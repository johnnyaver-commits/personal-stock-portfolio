import { getSql, hasDatabaseUrl } from "@/lib/db";
import { listHoldings } from "@/lib/store";

let memoryReport = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nextMonday(date = new Date()) {
  const result = new Date(date);
  const day = result.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  result.setUTCDate(result.getUTCDate() + daysUntilMonday);
  return result.toISOString().slice(0, 10);
}

function scoreHolding(holding, currencyTotal) {
  const pnlPercent = Number(holding.unrealized_pnl_percent ?? 0);
  const marketValue = Number(holding.market_value ?? 0);
  const concentration = currencyTotal > 0 ? (marketValue / currencyTotal) * 100 : 0;
  let trendScore = 0;
  if (pnlPercent < -8) trendScore = clamp(pnlPercent * 1.5, -35, -10);
  else if (pnlPercent <= 3) trendScore = pnlPercent;
  else if (pnlPercent <= 15) trendScore = pnlPercent;
  else if (pnlPercent <= 30) trendScore = 6;
  else trendScore = -clamp((pnlPercent - 30) * 0.25, 5, 25);

  const concentrationPenalty = concentration > 35 ? Math.min(20, (concentration - 35) * 0.7) : 0;
  const score = Math.round(clamp(55 + trendScore - concentrationPenalty, 0, 100));

  let action = "持有觀察";
  if (score >= 63 && pnlPercent >= 3 && pnlPercent <= 20 && concentration <= 25) action = "分批加碼觀察";
  if (score < 45) action = "暫緩加碼";

  const reasons = [];
  if (pnlPercent > 30) reasons.push(`目前相對付出成本上漲 ${pnlPercent.toFixed(1)}%，漲幅偏大，避免追高`);
  else if (pnlPercent >= 8) reasons.push(`目前相對付出成本上漲 ${pnlPercent.toFixed(1)}%，趨勢偏強`);
  else if (pnlPercent <= -8) reasons.push(`目前相對付出成本下跌 ${Math.abs(pnlPercent).toFixed(1)}%，需等待止跌訊號`);
  else reasons.push("目前現值接近付出成本，方向尚未明確");

  if (concentration > 35) reasons.push(`占同幣別資產 ${concentration.toFixed(1)}%，集中度偏高`);
  else reasons.push(`占同幣別資產 ${concentration.toFixed(1)}%，集中度尚可`);

  return {
    symbol: holding.symbol,
    name: holding.name,
    owner_name: holding.owner_name,
    currency: holding.currency,
    current_price: Number(holding.current_price),
    avg_cost: Number(holding.avg_cost),
    unrealized_pnl_percent: pnlPercent,
    concentration_percent: Number(concentration.toFixed(2)),
    score,
    action,
    reasons
  };
}

function buildReport(holdings) {
  const totals = holdings.reduce(
    (result, holding) => {
      const currency = holding.currency === "TWD" ? "TWD" : "USD";
      result[currency] += Number(holding.market_value ?? 0);
      return result;
    },
    { TWD: 0, USD: 0 }
  );

  const recommendations = holdings
    .map((holding) => scoreHolding(holding, totals[holding.currency === "TWD" ? "TWD" : "USD"]))
    .sort((a, b) => b.score - a.score);

  return {
    generated_at: new Date().toISOString(),
    week_start: nextMonday(),
    summary: recommendations.length
      ? `本週分析 ${recommendations.length} 筆持股；優先研究高分標的，集中度過高或趨勢偏弱者暫緩加碼。`
      : "目前沒有持股可供分析。",
    recommendations,
    disclaimer: "此內容為量化研究參考，不保證獲利，也不構成投資建議。請自行評估資金配置與風險。"
  };
}

async function ensureAnalysisTable() {
  if (!hasDatabaseUrl()) return;
  await getSql()`
    CREATE TABLE IF NOT EXISTS portfolio_weekly_analysis (
      id BIGSERIAL PRIMARY KEY,
      week_start DATE NOT NULL UNIQUE,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      report JSONB NOT NULL
    )
  `;
}

export async function generateWeeklyAnalysis() {
  const report = buildReport(await listHoldings());

  if (!hasDatabaseUrl()) {
    memoryReport = report;
    return report;
  }

  await ensureAnalysisTable();
  const [row] = await getSql()`
    INSERT INTO portfolio_weekly_analysis (week_start, generated_at, report)
    VALUES (${report.week_start}, ${report.generated_at}, ${JSON.stringify(report)}::jsonb)
    ON CONFLICT (week_start) DO UPDATE SET
      generated_at = EXCLUDED.generated_at,
      report = EXCLUDED.report
    RETURNING report
  `;
  return row.report;
}

export async function getLatestWeeklyAnalysis() {
  if (!hasDatabaseUrl()) return memoryReport;

  await ensureAnalysisTable();
  const rows = await getSql()`
    SELECT report
    FROM portfolio_weekly_analysis
    ORDER BY week_start DESC
    LIMIT 1
  `;
  return rows[0]?.report ?? null;
}
