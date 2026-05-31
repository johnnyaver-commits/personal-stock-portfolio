"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/frontend/components/Header";
import HoldingsTable from "@/frontend/components/HoldingsTable";
import PriceChart from "@/frontend/components/PriceChart";
import TradeForm from "@/frontend/components/TradeForm";
import { api } from "@/frontend/utils/api";
import { applyTransactionToHolding, calculateHoldingMetrics } from "@/lib/calculations";

const STORAGE_KEY = "personal-stock-portfolio.holdings.v1";

function formatMoney(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function currencyForSymbol(symbol, market = "") {
  const normalizedSymbol = String(symbol ?? "").toUpperCase();
  if (market === "台股" || normalizedSymbol.endsWith(".TW") || normalizedSymbol.endsWith(".TWO")) return "TWD";
  return "USD";
}

function toStoredHolding(holding) {
  return {
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    quantity: Number(holding.quantity ?? 0),
    avg_cost: Number(holding.avg_cost ?? 0),
    current_price: Number(holding.current_price ?? holding.avg_cost ?? 0),
    currency: holding.currency || currencyForSymbol(holding.symbol),
    created_at: holding.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function readSavedHoldings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveHoldings(holdings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings.map(toStoredHolding)));
}

export default function PortfolioDashboard() {
  const [holdings, setHoldings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function hydrateWithQuotes(baseHoldings) {
    const storedHoldings = baseHoldings.map(toStoredHolding);
    if (!storedHoldings.length) return [];

    const data = await api.getQuote(storedHoldings.map((holding) => holding.symbol));
    return storedHoldings.map((holding) => calculateHoldingMetrics(holding, data.quotes?.[holding.symbol]));
  }

  async function loadBaseHoldings() {
    const saved = readSavedHoldings();
    if (saved) return saved;

    const data = await api.getHoldings();
    const initialHoldings = (data.holdings ?? []).map(toStoredHolding);
    saveHoldings(initialHoldings);
    return initialHoldings;
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const baseHoldings = await loadBaseHoldings();
      setHoldings(await hydrateWithQuotes(baseHoldings));
      setLastUpdated(new Date().toLocaleTimeString("zh-TW"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const totalValue = holdings.reduce((sum, item) => sum + Number(item.market_value ?? 0), 0);
    const totalCost = holdings.reduce((sum, item) => sum + Number(item.cost_basis ?? 0), 0);
    const pnl = holdings.reduce((sum, item) => sum + Number(item.unrealized_pnl ?? 0), 0);
    const pnlPercent = totalCost ? (pnl / totalCost) * 100 : 0;
    return { totalValue, totalCost, pnl, pnlPercent };
  }, [holdings]);

  async function persistAndRender(nextHoldings) {
    const storedHoldings = nextHoldings.map(toStoredHolding);
    saveHoldings(storedHoldings);
    setHoldings(await hydrateWithQuotes(storedHoldings));
    setLastUpdated(new Date().toLocaleTimeString("zh-TW"));
  }

  async function handleTradeSubmit(data) {
    setError("");
    const symbol = String(data.symbol ?? "").trim().toUpperCase();
    const currentHoldings = holdings.map(toStoredHolding);
    const existing = currentHoldings.find((holding) => holding.symbol === symbol);
    const transaction = {
      symbol,
      type: data.type === "sell" ? "sell" : "buy",
      price: Number(data.price ?? 0),
      quantity: Number(data.quantity ?? 0),
      fee: Number(data.fee ?? 0)
    };

    if (!existing && transaction.type === "sell") {
      throw new Error("找不到可賣出的持股");
    }

    if (existing) {
      const updatedHolding = applyTransactionToHolding(existing, transaction);
      await persistAndRender(currentHoldings.map((holding) => (holding.id === existing.id ? updatedHolding : holding)));
      return;
    }

    const now = new Date().toISOString();
    await persistAndRender([
      ...currentHoldings,
      {
        id: currentHoldings.length ? Math.max(...currentHoldings.map((holding) => holding.id)) + 1 : 1,
        symbol,
        name: data.name || symbol,
        quantity: transaction.quantity,
        avg_cost: transaction.price,
        current_price: transaction.price,
        currency: data.currency || currencyForSymbol(symbol, data.market),
        created_at: now,
        updated_at: now
      }
    ]);
  }

  async function handleDeleteHolding(holding) {
    const confirmed = window.confirm(`確定刪除 ${holding.symbol}？此操作會從本機庫存移除。`);
    if (!confirmed) return;

    setDeletingId(holding.id);
    setError("");
    try {
      await persistAndRender(holdings.filter((item) => item.id !== holding.id));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">
      <Header lastUpdated={lastUpdated} onRefresh={refresh} refreshing={loading} />
      <main className="main">
        <section className="summary-grid" id="overview">
          <div className="metric primary">
            <span>總市值</span>
            <strong>{formatMoney(summary.totalValue)}</strong>
          </div>
          <div className="metric">
            <span>總成本</span>
            <strong>{formatMoney(summary.totalCost)}</strong>
          </div>
          <div className="metric">
            <span>未實現損益</span>
            <strong className={summary.pnl >= 0 ? "gain" : "loss"}>{formatMoney(summary.pnl)}</strong>
          </div>
          <div className="metric">
            <span>投資報酬率</span>
            <strong className={summary.pnlPercent >= 0 ? "gain" : "loss"}>{summary.pnlPercent.toFixed(2)}%</strong>
          </div>
        </section>
        {error ? <p className="status error">{error}</p> : null}
        <section className="content-grid">
          <HoldingsTable holdings={holdings} deletingId={deletingId} onDelete={handleDeleteHolding} />
          <div className="side-stack">
            <PriceChart holdings={holdings} />
            <TradeForm onSubmit={handleTradeSubmit} />
          </div>
        </section>
      </main>
    </div>
  );
}
