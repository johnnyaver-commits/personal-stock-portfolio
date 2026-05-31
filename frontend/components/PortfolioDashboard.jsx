"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/frontend/components/Header";
import HoldingsTable from "@/frontend/components/HoldingsTable";
import PriceChart from "@/frontend/components/PriceChart";
import TradeForm from "@/frontend/components/TradeForm";
import { api } from "@/frontend/utils/api";

function formatMoney(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

export default function PortfolioDashboard() {
  const [holdings, setHoldings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getHoldings();
      setHoldings(data.holdings);
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

  async function handleTradeSubmit(data) {
    await api.createTransaction(data);
    await refresh();
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
          <HoldingsTable holdings={holdings} />
          <div className="side-stack">
            <PriceChart holdings={holdings} />
            <TradeForm onSubmit={handleTradeSubmit} />
          </div>
        </section>
      </main>
    </div>
  );
}
