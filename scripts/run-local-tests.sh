#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
STATE_DIR="$PWD/.wrangler/test-state"
LOG_FILE="${TMPDIR:-/tmp}/bikestore-wrangler-test-$$.log"
DRYRUN_LOG="${TMPDIR:-/tmp}/bikestore-wrangler-dryrun-$$.log"
MOCK_LOG_FILE="${TMPDIR:-/tmp}/bikestore-resend-mock-$$.log"
TEST_PORT="${BIKESTORE_TEST_PORT:-$((12000 + ($$ % 30000)))}"
MOCK_PORT="$((TEST_PORT + 1))"
FAILED_LOGIN_IP='198.51.100.44'
EXPIRY_LOGIN_IP='198.51.100.47'
SERVER_PID=''
MOCK_PID=''
hash_test_password() {
  BIKESTORE_TEST_PASSWORD="$1" BIKESTORE_TEST_ITERATIONS="${2:-100000}" node --input-type=module -e '
import { pbkdf2Sync, randomBytes } from "node:crypto";
const password = process.env.BIKESTORE_TEST_PASSWORD;
const iterations = Number(process.env.BIKESTORE_TEST_ITERATIONS);
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const b64url = (value) => value.toString("base64url");
process.stdout.write(`pbkdf2-sha256$${iterations}$${b64url(salt)}$${b64url(hash)}\n`);
'
}
kill_tree() {
  local parent="$1" child
  while read -r child; do
    [[ -n "$child" ]] && kill_tree "$child"
  done < <(ps -o pid= --ppid "$parent" 2>/dev/null || true)
  kill -TERM "$parent" 2>/dev/null || true
}
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill_tree "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "$MOCK_PID" ]]; then
    kill_tree "$MOCK_PID"
    wait "$MOCK_PID" 2>/dev/null || true
  fi
  rm -rf "$STATE_DIR"
  rm -f "$LOG_FILE" "$DRYRUN_LOG" "$MOCK_LOG_FILE"
}
trap cleanup EXIT
cp app.js public/app.js
cp index.html public/index.html
cp styles.css public/styles.css
node --check tests/image-upload-worker-smoke.mjs
node tests/image-upload-worker-smoke.mjs
if command -v "${BIKESTORE_CHROMIUM_PATH:-/usr/bin/chromium}" >/dev/null 2>&1; then
  BIKESTORE_PRODUCT_FORM_VIEWPORT=desktop node tests/product-form-smoke.mjs
  BIKESTORE_PRODUCT_FORM_VIEWPORT=mobile node tests/product-form-smoke.mjs
  BIKESTORE_PRODUCT_FORM_VIEWPORT=mobile BIKESTORE_PRODUCT_FORM_UPLOAD_ENABLED=false node tests/product-form-smoke.mjs
  node tests/mobile-menu-smoke.mjs
  node tests/mobile-account-actions-smoke.mjs
  node tests/admin-product-delete-ui-smoke.mjs
  node tests/demo-header-smoke.mjs
else
  printf 'SKIP browser smoke tests: instala Chromium o define BIKESTORE_CHROMIUM_PATH.\n'
fi
rm -rf "$STATE_DIR"
mkdir -p "$STATE_DIR"

printf 'y\n' | npx wrangler d1 migrations apply bikestore-store --local --persist-to "$STATE_DIR" >/dev/null
TEST_ADMIN_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url') + 'K8!')")"
TEST_ADMIN_HASH="$(hash_test_password "$TEST_ADMIN_PASSWORD")"
SEED_SQL="INSERT INTO users (id, account_type, name, email, email_verified_at, role, password_hash) VALUES ('local-admin-smoke', 'account', 'Admin de prueba local', 'jjcorreagetial16@gmail.com', unixepoch(), 'admin', '$TEST_ADMIN_HASH') ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash, active=1"
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" --command "$SEED_SQL" --json >/dev/null
TEST_RUN_ID="$(node -e "process.stdout.write(require('node:crypto').randomUUID())")"
TEST_CUSTOMER_EMAIL="customer-${TEST_RUN_ID}@example.test"
TEST_CUSTOMER_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url') + 'M4!')")"
TEST_RESET_EMAIL="reset-${TEST_RUN_ID}@example.test"
TEST_RESET_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url') + 'R5!')")"
TEST_RESET_HASH="$(hash_test_password "$TEST_RESET_PASSWORD" 210000)"
SEED_RESET_SQL="INSERT INTO users (id, account_type, name, email, email_verified_at, role, password_hash) VALUES ('local-reset-${TEST_RUN_ID}', 'account', 'Cuenta local de recuperación', '$TEST_RESET_EMAIL', unixepoch(), 'customer', '$TEST_RESET_HASH')"
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" --command "$SEED_RESET_SQL" --json >/dev/null
MOCK_CONTROL_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"

BIKESTORE_TEST_RESEND_CONTROL_TOKEN="$MOCK_CONTROL_TOKEN" node tests/resend-mock.mjs "$MOCK_PORT" >"$MOCK_LOG_FILE" 2>&1 &
MOCK_PID=$!
mock_ready=0
for _ in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:$MOCK_PORT/health" >/dev/null 2>&1; then mock_ready=1; break; fi
  sleep 0.25
done
if [[ "$mock_ready" != 1 ]]; then
  cat "$MOCK_LOG_FILE" >&2
  echo 'El mock local de Resend no inició a tiempo.' >&2
  exit 1
fi

npx wrangler dev --ip 127.0.0.1 --port "$TEST_PORT" --local --persist-to "$STATE_DIR" --test-scheduled \
  --var 'BIKESTORE_TEST_MODE:true' --var 'RESEND_API_KEY:local-test-key' \
  --var 'RESEND_FROM_EMAIL:noreply@example.test' \
  --var "RESEND_TEST_ENDPOINT:http://127.0.0.1:$MOCK_PORT/emails" \
  --show-interactive-dev-session=false >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
ready=0
for _ in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:$TEST_PORT/api/health" >/dev/null 2>&1; then ready=1; break; fi
  sleep 0.25
done
if [[ "$ready" != 1 ]]; then
  cat "$LOG_FILE" >&2
  echo 'El Worker local no inició a tiempo.' >&2
  exit 1
fi

node --check app.js
node --check tests/api-smoke.mjs
node --check tests/admin-smoke.mjs
node --check tests/guest-lifecycle-smoke.mjs
node --check tests/rate-limit-expiry.mjs
node --check tests/password-reset-expiry-smoke.mjs
node --check tests/health-schema-smoke.mjs
node --check tests/resend-mailer-smoke.mjs
node --check tests/resend-mock.mjs
node --check tests/public-assets-allowlist.mjs
node --check tests/public-assets-safety.mjs
node --check tests/wrangler-assets-smoke.mjs
node --check tests/navigation-smoke.mjs
node --check tests/product-form-smoke.mjs
node --check tests/image-upload-worker-smoke.mjs
node --check tests/mobile-menu-smoke.mjs
node --check tests/mobile-account-actions-smoke.mjs
node --check tests/admin-product-delete-ui-smoke.mjs
node --check tests/demo-header-smoke.mjs
node --check src/resend-mailer.mjs
node --input-type=module --check < src/worker.js
node tests/resend-mailer-smoke.mjs
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" BIKESTORE_TEST_CUSTOMER_EMAIL="$TEST_CUSTOMER_EMAIL" BIKESTORE_TEST_CUSTOMER_PASSWORD="$TEST_CUSTOMER_PASSWORD" BIKESTORE_TEST_RESET_EMAIL="$TEST_RESET_EMAIL" BIKESTORE_TEST_RESET_PASSWORD="$TEST_RESET_PASSWORD" BIKESTORE_TEST_FAILED_LOGIN_IP="$FAILED_LOGIN_IP" BIKESTORE_TEST_RESEND_MOCK_URL="http://127.0.0.1:$MOCK_PORT" BIKESTORE_TEST_RESEND_CONTROL_TOKEN="$MOCK_CONTROL_TOKEN" node tests/api-smoke.mjs
BIKESTORE_TEST_LOCAL_ONLY=1 BIKESTORE_TEST_STATE_DIR="$STATE_DIR" BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" BIKESTORE_TEST_ADMIN_PASSWORD="$TEST_ADMIN_PASSWORD" BIKESTORE_TEST_CUSTOMER_EMAIL="$TEST_CUSTOMER_EMAIL" BIKESTORE_TEST_CUSTOMER_PASSWORD="$TEST_CUSTOMER_PASSWORD" BIKESTORE_TEST_RUN_ID="$TEST_RUN_ID" node tests/admin-smoke.mjs
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" BIKESTORE_TEST_STATE_DIR="$STATE_DIR" BIKESTORE_TEST_RUN_ID="$TEST_RUN_ID" node tests/guest-lifecycle-smoke.mjs
node tests/public-assets-safety.mjs
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" node tests/navigation-smoke.mjs

# Seed an expired, synthetic admin token to verify expiry without exposing or reusing any delivered token.
EXPIRED_RESET_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"
EXPIRED_RESET_HASH="$(node -e "process.stdout.write(require('node:crypto').createHash('sha256').update(process.argv[1]).digest('base64url'))" "$EXPIRED_RESET_TOKEN")"
RESET_SEED_SQL="INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) SELECT id, '$EXPIRED_RESET_HASH', unixepoch() - 1 FROM users WHERE email = 'jjcorreagetial16@gmail.com' ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash, expires_at=excluded.expires_at, consumed_at=NULL, consumed_by=NULL, created_at=unixepoch()"
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" --command "$RESET_SEED_SQL" --json >/dev/null
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" BIKESTORE_TEST_RESET_TOKEN="$EXPIRED_RESET_TOKEN" BIKESTORE_TEST_ADMIN_PASSWORD="$TEST_ADMIN_PASSWORD" node tests/password-reset-expiry-smoke.mjs

# Seed the previous 10-minute fixed window with base64url SHA-256 keys, matching the Worker encoding.
EXPIRED_RATE_SQL="$(BIKESTORE_TEST_CUSTOMER_EMAIL="$TEST_CUSTOMER_EMAIL" BIKESTORE_TEST_EXPIRY_IP="$EXPIRY_LOGIN_IP" node --input-type=module -e '
import { createHash } from "node:crypto";
const email = process.env.BIKESTORE_TEST_CUSTOMER_EMAIL.trim().toLowerCase();
const ip = process.env.BIKESTORE_TEST_EXPIRY_IP;
const hash = (value) => createHash("sha256").update(value).digest("base64url");
const ipKey = hash(`auth:login-failed:ip:${ip}`);
const pairKey = hash(`auth:login-failed:pair:${ip}\u0000${email}`);
const expiredStart = Math.floor(Date.now() / 1000 / 600) * 600 - 600;
process.stdout.write(`INSERT INTO auth_rate_limits (key_hash, window_start, attempts, updated_at) VALUES (\x27${ipKey}\x27, ${expiredStart}, 30, unixepoch()), (\x27${pairKey}\x27, ${expiredStart}, 10, unixepoch()) ON CONFLICT(key_hash) DO UPDATE SET window_start=excluded.window_start, attempts=excluded.attempts, updated_at=unixepoch()`);
')"
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" --command "$EXPIRED_RATE_SQL" --json >/dev/null
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" BIKESTORE_TEST_STATE_DIR="$STATE_DIR" BIKESTORE_TEST_CUSTOMER_EMAIL="$TEST_CUSTOMER_EMAIL" BIKESTORE_TEST_CUSTOMER_PASSWORD="$TEST_CUSTOMER_PASSWORD" BIKESTORE_TEST_FAILED_LOGIN_IP="$EXPIRY_LOGIN_IP" node tests/rate-limit-expiry.mjs

# Hide the reset-token table temporarily to verify health detects an incomplete auth schema.
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" \
  --command 'ALTER TABLE password_reset_tokens RENAME TO password_reset_tokens_health_test' --json >/dev/null
BIKESTORE_TEST_URL="http://127.0.0.1:$TEST_PORT" node tests/health-schema-smoke.mjs
npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" \
  --command 'ALTER TABLE password_reset_tokens_health_test RENAME TO password_reset_tokens' --json >/dev/null

CHECK_SQL="SELECT (SELECT count(*) FROM inventory_transactions WHERE idempotency_key='admin-patch:${TEST_RUN_ID}:stock-to-3') AS idempotent_moves, (SELECT count(*) FROM auth_rate_limits) AS rate_rows, (SELECT count(*) FROM password_reset_tokens) AS reset_rows, (SELECT count(*) FROM carts c JOIN users u ON u.id=c.user_id WHERE u.email='jjcorreagetial16@gmail.com') AS admin_carts, (SELECT CASE WHEN password_hash LIKE 'pbkdf2-sha256\$100000\$%' THEN 100000 ELSE 0 END FROM users WHERE email='${TEST_CUSTOMER_EMAIL}') AS customer_hash_iterations, (SELECT CASE WHEN password_hash LIKE 'pbkdf2-sha256\$100000\$%' THEN 100000 ELSE 0 END FROM users WHERE email='${TEST_RESET_EMAIL}') AS reset_hash_iterations"
CHECK_JSON="$(npx wrangler d1 execute bikestore-store --local --persist-to "$STATE_DIR" --command "$CHECK_SQL" --json)"
printf '%s' "$CHECK_JSON" | node --input-type=module -e '
import assert from "node:assert/strict";
let text = "";
for await (const chunk of process.stdin) text += chunk;
const data = JSON.parse(text);
const find = (value, key) => {
  if (Array.isArray(value)) { for (const item of value) { const result = find(item, key); if (result !== undefined) return result; } }
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, key)) return Number(value[key]);
    for (const child of Object.values(value)) { const result = find(child, key); if (result !== undefined) return result; }
  }
  return undefined;
};
assert.equal(find(data, "idempotent_moves"), 1, "replayed admin adjustment must create one inventory ledger row");
assert.ok(find(data, "rate_rows") <= 50_000, "D1 auth limiter table must stay bounded");
assert.ok(find(data, "reset_rows") <= 50_000, "password reset tokens must stay bounded by the account cap");
assert.equal(find(data, "admin_carts"), 0, "administrator must never receive a cart");
assert.equal(find(data, "customer_hash_iterations"), 100_000, "registration must generate production-compatible 100000-iteration hashes");
assert.equal(find(data, "reset_hash_iterations"), 100_000, "password reset must generate production-compatible 100000-iteration hashes after accepting a historical account");
console.log("PASS D1 invariants: idempotent ledger, bounded rate rows, no admin cart, register/reset PBKDF2 at 100000");
'

WRANGLER_LOG=debug npx wrangler deploy --dry-run >"$DRYRUN_LOG" 2>&1
node tests/wrangler-assets-smoke.mjs "$DRYRUN_LOG"
printf 'PASS full local suite; no remote D1 operation or deployment performed\n'
