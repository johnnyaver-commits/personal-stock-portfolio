import seed from "@/db/seeds/seed_data.json";
import { applyTransactionToHolding, calculateHoldingMetrics, roundMoney } from "@/lib/calculations";
import { getSql, hasDatabaseUrl } from "@/lib/db";
import { currencyForSymbol, fetchYahooQuote, fetchYahooQuotes } from "@/lib/yahooFinance";

let memoryHoldings = seed.holdings.map((holding, index) => ({
  id: index + 1,
  ...holding,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

let memoryTransactions = seed.transactions.map((transaction, index) => ({
  id: index + 1,
  ...transaction,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

let schemaReady = false;
const baseQuoteMap = new Map(memoryHoldings.map((holding) => [holding.symbol, Number(holding.current_price ?? holding.avg_cost)]));

function toHolding(row) {
  return {
    ...row,
    id: Number(row.id),
    quantity: Number(row.quantity),
    avg_cost: Number(row.avg_cost),
    current_price: Number(row.current_price ?? row.avg_cost)
  };
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
    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id BIGSERIAL PRIMARY KEY,
      symbol VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      quantity NUMERIC(20, 6) NOT NULL DEFAULT 0,
      avg_cost NUMERIC(20, 6) NOT NULL DEFAULT 0,
      current_price NUMERIC(20, 6) NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id BIGSERIAL PRIMARY KEY,
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

  const seeded = await sql`SELECT value FROM portfolio_app_meta WHERE key = 'seeded'`;
  if (!seeded.length) {
    for (const holding of seed.holdings) {
      await sql`
        INSERT INTO portfolio_holdings (symbol, name, quantity, avg_cost, current_price, currency)
        VALUES (
          ${holding.symbol},
          ${holding.name},
          ${holding.quantity},
          ${holding.avg_cost},
          ${holding.current_price ?? holding.avg_cost},
          ${holding.currency ?? currencyForSymbol(holding.symbol)}
        )
        ON CONFLICT (symbol) DO NOTHING
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

async function listBaseHoldings() {
  if (!hasDatabaseUrl()) return memoryHoldings.map(toHolding);

  await ensureSchema();
  const rows = await getSql()`SELECT * FROM portfolio_holdings ORDER BY symbol`;
  return rows.map(toHolding);
}

export async function listQuotes(symbols) {
  const fallbackMap = new Map((await listBaseHoldings()).map((holding) => [holding.symbol, Number(holding.current_price ?? holding.avg_cost)]));
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
  const holdingData = {
    symbol,
    name: String(data.name ?? symbol).trim(),
    quantity: Number(data.quantity ?? 0),
    avg_cost: Number(data.avg_cost ?? 0),
    current_price: Number(data.current_price ?? data.avg_cost ?? 0),
    currency: String(data.currency ?? currencyForSymbol(symbol, data.market)).toUpperCase()
  };

  if (!hasDatabaseUrl()) {
    const now = new Date().toISOString();
    const holding = {
      id: memoryHoldings.length ? Math.max(...memoryHoldings.map((item) => item.id)) + 1 : 1,
      ...holdingData,
      created_at: now,
      updated_at: now
    };
    memoryHoldings.push(holding);
    baseQuoteMap.set(holding.symbol, holding.current_price);
    return calculateHoldingMetrics(holding, await fetchYahooQuote(holding.symbol, holding.current_price));
  }

  await ensureSchema();
  const [row] = await getSql()`
    INSERT INTO portfolio_holdings (symbol, name, quantity, avg_cost, current_price, currency)
    VALUES (${holdingData.symbol}, ${holdingData.name}, ${holdingData.quantity}, ${holdingData.avg_cost}, ${holdingData.current_price}, ${holdingData.currency})
    ON CONFLICT (symbol) DO UPDATE SET
      name = EXCLUDED.name,
      quantity = EXCLUDED.quantity,
      avg_cost = EXCLUDED.avg_cost,
      current_price = EXCLUDED.current_price,
      currency = EXCLUDED.currency,
      updated_at = NOW()
    RETURNING *
  `;
  return calculateHoldingMetrics(toHolding(row), await fetchYahooQuote(row.symbol, Number(row.current_price)));
}

export async function updateHolding(id, data) {
  if (!hasDatabaseUrl()) {
    const index = memoryHoldings.findIndex((holding) => holding.id === Number(id));
    if (index === -1) return null;
    memoryHoldings[index] = {
      ...memoryHoldings[index],
      ...data,
      id: memoryHoldings[index].id,
      quantity: Number(data.quantity ?? memoryHoldings[index].quantity),
      avg_cost: Number(data.avg_cost ?? memoryHoldings[index].avg_cost),
      updated_at: new Date().toISOString()
    };
    return calculateHoldingMetrics(memoryHoldings[index], await fetchYahooQuote(memoryHoldings[index].symbol, memoryHoldings[index].current_price));
  }

  await ensureSchema();
  const existing = await getSql()`SELECT * FROM portfolio_holdings WHERE id = ${Number(id)}`;
  if (!existing.length) return null;
  const merged = { ...toHolding(existing[0]), ...data };
  const [row] = await getSql()`
    UPDATE portfolio_holdings
    SET
      symbol = ${merged.symbol},
      name = ${merged.name},
      quantity = ${Number(merged.quantity)},
      avg_cost = ${Number(merged.avg_cost)},
      current_price = ${Number(merged.current_price ?? merged.avg_cost)},
      currency = ${merged.currency ?? currencyForSymbol(merged.symbol)},
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING *
  `;
  return calculateHoldingMetrics(toHolding(row), await fetchYahooQuote(row.symbol, Number(row.current_price)));
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
  if (!hasDatabaseUrl()) return memoryTransactions;

  await ensureSchema();
  return getSql()`SELECT * FROM portfolio_transactions ORDER BY trade_date DESC, id DESC`;
}

export async function createTransaction(data) {
  const symbol = String(data.symbol ?? "").trim().toUpperCase();
  const type = data.type === "sell" ? "sell" : "buy";
  const transaction = {
    symbol,
    type,
    trade_date: data.trade_date ?? new Date().toISOString().slice(0, 10),
    price: Number(data.price ?? 0),
    quantity: Number(data.quantity ?? 0),
    fee: Number(data.fee ?? 0),
    realized_pnl: 0
  };

  if (!hasDatabaseUrl()) {
    const holding = memoryHoldings.find((item) => item.symbol === symbol);
    if (holding) {
      const updated = applyTransactionToHolding(holding, transaction);
      await updateHolding(holding.id, updated);
      if (transaction.type === "sell") {
        transaction.realized_pnl = roundMoney((transaction.price - holding.avg_cost) * transaction.quantity - transaction.fee);
      }
    } else if (transaction.type === "buy") {
      const created = await createHolding({
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
  const existingRows = await getSql()`SELECT * FROM portfolio_holdings WHERE symbol = ${symbol}`;
  let holding = existingRows[0] ? toHolding(existingRows[0]) : null;

  if (holding) {
    const updated = applyTransactionToHolding(holding, transaction);
    await updateHolding(holding.id, updated);
    if (transaction.type === "sell") {
      transaction.realized_pnl = roundMoney((transaction.price - holding.avg_cost) * transaction.quantity - transaction.fee);
    }
  } else if (transaction.type === "buy") {
    holding = await createHolding({
      symbol,
      name: data.name || symbol,
      quantity: transaction.quantity,
      avg_cost: transaction.price,
      current_price: transaction.price,
      currency: data.currency || currencyForSymbol(symbol, data.market),
      market: data.market
    });
  }

  const [row] = await getSql()`
    INSERT INTO portfolio_transactions (holding_id, symbol, type, trade_date, price, quantity, fee, realized_pnl)
    VALUES (${holding?.id ?? null}, ${symbol}, ${transaction.type}, ${transaction.trade_date}, ${transaction.price}, ${transaction.quantity}, ${transaction.fee}, ${transaction.realized_pnl})
    RETURNING *
  `;
  return row;
}

export async function updateTransaction(id, data) {
  if (!hasDatabaseUrl()) {
    const index = memoryTransactions.findIndex((transaction) => transaction.id === Number(id));
    if (index === -1) return null;
    memoryTransactions[index] = {
      ...memoryTransactions[index],
      ...data,
      id: memoryTransactions[index].id,
      updated_at: new Date().toISOString()
    };
    return memoryTransactions[index];
  }

  await ensureSchema();
  const existing = await getSql()`SELECT * FROM portfolio_transactions WHERE id = ${Number(id)}`;
  if (!existing.length) return null;
  const merged = { ...existing[0], ...data };
  const [row] = await getSql()`
    UPDATE portfolio_transactions
    SET
      symbol = ${merged.symbol},
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
  return row;
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
