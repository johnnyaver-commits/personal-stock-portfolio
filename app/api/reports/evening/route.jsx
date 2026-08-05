import { ImageResponse } from "next/og";
import { getEveningReportData, formatNumber, formatPercent, formatVolume } from "@/lib/market-data";

export const runtime = "edge";

const card = { background: "#ffffff", border: "2px solid #dbeafe", borderRadius: 24, padding: "22px 26px", display: "flex", flexDirection: "column" };

export async function GET() {
  let data;
  try {
    data = await getEveningReportData();
  } catch (error) {
    data = { etf: [], markets: [], target: null, premiumDiscount: null, nav: null, error: error.message };
  }

  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(new Date());
  const target = data.target;
  const targetMove = target?.changePercent ?? 0;
  const risk = Math.abs(targetMove) >= 2 ? "偏高" : "中性";

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#f8fbff", padding: "56px 52px", display: "flex", flexDirection: "column", color: "#111827", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#1d4ed8" }}>📊 每日 AI 投資日報</div>
          <div style={{ fontSize: 26, color: "#64748b", marginTop: 10 }}>{date}｜收盤版｜風險：{risk}</div>
        </div>
        <div style={{ fontSize: 68 }}>🤖</div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 30 }}>
        <div style={{ ...card, flex: 1, background: "#eff6ff" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1d4ed8" }}>009826 今日追蹤</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 23, color: "#64748b" }}>收盤價</span>
              <span style={{ fontSize: 48, fontWeight: 800 }}>{formatNumber(target?.price)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 23, color: "#64748b" }}>漲跌幅</span>
              <span style={{ fontSize: 42, fontWeight: 800, color: targetMove >= 0 ? "#dc2626" : "#059669" }}>{formatPercent(target?.changePercent)}</span>
            </div>
          </div>
          <div style={{ fontSize: 25, marginTop: 18 }}>成交量：{formatVolume(target?.volume)}</div>
          <div style={{ fontSize: 24, marginTop: 10 }}>NAV：官方資料更新中</div>
          <div style={{ fontSize: 24, marginTop: 8 }}>折溢價：官方淨值取得後計算</div>
        </div>
        <div style={{ ...card, width: "39%", background: "#fffbeb" }}>
          <div style={{ fontSize: 29, fontWeight: 800, color: "#92400e" }}>🌏 全球市場</div>
          {data.markets.map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #fde68a", fontSize: 25 }}>
              <span>{item.label}</span>
              <span style={{ fontWeight: 800, color: (item.changePercent ?? 0) >= 0 ? "#dc2626" : "#059669" }}>{formatPercent(item.changePercent)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginTop: 22 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#059669" }}>ETF 表現比較</div>
        <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
          {data.etf.map((item) => (
            <div key={item.label} style={{ flex: 1, background: "#f8fafc", borderRadius: 18, padding: "18px", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 25, fontWeight: 700 }}>{item.label}</span>
              <span style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{formatNumber(item.price)}</span>
              <span style={{ fontSize: 27, fontWeight: 800, color: (item.changePercent ?? 0) >= 0 ? "#dc2626" : "#059669", marginTop: 4 }}>{formatPercent(item.changePercent)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
        <div style={{ ...card, flex: 1 }}>
          <div style={{ fontSize: 29, fontWeight: 800, color: "#7c3aed" }}>🤖 AI／半導體觀察</div>
          <div style={{ fontSize: 27, lineHeight: 1.55, marginTop: 14 }}>
            費半與大型科技股仍是風險偏好的核心指標。若費半轉強且美債殖利率穩定，台灣 AI 供應鏈的評價修復機率提高。
          </div>
        </div>
        <div style={{ ...card, flex: 1, background: "#ecfdf5" }}>
          <div style={{ fontSize: 29, fontWeight: 800, color: "#047857" }}>⭐ 長期策略</div>
          <div style={{ fontSize: 27, lineHeight: 1.55, marginTop: 14 }}>
            009826 適合全球核心配置，建議定期定額與分批布局；短線若出現明顯溢價，避免追價，優先等待市價回歸淨值。
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 22, background: "#eef2ff" }}>
        <div style={{ fontSize: 27, color: "#4338ca", fontWeight: 800 }}>🎯 今日一句話</div>
        <div style={{ fontSize: 31, lineHeight: 1.5, marginTop: 10 }}>全球分散是底座，AI 成長是引擎；紀律投入比追逐單日漲跌更重要。</div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 20 }}>
        <span>資料來源：Yahoo Finance｜NAV與折溢價待官方資料串接</span>
        <span>Johnny AI Investment Agent</span>
      </div>
    </div>,
    { width: 1080, height: 1920 },
  );
}
