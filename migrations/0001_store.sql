PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('account', 'guest')),
  name TEXT NOT NULL,
  email TEXT COLLATE NOCASE,
  email_verified_at INTEGER,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  password_hash TEXT,
  guest_token_hash TEXT UNIQUE,
  guest_expires_at INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (email IS NULL OR email = lower(email)),
  CHECK (
    (account_type = 'account' AND email IS NOT NULL AND password_hash IS NOT NULL
      AND guest_token_hash IS NULL AND guest_expires_at IS NULL)
    OR
    (account_type = 'guest' AND email IS NULL AND password_hash IS NULL
      AND guest_token_hash IS NOT NULL AND guest_expires_at IS NOT NULL AND role = 'customer')
  ),
  CHECK (role = 'customer' OR
    (role = 'admin' AND account_type = 'account'
      AND email = 'jjcorreagetial16@gmail.com' AND email_verified_at IS NOT NULL))
);
CREATE UNIQUE INDEX uq_account_email ON users(email COLLATE NOCASE)
  WHERE account_type = 'account';

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_sessions_user_expiry ON sessions(user_id, expires_at);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency_code TEXT NOT NULL DEFAULT 'COP' CHECK (currency_code = 'COP'),
  image_path TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  flag TEXT NOT NULL DEFAULT '',
  gear INTEGER NOT NULL DEFAULT 0 CHECK (gear IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_products_active_category ON products(is_active, category_id);
CREATE INDEX ix_products_active_price ON products(is_active, price_minor);

CREATE TABLE inventory_stock (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL CHECK (reason IN ('seed', 'restock', 'adjustment')),
  idempotency_key TEXT NOT NULL UNIQUE,
  applied INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX ix_inventory_product_time ON inventory_transactions(product_id, created_at DESC);

CREATE TABLE carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE cart_items (
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
  added_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (cart_id, product_id, variant)
);
CREATE INDEX ix_cart_items_product ON cart_items(product_id);

CREATE TRIGGER products_create_stock
AFTER INSERT ON products
BEGIN
  INSERT INTO inventory_stock(product_id, quantity) VALUES (NEW.id, 0);
END;

CREATE TRIGGER stock_insert_zero_only
BEFORE INSERT ON inventory_stock
WHEN NEW.quantity <> 0
BEGIN
  SELECT RAISE(ABORT, 'stock must start at zero; add a ledger transaction');
END;
CREATE TRIGGER stock_no_delete
BEFORE DELETE ON inventory_stock
BEGIN
  SELECT RAISE(ABORT, 'inventory stock rows cannot be deleted');
END;
CREATE TRIGGER stock_product_immutable
BEFORE UPDATE OF product_id ON inventory_stock
BEGIN
  SELECT RAISE(ABORT, 'stock product_id is immutable');
END;
CREATE TRIGGER stock_update_via_ledger_only
BEFORE UPDATE OF quantity ON inventory_stock
WHEN NOT EXISTS (
  SELECT 1 FROM inventory_transactions t
  WHERE t.product_id = OLD.product_id AND t.applied = 0
    AND t.delta = NEW.quantity - OLD.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'update stock through inventory_transactions');
END;
CREATE TRIGGER inventory_tx_validate_applied
BEFORE INSERT ON inventory_transactions
WHEN NEW.applied <> 0
BEGIN
  SELECT RAISE(ABORT, 'inventory transaction must be unapplied on insert');
END;
CREATE TRIGGER inventory_tx_validate_product
BEFORE INSERT ON inventory_transactions
WHEN NOT EXISTS (SELECT 1 FROM inventory_stock WHERE product_id = NEW.product_id)
BEGIN
  SELECT RAISE(ABORT, 'inventory row missing');
END;
CREATE TRIGGER inventory_tx_validate_stock
BEFORE INSERT ON inventory_transactions
WHEN (SELECT quantity FROM inventory_stock WHERE product_id = NEW.product_id) + NEW.delta < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient_stock');
END;
CREATE TRIGGER inventory_tx_apply
AFTER INSERT ON inventory_transactions
BEGIN
  UPDATE inventory_stock
    SET quantity = quantity + NEW.delta, updated_at = unixepoch()
    WHERE product_id = NEW.product_id;
  UPDATE inventory_transactions SET applied = 1 WHERE id = NEW.id;
END;
CREATE TRIGGER inventory_tx_immutable
BEFORE UPDATE ON inventory_transactions
WHEN NOT (
  OLD.applied = 0 AND NEW.applied = 1
  AND NEW.id = OLD.id AND NEW.product_id = OLD.product_id
  AND NEW.delta = OLD.delta AND NEW.reason = OLD.reason
  AND NEW.idempotency_key = OLD.idempotency_key
  AND NEW.created_at = OLD.created_at
)
BEGIN
  SELECT RAISE(ABORT, 'inventory ledger is immutable');
END;
CREATE TRIGGER inventory_tx_no_delete
BEFORE DELETE ON inventory_transactions
BEGIN
  SELECT RAISE(ABORT, 'inventory ledger is append-only');
END;

INSERT INTO categories (id, slug, name) VALUES
  ('cat-mountain', 'bicicletas-de-montana', 'Bicicletas de montaña'),
  ('cat-road', 'bicicletas-de-ruta', 'Bicicletas de ruta'),
  ('cat-electric', 'bicicletas-electricas', 'Bicicletas eléctricas'),
  ('cat-helmets', 'cascos-y-proteccion', 'Cascos y protección'),
  ('cat-apparel', 'ropa-de-ciclismo', 'Ropa de ciclismo'),
  ('cat-accessories', 'accesorios', 'Accesorios'),
  ('cat-components', 'componentes-y-repuestos', 'Componentes y repuestos');

INSERT INTO products
  (id, category_id, sku, slug, name, description, price_minor, currency_code, image_path, is_active, featured, flag, gear)
VALUES
  ('bike-scorpion-mtb', 'cat-mountain', 'BIKE-SCORPION-MTB', 'bike-scorpion-mtb', 'Scorpion MTB 29', 'Bicicleta todo terreno para descubrir nuevos senderos con control y confianza.', 899000, 'COP', '/assets/bikestore/bike-mountain.jpg', 1, 1, 'Montaña', 0),
  ('bike-r8-road', 'cat-road', 'BIKE-R8-ROAD', 'bike-r8-road', 'Bici Ruta R8-4720', 'Bicicleta de ruta con cuadro ligero para rodadas largas y ritmo constante.', 5999000, 'COP', '/assets/bikestore/bike-road.jpg', 1, 1, 'Ruta', 0),
  ('bike-e-trail', 'cat-electric', 'BIKE-E-TRAIL', 'bike-e-trail', 'E-Trail 29 Demo', 'Una bicicleta de muestra para explorar la categoría eléctrica; las especificaciones son ilustrativas.', 2849000, 'COP', '/assets/bikestore/bike-hero.jpg', 1, 0, 'Demo', 0),
  ('helmet-vector-trail', 'cat-helmets', 'HELMET-VECTOR-TRAIL', 'helmet-vector-trail', 'Casco Trail Vector MIPS', 'Casco liviano con ventilación amplia y ajuste cómodo para tus recorridos.', 429000, 'COP', '/assets/bikestore/helmets.jpg', 1, 1, 'Protección', 1),
  ('helmet-bmx-kids', 'cat-helmets', 'HELMET-BMX-KIDS', 'helmet-bmx-kids', 'Casco BMX para niño', 'Protección cómoda para competencias, práctica y paseos en familia.', 150000, 'COP', '/assets/bikestore/helmet-kids.jpg', 1, 0, 'Niño', 1),
  ('jersey-route-pro', 'cat-apparel', 'JERSEY-ROUTE-PRO', 'jersey-route-pro', 'Traje de ruta Pro', 'Conjunto de ciclismo de ajuste cómodo para entrenamientos y salidas de ruta.', 200000, 'COP', '/assets/bikestore/apparel-set.jpg', 1, 1, 'Ruta', 1),
  ('rear-light-led', 'cat-accessories', 'REAR-LIGHT-LED', 'rear-light-led', 'Luz roja trasera', 'Luz trasera de muestra para sumar visibilidad a tus recorridos.', 89000, 'COP', '/assets/bikestore/rear-light.jpg', 1, 0, 'Visibilidad', 1),
  ('road-kit-mini', 'cat-accessories', 'ROAD-KIT-MINI', 'road-kit-mini', 'Kit de ruta y taller', 'Accesorios básicos para llevar y resolver pequeños imprevistos en el camino.', 279000, 'COP', '/assets/bikestore/road-kit.jpg', 1, 0, 'Esencial', 1),
  ('transmission-12v', 'cat-components', 'TRANSMISSION-12V', 'transmission-12v', 'Componentes transmisión 12v', 'Componentes ilustrativos para actualización y mantenimiento de tu bicicleta.', 349000, 'COP', '/assets/bikestore/components.jpg', 1, 0, 'Taller', 1);

INSERT INTO inventory_transactions (id, product_id, delta, reason, idempotency_key) VALUES
  ('seed-bike-scorpion-mtb', 'bike-scorpion-mtb', 6, 'seed', 'seed-bike-scorpion-mtb'),
  ('seed-bike-r8-road', 'bike-r8-road', 4, 'seed', 'seed-bike-r8-road'),
  ('seed-bike-e-trail', 'bike-e-trail', 3, 'seed', 'seed-bike-e-trail'),
  ('seed-helmet-vector-trail', 'helmet-vector-trail', 12, 'seed', 'seed-helmet-vector-trail'),
  ('seed-helmet-bmx-kids', 'helmet-bmx-kids', 8, 'seed', 'seed-helmet-bmx-kids'),
  ('seed-jersey-route-pro', 'jersey-route-pro', 9, 'seed', 'seed-jersey-route-pro'),
  ('seed-rear-light-led', 'rear-light-led', 18, 'seed', 'seed-rear-light-led'),
  ('seed-road-kit-mini', 'road-kit-mini', 7, 'seed', 'seed-road-kit-mini'),
  ('seed-transmission-12v', 'transmission-12v', 5, 'seed', 'seed-transmission-12v');
