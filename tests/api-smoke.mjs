import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const failedLoginIp = process.env.BIKESTORE_TEST_FAILED_LOGIN_IP || '198.51.100.44';
const resendMockUrl = process.env.BIKESTORE_TEST_RESEND_MOCK_URL;
const resendControlToken = process.env.BIKESTORE_TEST_RESEND_CONTROL_TOKEN;
const cookies = new Map();
const sumItems = (items) => items.reduce((sum, item) => sum + item.quantity, 0);
function absorbCookies(response, jar) {
  const lines = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([^=]+)=([^;]*)/);
    if (!match) continue;
    if (/Max-Age=0/i.test(line)) jar.delete(match[1]);
    else jar.set(match[1], match[2]);
  }
}
async function call(path, { method = 'GET', body, rawBody, streamBody, headers: extraHeaders = {}, jar = cookies, origin = true } = {}) {
  const headers = new Headers({ Accept: 'application/json', ...extraHeaders });
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  if (origin && isWrite && !headers.has('Origin')) headers.set('Origin', base);
  if (body !== undefined || rawBody !== undefined || streamBody !== undefined) headers.set('Content-Type', 'application/json');
  if (jar.size) headers.set('Cookie', [...jar].map(([key, value]) => `${key}=${value}`).join('; '));
  let payload = body === undefined ? undefined : JSON.stringify(body);
  const init = { method, headers };
  if (streamBody !== undefined) {
    const bytes = new TextEncoder().encode(streamBody);
    init.body = new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
    init.duplex = 'half';
  } else if (rawBody !== undefined) payload = rawBody;
  if (payload !== undefined) init.body = payload;
  const response = await fetch(`${base}${path}`, init);
  absorbCookies(response, jar);
  let data = {};
  try { data = await response.json(); } catch (_) {}
  return { status: response.status, data, jar };
}
async function capturedResetEmails() {
  assert.ok(resendMockUrl && resendControlToken, 'local Resend stub must be configured');
  const response = await fetch(`${resendMockUrl}/messages`, { headers: { 'X-Test-Control': resendControlToken } });
  assert.equal(response.status, 200);
  return (await response.json()).messages;
}
function resetTokenFromEmail(message) {
  assert.ok(message && Array.isArray(message.to) && typeof message.html === 'string');
  const href = message.html.match(/href="([^"]+)"/)?.[1];
  assert.ok(href, 'reset email must include one link');
  const url = new URL(href);
  assert.equal(url.origin, 'https://noma-estudio-demo.torch-ringer.workers.dev', 'reset link must use the existing published origin, not Host');
  const token = url.hash.match(/^#password-reset=([A-Za-z0-9_-]{43})$/)?.[1];
  assert.ok(token, 'reset link must carry a URL-safe token in the fragment');
  return token;
}

const health = await call('/api/health');
assert.equal(health.status, 200);
assert.equal(health.data.database, 'connected');
assert.equal(health.data.authSchema, 'ready', 'health must verify the schema shared by registration and login');
const catalog = await call('/api/products');
assert.equal(catalog.status, 200);
assert.equal(catalog.data.products.length, 9);
const product = catalog.data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.ok(product && product.stock >= 6);

const absentOrigin = await call('/api/auth/login', { method: 'POST', body: { email: 'x@example.test', password: 'invalid' }, origin: false });
assert.equal(absentOrigin.status, 403, 'writes without Origin must be rejected');
const foreignOrigin = await call('/api/auth/login', { method: 'POST', body: { email: 'x@example.test', password: 'invalid' }, headers: { Origin: 'https://attacker.example' } });
assert.equal(foreignOrigin.status, 403, 'cross-origin writes must be rejected');
const hugePayload = JSON.stringify({ email: 'x@example.test', password: 'p'.repeat(20_000) });
const oversized = await call('/api/auth/login', { method: 'POST', streamBody: hugePayload });
assert.equal(oversized.status, 413, 'body size must be checked from streamed bytes');

const emptyGuestCart = await call('/api/cart', { jar: new Map() });
assert.equal(emptyGuestCart.status, 200);
assert.equal(emptyGuestCart.data.user.accountType, 'guest');
assert.deepEqual(emptyGuestCart.data.items, []);
assert.ok(!emptyGuestCart.jar.has('__Host-bikestore_guest'), 'GET without a guest cookie must not create one');

let cart = await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 4, variant: 'M' } });
assert.equal(cart.status, 200);
assert.equal(cart.data.user.accountType, 'guest');
assert.ok(cookies.has('__Host-bikestore_guest'), 'a valid first add must create the persistent guest cart');
cart = await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 2, variant: 'L' } });
assert.equal(cart.status, 200);
assert.equal(sumItems(cart.data.items), 6);
const otherVariantOver = await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1, variant: 'XL' } });
assert.equal(otherVariantOver.status, 409, 'POST must sum quantities across variants');
const putOver = await call('/api/cart/items', { method: 'PUT', body: { productId: product.id, quantity: 3, variant: 'L' } });
assert.equal(putOver.status, 409, 'PUT must sum quantities across variants');
const removeLine = await call(`/api/cart/items?productId=${encodeURIComponent(product.id)}&variant=M`, { method: 'DELETE' });
assert.equal(removeLine.status, 200);
assert.equal(sumItems(removeLine.data.items), 2);
await call('/api/cart', { method: 'DELETE' });

// Registration must merge both variants from the guest cart into the new account.
await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 2, variant: 'M' } });
await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 2, variant: 'L' } });
const email = process.env.BIKESTORE_TEST_CUSTOMER_EMAIL || `smoke-${randomUUID()}@example.test`;
let password = process.env.BIKESTORE_TEST_CUSTOMER_PASSWORD || `${randomBytes(32).toString('base64url')}Q7!`;
const registration = await call('/api/auth/register', { method: 'POST', body: { name: 'Prueba API', email, password } });
assert.equal(registration.status, 201);
assert.equal(registration.data.user.role, 'customer');
assert.ok(cookies.has('__Host-bikestore_session'));
const accountSession = await call('/api/auth/session');
assert.equal(accountSession.data.user.email, email);
assert.equal(accountSession.data.user.role, 'customer');
const persistedLoginJar = new Map();
const persistedLogin = await call('/api/auth/login', {
  method: 'POST', body: { email, password }, jar: persistedLoginJar
});
assert.equal(persistedLogin.status, 200, 'new account credentials must authenticate after registration has returned');
assert.equal((await call('/api/auth/session', { jar: persistedLoginJar })).data.user.email, email,
  'login must retrieve the registered user and password hash from persistent D1 data');
cart = await call('/api/cart');
assert.equal(cart.data.user.email, email);
assert.equal(sumItems(cart.data.items), 4);
assert.deepEqual(new Set(cart.data.items.map((item) => item.variant)), new Set(['M', 'L']));
const deniedAdmin = await call('/api/admin/products');
assert.equal(deniedAdmin.status, 403);

// Use a separate seeded account so reset tests cannot mutate the customer credentials used by admin-smoke.
const resetEmail = process.env.BIKESTORE_TEST_RESET_EMAIL;
let resetPassword = process.env.BIKESTORE_TEST_RESET_PASSWORD;
assert.ok(resetEmail && resetPassword, 'the runner must seed a separate reset-test account');
const resetCookies = new Map();
const resetLogin = await call('/api/auth/login', { method: 'POST', body: { email: resetEmail, password: resetPassword }, jar: resetCookies });
assert.equal(resetLogin.status, 200);
let resetCart = await call('/api/cart', { jar: resetCookies });
assert.equal(resetCart.data.user.email, resetEmail);
await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1, variant: 'M' }, jar: resetCookies });

// Unknown and known accounts receive the same response; only the local Resend stub captures email.
const mailCountBefore = (await capturedResetEmails()).length;
const unknownReset = await call('/api/auth/password-reset/request', {
  method: 'POST', body: { email: `missing-${randomUUID()}@example.test` }, jar: new Map()
});
assert.equal(unknownReset.status, 202);
assert.equal((await capturedResetEmails()).length, mailCountBefore, 'unknown account must not trigger an email');
const resetRequest = await call('/api/auth/password-reset/request', { method: 'POST', body: { email: resetEmail }, jar: new Map() });
assert.equal(resetRequest.status, 202);
assert.equal(resetRequest.data.message, unknownReset.data.message, 'reset responses must not reveal whether an account exists');
let resetEmails = await capturedResetEmails();
assert.equal(resetEmails.length, mailCountBefore + 1);
assert.deepEqual(resetEmails.at(-1).to, [resetEmail]);
assert.equal(resetEmails.at(-1).from, 'BikeStore <noreply@example.test>');
const resetToken = resetTokenFromEmail(resetEmails.at(-1));
assert.ok(!JSON.stringify(resetRequest.data).includes(resetToken), 'API response must never expose the reset token');
const staleSession = new Map(resetCookies);
const replacementPassword = `${randomBytes(32).toString('base64url')}R8!`;
const resetComplete = await call('/api/auth/password-reset/complete', {
  method: 'POST', body: { token: resetToken, password: replacementPassword }, jar: resetCookies
});
assert.equal(resetComplete.status, 200);
assert.ok(!resetCookies.has('__Host-bikestore_session'), 'successful reset must clear the current session cookie');
const staleSessionCheck = await call('/api/auth/session', { jar: staleSession });
assert.equal(staleSessionCheck.data.user, null, 'successful reset must revoke all existing sessions');
const replay = await call('/api/auth/password-reset/complete', {
  method: 'POST', body: { token: resetToken, password: `${randomBytes(32).toString('base64url')}X3!` }, jar: new Map()
});
assert.equal(replay.status, 400, 'a reset token must be single-use');
const oldPasswordLogin = await call('/api/auth/login', { method: 'POST', body: { email: resetEmail, password: resetPassword }, jar: new Map() });
assert.equal(oldPasswordLogin.status, 401, 'reset must replace the old password hash');
const newPasswordLogin = await call('/api/auth/login', { method: 'POST', body: { email: resetEmail, password: replacementPassword }, jar: resetCookies });
assert.equal(newPasswordLogin.status, 200, 'reset must persist the new PBKDF2 hash');
resetPassword = replacementPassword;
resetCart = await call('/api/cart', { jar: resetCookies });
assert.equal(resetCart.data.user.email, resetEmail);
assert.equal(sumItems(resetCart.data.items), 1, 'password reset must preserve the account cart');

// Two simultaneous completions may redeem the same token only once.
const secondResetRequest = await call('/api/auth/password-reset/request', { method: 'POST', body: { email: resetEmail }, jar: new Map() });
assert.equal(secondResetRequest.status, 202);
resetEmails = await capturedResetEmails();
const concurrentToken = resetTokenFromEmail(resetEmails.at(-1));
const concurrentPasswords = [`${randomBytes(32).toString('base64url')}A5!`, `${randomBytes(32).toString('base64url')}B6!`];
const [completionA, completionB] = await Promise.all(concurrentPasswords.map((newPassword) => call('/api/auth/password-reset/complete', {
  method: 'POST', body: { token: concurrentToken, password: newPassword }, jar: new Map()
})));
assert.deepEqual([completionA.status, completionB.status].sort((a, b) => a - b), [200, 400], 'only one concurrent request may consume a reset token');
const winningIndex = completionA.status === 200 ? 0 : 1;
const losingIndex = 1 - winningIndex;
const concurrentStaleSession = new Map(resetCookies);
const concurrentSessionCheck = await call('/api/auth/session', { jar: concurrentStaleSession });
assert.equal(concurrentSessionCheck.data.user, null, 'concurrent reset must revoke existing sessions');
const winnerLogin = await call('/api/auth/login', { method: 'POST', body: { email: resetEmail, password: concurrentPasswords[winningIndex] }, jar: new Map() });
assert.equal(winnerLogin.status, 200);
const loserLogin = await call('/api/auth/login', { method: 'POST', body: { email: resetEmail, password: concurrentPasswords[losingIndex] }, jar: new Map() });
assert.equal(loserLogin.status, 401);
resetPassword = concurrentPasswords[winningIndex];
const replayConcurrent = await call('/api/auth/password-reset/complete', {
  method: 'POST', body: { token: concurrentToken, password: `${randomBytes(32).toString('base64url')}C7!` }, jar: new Map()
});
assert.equal(replayConcurrent.status, 400);
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const withinResetQuota = await call('/api/auth/password-reset/request', { method: 'POST', body: { email: resetEmail }, jar: new Map() });
  assert.equal(withinResetQuota.status, 202, 'reset requests must remain under the per-email/IP quota');
}
const overResetQuota = await call('/api/auth/password-reset/request', { method: 'POST', body: { email: resetEmail }, jar: new Map() });
assert.equal(overResetQuota.status, 429, 'reset request quota must bound attempts for one IP/email pair');

for (let attempt = 1; attempt <= 6; attempt += 1) {
  const duplicateCustomer = await call('/api/auth/register', { method: 'POST', body: { name: `Duplicado ${attempt}`, email, password } });
  assert.equal(duplicateCustomer.status, 409, 'duplicate registration must stay in the registration quota');
}
for (let attempt = 1; attempt <= 6; attempt += 1) {
  const reservedAdmin = await call('/api/auth/register', { method: 'POST', body: { name: `Intento admin ${attempt}`, email: 'jjcorreagetial16@gmail.com', password } });
  assert.equal(reservedAdmin.status, 409, 'reserved admin registration must not consume login-failure quota');
}
for (let attempt = 1; attempt <= 18; attempt += 1) {
  const invalidRegistration = await call('/api/auth/register', { method: 'POST', body: { name: '', email: `invalid-${attempt}@example.test`, password } });
  assert.equal(invalidRegistration.status, attempt <= 17 ? 400 : 429, 'registration IP quota should bound invalid attempts independently');
}

for (let attempt = 1; attempt <= 35; attempt += 1) {
  const successfulLogin = await call('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(successfulLogin.status, 200, 'successful logins must not consume login-failure quota');
}

// Refill a guest cart and issue concurrent logins with the same guest cookie.
await call('/api/auth/logout', { method: 'POST' });
assert.equal((await call('/api/auth/session')).data.user, null, 'logout must revoke the account session');
const emptyAfterLogout = await call('/api/cart');
assert.deepEqual(emptyAfterLogout.data.items, []);
assert.ok(!cookies.has('__Host-bikestore_guest'), 'a GET after logout must not recreate a guest row or cookie');
await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 2, variant: 'M' } });
await call('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 2, variant: 'L' } });
const guestSnapshot = new Map(cookies);
const loginJarA = new Map(guestSnapshot);
const loginJarB = new Map(guestSnapshot);
const [loginA, loginB] = await Promise.all([
  call('/api/auth/login', { method: 'POST', body: { email, password }, jar: loginJarA }),
  call('/api/auth/login', { method: 'POST', body: { email, password }, jar: loginJarB })
]);
assert.equal(loginA.status, 200);
assert.equal(loginB.status, 200);
cookies.clear();
for (const [key, value] of loginJarA) cookies.set(key, value);
cart = await call('/api/cart');
assert.equal(cart.data.user.email, email);
assert.ok(sumItems(cart.data.items) <= product.stock, 'concurrent guest/account merge must not overstock across variants');
assert.equal(sumItems(cart.data.items), product.stock, 'merge should preserve only available units');

for (let attempt = 1; attempt <= 10; attempt += 1) {
  const failed = await call('/api/auth/login', { method: 'POST', body: { email, password: randomBytes(24).toString('base64url') }, headers: { 'CF-Connecting-IP': failedLoginIp } });
  assert.equal(failed.status, 401, `failed attempt ${attempt} must be allowed up to the pair threshold`);
}
const limited = await call('/api/auth/login', { method: 'POST', body: { email, password }, headers: { 'CF-Connecting-IP': failedLoginIp } });
assert.equal(limited.status, 429, 'D1 must throttle the exhausted IP/email pair without penalizing other IPs');
const otherIpLogin = await call('/api/auth/login', { method: 'POST', body: { email, password }, headers: { 'CF-Connecting-IP': '198.51.100.45' } });
assert.equal(otherIpLogin.status, 200, 'failure threshold for one IP/email pair must not lock the account globally');

console.log('PASS API: origin/body bytes, M/L stock, merge, reset anti-enumeration/Resend, one-use tokens, PBKDF2 replacement, session revocation and races, separate auth quotas');
