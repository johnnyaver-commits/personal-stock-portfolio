import seed from "@/db/seeds/seed_data.json";
import { applyTransactionToHolding, calculateHoldingMetrics, roundMoney } from "@/lib/calculations";
import { getSql, hasDatabaseUrl } from "@/lib/db";
import { currencyForSymbol, fetchYahooQuote, fetchYahooQuotes } from "@/lib/yahooFinance";

export const DEFAULT_OWNERS = [
  { id: 1, name: "Johnny", sort_order: 1 },
  { id: 2, name: "Teresa", sort_order: 2 },
  { id: 3, name: "侑珊", sort_order: 3 },
  { id: 4, name: "采蓉", sort_order: 4 },
  { id: 5, name: "宥錡", sort_order: 5 }
];

let memoryHoldings = seed.holdings.map((holding, index) => ({
  id: index + 1,
  owner_id: 1,
  owner_name: "Johnny",
  ...holding,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

let memoryTransactions = seed.transactions.map((transaction, index) => ({
  id: index + 1,
  owner_id: 1,
  owner_name: "Johnny",
  ...transaction,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

let schemaReady = false;

function ownerNameForId(ownerId) {
  return DEFAULT_OWNERS.find((owner) => owner.id === Number(ownerId))?.name ?? "Johnny";
}

function normalizeOwnerId(ownerId) {
  const numericOwnerId = Number(ownerId ?? 1);
  return DEFAULT_OWNERS.some((owner) => owner.id === numericOwnerId) ? numericOwnerId : 1;
}

function toHolding(row) {
  return {
    ...row,
    id: Number(row.id),
    owner_id: normalizeOwnerId(row.owner_id),
    owner_name: row.owner_name ?? ownerNameForId(row.owner_id),
    quantity: Number(row.quantity),
    avg_cost: Number(row.avg_cost),
    current_price: Number(row.current_price ?? row.avg_cost)
  };
}

function toTransaction(row) {
  return {
    ...row,
    id: Number(row.id),
    owner_id: normalizeOwnerId(row.owner_id),
    owner_name: row.owner_name ?? ownerNameForId(row.owner_id),
    holding_id: row.holding_id == null ? null : Number(row.holding_id),
    price: Number(row.price),
    quantity: Number(row.quantity),
    fee: Number(row.fee),
    realized_pnl: Number(row.realized_pnl ?? 0)
  };
}

async function findHoldingRow(id) {
  const rows = await getSql()`
    SELECT h.*, o.name AS owner_name
    FROM portfolio_holdings h
    LEFT JOIN portfolio_owners o ON o.id = h.owner_id
    WHERE h.id = ${Number(id)}
  `;
  return rows[0] ? toHolding(rows[0]) : null;
}

async function ensureSchema() {
  if (!hasDatabaseUrl() || schemaReady) return;

  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_owners (
      id BIGINT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  for (const owner of DEFAULT_OWNERS) {
    await sql`
      INSERT INTO portfolio_owners (id, name, sort_order)
      VALUES (${owner.id}, ${owner.name}, ${owner.sort_order})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    `;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL DEFAULT 1,
      symbol VARCHAR(32) NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity NUMERIC(20, 6) NOT NULL DEFAULT 0,
      avg_cost NUMERIC(20, 6) NOT NULL DEFAULT 0,
      current_price NUMERIC(20, 6) NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (owner_id, symbol)
    )
  `;
  await sql`ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS owner_id BIGINT`;
  await sql`UPDATE portfolio_holdings SET owner_id = 1 WHERE owner_id IS NULL`;
  await sql`ALTER TABLE portfolio_holdings ALTER COLUMN owner_id SET DEFAULT 1`;
  await sql`ALTER TABLE portfolio_holdings ALTER COLUMN owner_id SET NOT NULL`;
  await sql`ALTER TABLE portfolio_holdings DROP CONSTRAINT IF EXISTS portfolio_holdings_symbol_key`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS portfolio_holdings_owner_symbol_idx ON portfolio_holdings (owner_id, symbol)`;

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL DEFAULT 1,
      holding_id BIGINT REFERENCES portfolio_holdings(id) ON DELETE SET NULL,
      symbol VARCHAR(32) NOT NULL,
      type VARCHAR(8) NOT NULL CHECK (type IN ('buy', 'sell')),
      trade_date DATE NOT NULL,
      price NUMERIC(20, 6) NOT NULL,
      quantity NUMERIC(20, 6) NOT NULL,
      fee NUMERIC(20, 6) NOT NULL DEFAULT 0,
      realized_pnl NUMERIC(20, 6) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE portfolio_transactions ADD COLUMN IF NOT EXISTS owner_id BIGINT`;
  await sql`
    UPDATE portfolio_transactions t
    SET owner_id = COALESCE(h.owner_id, 1)
    FROM portfolio_holdings h
    WHERE t.holding_id = h.id AND t.owner_id IS NULL
  `;
  await sql`UPDATE portfolio_transactions SET owner_id = 1 WHERE owner_id IS NULL`;
  await sql`ALTER TABLE portfolio_transactions ALTER COLUMN owner_id SET DEFAULT 1`;
  await sql`ALTER TABLE portfolio_transactions ALTER COLUMN owner_id SET NOT NULL`;

  const seeded = await sql`SELECT value FROM portfolio_app_meta WHERE key = 'seeded'`;
  if (!seeded.length) {
    for (const holding of seed.holdings) {
      await sql`
        INSERT INTO portfolio_holdings (owner_id, symbol, name, quantity, avg_cost, current_price, currency)
        VALUES (
          1,
          ${holding.symbol},
          ${holding.name},
          ${holding.quantity},
          ${holding.avg_cost},
          ${holding.current_price ?? holding.avg_cost},
          ${holding.currency ?? currencyForSymbol(holding.symbol)}
        )
        ON CONFLICT (owner_id, symbol) DO NOTHING
      `;
    }
    await sql`
      INSERT INTO portfolio_app_meta (key, value)
      VALUES ('seeded', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  schemaReady = true;
}

export async function listOwners() {
  if (!hasDatabaseUrl()) return DEFAULT_OWNERS;

  await ensureSchema();
  const rows = await getSql()`SELECT id, name, sort_order FROM portfolio_owners ORDER BY sort_order, id`;
  return rows.map((owner) => ({
    id: Number(owner.id),
    name: owner.name,
    sort_order: Number(owner.sort_order)
  }));
}

async function listBaseHoldings() {
  if (!hasDatabaseUrl()) return memoryHoldings.map(toHolding);

  await ensureSchema();
  const rows = await getSql()`
    SELECT h.*, o.name AS owner_name
    FROM portfolio_holdings h
    LEFT JOIN portfolio_owners o ON o.id = h.owner_id
    ORDER BY o.sort_order, h.symbol
  `;
  return rows.map(toHolding);
}

export async function listQuotes(symbols) {
  const baseHoldings = await listBaseHoldings();
  const fallbackMap = new Map(baseHoldings.map((holding) => [holding.symbol, Number(holding.current_price ?? holding.avg_cost)]));
  return fetchYahooQuotes(symbols, fallbackMap);
}

export async function listHoldings() {
  const baseHoldings = await listBaseHoldings();
  const quotes = await fetchYahooQuotes(
    baseHoldings.map((holding) => holding.symbol),
    new Map(baseHoldings.map((holding) => [holding.symbol, Number(holding.current_price ?? holding.avg_cost)]))
  );
  return baseHoldings.map((holding) => calculateHoldingMetrics(holding, quotes[holding.symbol]));
}

export async function getHolding(id) {
  const holdings = await listHoldings();
  return holdings.find((holding) => holding.id === Number(id));
}

export async function createHolding(data) {
  const symbol = String(data.symbol ?? "").trim().toUpperCase();
  const ownerId = normalizeOwnerId(data.owner_id);
  const holdingData = {
    owner_id: ownerId,
    symbol,
    name: String(data.name ?? symbol).trim(),
    quantity: Number(data.quantity ?? 0),
    avg_cost: Number(data.avg_cost ?? 0),
    current_price: Number(data.current_price ?? data.avg_cost ?? 0),
    currency: String(data.currency ?? currencyForSymbol(symbol, data.market)).toUpperCase()
  };

  if (!hasDatabaseUrl()) {
    const existing = memoryHoldings.find((holding) => holding.owner_id === ownerId && holding.symbol === symbol);
    const now = new Date().toISOString();

    if (existing) {
      Object.assign(existing, holdingData, {
        owner_name: ownerNameForId(ownerId),
        updated_at: now
      });
      return calculateHoldingMetrics(existing, await fetchYahooQuote(existing.symbol, existing.current_price));
    }

    const holding = {
      id: memoryHoldings.length ? Math.max(...memoryHoldings.map((item) => item.id)) + 1 : 1,
      ...holdingData,
      owner_name: ownerNameForId(ownerId),
      created_at: now,
      updated_at: now
    };
    memoryHoldings.push(holding);
    return calculateHoldingMetrics(holding, await fetchYahooQuote(holding.symbol, holding.current_price));
  }

  await ensureSchema();
  const [row] = await getSql()`
    INSERT INTO portfolio_holdings (owner_id, symbol, name, quantity, avg_cost, current_price, currency)
    VALUES (${holdingData.owner_id}, ${holdingData.symbol}, ${holdingData.name}, ${holdingData.quantity}, ${holdingData.avg_cost}, ${holdingData.current_price}, ${holdingData.currency})
    ON CONFLICT (owner_id, symbol) DO UPDATE SET
      name = EXCLUDED.name,
      quantity = EXCLUDED.quantity,
      avg_cost = EXCLUDED.avg_cost,
      current_price = EXCLUDED.current_price,
      currency = EXCLUDED.currency,
      updated_at = NOW()
    RETURNING id
  `;
  const holding = await findHoldingRow(row.id);
  return calculateHoldingMetrics(holding, await fetchYahooQuote(holding.symbol, Number(holding.current_price)));
}

export async function updateHolding(id, data) {
  if (!hasDatabaseUrl()) {
    const index = memoryHoldings.findIndex((holding) => holding.id === Number(id));
    if (index === -1) return null;
    const ownerId = normalizeOwnerId(data.owner_id ?? memoryHoldings[index].owner_id);
    memoryHoldings[index] = {
      ...memoryHoldings[index],
      ...data,
      id: memoryHoldings[index].id,
      owner_id: ownerId,
      owner_name: ownerNameForId(ownerId),
      quantity: Number(data.quantity ?? memoryHoldings[index].quantity),
      avg_cost: Number(data.avg_cost ?? memoryHoldings[index].avg_cost),
      updated_at: new Date().toISOString()
    };
    return calculateHoldingMetrics(memoryHoldings[index], await fetchYahooQuote(memoryHoldings[index].symbol, memoryHoldings[index].current_price));
  }

  await ensureSchema();
  const existing = await findHoldingRow(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, owner_id: normalizeOwnerId(data.owner_id ?? existing.owner_id) };
  const [row] = await getSql()`
    UPDATE portfolio_holdings
    SET
      owner_id = ${merged.owner_id},
      symbol = ${String(merged.symbol).toUpperCase()},
      name = ${merged.name},
      quantity = ${Number(merged.quantity)},
      avg_cost = ${Number(merged.avg_cost)},
      current_price = ${Number(merged.current_price ?? merged.avg_cost)},
      currency = ${merged.currency ?? currencyForSymbol(merged.symbol)},
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING id
  `;
  const holding = await findHoldingRow(row.id);
  return calculateHoldingMetrics(holding, await fetchYahooQuote(holding.symbol, Number(holding.current_price)));
}

export async function deleteHolding(id) {
  if (!hasDatabaseUrl()) {
    const before = memoryHoldings.length;
    memoryHoldings = memoryHoldings.filter((holding) => holding.id !== Number(id));
    memoryTransactions = memoryTransactions.filter((transaction) => transaction.holding_id !== Number(id));
    return before !== memoryHoldings.length;
  }

  await ensureSchema();
  const deleted = await getSql()`DELETE FROM portfolio_holdings WHERE id = ${Number(id)} RETURNING id`;
  return deleted.length > 0;
}

export async function listTransactions() {
  if (!hasDatabaseUrl()) return memoryTransactions.map(toTransaction);

  await ensureSchema();
  const rows = await getSql()`
    SELECT t.*, o.name AS owner_name
    FROM portfolio_transactions t
    LEFT JOIN portfolio_owners o ON o.id = t.owner_id
    ORDER BY trade_date DESC, id DESC
  `;
  return rows.map(toTransaction);
}

export async function createTransaction(data) {
  const symbol = String(data.symbol ?? "").trim().toUpperCase();
  const ownerId = normalizeOwnerId(data.owner_id);
  const type = data.type === "sell" ? "sell" : "buy";
  const transaction = {
    owner_id: ownerId,
    owner_name: ownerNameForId(ownerId),
    symbol,
    type,
    trade_date: data.trade_date ?? new Date().toISOString().slice(0, 10),
    price: Number(data.price ?? 0),
    quantity: Number(data.quantity ?? 0),
    fee: Number(data.fee ?? 0),
    realized_pnl: 0
  };

  if (!hasDatabaseUrl()) {
    const holding = memoryHoldings.find((item) => item.owner_id === ownerId && item.symbol === symbol);
    if (holding) {
      const updated = applyTransactionToHolding(holding, transaction);
      await updateHolding(holding.id, updated);
      transaction.holding_id = holding.id;
      if (transaction.type === "sell") {
        transaction.realized_pnl = roundMoney((transaction.price - holding.avg_cost) * transaction.quantity - transaction.fee);
      }
    } else if (transaction.type === "buy") {
      const created = await createHolding({
        owner_id: ownerId,
        symbol,
        name: data.name || symbol,
        quantity: transaction.quantity,
        avg_cost: transaction.price,
        current_price: transaction.price,
        currency: data.currency || currencyForSymbol(symbol, data.market),
        market: data.market
      });
      transaction.holding_id = created.id;
    }

    const now = new Date().toISOString();
    const saved = {
      id: memoryTransactions.length ? Math.max(...memoryTransactions.map((item) => item.id)) + 1 : 1,
      ...transaction,
      created_at: now,
      updated_at: now
    };
    memoryTransactions.unshift(saved);
    return saved;
  }

  await ensureSchema();
  const existingRows = await getSql()`
    SELECT h.*, o.name AS owner_name
    FROM portfolio_holdings h
    LEFT JOIN portfolio_owners o ON o.id = h.owner_id
    WHERE h.owner_id = ${ownerId} AND h.symbol = ${symbol}
  `;
  let holding = existingRows[0] ? toHolding(existingRows[0]) : null;

  if (holding) {
    const updated = applyTransactionToHolding(holding, transaction);
    await updateHolding(holding.id, updated);
    transaction.holding_id = holding.id;
    if (transaction.type === "sell") {
      transaction.realized_pnl = roundMoney((transaction.price - holding.avg_cost) * transaction.quantity - transaction.fee);
    }
  } else if (transaction.type === "buy") {
    holding = await createHolding({
      owner_id: ownerId,
      symbol,
      name: data.name || symbol,
      quantity: transaction.quantity,
      avg_cost: transaction.price,
      current_price: transaction.price,
      currency: data.currency || currencyForSymbol(symbol, data.market),
      market: data.market
    });
    transaction.holding_id = holding.id;
  }

  const [row] = await getSql()`
    INSERT INTO portfolio_transactions (owner_id, holding_id, symbol, type, trade_date, price, quantity, fee, realized_pnl)
    VALUES (${ownerId}, ${holding?.id ?? null}, ${symbol}, ${transaction.type}, ${transaction.trade_date}, ${transaction.price}, ${transaction.quantity}, ${transaction.fee}, ${transaction.realized_pnl})
    RETURNING *
  `;
  return toTransaction(row);
}

export async function updateTransaction(id, data) {
  if (!hasDatabaseUrl()) {
    const index = memoryTransactions.findIndex((transaction) => transaction.id === Number(id));
    if (index === -1) return null;
    const ownerId = normalizeOwnerId(data.owner_id ?? memoryTransactions[index].owner_id);
    memoryTransactions[index] = {
      ...memoryTransactions[index],
      ...data,
      id: memoryTransactions[index].id,
      owner_id: ownerId,
      owner_name: ownerNameForId(ownerId),
      updated_at: new Date().toISOString()
    };
    return toTransaction(memoryTransactions[index]);
  }

  await ensureSchema();
  const existing = await getSql()`SELECT * FROM portfolio_transactions WHERE id = ${Number(id)}`;
  if (!existing.length) return null;
  const merged = { ...existing[0], ...data, owner_id: normalizeOwnerId(data.owner_id ?? existing[0].owner_id) };
  const [row] = await getSql()`
    UPDATE portfolio_transactions
    SET
      owner_id = ${merged.owner_id},
      symbol = ${String(merged.symbol).toUpperCase()},
      type = ${merged.type},
      trade_date = ${merged.trade_date},
      price = ${Number(merged.price)},
      quantity = ${Number(merged.quantity)},
      fee = ${Number(merged.fee)},
      realized_pnl = ${Number(merged.realized_pnl ?? 0)},
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING *
  `;
  return toTransaction(row);
}

export async function deleteTransaction(id) {
  if (!hasDatabaseUrl()) {
    const before = memoryTransactions.length;
    memoryTransactions = memoryTransactions.filter((transaction) => transaction.id !== Number(id));
    return before !== memoryTransactions.length;
  }

  await ensureSchema();
  const deleted = await getSql()`DELETE FROM portfolio_transactions WHERE id = ${Number(id)} RETURNING id`;
  return deleted.length > 0;
}
