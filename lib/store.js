import seed from "@/db/seeds/seed_data.json";
import { applyTransactionToHolding, calculateHoldingMetrics, roundMoney } from "@/lib/calculations";

let holdings = seed.holdings.map((holding, index) => ({
  id: index + 1,
  ...holding,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

let transactions = seed.transactions.map((transaction, index) => ({
  id: index + 1,
  ...transaction,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

const baseQuoteMap = new Map(
  holdings.map((holding) => [holding.symbol, Number(holding.current_price ?? holding.avg_cost)])
);

function quoteForSymbol(symbol) {
  const base = baseQuoteMap.get(symbol) ?? 100;
  const wave = Math.sin(Date.now() / 45000 + symbol.length) * 0.018;
  const drift = ((symbol.charCodeAt(0) % 7) - 3) / 1000;
  return {
    price: roundMoney(base * (1 + wave + drift)),
    currency: symbol.endsWith(".TW") ? "TWD" : "USD",
    timestamp: new Date().toISOString(),
    source: "demo-realtime"
  };
}

export function listQuotes(symbols) {
  return Object.fromEntries(symbols.filter(Boolean).map((symbol) => [symbol, quoteForSymbol(symbol)]));
}

export function listHoldings() {
  const quotes = listQuotes(holdings.map((holding) => holding.symbol));
  return holdings.map((holding) => calculateHoldingMetrics(holding, quotes[holding.symbol]));
}

export function getHolding(id) {
  return listHoldings().find((holding) => holding.id === Number(id));
}

export function createHolding(data) {
  const now = new Date().toISOString();
  const holding = {
    id: holdings.length ? Math.max(...holdings.map((item) => item.id)) + 1 : 1,
    symbol: String(data.symbol ?? "").trim().toUpperCase(),
    name: String(data.name ?? data.symbol ?? "").trim(),
    quantity: Number(data.quantity ?? 0),
    avg_cost: Number(data.avg_cost ?? 0),
    current_price: Number(data.current_price ?? data.avg_cost ?? 0),
    currency: String(data.currency ?? "USD").toUpperCase(),
    created_at: now,
    updated_at: now
  };
  holdings.push(holding);
  baseQuoteMap.set(holding.symbol, holding.current_price);
  return calculateHoldingMetrics(holding, quoteForSymbol(holding.symbol));
}

export function updateHolding(id, data) {
  const index = holdings.findIndex((holding) => holding.id === Number(id));
  if (index === -1) return null;
  holdings[index] = {
    ...holdings[index],
    ...data,
    id: holdings[index].id,
    quantity: Number(data.quantity ?? holdings[index].quantity),
    avg_cost: Number(data.avg_cost ?? holdings[index].avg_cost),
    updated_at: new Date().toISOString()
  };
  baseQuoteMap.set(holdings[index].symbol, Number(holdings[index].current_price ?? holdings[index].avg_cost));
  return calculateHoldingMetrics(holdings[index], quoteForSymbol(holdings[index].symbol));
}

export function deleteHolding(id) {
  const before = holdings.length;
  holdings = holdings.filter((holding) => holding.id !== Number(id));
  transactions = transactions.filter((transaction) => transaction.holding_id !== Number(id));
  return before !== holdings.length;
}

export function listTransactions() {
  return transactions;
}

export function createTransaction(data) {
  const holding = holdings.find((item) => item.symbol === String(data.symbol ?? "").trim().toUpperCase());
  const now = new Date().toISOString();
  const transaction = {
    id: transactions.length ? Math.max(...transactions.map((item) => item.id)) + 1 : 1,
    holding_id: holding?.id ?? null,
    symbol: String(data.symbol ?? "").trim().toUpperCase(),
    type: data.type === "sell" ? "sell" : "buy",
    trade_date: data.trade_date ?? new Date().toISOString().slice(0, 10),
    price: Number(data.price ?? 0),
    quantity: Number(data.quantity ?? 0),
    fee: Number(data.fee ?? 0),
    realized_pnl: 0,
    created_at: now,
    updated_at: now
  };

  if (holding) {
    const updated = applyTransactionToHolding(holding, transaction);
    updateHolding(holding.id, updated);
    if (transaction.type === "sell") {
      transaction.realized_pnl = roundMoney((transaction.price - holding.avg_cost) * transaction.quantity - transaction.fee);
    }
  } else if (transaction.type === "buy") {
    const created = createHolding({
      symbol: transaction.symbol,
      name: transaction.symbol,
      quantity: transaction.quantity,
      avg_cost: transaction.price,
      current_price: transaction.price
    });
    transaction.holding_id = created.id;
  }

  transactions.unshift(transaction);
  return transaction;
}

export function updateTransaction(id, data) {
  const index = transactions.findIndex((transaction) => transaction.id === Number(id));
  if (index === -1) return null;
  transactions[index] = {
    ...transactions[index],
    ...data,
    id: transactions[index].id,
    updated_at: new Date().toISOString()
  };
  return transactions[index];
}

export function deleteTransaction(id) {
  const before = transactions.length;
  transactions = transactions.filter((transaction) => transaction.id !== Number(id));
  return before !== transactions.length;
}
