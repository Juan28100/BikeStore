import assert from 'node:assert/strict';
import { resolveResendEndpoint, sendPasswordResetEmail } from '../src/resend-mailer.mjs';

const resetUrl = 'https://noma-estudio-demo.torch-ringer.workers.dev/#password-reset=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
let capturedUrl = '';
let capturedInit = null;
const delivered = await sendPasswordResetEmail({
  apiKey: 'local-test-key',
  fromEmail: 'noreply@example.test',
  to: 'customer@example.test',
  resetUrl,
  fetchImpl: async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response('{"id":"local-test-id"}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
});
assert.equal(delivered, true);
assert.equal(capturedUrl, 'https://api.resend.com/emails');
assert.equal(capturedInit.method, 'POST');
assert.equal(capturedInit.headers.Authorization, 'Bearer local-test-key');
const payload = JSON.parse(capturedInit.body);
assert.equal(payload.from, 'BikeStore <noreply@example.test>');
assert.deepEqual(payload.to, ['customer@example.test']);
assert.match(payload.html, /#password-reset=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/);
assert.match(payload.text, /#password-reset=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/);
assert.equal(resolveResendEndpoint({ testMode: true, testEndpoint: 'http://127.0.0.1:43123/emails' }), 'http://127.0.0.1:43123/emails');
assert.equal(resolveResendEndpoint({ testMode: true, testEndpoint: 'https://attacker.example/collect' }), 'https://api.resend.com/emails');
assert.equal(resolveResendEndpoint({ testMode: false, testEndpoint: 'http://127.0.0.1:43123/emails' }), 'https://api.resend.com/emails');
await assert.rejects(() => sendPasswordResetEmail({
  apiKey: '', fromEmail: 'noreply@example.test', to: 'customer@example.test', resetUrl,
  fetchImpl: async () => new Response('', { status: 500 })
}), /resend_not_configured/);
console.log('PASS Resend client: send-only payload, fixed production endpoint, loopback-only test override');
