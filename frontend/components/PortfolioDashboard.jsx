"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/frontend/components/Header";
import HoldingsTable from "@/frontend/components/HoldingsTable";
import PriceChart from "@/frontend/components/PriceChart";
import TradeForm from "@/frontend/components/TradeForm";
import { api } from "@/frontend/utils/api";

function formatMoney(value, currency) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function OwnerFilter({ owners, selectedOwnerId, onChange }) {
  return (
    <section className="owner-filter" aria-label="持有人篩選">
      <button className={selectedOwnerId === "all" ? "active" : ""} type="button" onClick={() => onChange("all")}>
        全部
      </button>
      {owners.map((owner) => (
        <button className={String(selectedOwnerId) === String(owner.id) ? "active" : ""} key={owner.id} type="button" onClick={() => onChange(owner.id)}>
          {owner.name}
        </button>
      ))}
    </section>
  );
}

export default function PortfolioDashboard() {
  const [owners, setOwners] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("all");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [ownersData, holdingsData] = await Promise.all([api.getOwners(), api.getHoldings()]);
      setOwners(ownersData.owners);
      setHoldings(holdingsData.holdings);
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

  const selectedOwner = owners.find((owner) => String(owner.id) === String(selectedOwnerId));
  const filteredHoldings = useMemo(() => {
    if (selectedOwnerId === "all") return holdings;
    return holdings.filter((holding) => String(holding.owner_id) === String(selectedOwnerId));
  }, [holdings, selectedOwnerId]);

  const summary = useMemo(() => {
    const totals = {
      TWD: { marketValue: 0, costBasis: 0, pnl: 0 },
      USD: { marketValue: 0, costBasis: 0, pnl: 0 }
    };

    for (const holding of filteredHoldings) {
      const currency = holding.currency === "TWD" ? "TWD" : "USD";
      totals[currency].marketValue += Number(holding.market_value ?? 0);
      totals[currency].costBasis += Number(holding.cost_basis ?? 0);
      totals[currency].pnl += Number(holding.unrealized_pnl ?? 0);
    }

    return totals;
  }, [filteredHoldings]);

  async function handleTradeSubmit(data) {
    await api.createTransaction({
      ...data,
      owner_id: data.owner_id ?? (selectedOwnerId === "all" ? 1 : selectedOwnerId)
    });
    await refresh();
  }

  async function handleUpdateHolding(holding, updates) {
    if (updates.quantity < 0 || updates.avg_cost < 0 || Number.isNaN(updates.quantity) || Number.isNaN(updates.avg_cost)) {
      setError("數量和平均成本必須是 0 以上的數字");
      return;
    }

    setSavingId(holding.id);
    setError("");
    try {
      await api.updateHolding(holding.id, updates);
      await refresh();
    } catch (updateError) {
      setError(updateError.message);
      throw updateError;
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteHolding(holding) {
    const confirmed = window.confirm(`確定刪除 ${holding.owner_name} 的 ${holding.symbol}？這會從 Neon 資料庫移除這筆持股。`);
    if (!confirmed) return;

    setDeletingId(holding.id);
    setError("");
    try {
      await api.deleteHolding(holding.id);
      await refresh();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const viewName = selectedOwnerId === "all" ? "全部持有人" : selectedOwner?.name ?? "Johnny";

  return (
    <div className="app-shell">
      <Header lastUpdated={lastUpdated} onRefresh={refresh} refreshing={loading} />
      <main className="main">
        <OwnerFilter owners={owners} selectedOwnerId={selectedOwnerId} onChange={setSelectedOwnerId} />
        <section className="summary-grid" id="overview">
          <div className="metric primary">
            <span>{viewName}</span>
            <strong>{filteredHoldings.length} 筆持股</strong>
          </div>
          <div className="metric">
            <span>台股市值</span>
            <strong>{formatMoney(summary.TWD.marketValue, "TWD")}</strong>
          </div>
          <div className="metric">
            <span>美股市值</span>
            <strong>{formatMoney(summary.USD.marketValue, "USD")}</strong>
          </div>
          <div className="metric">
            <span>未實現損益</span>
            <strong>
              <span className={summary.TWD.pnl >= 0 ? "gain" : "loss"}>{formatMoney(summary.TWD.pnl, "TWD")}</span>
              <span className={summary.USD.pnl >= 0 ? "gain metric-line" : "loss metric-line"}>{formatMoney(summary.USD.pnl, "USD")}</span>
            </strong>
          </div>
        </section>
        {error ? <p className="status error">{error}</p> : null}
        <section className="content-grid">
          <HoldingsTable
            deletingId={deletingId}
            holdings={filteredHoldings}
            onDelete={handleDeleteHolding}
            onUpdate={handleUpdateHolding}
            savingId={savingId}
            showOwner={selectedOwnerId === "all"}
          />
          <div className="side-stack">
            <PriceChart holdings={filteredHoldings} showOwner={selectedOwnerId === "all"} />
            <TradeForm owners={owners} selectedOwnerId={selectedOwnerId} onSubmit={handleTradeSubmit} />
          </div>
        </section>
      </main>
    </div>
  );
}
