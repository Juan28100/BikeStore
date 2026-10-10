import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const stateDir = process.env.BIKESTORE_TEST_STATE_DIR;
const runId = process.env.BIKESTORE_TEST_RUN_ID;
assert.ok(stateDir && runId, 'El runner debe proporcionar D1 local y un ID de ejecución.');
const readIp = '198.51.100.60';
const createIp = '198.51.100.61';
const guestLimiterKey = createHash('sha256').update(`guest:create:ip:${createIp}`).digest('base64url');
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const digest = (value) => createHash('sha256').update(value).digest('base64url');

function executeSql(sql) {
  const output = execFileSync('npx', [
    'wrangler', 'd1', 'execute', 'bikestore-store', '--local', '--persist-to', stateDir,
    '--command', sql, '--json'
  ], { encoding: 'utf8' });
  return JSON.parse(output);
}
function findScalar(value, key) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findScalar(child, key);
      if (found !== undefined) return found;
    }
  } else if (value && typeof value === 'object') {
    if (Object.hasOwn(value, key)) return value[key];
    for (const child of Object.values(value)) {
      const found = findScalar(child, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
function scalar(sql, key = 'value') {
  const value = findScalar(executeSql(sql), key);
  assert.notEqual(value, undefined, `D1 local query must return ${key}`);
  return Number(value);
}
async function api(path, { method = 'GET', body, ip, cookie } = {}) {
  const headers = new Headers({ Accept: 'application/json' });
  if (ip) headers.set('CF-Connecting-IP', ip);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('Origin', base);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(`${base}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}
function setCookies(response) {
  return typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
}
function cookieValue(response, name) {
  const line = setCookies(response).find((value) => value.startsWith(`${name}=`));
  assert.ok(line, `response must set ${name}`);
  return line.slice(name.length + 1).split(';', 1)[0];
}
const guestCount = () => scalar("SELECT COUNT(*) AS value FROM users WHERE account_type = 'guest'");
const cartCount = () => scalar('SELECT COUNT(*) AS value FROM carts');

// Repeated no-cookie reads must be pure and must not consume the create quota.
const guestsBeforeReads = guestCount();
const cartsBeforeReads = cartCount();
for (let attempt = 0; attempt < 30; attempt += 1) {
  const { response, data } = await api('/api/cart', { ip: readIp });
  assert.equal(response.status, 200);
  assert.equal(data.user.accountType, 'guest');
  assert.deepEqual(data.items, []);
  assert.equal(response.headers.get('set-cookie'), null, 'anonymous GET must not mint a guest cookie');
}
assert.equal(guestCount(), guestsBeforeReads, '30 anonymous GETs must not insert guest users');
assert.equal(cartCount(), cartsBeforeReads, '30 anonymous GETs must not insert carts');
const readLimiterKey = digest(`guest:create:ip:${readIp}`);
assert.equal(scalar(`SELECT COUNT(*) AS value FROM auth_rate_limits WHERE key_hash = ${quote(readLimiterKey)}`), 0,
  'anonymous GETs must not consume the guest-creation bucket');

// A valid first add may create one guest cart; repeated cookie-less creates from one IP are bounded.
const guestsBeforeCreates = guestCount();
const cartsBeforeCreates = cartCount();
let firstGuestToken = '';
for (let attempt = 1; attempt <= 20; attempt += 1) {
  const { response, data } = await api('/api/cart/items', {
    method: 'POST', ip: createIp,
    body: { productId: 'rear-light-led', quantity: 1, variant: `G-${String(attempt).padStart(2, '0')}` }
  });
  assert.equal(response.status, 200, `valid guest cart creation ${attempt} must pass the 20/IP D1 limit`);
  assert.equal(data.user.accountType, 'guest');
  assert.equal(data.items.length, 1);
  if (attempt === 1) firstGuestToken = cookieValue(response, '__Host-bikestore_guest');
}
assert.equal(guestCount(), guestsBeforeCreates + 20, 'each accepted no-cookie write should create exactly one guest');
assert.equal(cartCount(), cartsBeforeCreates + 20, 'each accepted no-cookie write should create exactly one cart');
assert.equal(scalar(`SELECT attempts AS value FROM auth_rate_limits WHERE key_hash = ${quote(guestLimiterKey)}`), 20,
  'the same IP must increment one D1 guest-creation bucket for each accepted write');
const blocked = await api('/api/cart/items', {
  method: 'POST', ip: createIp,
  body: { productId: 'rear-light-led', quantity: 1, variant: 'G-OVER' }
});
assert.equal(blocked.response.status, 429, 'the 21st cookie-less guest-cart create from the same IP must be blocked');
assert.equal(guestCount(), guestsBeforeCreates + 20, 'blocked requests must not add guest rows');
assert.equal(cartCount(), cartsBeforeCreates + 20, 'blocked requests must not add cart rows');
assert.equal(scalar(`SELECT attempts AS value FROM auth_rate_limits WHERE key_hash = ${quote(guestLimiterKey)}`), 21,
  'the bounded D1 IP bucket must record the 21st blocked attempt');

// Guest logout removes its ephemeral children in FK-safe order; it does not target account carts.
const guestHash = digest(firstGuestToken);
assert.equal(scalar(`SELECT COUNT(*) AS value FROM users WHERE guest_token_hash = ${quote(guestHash)}`), 1);
assert.equal(scalar(`SELECT COUNT(*) AS value FROM carts c JOIN users u ON u.id = c.user_id WHERE u.guest_token_hash = ${quote(guestHash)}`), 1);
const logout = await api('/api/auth/logout', {
  method: 'POST', ip: createIp, cookie: `__Host-bikestore_guest=${firstGuestToken}`
});
assert.equal(logout.response.status, 200);
assert.ok(setCookies(logout.response).some((line) => line.startsWith('__Host-bikestore_guest=') && /Max-Age=0/i.test(line)));
assert.equal(scalar(`SELECT COUNT(*) AS value FROM users WHERE guest_token_hash = ${quote(guestHash)}`), 0,
  'guest logout must remove the ephemeral user');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM carts c JOIN users u ON u.id = c.user_id WHERE u.guest_token_hash = ${quote(guestHash)}`), 0,
  'guest logout must remove the guest cart');

// Seed FK dependants plus one live guest; exercise the actual scheduled handler through Wrangler's local endpoint.
const expiredUserId = `expired-guest-${runId}`;
const expiredCartId = `expired-cart-${runId}`;
const liveUserId = `live-guest-${runId}`;
const liveCartId = `live-cart-${runId}`;
const expiredGuestHash = `fixture-expired-${runId}`;
const liveGuestHash = `fixture-live-${runId}`;
executeSql(`INSERT INTO users (id, account_type, name, guest_token_hash, guest_expires_at)
  VALUES (${quote(expiredUserId)}, 'guest', 'Invitado vencido de prueba', ${quote(expiredGuestHash)}, unixepoch() - 60)`);
executeSql(`INSERT INTO carts (id, user_id) VALUES (${quote(expiredCartId)}, ${quote(expiredUserId)})`);
executeSql(`INSERT INTO cart_items (cart_id, product_id, variant, quantity)
  VALUES (${quote(expiredCartId)}, 'rear-light-led', 'EXPIRED', 1)`);
executeSql(`INSERT INTO sessions (id, user_id, token_hash, expires_at)
  VALUES (${quote(`session-${runId}`)}, ${quote(expiredUserId)}, ${quote(`session-token-${runId}`)}, unixepoch() + 3600)`);
executeSql(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (${quote(expiredUserId)}, ${quote(`reset-token-${runId}`)}, unixepoch() + 3600)`);
executeSql(`INSERT INTO users (id, account_type, name, guest_token_hash, guest_expires_at)
  VALUES (${quote(liveUserId)}, 'guest', 'Invitado vigente de prueba', ${quote(liveGuestHash)}, unixepoch() + 86400)`);
executeSql(`INSERT INTO carts (id, user_id) VALUES (${quote(liveCartId)}, ${quote(liveUserId)})`);
executeSql(`INSERT INTO cart_items (cart_id, product_id, variant, quantity)
  VALUES (${quote(liveCartId)}, 'rear-light-led', 'LIVE', 1)`);

const scheduled = await fetch(`${base}/__scheduled?cron=0+5+*+*+*`);
assert.equal(scheduled.status, 200, 'Wrangler local scheduled endpoint must run the configured Cron handler');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM users WHERE id = ${quote(expiredUserId)}`), 0,
  'expired guest user must be removed');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM carts WHERE id = ${quote(expiredCartId)}`), 0,
  'expired guest cart must be removed after its lines');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM cart_items WHERE cart_id = ${quote(expiredCartId)}`), 0,
  'expired guest cart lines must be removed first');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM sessions WHERE user_id = ${quote(expiredUserId)}`), 0,
  'expired guest sessions must be removed before the user');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM password_reset_tokens WHERE user_id = ${quote(expiredUserId)}`), 0,
  'expired guest reset references must be removed before the user');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM users WHERE id = ${quote(liveUserId)}`), 1,
  'scheduled cleanup must preserve unexpired guests');
assert.equal(scalar(`SELECT COUNT(*) AS value FROM cart_items WHERE cart_id = ${quote(liveCartId)}`), 1,
  'scheduled cleanup must preserve the active guest cart');

console.log('PASS guest lifecycle: 30 read-only GETs, D1 per-IP create cap, guest logout cleanup, and FK-safe scheduled expiry');
