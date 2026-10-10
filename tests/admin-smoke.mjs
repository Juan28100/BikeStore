import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const password = process.env.BIKESTORE_TEST_ADMIN_PASSWORD;
const customerEmail = process.env.BIKESTORE_TEST_CUSTOMER_EMAIL;
const customerPassword = process.env.BIKESTORE_TEST_CUSTOMER_PASSWORD;
const runId = process.env.BIKESTORE_TEST_RUN_ID || randomUUID();
assert.ok(password && customerEmail && customerPassword, 'El runner debe proporcionar credenciales locales efímeras.');
const adminCookies = new Map();
const customerCookies = new Map();
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
async function call(path, { method = 'GET', body, headers: extraHeaders = {}, jar = adminCookies } = {}) {
  const headers = new Headers({ Accept: 'application/json', ...extraHeaders });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) headers.set('Origin', base);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (jar.size) headers.set('Cookie', [...jar].map(([key, value]) => `${key}=${value}`).join('; '));
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  absorbCookies(response, jar);
  let data = {};
  try { data = await response.json(); } catch (_) {}
  return { status: response.status, data };
}
async function patchProduct(product, stock, key) {
  return call(`/api/admin/products/${encodeURIComponent(product.id)}`, {
    method: 'PATCH', body: { ...product, stock }, headers: { 'Idempotency-Key': key }
  });
}

const login = await call('/api/auth/login', { method: 'POST', body: { email: 'jjcorreagetial16@gmail.com', password } });
assert.equal(login.status, 200, 'admin login must remain available after reserved-email registrations');
const adminSession = await call('/api/auth/session');
assert.equal(adminSession.data.user.role, 'admin');
assert.equal((await call('/api/cart')).status, 403, 'administrator accounts must not obtain or create a cart');
assert.equal((await call('/api/cart/items', { method: 'POST', body: { productId: 'bike-scorpion-mtb', quantity: 1, variant: 'M' } })).status, 403);
assert.equal(adminCookies.has('__Host-bikestore_guest'), false, 'admin cart denial must not create guest identity');

const customerLogin = await call('/api/auth/login', {
  method: 'POST', body: { email: customerEmail, password: customerPassword }, jar: customerCookies,
  headers: { 'CF-Connecting-IP': '198.51.100.46' }
});
assert.equal(customerLogin.status, 200);
let customerCart = await call('/api/cart', { jar: customerCookies });
assert.equal(customerCart.status, 200);
assert.ok(sumItems(customerCart.data.items) >= 4, 'customer account cart must survive separate admin login');

const adminCatalog = await call('/api/admin/products');
assert.equal(adminCatalog.status, 200);
assert.ok(adminCatalog.data.products.length >= 9);
let bike = adminCatalog.data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.ok(bike);
const initialStock = bike.stock;
assert.ok(initialStock >= 6);

const idempotentKey = `${runId}:stock-to-3`;
const lowerStock = await patchProduct(bike, 3, idempotentKey);
assert.equal(lowerStock.status, 200);
assert.equal(lowerStock.data.product.stock, 3);
customerCart = await call('/api/cart', { jar: customerCookies });
assert.ok(sumItems(customerCart.data.items) <= 3, 'customer cart GET must normalize aggregate M/L stock after admin change');
const repeated = await patchProduct(bike, 3, idempotentKey);
assert.equal(repeated.status, 200, 'same idempotency key and payload is a successful retry');
const conflictingReplay = await patchProduct(bike, 2, idempotentKey);
assert.equal(conflictingReplay.status, 409, 'same key with a different payload must be rejected');

const [raceA, raceB] = await Promise.all([
  patchProduct(bike, 9, `${runId}:race-a`),
  patchProduct(bike, 9, `${runId}:race-b`)
]);
assert.equal(raceA.status, 200);
assert.equal(raceB.status, 200);
bike = (await call('/api/admin/products')).data.products.find((item) => item.id === bike.id);
assert.equal(bike.stock, 9, 'concurrent absolute adjustments must converge on target, not add stale deltas');

bike = (await call('/api/admin/products')).data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.equal((await patchProduct(bike, initialStock, `${runId}:stock-reset`)).status, 200);
bike = (await call('/api/admin/products')).data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.equal((await call('/api/cart', { method: 'DELETE', jar: customerCookies })).status, 200);
assert.equal((await call('/api/cart/items', { method: 'POST', body: { productId: bike.id, quantity: 4, variant: 'M' }, jar: customerCookies })).status, 200);
assert.equal((await call('/api/cart/items', { method: 'POST', body: { productId: bike.id, quantity: 2, variant: 'L' }, jar: customerCookies })).status, 200);
assert.equal((await call('/api/cart/items', { method: 'POST', body: { productId: bike.id, quantity: 1, variant: 'XL' }, jar: customerCookies })).status, 409);
assert.equal((await call('/api/cart/items', { method: 'PUT', body: { productId: bike.id, quantity: 3, variant: 'L' }, jar: customerCookies })).status, 409);
customerCart = await call('/api/cart', { jar: customerCookies });
assert.equal(sumItems(customerCart.data.items), 6);

bike = (await call('/api/admin/products')).data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.equal((await patchProduct(bike, 0, `${runId}:stock-zero`)).status, 200);
assert.equal((await call('/api/cart/items', { method: 'POST', body: { productId: bike.id, quantity: 1, variant: 'M' }, jar: customerCookies })).status, 409);
customerCart = await call('/api/cart', { jar: customerCookies });
assert.equal(customerCart.data.items.length, 0, 'customer cart must normalize every variant at zero stock');

bike = (await call('/api/admin/products')).data.products.find((item) => item.id === 'bike-scorpion-mtb');
assert.equal((await patchProduct(bike, initialStock, `${runId}:stock-restore`)).status, 200);
const newProductId = `smoke-${runId.slice(0, 24)}`;
const created = await call('/api/admin/products', { method: 'POST', body: {
  id: newProductId, name: 'Producto temporal', category: 'Accesorios', price: 99000,
  stock: 2, image: '/assets/bikestore/road-kit.jpg', description: 'Producto de prueba local.', active: true
} });
assert.equal(created.status, 201);
assert.equal((await call(`/api/admin/products/${encodeURIComponent(newProductId)}`, { method: 'DELETE' })).status, 200);
const publicCatalog = await call('/api/products');
assert.ok(!publicCatalog.data.products.some((item) => item.id === newProductId));

console.log(`PASS admin-only: no admin cart, customer cart persistence, aggregate stock, idempotent PATCH ${idempotentKey}, concurrent adjustments, create/delete`);
