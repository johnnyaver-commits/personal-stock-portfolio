import { getSql, hasDatabaseUrl } from "@/lib/db";

const TDCC_SHAREHOLDER_URL = "https://openapi.tdcc.com.tw/v1/opendata/1-5";
const PHISON_SYMBOL = "8299";
const UNDER_1_LOT_LEVEL = "1";
const LARGE_HOLDER_LEVEL = "15";
const TOTAL_LEVEL = "17";
const CACHE_TTL_MS = 60 * 60 * 1000;

const CUMULATIVE_BUCKETS = [
  { prefix: "over_1_lot", minLevel: 2 },
  { prefix: "over_10_lot", minLevel: 4 },
  { prefix: "over_100_lot", minLevel: 10 },
  { prefix: "over_400_lot", minLevel: 12 }
];

const BASELINE_SNAPSHOT = {
  symbol: PHISON_SYMBOL,
  name: "群聯",
  snapshot_date: "2026-06-05",
  large_holders: 35,
  large_shares: 83844554,
  large_percentage: 37.91,
  under_1_lot_holders: 140840,
  under_1_lot_shares: 11649000,
  under_1_lot_percentage: 5.26,
  over_1_lot_holders: 23890,
  over_1_lot_shares: 209472000,
  over_1_lot_percentage: 94.74,
  over_10_lot_holders: 1434,
  over_10_lot_shares: 164240000,
  over_10_lot_percentage: 74.23,
  over_100_lot_holders: 198,
  over_100_lot_shares: 131062000,
  over_100_lot_percentage: 59.24,
  over_400_lot_holders: 72,
  over_400_lot_shares: 106880000,
  over_400_lot_percentage: 48.31,
  total_holders: 164730,
  total_shares: 221121000,
  source: "TDCC",
  frequency: "weekly"
};

const JUNE_12_SNAPSHOT = {
  symbol: PHISON_SYMBOL,
  name: "群聯",
  snapshot_date: "2026-06-12",
  large_holders: 31,
  large_shares: 79408698,
  large_percentage: 35.9,
  under_1_lot_holders: 150823,
  under_1_lot_shares: 12937700,
  under_1_lot_percentage: 5.84,
  over_1_lot_holders: 24746,
  over_1_lot_shares: 208227547,
  over_1_lot_percentage: 94.1,
  over_10_lot_holders: 1411,
  over_10_lot_shares: 160439086,
  over_10_lot_percentage: 72.5,
  over_100_lot_holders: 198,
  over_100_lot_shares: 127722608,
  over_100_lot_percentage: 57.72,
  over_400_lot_holders: 67,
  over_400_lot_shares: 102177102,
  over_400_lot_percentage: 46.18,
  total_holders: 175569,
  total_shares: 221165247,
  source: "TDCC",
  frequency: "weekly"
};

const HISTORICAL_SNAPSHOTS = [BASELINE_SNAPSHOT, JUNE_12_SNAPSHOT];

let latestCache = null;

function numeric(value) {
  return Number(String(value ?? "0").replace(/,/g, ""));
}

function dateFromTdcc(value) {
  const text = String(value ?? "");
  if (!/^\d{8}$/.test(text)) return new Date().toISOString().slice(0, 10);
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const [codeKey, pctKey, holdersKey, dateKey, sharesKey, levelKey] = keys;

  return rows
    .filter((row) => String(row[codeKey] ?? "").trim() === PHISON_SYMBOL)
    .map((row) => ({
      date: dateFromTdcc(row[dateKey]),
      level: String(row[levelKey] ?? "").trim(),
      holders: numeric(row[holdersKey]),
      shares: numeric(row[sharesKey]),
      percentage: numeric(row[pctKey])
    }));
}

function cumulativeBucketValues(rows) {
  return Object.fromEntries(
    CUMULATIVE_BUCKETS.flatMap((bucket) => {
      const bucketRows = rows.filter((row) => Number(row.level) >= bucket.minLevel && Number(row.level) < Number(TOTAL_LEVEL));
      const holders = bucketRows.reduce((sum, row) => sum + Number(row.holders ?? 0), 0);
      const shares = bucketRows.reduce((sum, row) => sum + Number(row.shares ?? 0), 0);
      const percentage = bucketRows.reduce((sum, row) => sum + Number(row.percentage ?? 0), 0);
      return [
        [`${bucket.prefix}_holders`, holders],
        [`${bucket.prefix}_shares`, shares],
        [`${bucket.prefix}_percentage`, Number(percentage.toFixed(4))]
      ];
    })
  );
}

async function fetchLatestPhisonLargeHolders() {
  if (latestCache && Date.now() - latestCache.createdAt < CACHE_TTL_MS) return latestCache.data;

  const response = await fetch(TDCC_SHAREHOLDER_URL, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 portfolio-dashboard"
    }
  });

  if (!response.ok) throw new Error("TDCC shareholder data unavailable");

  const rows = normalizeRows(await response.json());
  const underOneLot = rows.find((row) => row.level === UNDER_1_LOT_LEVEL);
  const largeHolder = rows.find((row) => row.level === LARGE_HOLDER_LEVEL);
  const total = rows.find((row) => row.level === TOTAL_LEVEL);
  if (!largeHolder) throw new Error("Phison large-holder data not found");

  const data = {
    symbol: PHISON_SYMBOL,
    name: "群聯",
    snapshot_date: largeHolder.date,
    large_holders: largeHolder.holders,
    large_shares: largeHolder.shares,
    large_percentage: largeHolder.percentage,
    under_1_lot_holders: underOneLot?.holders ?? null,
    under_1_lot_shares: underOneLot?.shares ?? null,
    under_1_lot_percentage: underOneLot?.percentage ?? null,
    ...cumulativeBucketValues(rows),
    total_holders: total?.holders ?? null,
    total_shares: total?.shares ?? null,
    source: "TDCC",
    frequency: "weekly"
  };

  latestCache = { createdAt: Date.now(), data };
  return data;
}

function nullableNumber(value) {
  return value == null ? null : Number(value);
}

function toTrendRow(row) {
  return {
    symbol: row.symbol,
    name: row.name ?? "群聯",
    snapshot_date: row.snapshot_date instanceof Date ? row.snapshot_date.toISOString().slice(0, 10) : String(row.snapshot_date).slice(0, 10),
    large_holders: Number(row.large_holders ?? 0),
    large_shares: Number(row.large_shares ?? 0),
    large_percentage: Number(row.large_percentage ?? 0),
    under_1_lot_holders: nullableNumber(row.under_1_lot_holders),
    under_1_lot_shares: nullableNumber(row.under_1_lot_shares),
    under_1_lot_percentage: nullableNumber(row.under_1_lot_percentage),
    over_1_lot_holders: nullableNumber(row.over_1_lot_holders),
    over_1_lot_shares: nullableNumber(row.over_1_lot_shares),
    over_1_lot_percentage: nullableNumber(row.over_1_lot_percentage),
    over_10_lot_holders: nullableNumber(row.over_10_lot_holders),
    over_10_lot_shares: nullableNumber(row.over_10_lot_shares),
    over_10_lot_percentage: nullableNumber(row.over_10_lot_percentage),
    over_100_lot_holders: nullableNumber(row.over_100_lot_holders),
    over_100_lot_shares: nullableNumber(row.over_100_lot_shares),
    over_100_lot_percentage: nullableNumber(row.over_100_lot_percentage),
    over_400_lot_holders: nullableNumber(row.over_400_lot_holders),
    over_400_lot_shares: nullableNumber(row.over_400_lot_shares),
    over_400_lot_percentage: nullableNumber(row.over_400_lot_percentage),
    total_holders: nullableNumber(row.total_holders),
    total_shares: nullableNumber(row.total_shares),
    source: row.source ?? "TDCC",
    frequency: row.frequency ?? "weekly"
  };
}

async function ensureShareholderSchema() {
  if (!hasDatabaseUrl()) return;

  await getSql()`
    CREATE TABLE IF NOT EXISTS portfolio_shareholder_snapshots (
      id BIGSERIAL PRIMARY KEY,
      symbol VARCHAR(16) NOT NULL,
      name VARCHAR(80) NOT NULL,
      snapshot_date DATE NOT NULL,
      large_holders NUMERIC(20, 6) NOT NULL DEFAULT 0,
      large_shares NUMERIC(20, 6) NOT NULL DEFAULT 0,
      large_percentage NUMERIC(10, 4) NOT NULL DEFAULT 0,
      under_1_lot_holders NUMERIC(20, 6),
      under_1_lot_shares NUMERIC(20, 6),
      under_1_lot_percentage NUMERIC(10, 4),
      over_1_lot_holders NUMERIC(20, 6),
      over_1_lot_shares NUMERIC(20, 6),
      over_1_lot_percentage NUMERIC(10, 4),
      over_10_lot_holders NUMERIC(20, 6),
      over_10_lot_shares NUMERIC(20, 6),
      over_10_lot_percentage NUMERIC(10, 4),
      over_100_lot_holders NUMERIC(20, 6),
      over_100_lot_shares NUMERIC(20, 6),
      over_100_lot_percentage NUMERIC(10, 4),
      over_400_lot_holders NUMERIC(20, 6),
      over_400_lot_shares NUMERIC(20, 6),
      over_400_lot_percentage NUMERIC(10, 4),
      total_holders NUMERIC(20, 6),
      total_shares NUMERIC(20, 6),
      source VARCHAR(40) NOT NULL DEFAULT 'TDCC',
      frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (symbol, snapshot_date)
    )
  `;

  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS under_1_lot_holders NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS under_1_lot_shares NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS under_1_lot_percentage NUMERIC(10, 4)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_1_lot_holders NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_1_lot_shares NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_1_lot_percentage NUMERIC(10, 4)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_10_lot_holders NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_10_lot_shares NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_10_lot_percentage NUMERIC(10, 4)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_100_lot_holders NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_100_lot_shares NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_100_lot_percentage NUMERIC(10, 4)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_400_lot_holders NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_400_lot_shares NUMERIC(20, 6)`;
  await getSql()`ALTER TABLE portfolio_shareholder_snapshots ADD COLUMN IF NOT EXISTS over_400_lot_percentage NUMERIC(10, 4)`;
}

async function backfillBaselineSnapshot() {
  for (const snapshot of HISTORICAL_SNAPSHOTS) {
    await getSql()`
    INSERT INTO portfolio_shareholder_snapshots (
      symbol,
      name,
      snapshot_date,
      large_holders,
      large_shares,
      large_percentage,
      under_1_lot_holders,
      under_1_lot_shares,
      under_1_lot_percentage,
      over_1_lot_holders,
      over_1_lot_shares,
      over_1_lot_percentage,
      over_10_lot_holders,
      over_10_lot_shares,
      over_10_lot_percentage,
      over_100_lot_holders,
      over_100_lot_shares,
      over_100_lot_percentage,
      over_400_lot_holders,
      over_400_lot_shares,
      over_400_lot_percentage,
      total_holders,
      total_shares,
      source,
      frequency
    )
    VALUES (
      ${snapshot.symbol},
      ${snapshot.name},
      ${snapshot.snapshot_date},
      ${snapshot.large_holders},
      ${snapshot.large_shares},
      ${snapshot.large_percentage},
      ${snapshot.under_1_lot_holders},
      ${snapshot.under_1_lot_shares},
      ${snapshot.under_1_lot_percentage},
      ${snapshot.over_1_lot_holders},
      ${snapshot.over_1_lot_shares},
      ${snapshot.over_1_lot_percentage},
      ${snapshot.over_10_lot_holders},
      ${snapshot.over_10_lot_shares},
      ${snapshot.over_10_lot_percentage},
      ${snapshot.over_100_lot_holders},
      ${snapshot.over_100_lot_shares},
      ${snapshot.over_100_lot_percentage},
      ${snapshot.over_400_lot_holders},
      ${snapshot.over_400_lot_shares},
      ${snapshot.over_400_lot_percentage},
      ${snapshot.total_holders},
      ${snapshot.total_shares},
      ${snapshot.source},
      ${snapshot.frequency}
    )
    ON CONFLICT (symbol, snapshot_date) DO UPDATE SET
      name = EXCLUDED.name,
      large_holders = EXCLUDED.large_holders,
      large_shares = EXCLUDED.large_shares,
      large_percentage = EXCLUDED.large_percentage,
      under_1_lot_holders = EXCLUDED.under_1_lot_holders,
      under_1_lot_shares = EXCLUDED.under_1_lot_shares,
      under_1_lot_percentage = EXCLUDED.under_1_lot_percentage,
      over_1_lot_holders = EXCLUDED.over_1_lot_holders,
      over_1_lot_shares = EXCLUDED.over_1_lot_shares,
      over_1_lot_percentage = EXCLUDED.over_1_lot_percentage,
      over_10_lot_holders = EXCLUDED.over_10_lot_holders,
      over_10_lot_shares = EXCLUDED.over_10_lot_shares,
      over_10_lot_percentage = EXCLUDED.over_10_lot_percentage,
      over_100_lot_holders = EXCLUDED.over_100_lot_holders,
      over_100_lot_shares = EXCLUDED.over_100_lot_shares,
      over_100_lot_percentage = EXCLUDED.over_100_lot_percentage,
      over_400_lot_holders = EXCLUDED.over_400_lot_holders,
      over_400_lot_shares = EXCLUDED.over_400_lot_shares,
      over_400_lot_percentage = EXCLUDED.over_400_lot_percentage,
      total_holders = EXCLUDED.total_holders,
      total_shares = EXCLUDED.total_shares,
      source = EXCLUDED.source,
      frequency = EXCLUDED.frequency,
      updated_at = NOW()
  `;
  }
}

export async function listPhisonShareholderTrend() {
  const latest = await fetchLatestPhisonLargeHolders();

  if (!hasDatabaseUrl()) {
    return { latest, trend: [latest] };
  }

  await ensureShareholderSchema();
  await backfillBaselineSnapshot();
  await getSql()`
    INSERT INTO portfolio_shareholder_snapshots (
      symbol,
      name,
      snapshot_date,
      large_holders,
      large_shares,
      large_percentage,
      under_1_lot_holders,
      under_1_lot_shares,
      under_1_lot_percentage,
      over_1_lot_holders,
      over_1_lot_shares,
      over_1_lot_percentage,
      over_10_lot_holders,
      over_10_lot_shares,
      over_10_lot_percentage,
      over_100_lot_holders,
      over_100_lot_shares,
      over_100_lot_percentage,
      over_400_lot_holders,
      over_400_lot_shares,
      over_400_lot_percentage,
      total_holders,
      total_shares,
      source,
      frequency
    )
    VALUES (
      ${latest.symbol},
      ${latest.name},
      ${latest.snapshot_date},
      ${latest.large_holders},
      ${latest.large_shares},
      ${latest.large_percentage},
      ${latest.under_1_lot_holders},
      ${latest.under_1_lot_shares},
      ${latest.under_1_lot_percentage},
      ${latest.over_1_lot_holders},
      ${latest.over_1_lot_shares},
      ${latest.over_1_lot_percentage},
      ${latest.over_10_lot_holders},
      ${latest.over_10_lot_shares},
      ${latest.over_10_lot_percentage},
      ${latest.over_100_lot_holders},
      ${latest.over_100_lot_shares},
      ${latest.over_100_lot_percentage},
      ${latest.over_400_lot_holders},
      ${latest.over_400_lot_shares},
      ${latest.over_400_lot_percentage},
      ${latest.total_holders},
      ${latest.total_shares},
      ${latest.source},
      ${latest.frequency}
    )
    ON CONFLICT (symbol, snapshot_date) DO UPDATE SET
      name = EXCLUDED.name,
      large_holders = EXCLUDED.large_holders,
      large_shares = EXCLUDED.large_shares,
      large_percentage = EXCLUDED.large_percentage,
      under_1_lot_holders = EXCLUDED.under_1_lot_holders,
      under_1_lot_shares = EXCLUDED.under_1_lot_shares,
      under_1_lot_percentage = EXCLUDED.under_1_lot_percentage,
      over_1_lot_holders = EXCLUDED.over_1_lot_holders,
      over_1_lot_shares = EXCLUDED.over_1_lot_shares,
      over_1_lot_percentage = EXCLUDED.over_1_lot_percentage,
      over_10_lot_holders = EXCLUDED.over_10_lot_holders,
      over_10_lot_shares = EXCLUDED.over_10_lot_shares,
      over_10_lot_percentage = EXCLUDED.over_10_lot_percentage,
      over_100_lot_holders = EXCLUDED.over_100_lot_holders,
      over_100_lot_shares = EXCLUDED.over_100_lot_shares,
      over_100_lot_percentage = EXCLUDED.over_100_lot_percentage,
      over_400_lot_holders = EXCLUDED.over_400_lot_holders,
      over_400_lot_shares = EXCLUDED.over_400_lot_shares,
      over_400_lot_percentage = EXCLUDED.over_400_lot_percentage,
      total_holders = EXCLUDED.total_holders,
      total_shares = EXCLUDED.total_shares,
      source = EXCLUDED.source,
      frequency = EXCLUDED.frequency,
      updated_at = NOW()
  `;

  const rows = await getSql()`
    SELECT
      symbol,
      name,
      snapshot_date,
      large_holders,
      large_shares,
      large_percentage,
      under_1_lot_holders,
      under_1_lot_shares,
      under_1_lot_percentage,
      over_1_lot_holders,
      over_1_lot_shares,
      over_1_lot_percentage,
      over_10_lot_holders,
      over_10_lot_shares,
      over_10_lot_percentage,
      over_100_lot_holders,
      over_100_lot_shares,
      over_100_lot_percentage,
      over_400_lot_holders,
      over_400_lot_shares,
      over_400_lot_percentage,
      total_holders,
      total_shares,
      source,
      frequency
    FROM portfolio_shareholder_snapshots
    WHERE symbol = ${PHISON_SYMBOL}
    ORDER BY snapshot_date ASC
  `;

  const trend = rows.map(toTrendRow);
  return { latest: trend.at(-1) ?? latest, trend };
}
