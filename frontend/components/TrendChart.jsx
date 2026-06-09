"use client";

import { useEffect, useMemo, useState } from "react";

const ranges = [
  { key: "daily", label: "每日" },
  { key: "monthly", label: "每月" },
  { key: "yearly", label: "每年" }
];

const twdSeries = [
  { key: "twd_market_value", label: "台股現值", color: "#594ff4", currency: "TWD" },
  { key: "twd_cost_basis", label: "台股付出成本", color: "#8c7bff", currency: "TWD" },
  { key: "twd_unrealized_pnl", label: "台股未實現損益", color: "#0f8a4b", currency: "TWD" }
];

const usdSeries = [
  { key: "usd_market_value", label: "美股現值", color: "#111111", currency: "USD" },
  { key: "usd_cost_basis", label: "美股付出成本", color: "#6b7280", currency: "USD" },
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

function scaleForSeries(points, items) {
  const values = points.flatMap((point) => items.map((item) => Number(point[item.key] ?? 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min, range };
}

function buildPath(points, key, scale) {
  if (!points.length) return "";

  const width = 620;
  const height = 210;
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((Number(point[key] ?? 0) - scale.min) / scale.range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function CombinedTrendChart({ title, items, points, range, focusKey, focusLabel }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(points.length - 1, 0));
  const scale = scaleForSeries(points, items);
  const startLabel = labelForDate(points[0]?.snapshot_date, range);
  const endLabel = labelForDate(points.at(-1)?.snapshot_date, range);
  const selectedPoint = points[selectedIndex] ?? points.at(-1);
  const focusItem = items.find((item) => item.key === focusKey);

  useEffect(() => {
    setSelectedIndex(Math.max(points.length - 1, 0));
  }, [points.length, range]);

  return (
    <article className="trend-card trend-card-wide">
      <div className="trend-card-top">
        <span>{title}</span>
        <em>{startLabel} - {endLabel}</em>
      </div>

      <div className="trend-combined-legend">
        {items.map((item) => {
          const stats = changeStats(points, item.key);
          return (
            <div className="trend-stat compact" key={item.key}>
              <span>
                <i style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <strong>{money(stats.latest, item.currency)}</strong>
              <small className={stats.change >= 0 ? "gain" : "loss"}>
                {stats.change >= 0 ? "+" : "-"}
                {money(Math.abs(stats.change), item.currency)} / {percent(stats.changePercent)}
              </small>
            </div>
          );
        })}
      </div>

      <svg className="trend-chart" viewBox="0 0 640 250" role="img" aria-label={`${title}圖表`}>
        <line x1="10" y1="230" x2="630" y2="230" stroke="#e7e7e7" />
        <g transform="translate(10 10)">
          {items.map((item) => (
            <path d={buildPath(points, item.key, scale)} fill="none" key={item.key} stroke={item.color} strokeLinecap="round" strokeWidth="4" />
          ))}
        </g>
      </svg>

      <div className="trend-card-foot">
        <span>{startLabel}</span>
        <span>{points.length} 筆</span>
        <span>{endLabel}</span>
      </div>

      {focusKey && selectedPoint && focusItem ? (
        <div className="trend-day-slider">
          <div>
            <span>{selectedPoint.snapshot_date}</span>
            <strong className={Number(selectedPoint[focusKey] ?? 0) >= 0 ? "gain" : "loss"}>
              {focusLabel} {money(selectedPoint[focusKey], focusItem.currency)}
            </strong>
          </div>
          <input
            aria-label={`${focusLabel}日期`}
            max={Math.max(points.length - 1, 0)}
            min="0"
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            type="range"
            value={selectedIndex}
          />
        </div>
      ) : null}
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
          <p>台股與美股現值、付出成本、未實現損益走勢，從 6/5 基準資料開始顯示。</p>
        </div>
        <div className="segmented" aria-label="趨勢範圍">
          {ranges.map((item) => (
            <button className={range === item.key ? "active" : ""} key={item.key} type="button" onClick={() => setRange(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trend-body trend-body-cards">
        {points.length ? (
          <>
            <CombinedTrendChart focusKey="twd_unrealized_pnl" focusLabel="當日台股獲利" title="台股資產趨勢" items={twdSeries} points={points} range={range} />
            <CombinedTrendChart title="美股資產趨勢" items={usdSeries} points={points} range={range} />
          </>
        ) : (
          <div className="trend-empty">尚無趨勢資料</div>
        )}
      </div>
    </section>
  );
}
