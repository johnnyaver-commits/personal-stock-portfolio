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
  { key: "total_unrealized_pnl", label: "未實現損益", color: "#0f8a4b", currency: "TWD" }
];

function money(value, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function labelForDate(value, range) {
  if (!value) return "";
  if (range === "yearly") return value.slice(0, 4);
  if (range === "monthly") return value.slice(0, 7);
  return value.slice(5);
}

function normalizePoint(point) {
  return {
    ...point,
    total_unrealized_pnl: Number(point.twd_unrealized_pnl ?? 0) + Number(point.usd_unrealized_pnl ?? 0)
  };
}

function buildPath(points, key, min, max) {
  if (!points.length) return "";
  const width = 520;
  const height = 180;
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((Number(point[key] ?? 0) - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function TrendChart({ trends }) {
  const [range, setRange] = useState("daily");
  const points = useMemo(() => (trends?.[range] ?? []).map(normalizePoint), [trends, range]);
  const values = points.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0)));
  const min = values.length ? Math.min(0, ...values) : 0;
  const max = values.length ? Math.max(1, ...values) : 1;
  const latest = points.at(-1);

  return (
    <section className="panel trend-panel" id="trends">
      <div className="panel-header trend-header">
        <div>
          <h2>資產趨勢</h2>
          <p>追蹤台股市值、美股市值與未實現損益。歷史資料會從今天開始每日累積。</p>
        </div>
        <div className="segmented" aria-label="趨勢區間">
          {ranges.map((item) => (
            <button className={range === item.key ? "active" : ""} key={item.key} type="button" onClick={() => setRange(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trend-body">
        <div className="trend-chart-wrap">
          {points.length ? (
            <svg className="trend-chart" viewBox="0 0 560 220" role="img" aria-label="資產趨勢圖">
              <line x1="20" y1="190" x2="540" y2="190" stroke="#e7e7e7" />
              <line x1="20" y1="10" x2="20" y2="190" stroke="#e7e7e7" />
              <g transform="translate(20 10)">
                {series.map((item) => (
                  <path d={buildPath(points, item.key, min, max)} fill="none" key={item.key} stroke={item.color} strokeLinecap="round" strokeWidth="3" />
                ))}
              </g>
              {points.map((point, index) => {
                if (index !== 0 && index !== points.length - 1) return null;
                const x = points.length === 1 ? 280 : 20 + (index / (points.length - 1)) * 520;
                return (
                  <text fill="#888888" fontSize="11" key={`${point.snapshot_date}-${index}`} textAnchor={index === 0 ? "start" : "end"} x={x} y="214">
                    {labelForDate(point.snapshot_date, range)}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div className="trend-empty">目前還沒有趨勢資料</div>
          )}
        </div>

        <div className="trend-legend">
          {series.map((item) => (
            <div className="trend-stat" key={item.key}>
              <span>
                <i style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <strong className={item.key === "total_unrealized_pnl" && Number(latest?.[item.key] ?? 0) < 0 ? "loss" : ""}>
                {money(latest?.[item.key] ?? 0, item.currency)}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
