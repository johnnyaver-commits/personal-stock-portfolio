"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/frontend/utils/api";

const text = {
  title: "\u7fa4\u806f\u80a1\u6771\u7d50\u69cb\u8da8\u52e2",
  description:
    "\u8cc7\u6599\u4f86\u6e90 TDCC \u96c6\u4fdd\u6236\u80a1\u6b0a\u5206\u6563\u8868\uff1b\u516c\u958b\u8cc7\u6599\u70ba\u6bcf\u9031\u66f4\u65b0\uff0c\u7db2\u7ad9\u6bcf\u65e5\u6aa2\u67e5\u65b0\u8cc7\u6599\u3002",
  dataDate: "\u8cc7\u6599\u65e5",
  records: "\u7b46",
  loading: "\u6b63\u5728\u8b80\u53d6\u7fa4\u806f\u80a1\u6771\u7d50\u69cb\u8cc7\u6599",
  chartLabel: "\u7fa4\u806f\u80a1\u6771\u7d50\u69cb\u8da8\u52e2",
  holders: "\u4eba\u6578",
  lots: "\u5f35\u6578",
  percentage: "\u6301\u80a1\u6bd4\u4f8b",
  institutional: "\u4e09\u5927\u6cd5\u4eba\u5408\u8a08",
  foreign: "\u5916\u8cc7",
  investmentTrust: "\u6295\u4fe1",
  dealer: "\u81ea\u71df\u5546",
  holdingLots: "\u6301\u80a1\u5f35\u6578",
  under1: "<1 \u5f35",
  latest: "\u6700\u65b0",
  change: "\u5dee\u503c",
  exclusiveTitle: "\u975e\u91cd\u758a\u7d1a\u8ddd\u8b8a\u5316",
  range: "\u7d1a\u8ddd",
  total: "\u5408\u8a08",
  latestLots: "\u6700\u65b0\u5f35\u6578",
  lotChange: "\u5f35\u6578\u5dee",
  over1: ">1 \u5f35",
  from1To10: "1-10 \u5f35",
  from10To100: "10-100 \u5f35",
  from100To400: "100-400 \u5f35",
  from400To1000: "400-1000 \u5f35",
  over10: ">10 \u5f35",
  over100: ">100 \u5f35",
  over400: ">400 \u5f35",
  over1000: ">1000 \u5f35"
};

const series = [
  { key: "under_1_lot_percentage", holderKey: "under_1_lot_holders", sharesKey: "under_1_lot_shares", label: text.under1, color: "#2563eb" },
  { key: "over_1_lot_percentage", holderKey: "over_1_lot_holders", sharesKey: "over_1_lot_shares", label: text.over1, color: "#594ff4" },
  { key: "over_10_lot_percentage", holderKey: "over_10_lot_holders", sharesKey: "over_10_lot_shares", label: text.over10, color: "#0f8a4b" },
  { key: "over_100_lot_percentage", holderKey: "over_100_lot_holders", sharesKey: "over_100_lot_shares", label: text.over100, color: "#c46a16" },
  { key: "over_400_lot_percentage", holderKey: "over_400_lot_holders", sharesKey: "over_400_lot_shares", label: text.over400, color: "#0f766e" },
  { key: "large_percentage", holderKey: "large_holders", sharesKey: "large_shares", label: text.over1000, color: "#111111" }
];

const institutionalSeries = [
  { key: "foreign_holding_percentage", sharesKey: "foreign_holding_lots", label: text.foreign, color: "#d946ef" },
  { key: "investment_trust_holding_percentage", sharesKey: "investment_trust_holding_lots", label: text.investmentTrust, color: "#0891b2" },
  { key: "dealer_holding_percentage", sharesKey: "dealer_holding_lots", label: text.dealer, color: "#f97316" },
  { key: "institutional_holding_percentage", sharesKey: "institutional_holding_lots", label: text.institutional, color: "#7c3aed" }
];

function number(value, digits = 0) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

function percent(value) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function labelForDate(value) {
  return String(value ?? "").slice(5);
}

function finiteValue(point, key) {
  const value = Number(point?.[key]);
  return Number.isFinite(value) ? value : null;
}

function changeStats(points, key) {
  const available = points.filter((point) => finiteValue(point, key) != null);
  const first = Number(available[0]?.[key] ?? 0);
  const latest = Number(available.at(-1)?.[key] ?? 0);
  const change = latest - first;
  const changePercent = first === 0 ? 0 : (change / Math.abs(first)) * 100;
  return { first, latest, change, changePercent };
}

function valueStats(points, key) {
  const available = points.filter((point) => finiteValue(point, key) != null);
  const first = Number(available[0]?.[key] ?? 0);
  const latest = Number(available.at(-1)?.[key] ?? 0);
  return { first, latest, change: latest - first };
}

function signedNumber(value, digits = 0) {
  const numberValue = Number(value ?? 0);
  const sign = numberValue >= 0 ? "+" : "-";
  return `${sign}${number(Math.abs(numberValue), digits)}`;
}

function signedPercent(value) {
  const numberValue = Number(value ?? 0);
  const sign = numberValue >= 0 ? "+" : "-";
  return `${sign}${Math.abs(numberValue).toFixed(2)} pct`;
}

function metric(point, key) {
  return Number(point?.[key] ?? 0);
}

function exclusiveBucketValues(point) {
  return [
    {
      label: text.under1,
      holders: metric(point, "under_1_lot_holders"),
      shares: metric(point, "under_1_lot_shares"),
      percentage: metric(point, "under_1_lot_percentage")
    },
    {
      label: text.from1To10,
      holders: metric(point, "over_1_lot_holders") - metric(point, "over_10_lot_holders"),
      shares: metric(point, "over_1_lot_shares") - metric(point, "over_10_lot_shares"),
      percentage: metric(point, "over_1_lot_percentage") - metric(point, "over_10_lot_percentage")
    },
    {
      label: text.from10To100,
      holders: metric(point, "over_10_lot_holders") - metric(point, "over_100_lot_holders"),
      shares: metric(point, "over_10_lot_shares") - metric(point, "over_100_lot_shares"),
      percentage: metric(point, "over_10_lot_percentage") - metric(point, "over_100_lot_percentage")
    },
    {
      label: text.from100To400,
      holders: metric(point, "over_100_lot_holders") - metric(point, "over_400_lot_holders"),
      shares: metric(point, "over_100_lot_shares") - metric(point, "over_400_lot_shares"),
      percentage: metric(point, "over_100_lot_percentage") - metric(point, "over_400_lot_percentage")
    },
    {
      label: text.from400To1000,
      holders: metric(point, "over_400_lot_holders") - metric(point, "large_holders"),
      shares: metric(point, "over_400_lot_shares") - metric(point, "large_shares"),
      percentage: metric(point, "over_400_lot_percentage") - metric(point, "large_percentage")
    },
    {
      label: text.over1000,
      holders: metric(point, "large_holders"),
      shares: metric(point, "large_shares"),
      percentage: metric(point, "large_percentage")
    }
  ];
}

function exclusiveBucketChanges(points) {
  const first = points.at(-2) ?? points[0];
  const latest = points.at(-1);
  const firstBuckets = exclusiveBucketValues(first);
  const latestBuckets = exclusiveBucketValues(latest);
  return latestBuckets.map((bucket, index) => {
    const baseline = firstBuckets[index];
    return {
      ...bucket,
      holderChange: bucket.holders - baseline.holders,
      lotChange: (bucket.shares - baseline.shares) / 1000,
      percentageChange: bucket.percentage - baseline.percentage
    };
  });
}

function exclusiveTotals(buckets) {
  return buckets.reduce(
    (total, bucket) => ({
      holderChange: total.holderChange + bucket.holderChange,
      lotChange: total.lotChange + bucket.lotChange,
      percentageChange: total.percentageChange + bucket.percentageChange
    }),
    { holderChange: 0, lotChange: 0, percentageChange: 0 }
  );
}

function scaleForSeries(points, items) {
  const values = points.flatMap((point) => items.map((item) => finiteValue(point, item.key))).filter((value) => value != null);
  if (!values.length) return { min: 0, range: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min, range };
}

function percentageScale() {
  return { min: 0, range: 100 };
}

function buildPath(points, key, scale) {
  const available = points.filter((point) => finiteValue(point, key) != null);
  const width = 620;
  const height = 210;
  return available
    .map((point, index) => {
      const x = available.length === 1 ? width / 2 : (index / (available.length - 1)) * width;
      const y = height - ((Number(point[key] ?? 0) - scale.min) / scale.range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function PhisonShareholderTrend() {
  const [trend, setTrend] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState("");
  const scale = useMemo(() => percentageScale(), []);
  const chartSeries = useMemo(() => [...series, ...institutionalSeries], []);
  const exclusiveChanges = useMemo(() => exclusiveBucketChanges(trend), [trend]);
  const exclusiveTotal = useMemo(() => exclusiveTotals(exclusiveChanges), [exclusiveChanges]);
  const exclusiveBaseline = trend.at(-2) ?? trend[0];
  const exclusiveLatest = trend.at(-1);

  useEffect(() => {
    let active = true;
    api
      .getPhisonShareholders()
      .then((data) => {
        if (!active) return;
        const points = data.trend ?? [];
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
          <h2>{text.title}</h2>
          <p>{text.description}</p>
        </div>
        {latest ? <span className="status pill">{text.dataDate} {latest.snapshot_date}</span> : null}
      </div>

      {error ? <p className="status error shareholder-status">{error}</p> : null}

      {trend.length ? (
        <div className="shareholder-body">
          <div className="trend-combined-legend shareholder-legend-grid">
            {series.map((item) => {
              const percentageStats = changeStats(trend, item.key);
              const holderStats = valueStats(trend, item.holderKey);
              const lotStats = valueStats(
                trend.map((point) => ({
                  ...point,
                  [`${item.sharesKey}_lots`]: finiteValue(point, item.sharesKey) == null ? null : Number(point[item.sharesKey]) / 1000
                })),
                `${item.sharesKey}_lots`
              );
              return (
                <div className="trend-stat compact" key={item.key}>
                  <span>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label} {text.percentage}
                  </span>
                  <strong>{percent(percentageStats.latest)}</strong>
                  <small className={percentageStats.change >= 0 ? "gain" : "loss"}>
                    {text.change} {signedNumber(percentageStats.change, 2)} pct / {signedNumber(percentageStats.changePercent, 2)}%
                  </small>
                  <em>{text.latest} {text.holders} {number(holderStats.latest)} / {text.lots} {number(lotStats.latest)}</em>
                  <em className={holderStats.change >= 0 ? "gain" : "loss"}>{text.change} {text.holders} {signedNumber(holderStats.change)}</em>
                  <em className={lotStats.change >= 0 ? "gain" : "loss"}>{text.change} {text.lots} {signedNumber(lotStats.change)}</em>
                </div>
              );
            })}
            {institutionalSeries.map((item) => {
              const percentageStats = changeStats(trend, item.key);
              const lotStats = valueStats(trend, item.sharesKey);
              return (
                <div className="trend-stat compact shareholder-institutional-stat" key={item.key}>
                  <span>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label} {text.percentage}
                  </span>
                  <strong>{percent(percentageStats.latest)}</strong>
                  <small className={percentageStats.change >= 0 ? "gain" : "loss"}>
                    {text.change} {signedNumber(percentageStats.change, 2)} pct / {signedNumber(percentageStats.changePercent, 2)}%
                  </small>
                  <em>{text.latest} {text.holdingLots} {number(lotStats.latest)}</em>
                  <em className={lotStats.change >= 0 ? "gain" : "loss"}>{text.change} {text.lots} {signedNumber(lotStats.change)}</em>
                </div>
              );
            })}
          </div>
          <svg className="trend-chart shareholder-chart" viewBox="0 0 640 250" role="img" aria-label={text.chartLabel}>
            <line x1="10" y1="230" x2="630" y2="230" stroke="#e7e7e7" />
            <line x1="10" y1="20" x2="630" y2="20" stroke="#ececec" />
            <line x1="10" y1="125" x2="630" y2="125" stroke="#ececec" />
            <text x="612" y="17" fill="#8b8b8b" fontSize="12" fontWeight="800">100%</text>
            <text x="618" y="121" fill="#8b8b8b" fontSize="12" fontWeight="800">50%</text>
            <text x="624" y="244" fill="#8b8b8b" fontSize="12" fontWeight="800">0%</text>
            <g transform="translate(10 10)">
              {chartSeries.map((item) => (
                <path d={buildPath(trend, item.key, scale)} fill="none" key={item.key} stroke={item.color} strokeLinecap="round" strokeWidth="4" />
              ))}
            </g>
          </svg>
          <div className="trend-card-foot shareholder-foot">
            <span>{labelForDate(trend[0]?.snapshot_date)}</span>
            <span>{trend.length} {text.records}</span>
            <span>{labelForDate(trend.at(-1)?.snapshot_date)}</span>
          </div>
          <div className="shareholder-exclusive">
            <div className="shareholder-exclusive-head">
              <strong>{text.exclusiveTitle}</strong>
              <span>{exclusiveBaseline?.snapshot_date} - {exclusiveLatest?.snapshot_date}</span>
            </div>
            <div className="shareholder-exclusive-table">
              <div className="shareholder-exclusive-row heading">
                <span>{text.range}</span>
                <span>{text.percentage}</span>
                <span>{text.holders}</span>
                <span>{text.latestLots}</span>
                <span>{text.lotChange}</span>
              </div>
              {exclusiveChanges.map((bucket) => (
                <div className="shareholder-exclusive-row" key={bucket.label}>
                  <strong>{bucket.label}</strong>
                  <span className={bucket.percentageChange >= 0 ? "gain" : "loss"}>{signedPercent(bucket.percentageChange)}</span>
                  <span className={bucket.holderChange >= 0 ? "gain" : "loss"}>{signedNumber(bucket.holderChange)}</span>
                  <span>{number(bucket.shares / 1000)}</span>
                  <span className={bucket.lotChange >= 0 ? "gain" : "loss"}>{signedNumber(bucket.lotChange)}</span>
                </div>
              ))}
              <div className="shareholder-exclusive-row total">
                <strong>{text.total}</strong>
                <span className={exclusiveTotal.percentageChange >= 0 ? "gain" : "loss"}>{signedPercent(exclusiveTotal.percentageChange)}</span>
                <span className={exclusiveTotal.holderChange >= 0 ? "gain" : "loss"}>{signedNumber(exclusiveTotal.holderChange)}</span>
                <span>{number(metric(trend.at(-1), "total_shares") / 1000)}</span>
                <span className={exclusiveTotal.lotChange >= 0 ? "gain" : "loss"}>{signedNumber(exclusiveTotal.lotChange)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : !error ? (
        <div className="trend-empty">{text.loading}</div>
      ) : null}
    </section>
  );
}
