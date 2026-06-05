"use client";

import { useMemo, useState } from "react";

const ranges = [
  { key: "daily", label: "每日" },
  { key: "monthly", label: "每月" },
  { key: "yearly", label: "每年" }
];

const series = [
  { key: "twd_market_value", label: "台股市值", color: "#594ff4", currency: "TWD" },
  { key: "usd_market_value", label: "美股市值", color: "#111111", currency: "USD" },
  { key: "twd_cost_basis", label: "台股庫存成本", color: "#8c7bff", currency: "TWD" },
  { key: "usd_cost_basis", label: "美股庫存成本", color: "#6b7280", currency: "USD" },
  { key: "twd_unrealized_pnl", label: "台股未實現損益", color: "#0f8a4b", currency: "TWD" },
  { key: "usd_unrealized_pnl", label: "美股未實現損益", color: "#c46a16", currency: "USD" }
];

function money(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function percent(value) {
  const number = Number(value ?? 0);
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function labelForDate(value, range) {
  if (!value) return "";
  if (range === "yearly") return value.slice(0, 4);
  if (range === "monthly") return value.slice(0, 7);
  return value.slice(5);
}

function changeStats(points, key) {
  const first = Number(points[0]?.[key] ?? 0);
  const latest = Number(points.at(-1)?.[key] ?? 0);
  const change = latest - first;
  const changePercent = first === 0 ? 0 : (change / Math.abs(first)) * 100;
  return { first, latest, change, changePercent };
}

function buildPath(points, key) {
  if (!points.length) return "";

  const width = 320;
  const height = 110;
  const values = points.map((point) => Number(point[key] ?? 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((Number(point[key] ?? 0) - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function TrendCard({ item, points, range }) {
  const stats = changeStats(points, item.key);
  const isGain = stats.change >= 0;
  const startLabel = labelForDate(points[0]?.snapshot_date, range);
  const endLabel = labelForDate(points.at(-1)?.snapshot_date, range);

  return (
    <article className="trend-card">
      <div className="trend-card-top">
        <span>
          <i style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
        <em className={isGain ? "gain" : "loss"}>{percent(stats.changePercent)}</em>
      </div>
      <strong>{money(stats.latest, item.currency)}</strong>
      <div className={isGain ? "trend-change gain" : "trend-change loss"}>
        {isGain ? "上漲" : "下跌"} {money(Math.abs(stats.change), item.currency)}
      </div>
      <svg className="trend-sparkline" viewBox="0 0 340 130" role="img" aria-label={`${item.label}趨勢`}>
        <line x1="10" y1="120" x2="330" y2="120" stroke="#e7e7e7" />
        <g transform="translate(10 10)">
          <path d={buildPath(points, item.key)} fill="none" stroke={item.color} strokeLinecap="round" strokeWidth="4" />
        </g>
      </svg>
      <div className="trend-card-foot">
        <span>{startLabel}</span>
        <span>{points.length} 筆資料</span>
        <span>{endLabel}</span>
      </div>
    </article>
  );
}

export default function TrendChart({ trends }) {
  const [range, setRange] = useState("daily");
  const points = useMemo(() => trends?.[range] ?? [], [trends, range]);

  return (
    <section className="panel trend-panel" id="trends">
      <div className="panel-header trend-header">
        <div>
          <h2>資產趨勢</h2>
          <p>每個指標獨立顯示漲跌幅，方便比較台股、美股與損益變化。</p>
        </div>
        <div className="segmented" aria-label="趨勢區間">
          {ranges.map((item) => (
            <button className={range === item.key ? "active" : ""} key={item.key} type="button" onClick={() => setRange(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trend-body trend-body-cards">
        {points.length ? (
          series.map((item) => <TrendCard item={item} key={item.key} points={points} range={range} />)
        ) : (
          <div className="trend-empty">目前還沒有趨勢資料</div>
        )}
      </div>
    </section>
  );
}
