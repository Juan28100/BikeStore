import { pbkdf2 } from 'node:crypto';
import { sendPasswordResetEmail } from './resend-mailer.mjs';

const ADMIN_EMAIL = 'jjcorreagetial16@gmail.com';
const SESSION_COOKIE = '__Host-bikestore_session';
const GUEST_COOKIE = '__Host-bikestore_guest';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const GUEST_SECONDS = 60 * 60 * 24 * 180;
const PASSWORD_ITERATIONS = 210_000;
const MAX_REQUEST_BYTES = 16_384;
const AUTH_WINDOW_SECONDS = 600;
const AUTH_REGISTER_MAX_ATTEMPTS = 30;
const GUEST_CREATE_MAX_PER_IP = 20;
const GUEST_CLEANUP_BATCH_SIZE = 500;
const AUTH_LOGIN_IP_MAX_FAILURES = 30;
const AUTH_LOGIN_PAIR_MAX_FAILURES = 10;
const AUTH_RATE_LIMIT_MAX_ROWS = 50_000;
const PASSWORD_RESET_SECONDS = 30 * 60;
const PASSWORD_RESET_MAX_ROWS = 50_000;
const PASSWORD_RESET_REQUEST_IP_MAX = 20;
const PASSWORD_RESET_REQUEST_PAIR_MAX = 5;
const PASSWORD_RESET_COMPLETE_IP_MAX = 20;
const PASSWORD_RESET_COMPLETE_TOKEN_MAX = 5;
const PASSWORD_RESET_REPLY = 'Si el correo corresponde a una cuenta, recibirás instrucciones para cambiar la contraseña.';
const encoder = new TextEncoder();

const IMAGE_PATHS = new Set([
  'bike-mountain', 'bike-kids', 'bike-city', 'bike-road-white', 'bike-trail-blue', 'bike-road', 'bike-hero',
  'helmets', 'helmet-route', 'helmet-kids', 'apparel-set', 'apparel-jersey', 'apparel-black', 'road-kit',
  'components', 'rear-light', 'lights', 'hero-ride'
].map((name) => `/assets/bikestore/${name}.jpg`));
const CATEGORY_NAMES = new Set([
  'Bicicletas de montaña', 'Bicicletas de ruta', 'Bicicletas eléctricas', 'Cascos y protección',
  'Ropa de ciclismo', 'Accesorios', 'Componentes y repuestos'
]);

function json(data, status = 200, extra = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Vary': 'Cookie'
  });
  if (extra instanceof Headers) {
    for (const [key, value] of extra.entries()) if (key.toLowerCase() !== 'set-cookie') headers.set(key, value);
    const cookies = typeof extra.getSetCookie === 'function'
      ? extra.getSetCookie()
      : (extra.get('Set-Cookie') || '').split(/, (?=__Host-bikestore_)/).filter(Boolean);
    for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  } else {
    for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}
function failure(message, status = 400) { return json({ error: message }, status); }
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
function decodeBase64Url(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function encodeBase64Url(value) {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
function derivePasswordBits(password, salt, iterations) {
  return new Promise((resolve, reject) => {
    pbkdf2(encoder.encode(password), salt, iterations, 32, 'sha256', (error, derivedKey) => {
      if (error) reject(error);
      else resolve(new Uint8Array(derivedKey));
    });
  });
}
async function sha256(value) {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordBits(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(hash)}`;
}
async function verifyPassword(password, encoded) {
  const [algorithm, roundsText, saltText, expectedText] = String(encoded || '').split('$');
  const rounds = Number(roundsText);
  if (algorithm !== 'pbkdf2-sha256' || !Number.isInteger(rounds) || rounds < 100_000 || rounds > 1_000_000 || !saltText || !expectedText) return false;
  try {
    const actual = await derivePasswordBits(password, decodeBase64Url(saltText), rounds);
    const expected = decodeBase64Url(expectedText);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch (_) { return false; }
}
function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const index = part.indexOf('=');
    if (index >= 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}
function cookieHeader(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie(name) { return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
function newId() { return crypto.randomUUID(); }
function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validPassword(value) { return typeof value === 'string' && encoder.encode(value).length >= 8 && encoder.encode(value).length <= 1024; }
function validName(value) { return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 80; }
function cleanProductInput(value) {
  if (!value || typeof value !== 'object') return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const category = typeof value.category === 'string' ? value.category.trim() : '';
  const price = Number(value.price);
  const stock = Number(value.stock);
  const image = typeof value.image === 'string' ? value.image : '';
  const id = typeof value.id === 'string' ? value.id.toLowerCase() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const active = value.active !== false;
  if (!/^[a-z0-9_-]{3,48}$/.test(id) || name.length < 2 || name.length > 80 || !CATEGORY_NAMES.has(category)) return null;
  if (!Number.isInteger(price) || price < 1_000 || price > 10_000_000 || !Number.isInteger(stock) || stock < 0 || stock > 10_000) return null;
  if (!IMAGE_PATHS.has(image) || description.length > 260) return null;
  return { id, name, category, price, stock, image, description, active };
}
class ApiInputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function bodyJson(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/json')) throw new ApiInputError('Se requiere JSON.', 415);
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_REQUEST_BYTES) {
    throw new ApiInputError('La solicitud es demasiado grande.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiInputError('El cuerpo JSON está vacío.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => {});
      throw new ApiInputError('La solicitud es demasiado grande.', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch (_) { throw new ApiInputError('El cuerpo no contiene UTF-8 válido.'); }
  try { return JSON.parse(text); }
  catch (_) { throw new ApiInputError('El JSON enviado no es válido.'); }
}
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
  if (!origin) return safeMethod;
  return origin === new URL(request.url).origin;
}
async function authenticate(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.email_verified_at, u.account_type
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > unixepoch() AND u.active = 1 AND u.account_type = 'account'
  `).bind(tokenHash).first();
}
async function findGuest(request, env) {
  const token = cookieValue(request, GUEST_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(`
    SELECT id, account_type FROM users
    WHERE guest_token_hash = ? AND guest_expires_at > unixepoch() AND account_type = 'guest'
  `).bind(tokenHash).first();
  return user ? { ...user, token } : null;
}
async function createGuest(env, headers) {
  const token = randomToken();
  const userId = newId();
  const cartId = newId();
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_SECONDS;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (id, account_type, name, guest_token_hash, guest_expires_at) VALUES (?, 'guest', 'Invitado', ?, ?)`)
      .bind(userId, await sha256(token), expiresAt),
    env.DB.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?)').bind(cartId, userId)
  ]);
  headers.append('Set-Cookie', cookieHeader(GUEST_COOKIE, token, GUEST_SECONDS));
  return { id: userId, account_type: 'guest', token, cart_id: cartId };
}
async function getCartId(env, userId) {
  let cart = await env.DB.prepare('SELECT id FROM carts WHERE user_id = ?').bind(userId).first();
  if (!cart) {
    const id = newId();
    await env.DB.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING').bind(id, userId).run();
    cart = await env.DB.prepare('SELECT id FROM carts WHERE user_id = ?').bind(userId).first();
  }
  if (!cart) throw new Error('No se pudo obtener el carrito de la cuenta.');
  return cart.id;
}
async function currentCartOwner(request, env, headers) {
  const account = await authenticate(request, env);
  if (account) {
    if (account.role === 'admin') throw new ApiInputError('Las cuentas administradoras no tienen carrito de compra.', 403);
    return { user: account, cartId: await getCartId(env, account.id) };
  }
  const guestCookie = cookieValue(request, GUEST_COOKIE);
  const guest = await findGuest(request, env);
  if (!guest) {
    if (guestCookie) headers.append('Set-Cookie', clearCookie(GUEST_COOKIE));
    return null;
  }
  return { user: { id: guest.id, name: 'Invitado', role: 'customer', account_type: 'guest' }, cartId: await getCartId(env, guest.id) };
}
function publicUser(user) {
  if (!user) return null;
  return { name: user.name, email: user.email || null, role: user.role, accountType: user.account_type };
}
function emptyGuestCart() {
  return { items: [], user: publicUser({ name: 'Invitado', role: 'customer', account_type: 'guest' }) };
}
async function createGuestCartOwner(env, headers) {
  const guest = await createGuest(env, headers);
  return { user: { id: guest.id, name: 'Invitado', role: 'customer', account_type: 'guest' }, cartId: guest.cart_id };
}
async function mergeGuestCart(request, env, accountUserId) {
  const guest = await findGuest(request, env);
  if (!guest || guest.id === accountUserId) return;
  const guestCartId = await getCartId(env, guest.id);
  const accountCartId = await getCartId(env, accountUserId);
  await env.DB.batch([
    env.DB.prepare(`
      WITH guest_items AS (
        SELECT product_id, variant, quantity
        FROM cart_items WHERE cart_id = ?
      ), ranked AS (
        SELECT g.product_id, g.variant, g.quantity, s.quantity AS stock,
          COALESCE((SELECT SUM(account_item.quantity) FROM cart_items account_item
            WHERE account_item.cart_id = ? AND account_item.product_id = g.product_id), 0) AS account_total,
          COALESCE(SUM(g.quantity) OVER (
            PARTITION BY g.product_id ORDER BY g.variant
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0) AS earlier_guest_total
        FROM guest_items g
        JOIN products p ON p.id = g.product_id AND p.is_active = 1
        JOIN inventory_stock s ON s.product_id = p.id
      ), allocations AS (
        SELECT product_id, variant,
          MAX(0, MIN(quantity, stock - account_total - earlier_guest_total)) AS amount
        FROM ranked
      )
      INSERT INTO cart_items (cart_id, product_id, variant, quantity)
      SELECT ?, product_id, variant, amount FROM allocations WHERE amount > 0
      ON CONFLICT(cart_id, product_id, variant) DO UPDATE
        SET quantity = quantity + excluded.quantity, updated_at = unixepoch()
    `).bind(guestCartId, accountCartId, accountCartId),
    env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(guestCartId),
    env.DB.prepare('UPDATE carts SET updated_at = unixepoch() WHERE id IN (?, ?)').bind(guestCartId, accountCartId),
    env.DB.prepare(`UPDATE users SET guest_expires_at = unixepoch()
      WHERE id = ? AND account_type = 'guest'`).bind(guest.id)
  ]);
}
async function purgeGuestData(env, userId) {
  const guestUser = `SELECT id FROM users WHERE id = ? AND account_type = 'guest'`;
  const guestCarts = `SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id
    WHERE u.id = ? AND u.account_type = 'guest'`;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM cart_items WHERE cart_id IN (${guestCarts})`).bind(userId),
    env.DB.prepare(`DELETE FROM carts WHERE user_id IN (${guestUser})`).bind(userId),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id IN (${guestUser})`).bind(userId),
    env.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id IN (${guestUser})`).bind(userId),
    env.DB.prepare(`DELETE FROM users WHERE id IN (${guestUser})`).bind(userId)
  ]);
}
async function cleanupExpiredGuests(env) {
  const now = Math.floor(Date.now() / 1000);
  const limit = GUEST_CLEANUP_BATCH_SIZE;
  const expiredUsers = `SELECT id FROM users WHERE account_type = 'guest' AND guest_expires_at <= ?
    ORDER BY guest_expires_at, id LIMIT ?`;
  const expiredCarts = `SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id
    WHERE u.account_type = 'guest' AND u.guest_expires_at <= ?
    ORDER BY u.guest_expires_at, u.id LIMIT ?`;
  const results = await env.DB.batch([
    env.DB.prepare(`DELETE FROM cart_items WHERE cart_id IN (${expiredCarts})`).bind(now, limit),
    env.DB.prepare(`DELETE FROM carts WHERE id IN (${expiredCarts})`).bind(now, limit),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id IN (${expiredUsers})`).bind(now, limit),
    env.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id IN (${expiredUsers})`).bind(now, limit),
    env.DB.prepare(`DELETE FROM users WHERE id IN (${expiredUsers}) AND account_type = 'guest'
      AND NOT EXISTS (SELECT 1 FROM carts c WHERE c.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM password_reset_tokens r WHERE r.user_id = users.id)`)
      .bind(now, limit)
  ]);
  return {
    cartItems: Number(results[0]?.meta?.changes || 0),
    carts: Number(results[1]?.meta?.changes || 0),
    users: Number(results[4]?.meta?.changes || 0)
  };
}
async function issueSession(user, env, headers) {
  const token = randomToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(newId(), user.id, await sha256(token), expiresAt).run();
  headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE, token, SESSION_SECONDS));
  headers.append('Set-Cookie', clearCookie(GUEST_COOKIE));
}
async function readCart(env, cartId, user) {
  const result = await env.DB.batch([
    env.DB.prepare(`
      DELETE FROM cart_items
      WHERE cart_id = ? AND (
        NOT EXISTS (SELECT 1 FROM products p JOIN inventory_stock s ON s.product_id = p.id
          WHERE p.id = cart_items.product_id AND p.is_active = 1 AND s.quantity > 0)
        OR COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
          >= COALESCE((SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id), 0)
      )
    `).bind(cartId),
    env.DB.prepare(`
      UPDATE cart_items
      SET quantity = MIN(cart_items.quantity, MAX(1,
        (SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id)
        - COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
      )), updated_at = unixepoch()
      WHERE cart_id = ? AND quantity > MIN(cart_items.quantity, MAX(1,
        (SELECT s.quantity FROM inventory_stock s WHERE s.product_id = cart_items.product_id)
        - COALESCE((SELECT SUM(previous.quantity) FROM cart_items previous
          WHERE previous.cart_id = cart_items.cart_id AND previous.product_id = cart_items.product_id
            AND (previous.added_at < cart_items.added_at
              OR (previous.added_at = cart_items.added_at AND previous.variant < cart_items.variant))), 0)
      ))
    `).bind(cartId),
    env.DB.prepare('UPDATE carts SET updated_at = unixepoch() WHERE id = ?').bind(cartId),
    env.DB.prepare('SELECT product_id AS productId, variant, quantity FROM cart_items WHERE cart_id = ? ORDER BY added_at, variant').bind(cartId)
  ]);
  return { items: result[3]?.results || [], user: publicUser(user) };
}
function productSelect() {
  return `SELECT p.id, p.name, c.name AS category, p.price_minor AS price, s.quantity AS stock,
    p.image_path AS image, p.description, p.is_active AS active, p.featured, p.flag, p.gear
    FROM products p JOIN categories c ON c.id = p.category_id
    JOIN inventory_stock s ON s.product_id = p.id`;
}
async function listProducts(env, request, admin = false) {
  const url = new URL(request.url);
  const category = (url.searchParams.get('category') || '').trim();
  const query = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const sort = url.searchParams.get('sort') || 'featured';
  let sql = `${productSelect()} WHERE (? = 1 OR p.is_active = 1) AND (? = '' OR c.name = ?) AND (? = '' OR p.name LIKE '%' || ? || '%' OR p.description LIKE '%' || ? || '%')`;
  const params = [admin ? 1 : 0, category, category, query, query, query];
  if (sort === 'asc') sql += ' ORDER BY p.price_minor ASC, p.name COLLATE NOCASE';
  else if (sort === 'desc') sql += ' ORDER BY p.price_minor DESC, p.name COLLATE NOCASE';
  else sql += ' ORDER BY p.featured DESC, p.created_at ASC';
  const result = await env.DB.prepare(sql).bind(...params).all();
  return (result.results || []).map((row) => ({ ...row, active: Boolean(row.active), featured: Boolean(row.featured), gear: Boolean(row.gear), price: Number(row.price), stock: Number(row.stock) }));
}
async function requireAdmin(request, env) {
  const user = await authenticate(request, env);
  if (!user) return { error: failure('Inicia sesión para continuar.', 401) };
  if (user.role !== 'admin' || user.email?.toLowerCase() !== ADMIN_EMAIL || !user.email_verified_at) {
    return { error: failure('Acceso reservado a la cuenta administradora.', 403) };
  }
  return { user };
}
async function edgeRateLimited(limiter, key) {
  if (!limiter || typeof limiter.limit !== 'function') return false;
  try {
    const result = await limiter.limit({ key });
    return !result.success;
  } catch (_) {
    // D1 is authoritative; edge bindings are additional burst barriers.
    return false;
  }
}
function authWindowStart() {
  const windowStart = Math.floor(Date.now() / 1000 / AUTH_WINDOW_SECONDS) * AUTH_WINDOW_SECONDS;
  return windowStart;
}
function authCounterStatement(keyHash, windowStart) {
  return `
    INSERT INTO auth_rate_limits (key_hash, window_start, attempts, updated_at)
    SELECT ?, ?, 1, unixepoch()
    WHERE (SELECT COUNT(*) FROM auth_rate_limits) < ?
      OR EXISTS (SELECT 1 FROM auth_rate_limits WHERE key_hash = ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_start = excluded.window_start
        THEN auth_rate_limits.attempts + 1 ELSE 1 END,
      window_start = excluded.window_start,
      updated_at = unixepoch()
    RETURNING attempts
  `;
}
async function incrementAuthCounters(env, keyHashes) {
  const windowStart = authWindowStart();
  const results = await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_rate_limits WHERE window_start < ?').bind(windowStart - AUTH_WINDOW_SECONDS * 2),
    ...keyHashes.map((keyHash) => env.DB.prepare(authCounterStatement(keyHash, windowStart)).bind(
      keyHash, windowStart, AUTH_RATE_LIMIT_MAX_ROWS, keyHash
    ))
  ]);
  return results.slice(1).map((result) => Number(result?.results?.[0]?.attempts || 0));
}
async function loginRateKeys(request, email) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const ipKey = await sha256(`auth:login-failed:ip:${ip}`);
  const pairKey = await sha256(`auth:login-failed:pair:${ip}\u0000${normalizedEmail}`);
  return { ipKey, pairKey };
}
async function registrationAttemptLimited(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = await sha256(`auth:register:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env.AUTH_EDGE_REGISTER_LIMITER, ipKey),
    incrementAuthCounters(env, [ipKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > AUTH_REGISTER_MAX_ATTEMPTS;
}
async function guestCreationLimited(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = await sha256(`guest:create:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env.GUEST_EDGE_CREATE_LIMITER, key),
    incrementAuthCounters(env, [key])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > GUEST_CREATE_MAX_PER_IP;
}
async function loginRateLimited(request, env, email) {
  const { ipKey, pairKey } = await loginRateKeys(request, email);
  const windowStart = authWindowStart();
  const results = await env.DB.batch([
    env.DB.prepare('SELECT attempts FROM auth_rate_limits WHERE key_hash = ? AND window_start = ?').bind(ipKey, windowStart),
    env.DB.prepare('SELECT attempts FROM auth_rate_limits WHERE key_hash = ? AND window_start = ?').bind(pairKey, windowStart)
  ]);
  const ipAttempts = Number(results[0]?.results?.[0]?.attempts || 0);
  const pairAttempts = Number(results[1]?.results?.[0]?.attempts || 0);
  return ipAttempts >= AUTH_LOGIN_IP_MAX_FAILURES || pairAttempts >= AUTH_LOGIN_PAIR_MAX_FAILURES;
}
async function recordLoginFailure(request, env, email) {
  const { ipKey, pairKey } = await loginRateKeys(request, email);
  const [counts, edgeBlocks] = await Promise.all([
    incrementAuthCounters(env, [ipKey, pairKey]),
    Promise.all([
      edgeRateLimited(env.AUTH_EDGE_LOGIN_IP_LIMITER, ipKey),
      edgeRateLimited(env.AUTH_EDGE_LOGIN_PAIR_LIMITER, pairKey)
    ])
  ]);
  return counts[0] < 1 || counts[1] < 1
    || counts[0] > AUTH_LOGIN_IP_MAX_FAILURES || counts[1] > AUTH_LOGIN_PAIR_MAX_FAILURES
    || edgeBlocks[0] || edgeBlocks[1];
}
async function passwordResetRequestIpLimited(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = await sha256(`auth:password-reset-request:ip:${ip}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env.AUTH_EDGE_PASSWORD_RESET_LIMITER, ipKey),
    incrementAuthCounters(env, [ipKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[0] > PASSWORD_RESET_REQUEST_IP_MAX;
}
async function passwordResetRequestPairLimited(request, env, email) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const pairKey = await sha256(`auth:password-reset-request:pair:${ip}\u0000${email}`);
  const counts = await incrementAuthCounters(env, [pairKey]);
  return counts[0] < 1 || counts[0] > PASSWORD_RESET_REQUEST_PAIR_MAX;
}
async function passwordResetCompleteLimited(request, env, tokenHash) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = await sha256(`auth:password-reset-complete:ip:${ip}`);
  const tokenKey = await sha256(`auth:password-reset-complete:token:${ip}\u0000${tokenHash}`);
  const [edgeBlocked, counts] = await Promise.all([
    edgeRateLimited(env.AUTH_EDGE_PASSWORD_RESET_LIMITER, ipKey),
    incrementAuthCounters(env, [ipKey, tokenKey])
  ]);
  return edgeBlocked || counts[0] < 1 || counts[1] < 1
    || counts[0] > PASSWORD_RESET_COMPLETE_IP_MAX || counts[1] > PASSWORD_RESET_COMPLETE_TOKEN_MAX;
}
function configuredAppOrigin(env) {
  const configured = String(env.APP_ORIGIN || '');
  const parsed = new URL(configured);
  const normalized = configured.replace(/\/$/, '');
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== normalized
      || (parsed.protocol !== 'https:' && env.BIKESTORE_TEST_MODE !== 'true')) {
    throw new Error('password_reset_origin_invalid');
  }
  return parsed.origin;
}
async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const headers = new Headers();
  if (!sameOrigin(request)) return failure('Origen no permitido.', 403);
  try {
    if (path === '/api/health' && method === 'GET') {
      await env.DB.prepare('SELECT 1 AS ok').first();
      try {
        await env.DB.prepare(`SELECT u.id, u.name, u.email, u.role, u.email_verified_at,
          u.account_type, u.password_hash, u.active, s.token_hash, s.expires_at
          FROM users u LEFT JOIN sessions s ON s.user_id = u.id LIMIT 0`).all();
        await env.DB.prepare(`SELECT key_hash, window_start, attempts, updated_at
          FROM auth_rate_limits LIMIT 0`).all();
        await env.DB.prepare(`SELECT user_id, token_hash, expires_at, consumed_at, consumed_by
          FROM password_reset_tokens LIMIT 0`).all();
        return json({ ok: true, database: 'connected', authSchema: 'ready' });
      } catch (_) {
        return json({ ok: false, database: 'connected', authSchema: 'incomplete' }, 503);
      }
    }
    if (path === '/api/products' && method === 'GET') {
      return json({ products: await listProducts(env, request, false) });
    }
    if (path === '/api/auth/session' && method === 'GET') {
      return json({ user: publicUser(await authenticate(request, env)) });
    }
    if (path === '/api/auth/register' && method === 'POST') {
      if (await registrationAttemptLimited(request, env)) return failure('Demasiados intentos de registro. Espera unos minutos.', 429);
      const input = await bodyJson(request);
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const password = input.password;
      if (!validName(name) || !isEmail(email) || !validPassword(password)) {
        return failure('Revisa nombre, correo y contraseña (mínimo 8 caracteres).');
      }
      if (email === ADMIN_EMAIL) return failure('Esta cuenta administradora ya está reservada.', 409);
      const user = { id: newId(), name, email, role: 'customer', account_type: 'account' };
      const hash = await passwordHash(password);
      const inserted = await env.DB.prepare(`INSERT INTO users (id, account_type, name, email, role, password_hash)
        VALUES (?, 'account', ?, ?, 'customer', ?)
        ON CONFLICT DO NOTHING RETURNING id`).bind(user.id, name, email, hash).first();
      if (!inserted) {
        const duplicate = await env.DB.prepare(`SELECT id FROM users
          WHERE email = ? COLLATE NOCASE AND account_type = 'account'`).bind(email).first();
        if (duplicate) return failure('No se pudo crear la cuenta. Si el correo ya existe, inicia sesión.', 409);
        throw new Error('registration_insert_not_applied');
      }
      await mergeGuestCart(request, env, user.id);
      await issueSession(user, env, headers);
      return json({ user: publicUser(user) }, 201, headers);
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const input = await bodyJson(request);
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const password = typeof input.password === 'string' ? input.password : '';
      if (await loginRateLimited(request, env, email)) return failure('Demasiados intentos fallidos desde este origen. Intenta más tarde o desde otra red.', 429);
      const user = isEmail(email) ? await env.DB.prepare(`SELECT id, name, email, role, email_verified_at, account_type, password_hash, active
        FROM users WHERE email = ? COLLATE NOCASE AND account_type = 'account'`).bind(email).first() : null;
      const passwordOk = user ? await verifyPassword(password, user.password_hash) : false;
      if (!user || !user.active || !passwordOk) {
        const limited = await recordLoginFailure(request, env, email);
        return failure('Correo o contraseña incorrectos.', limited ? 429 : 401);
      }
      await mergeGuestCart(request, env, user.id);
      await issueSession(user, env, headers);
      return json({ user: publicUser(user) }, 200, headers);
    }
    if (path === '/api/auth/password-reset/request' && method === 'POST') {
      if (await passwordResetRequestIpLimited(request, env)) return failure('Demasiadas solicitudes. Intenta más tarde.', 429);
      const input = await bodyJson(request);
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (!isEmail(email)) return failure('Escribe un correo electrónico válido.');
      if (await passwordResetRequestPairLimited(request, env, email)) return failure('Demasiadas solicitudes. Intenta más tarde.', 429);
      const user = await env.DB.prepare(`SELECT id, email FROM users
        WHERE email = ? COLLATE NOCASE AND account_type = 'account' AND active = 1`).bind(email).first();
      if (user) {
        const token = randomToken();
        const tokenHash = await sha256(token);
        const expiresAt = Math.floor(Date.now() / 1000) + PASSWORD_RESET_SECONDS;
        const stored = await env.DB.batch([
          env.DB.prepare('DELETE FROM password_reset_tokens WHERE expires_at < unixepoch() - 86400'),
          env.DB.prepare(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            SELECT ?, ?, ?
            WHERE (SELECT COUNT(*) FROM password_reset_tokens) < ?
              OR EXISTS (SELECT 1 FROM password_reset_tokens WHERE user_id = ?)
            ON CONFLICT(user_id) DO UPDATE SET
              token_hash = excluded.token_hash, expires_at = excluded.expires_at,
              consumed_at = NULL, consumed_by = NULL, created_at = unixepoch()
            RETURNING user_id`).bind(user.id, tokenHash, expiresAt, PASSWORD_RESET_MAX_ROWS, user.id)
        ]);
        if (stored[1]?.meta?.changes) {
          try {
            const origin = configuredAppOrigin(env);
            const resetUrl = `${origin}/#password-reset=${token}`;
            await sendPasswordResetEmail({
              apiKey: env.RESEND_API_KEY,
              fromEmail: env.RESEND_FROM_EMAIL,
              to: user.email,
              resetUrl,
              testMode: env.BIKESTORE_TEST_MODE === 'true',
              testEndpoint: env.RESEND_TEST_ENDPOINT
            });
          } catch (_) {
            await env.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?
              AND token_hash = ? AND consumed_at IS NULL`).bind(user.id, tokenHash).run().catch(() => {});
            console.error('bikestore-password-reset-delivery-failed');
          }
        }
      }
      return json({ ok: true, message: PASSWORD_RESET_REPLY }, 202);
    }
    if (path === '/api/auth/password-reset/complete' && method === 'POST') {
      const input = await bodyJson(request);
      const token = typeof input.token === 'string' ? input.token : '';
      const password = input.password;
      if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !validPassword(password)) {
        return failure('El enlace no es válido o venció, o la contraseña no cumple el mínimo de 8 caracteres.');
      }
      const tokenHash = await sha256(token);
      if (await passwordResetCompleteLimited(request, env, tokenHash)) return failure('Demasiados intentos. Intenta más tarde.', 429);
      const validToken = await env.DB.prepare(`SELECT user_id FROM password_reset_tokens
        WHERE token_hash = ? AND consumed_at IS NULL AND consumed_by IS NULL AND expires_at > unixepoch()`)
        .bind(tokenHash).first();
      if (!validToken) return failure('El enlace no es válido o venció.', 400);
      const newPasswordHash = await passwordHash(password);
      const redemptionId = newId();
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE password_reset_tokens SET consumed_at = unixepoch(), consumed_by = ?
          WHERE token_hash = ? AND consumed_at IS NULL AND consumed_by IS NULL AND expires_at > unixepoch()`)
          .bind(redemptionId, tokenHash),
        env.DB.prepare(`UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, unixepoch())
          WHERE id = (SELECT user_id FROM password_reset_tokens
            WHERE token_hash = ? AND consumed_by = ? AND consumed_at IS NOT NULL)
            AND account_type = 'account' AND active = 1`)
          .bind(newPasswordHash, tokenHash, redemptionId),
        env.DB.prepare(`DELETE FROM sessions WHERE user_id = (SELECT user_id FROM password_reset_tokens
          WHERE token_hash = ? AND consumed_by = ? AND consumed_at IS NOT NULL)`)
          .bind(tokenHash, redemptionId)
      ]);
      if (!results[1]?.meta?.changes) return failure('El enlace no es válido o venció.', 400);
      headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
      return json({ ok: true }, 200, headers);
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      const token = cookieValue(request, SESSION_COOKIE);
      if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
      const guest = await findGuest(request, env);
      if (guest) await purgeGuestData(env, guest.id);
      headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
      headers.append('Set-Cookie', clearCookie(GUEST_COOKIE));
      return json({ ok: true }, 200, headers);
    }
    if (path === '/api/cart' && method === 'GET') {
      const owner = await currentCartOwner(request, env, headers);
      const result = owner ? await readCart(env, owner.cartId, owner.user) : emptyGuestCart();
      return json(result, 200, headers);
    }
    if (path === '/api/cart/items' && method === 'POST') {
      const owner = await currentCartOwner(request, env, headers);
      const input = await bodyJson(request);
      const productId = typeof input.productId === 'string' ? input.productId : '';
      const variant = typeof input.variant === 'string' ? input.variant.trim().slice(0, 24) : '';
      const amount = Number(input.quantity ?? 1);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId) || !Number.isInteger(amount) || amount < 1 || amount > 100) return failure('Producto o cantidad inválidos.');
      let cartOwner = owner;
      if (!cartOwner) {
        const available = await env.DB.prepare(`SELECT 1 AS ok FROM products p
          JOIN inventory_stock s ON s.product_id = p.id
          WHERE p.id = ? AND p.is_active = 1 AND s.quantity >= ?`).bind(productId, amount).first();
        if (!available) return failure('No hay existencias suficientes para esa cantidad.', 409);
        if (await guestCreationLimited(request, env)) return failure('Demasiadas creaciones de carrito desde esta red. Intenta más tarde.', 429);
        cartOwner = await createGuestCartOwner(env, headers);
      }
      const write = await env.DB.prepare(`
        INSERT INTO cart_items (cart_id, product_id, variant, quantity)
        SELECT ?, p.id, ?, ? FROM products p JOIN inventory_stock s ON s.product_id = p.id
        WHERE p.id = ? AND p.is_active = 1 AND s.quantity >= ?
          AND COALESCE((SELECT SUM(ci.quantity) FROM cart_items ci WHERE ci.cart_id = ? AND ci.product_id = p.id), 0) + ? <= s.quantity
        ON CONFLICT(cart_id, product_id, variant) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = unixepoch()
      `).bind(cartOwner.cartId, variant, amount, productId, amount, cartOwner.cartId, amount).run();
      if (!write.meta?.changes) return failure('No hay existencias suficientes para esa cantidad.', 409);
      await env.DB.prepare('UPDATE carts SET updated_at = unixepoch() WHERE id = ?').bind(cartOwner.cartId).run();
      return json(await readCart(env, cartOwner.cartId, cartOwner.user), 200, headers);
    }
    if (path === '/api/cart/items' && method === 'PUT') {
      const owner = await currentCartOwner(request, env, headers);
      if (!owner) return failure('No existe esa línea o no hay existencias suficientes.', 409);
      const input = await bodyJson(request);
      const productId = typeof input.productId === 'string' ? input.productId : '';
      const variant = typeof input.variant === 'string' ? input.variant.trim().slice(0, 24) : '';
      const quantity = Number(input.quantity);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return failure('Producto o cantidad inválidos.');
      const write = await env.DB.prepare(`
        UPDATE cart_items SET quantity = ?, updated_at = unixepoch()
        WHERE cart_id = ? AND product_id = ? AND variant = ?
          AND EXISTS (SELECT 1 FROM products p JOIN inventory_stock s ON s.product_id = p.id
            WHERE p.id = ? AND p.is_active = 1
              AND ? + COALESCE((SELECT SUM(other.quantity) FROM cart_items other
                WHERE other.cart_id = ? AND other.product_id = p.id AND other.variant <> ?), 0) <= s.quantity)
      `).bind(quantity, owner.cartId, productId, variant, productId, quantity, owner.cartId, variant).run();
      if (!write.meta?.changes) return failure('No existe esa línea o no hay existencias suficientes.', 409);
      await env.DB.prepare('UPDATE carts SET updated_at = unixepoch() WHERE id = ?').bind(owner.cartId).run();
      return json(await readCart(env, owner.cartId, owner.user), 200, headers);
    }
    if (path === '/api/cart/items' && method === 'DELETE') {
      const owner = await currentCartOwner(request, env, headers);
      if (!owner) return json(emptyGuestCart(), 200, headers);
      const productId = url.searchParams.get('productId') || '';
      const variant = (url.searchParams.get('variant') || '').slice(0, 24);
      if (!/^[a-z0-9_-]{3,48}$/i.test(productId)) return failure('Producto inválido.');
      await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant = ?').bind(owner.cartId, productId, variant).run();
      return json(await readCart(env, owner.cartId, owner.user), 200, headers);
    }
    if (path === '/api/cart' && method === 'DELETE') {
      const owner = await currentCartOwner(request, env, headers);
      if (!owner) return json(emptyGuestCart(), 200, headers);
      await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(owner.cartId).run();
      return json(await readCart(env, owner.cartId, owner.user), 200, headers);
    }
    if (path === '/api/admin/products' && method === 'GET') {
      const auth = await requireAdmin(request, env);
      if (auth.error) return auth.error;
      return json({ products: await listProducts(env, request, true) });
    }
    if (path === '/api/admin/products' && method === 'POST') {
      const auth = await requireAdmin(request, env);
      if (auth.error) return auth.error;
      const product = cleanProductInput(await bodyJson(request));
      if (!product) return failure('Revisa los datos del producto.');
      const category = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND is_active = 1').bind(product.category).first();
      if (!category) return failure('Categoría inválida.');
      const idempotency = `initial-stock:${product.id}:${newId()}`;
      const statements = [env.DB.prepare(`INSERT INTO products
        (id, category_id, sku, slug, name, description, price_minor, currency_code, image_path, is_active, featured, flag, gear)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COP', ?, ?, 0, 'Nuevo', ?)`)
        .bind(product.id, category.id, product.id.toUpperCase(), product.id, product.name, product.description, product.price, product.image, product.active ? 1 : 0, product.category.startsWith('Bicicletas') ? 0 : 1)];
      if (product.stock > 0) statements.push(env.DB.prepare(`INSERT INTO inventory_transactions
        (id, product_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 'restock', ?)`)
        .bind(newId(), product.id, product.stock, idempotency));
      try { await env.DB.batch(statements); } catch (_) { return failure('No se pudo crear: el identificador ya existe o los datos no son válidos.', 409); }
      return json({ product: (await listProducts(env, new Request(`${url.origin}/api/admin/products?q=${encodeURIComponent(product.name)}`), true))[0] }, 201);
    }
    const productRoute = path.match(/^\/api\/admin\/products\/([a-z0-9_-]{3,48})$/i);
    if (productRoute && method === 'PATCH') {
      const auth = await requireAdmin(request, env);
      if (auth.error) return auth.error;
      const product = cleanProductInput(await bodyJson(request));
      if (!product || product.id.toLowerCase() !== productRoute[1].toLowerCase()) return failure('Revisa los datos del producto.');
      const category = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND is_active = 1').bind(product.category).first();
      const current = await env.DB.prepare(`SELECT p.id FROM products p
        JOIN inventory_stock s ON s.product_id = p.id WHERE p.id = ?`).bind(productRoute[1]).first();
      if (!category || !current) return failure('Producto o categoría no encontrados.', 404);
      const idempotencyKey = request.headers.get('Idempotency-Key') || '';
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return failure('Se requiere una clave Idempotency-Key válida.', 400);
      const payloadHash = await sha256(JSON.stringify(product));
      const inventoryKey = `admin-patch:${idempotencyKey}`;
      try {
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO admin_product_patch_requests (idempotency_key, product_id, payload_hash)
            VALUES (?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`).bind(idempotencyKey, product.id, payloadHash),
          env.DB.prepare(`UPDATE products SET category_id = ?, name = ?, description = ?, price_minor = ?, image_path = ?, is_active = ?, gear = ?, updated_at = unixepoch()
            WHERE id = ? AND EXISTS (SELECT 1 FROM admin_product_patch_requests r
              WHERE r.idempotency_key = ? AND r.product_id = ? AND r.payload_hash = ?)`)
            .bind(category.id, product.name, product.description, product.price, product.image, product.active ? 1 : 0,
              product.category.startsWith('Bicicletas') ? 0 : 1, product.id, idempotencyKey, product.id, payloadHash),
          env.DB.prepare(`INSERT INTO inventory_transactions (id, product_id, delta, reason, idempotency_key)
            SELECT ?, s.product_id, ? - s.quantity, 'adjustment', ? FROM inventory_stock s
            WHERE s.product_id = ? AND s.quantity <> ?
              AND EXISTS (SELECT 1 FROM admin_product_patch_requests r
                WHERE r.idempotency_key = ? AND r.product_id = ? AND r.payload_hash = ?)
            ON CONFLICT(idempotency_key) DO NOTHING`)
            .bind(newId(), product.stock, inventoryKey, product.id, product.stock, idempotencyKey, product.id, payloadHash)
        ]);
      } catch (_) { return failure('No se pudo guardar el producto o el ajuste de stock.', 409); }
      const requestRecord = await env.DB.prepare('SELECT product_id, payload_hash FROM admin_product_patch_requests WHERE idempotency_key = ?').bind(idempotencyKey).first();
      if (!requestRecord || requestRecord.product_id !== product.id || requestRecord.payload_hash !== payloadHash) {
        return failure('La clave idempotente ya fue usada con otra solicitud.', 409);
      }
      return json({ product: (await env.DB.prepare(`${productSelect()} WHERE p.id = ?`).bind(product.id).first()) });
    }
    if (productRoute && method === 'DELETE') {
      const auth = await requireAdmin(request, env);
      if (auth.error) return auth.error;
      const productId = productRoute[1];
      const exists = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first();
      if (!exists) return failure('Producto no encontrado.', 404);
      await env.DB.batch([
        env.DB.prepare('UPDATE products SET is_active = 0, updated_at = unixepoch() WHERE id = ?').bind(productId),
        env.DB.prepare('DELETE FROM cart_items WHERE product_id = ?').bind(productId)
      ]);
      return json({ ok: true, deleted: productId });
    }
    return failure('Ruta no encontrada.', 404);
  } catch (error) {
    if (Number.isInteger(error?.status)) return failure(String(error.message || 'Solicitud inválida.'), error.status);
    if (error instanceof SyntaxError) return failure('El JSON enviado no es válido.');
    if (String(error?.message || '').includes('JSON')) return failure(error.message);
    console.error('bikestore-api-error', String(error?.message || 'unknown').slice(0, 180));
    return failure('No se pudo completar la solicitud.', 500);
  }
}

function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return secureResponse(await handleApi(request, env));
    }
    const appRoutes = new Set(['/catalogo', '/accesorios', '/carrito', '/checkout', '/confirmacion', '/admin']);
    const appRoute = appRoutes.has(url.pathname) || /^\/producto\/[a-z0-9_-]{1,48}$/i.test(url.pathname);
    if (appRoute && ['GET', 'HEAD'].includes(request.method)) {
      const appUrl = new URL('/', url.origin);
      return secureResponse(await env.ASSETS.fetch(new Request(appUrl, request)));
    }
    const response = await env.ASSETS.fetch(request);
    return secureResponse(response);
  },
  async scheduled(_controller, env) {
    await cleanupExpiredGuests(env);
  }
};
