"use client";

import { useEffect, useState } from "react";
import { api } from "@/frontend/utils/api";

function number(value, digits = 0) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

function percent(value) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function labelForDate(value) {
  return String(value ?? "").slice(5);
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

const series = [
  { key: "large_percentage", label: "千張大戶持股比例", color: "#594ff4", format: percent },
  { key: "large_holders", label: "千張大戶人數", color: "#0f8a4b", format: (value) => `${number(value)} 人` },
  { key: "large_shares_lots", label: "千張大戶持有張數", color: "#c46a16", format: (value) => `${number(value)} 張` }
];

export default function PhisonShareholderTrend() {
  const [trend, setTrend] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getPhisonShareholders()
      .then((data) => {
        if (!active) return;
        const points = (data.trend ?? []).map((point) => ({
          ...point,
          large_shares_lots: Number(point.large_shares ?? 0) / 1000
        }));
        setTrend(points);
        setLatest(data.latest ?? points.at(-1) ?? null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="panel shareholder-panel" id="phison-shareholders">
      <div className="panel-header">
        <div>
          <h2>群聯千張大戶趨勢</h2>
          <p>資料來源 TDCC 集保戶股權分散表；公開資料為每週更新，網站每日檢查新資料。</p>
        </div>
        {latest ? <span className="status pill">資料日 {latest.snapshot_date}</span> : null}
      </div>

      {error ? <p className="status error shareholder-status">{error}</p> : null}

      {trend.length ? (
        <div className="shareholder-body">
          <div className="trend-combined-legend">
            {series.map((item) => {
              const stats = changeStats(trend, item.key);
              return (
                <div className="trend-stat compact" key={item.key}>
                  <span>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <strong>{item.format(stats.latest)}</strong>
                  <small className={stats.change >= 0 ? "gain" : "loss"}>
                    {stats.change >= 0 ? "+" : "-"}
                    {item.format(Math.abs(stats.change))} · {stats.changePercent >= 0 ? "+" : ""}
                    {stats.changePercent.toFixed(2)}%
                  </small>
                </div>
              );
            })}
          </div>
          <svg className="trend-chart shareholder-chart" viewBox="0 0 640 250" role="img" aria-label="群聯千張大戶趨勢">
            <line x1="10" y1="230" x2="630" y2="230" stroke="#e7e7e7" />
            <g transform="translate(10 10)">
              {series.map((item) => (
                <path d={buildPath(trend, item.key, scaleForSeries(trend, [item]))} fill="none" key={item.key} stroke={item.color} strokeLinecap="round" strokeWidth="4" />
              ))}
            </g>
          </svg>
          <div className="trend-card-foot shareholder-foot">
            <span>{labelForDate(trend[0]?.snapshot_date)}</span>
            <span>{trend.length} 筆</span>
            <span>{labelForDate(trend.at(-1)?.snapshot_date)}</span>
          </div>
        </div>
      ) : !error ? (
        <div className="trend-empty">正在讀取群聯股權分散資料</div>
      ) : null}
    </section>
  );
}
