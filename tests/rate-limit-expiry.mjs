import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const email = process.env.BIKESTORE_TEST_CUSTOMER_EMAIL;
const password = process.env.BIKESTORE_TEST_CUSTOMER_PASSWORD;
const failedIp = process.env.BIKESTORE_TEST_FAILED_LOGIN_IP;
const stateDir = process.env.BIKESTORE_TEST_STATE_DIR;
assert.ok(email && password && failedIp && stateDir, 'El runner debe proporcionar credenciales, IP y estado D1 local.');
const digest = (value) => createHash('sha256').update(value).digest('base64url');
const ipKey = digest(`auth:login-failed:ip:${failedIp}`);
const pairKey = digest(`auth:login-failed:pair:${failedIp}\u0000${email.trim().toLowerCase()}`);
const headers = { Origin: base, 'Content-Type': 'application/json', Accept: 'application/json', 'CF-Connecting-IP': failedIp };
async function login(secret) {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email, password: secret }) });
  return response.status;
}
function findRows(value) {
  if (Array.isArray(value)) {
    if (value.some((row) => row && typeof row === 'object' && Object.hasOwn(row, 'key_hash'))) {
      return value.filter((row) => row && typeof row === 'object' && Object.hasOwn(row, 'key_hash'));
    }
    for (const child of value) {
      const rows = findRows(child);
      if (rows.length) return rows;
    }
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) {
      const rows = findRows(child);
      if (rows.length) return rows;
    }
  }
  return [];
}

assert.equal(await login(`${password}-incorrecta`), 401, 'a failure bucket from the previous fixed window must expire');
const sql = `SELECT key_hash, window_start, attempts FROM auth_rate_limits WHERE key_hash IN ('${ipKey}', '${pairKey}')`;
const output = execFileSync('npx', ['wrangler', 'd1', 'execute', 'bikestore-store', '--local', '--persist-to', stateDir, '--command', sql, '--json'], { encoding: 'utf8' });
const rows = findRows(JSON.parse(output));
assert.equal(rows.length, 2, 'the Worker must query and update the exact two seeded base64url keys, not create alternate keys');
const byKey = new Map(rows.map((row) => [row.key_hash, row]));
for (const key of [ipKey, pairKey]) {
  const row = byKey.get(key);
  assert.ok(row, 'the seeded key must still exist after the Worker request');
  assert.equal(Number(row.attempts), 1, 'the expired bucket must reset to the single real failed login');
  assert.ok(Number(row.window_start) >= Math.floor(Date.now() / 1000 / 600) * 600 - 600,
    'the exact seeded row must move into the active fixed window');
}
assert.equal(await login(password), 200, 'a successful login after expiry must remain available');
console.log('PASS auth expiry: base64url seed keys were reset by the Worker; the exact D1 rows were updated and success stayed uncounted');
