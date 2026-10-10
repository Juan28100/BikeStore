CREATE TABLE auth_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_auth_rate_limits_window ON auth_rate_limits(window_start, updated_at);

CREATE TABLE admin_product_patch_requests (
  idempotency_key TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  payload_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
