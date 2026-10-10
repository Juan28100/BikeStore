import assert from 'node:assert/strict';

const base = process.env.BIKESTORE_TEST_URL || 'http://127.0.0.1:8787';
const response = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' } });
const data = await response.json();

assert.equal(response.status, 503, 'health must reject an incomplete auth schema');
assert.equal(data.database, 'connected', 'the health response should still report that D1 is reachable');
assert.equal(data.authSchema, 'incomplete', 'a missing password_reset_tokens table must be reported');

console.log('PASS health schema: missing password_reset_tokens reports 503/authSchema incomplete');
