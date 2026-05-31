import { Activity, RefreshCw } from "lucide-react";

export default function Header({ lastUpdated, onRefresh, refreshing }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={22} aria-hidden="true" />
          </div>
          <div>
            <h1>個人股票庫存</h1>
            <p>持股、交易、即時估值與未實現損益</p>
          </div>
        </div>
        <div className="header-meta">
          <span>更新：{lastUpdated || "尚未同步"}</span>
          <button className="button" type="button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={16} aria-hidden="true" />
            {refreshing ? "同步中" : "更新報價"}
          </button>
        </div>
      </div>
    </header>
  );
}
