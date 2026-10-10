import assert from 'node:assert/strict';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const token = process.env.BIKESTORE_TEST_RESET_TOKEN || '';
const email = 'jjcorreagetial16@gmail.com';
const password = process.env.BIKESTORE_TEST_ADMIN_PASSWORD || '';
assert.match(token, /^[A-Za-z0-9_-]{43}$/);

const expired = await fetch(`${base}/api/auth/password-reset/complete`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: base,
    'CF-Connecting-IP': '198.51.100.49'
  },
  body: JSON.stringify({ token, password: `${password}Expired!` })
});
assert.equal(expired.status, 400, 'expired reset link must be rejected');
const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ email, password })
});
assert.equal(login.status, 200, 'expired reset link must not replace the current password');
console.log('PASS password reset expiry: expired token rejected without changing the account');
