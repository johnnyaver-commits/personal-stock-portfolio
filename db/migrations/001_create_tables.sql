CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Taipei',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE holdings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity NUMERIC(20, 6) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(20, 6) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE transaction_records (
  id BIGSERIAL PRIMARY KEY,
  holding_id BIGINT REFERENCES holdings(id) ON DELETE SET NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL,
  type VARCHAR(8) NOT NULL CHECK (type IN ('buy', 'sell')),
  trade_date DATE NOT NULL,
  price NUMERIC(20, 6) NOT NULL,
  quantity NUMERIC(20, 6) NOT NULL,
  fee NUMERIC(20, 6) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quote_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  price NUMERIC(20, 6) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  quoted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_user_id ON holdings(user_id);
CREATE INDEX idx_transactions_user_symbol_date ON transaction_records(user_id, symbol, trade_date DESC);
CREATE INDEX idx_quote_snapshots_symbol_time ON quote_snapshots(symbol, quoted_at DESC);
