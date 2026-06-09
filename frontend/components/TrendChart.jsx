"use client";

import { useEffect, useMemo, useState } from "react";

const text = {
  daily: "\u6bcf\u65e5",
  monthly: "\u6bcf\u6708",
  yearly: "\u6bcf\u5e74",
  twdMarketValue: "\u53f0\u80a1\u73fe\u503c",
  twdCostBasis: "\u53f0\u80a1\u4ed8\u51fa\u6210\u672c",
  twdUnrealizedPnl: "\u53f0\u80a1\u672a\u5be6\u73fe\u640d\u76ca",
  usdMarketValue: "\u7f8e\u80a1\u73fe\u503c",
  usdCostBasis: "\u7f8e\u80a1\u4ed8\u51fa\u6210\u672c",
  usdUnrealizedPnl: "\u7f8e\u80a1\u672a\u5be6\u73fe\u640d\u76ca",
  assetTrend: "\u8cc7\u7522\u8da8\u52e2",
  assetTrendDescription:
    "\u53f0\u80a1\u8207\u7f8e\u80a1\u73fe\u503c\u3001\u4ed8\u51fa\u6210\u672c\u3001\u672a\u5be6\u73fe\u640d\u76ca\u8d70\u52e2\uff0c\u5f9e 6/5 \u57fa\u6e96\u8cc7\u6599\u958b\u59cb\u986f\u793a\u3002",
  trendRange: "\u8da8\u52e2\u7bc4\u570d",
  twdTrend: "\u53f0\u80a1\u8cc7\u7522\u8da8\u52e2",
  usdTrend: "\u7f8e\u80a1\u8cc7\u7522\u8da8\u52e2",
  chart: "\u5716\u8868",
  records: "\u7b46",
  noData: "\u5c1a\u7121\u8da8\u52e2\u8cc7\u6599",
  selectedDate: "\u9078\u64c7\u65e5\u671f",
  date: "\u65e5\u671f"
};

const ranges = [
  { key: "daily", label: text.daily },
  { key: "monthly", label: text.monthly },
  { key: "yearly", label: text.yearly }
];

const twdSeries = [
  { key: "twd_market_value", label: text.twdMarketValue, color: "#594ff4", currency: "TWD" },
  { key: "twd_cost_basis", label: text.twdCostBasis, color: "#8c7bff", currency: "TWD" },
  { key: "twd_unrealized_pnl", label: text.twdUnrealizedPnl, color: "#0f8a4b", currency: "TWD" }
];

const usdSeries = [
  { key: "usd_market_value", label: text.usdMarketValue, color: "#111111", currency: "USD" },
  { key: "usd_cost_basis", label: text.usdCostBasis, color: "#6b7280", currency: "USD" },
  { key: "usd_unrealized_pnl", label: text.usdUnrealizedPnl, color: "#c46a16", currency: "USD" }
];

const chart = {
  width: 620,
  height: 210,
  paddingX: 10,
  paddingY: 10
};

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

function pointChangeStats(points, point, key) {
  const first = Number(points[0]?.[key] ?? 0);
  const current = Number(point?.[key] ?? 0);
  const change = current - first;
  const changePercent = first === 0 ? 0 : (change / Math.abs(first)) * 100;
  return { change, changePercent };
}

function scaleForSeries(points, items) {
  const values = points.flatMap((point) => items.map((item) => Number(point[item.key] ?? 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min, range };
}

function pointX(points, index) {
  if (points.length === 1) return chart.width / 2;
  return (index / (points.length - 1)) * chart.width;
}

function pointY(point, key, scale) {
  return chart.height - ((Number(point[key] ?? 0) - scale.min) / scale.range) * chart.height;
}

function buildPath(points, key, scale) {
  if (!points.length) return "";

  return points
    .map((point, index) => {
      const x = pointX(points, index);
      const y = pointY(point, key, scale);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function CombinedTrendChart({ title, items, points, range, interactive = false }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(points.length - 1, 0));
  const scale = scaleForSeries(points, items);
  const startLabel = labelForDate(points[0]?.snapshot_date, range);
  const endLabel = labelForDate(points.at(-1)?.snapshot_date, range);
  const selectedPoint = points[selectedIndex] ?? points.at(-1);
  const selectedX = pointX(points, selectedIndex);

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

      <div className={interactive ? "trend-chart-interactive" : ""}>
        <svg className="trend-chart" viewBox="0 0 640 250" role="img" aria-label={`${title}${text.chart}`}>
          <line x1="10" y1="230" x2="630" y2="230" stroke="#e7e7e7" />
          <g transform="translate(10 10)">
            {items.map((item) => (
              <path d={buildPath(points, item.key, scale)} fill="none" key={item.key} stroke={item.color} strokeLinecap="round" strokeWidth="4" />
            ))}
            {interactive && selectedPoint ? (
              <>
                <line className="trend-cursor-line" x1={selectedX} x2={selectedX} y1="0" y2={chart.height} />
                {items.map((item) => (
                  <circle
                    className="trend-cursor-dot"
                    cx={selectedX}
                    cy={pointY(selectedPoint, item.key, scale)}
                    fill={item.color}
                    key={item.key}
                    r="6"
                  />
                ))}
              </>
            ) : null}
          </g>
        </svg>

        {interactive ? (
          <input
            aria-label={text.selectedDate}
            className="trend-cursor-range"
            max={Math.max(points.length - 1, 0)}
            min="0"
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            type="range"
            value={selectedIndex}
          />
        ) : null}
      </div>

      <div className="trend-card-foot">
        <span>{startLabel}</span>
        <span>{points.length} {text.records}</span>
        <span>{endLabel}</span>
      </div>

      {interactive && selectedPoint ? (
        <div className="trend-cursor-readout">
          <div className="trend-cursor-date">
            <span>{text.date}</span>
            <strong>{selectedPoint.snapshot_date}</strong>
          </div>
          {items.map((item) => {
            const selectedStats = pointChangeStats(points, selectedPoint, item.key);
            return (
              <div className="trend-cursor-value" key={item.key}>
                <span>
                  <i style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <strong className={item.key.includes("pnl") ? (Number(selectedPoint[item.key] ?? 0) >= 0 ? "gain" : "loss") : ""}>
                  {money(selectedPoint[item.key], item.currency)}
                </strong>
                <small className={selectedStats.change >= 0 ? "gain" : "loss"}>
                  {selectedStats.change >= 0 ? "+" : "-"}
                  {money(Math.abs(selectedStats.change), item.currency)} / {percent(selectedStats.changePercent)}
                </small>
              </div>
            );
          })}
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
          <h2>{text.assetTrend}</h2>
          <p>{text.assetTrendDescription}</p>
        </div>
        <div className="segmented" aria-label={text.trendRange}>
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
            <CombinedTrendChart interactive title={text.twdTrend} items={twdSeries} points={points} range={range} />
            <CombinedTrendChart interactive title={text.usdTrend} items={usdSeries} points={points} range={range} />
          </>
        ) : (
          <div className="trend-empty">{text.noData}</div>
        )}
      </div>
    </section>
  );
}
