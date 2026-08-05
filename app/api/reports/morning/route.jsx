import { ImageResponse } from "next/og";
import { getMorningReportData, formatNumber, formatPercent } from "@/lib/market-data";

export const runtime = "edge";

const box = { background: "#ffffff", border: "2px solid #dbeafe", borderRadius: 24, padding: "22px 26px", display: "flex", flexDirection: "column" };

function MetricRow({ item }) {
  const positive = (item?.changePercent ?? 0) >= 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #e5e7eb", fontSize: 26 }}>
      <span style={{ color: "#1f2937" }}>{item?.label}</span>
      <div style={{ display: "flex", gap: 16 }}>
        <span style={{ color: "#111827", fontWeight: 700 }}>{formatNumber(item?.price)}</span>
        <span style={{ color: positive ? "#dc2626" : "#059669", fontWeight: 700 }}>{formatPercent(item?.changePercent)}</span>
      </div>
    </div>
  );
}

export async function GET() {
  let data;
  try {
    data = await getMorningReportData();
  } catch (error) {
    data = { indices: [], tech: [], macro: [], sentiment: "資料更新中", error: error.message };
  }
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(new Date());
  const tsm = data.tech.find((q) => q?.label === "台積電 ADR");
  const sox = data.indices.find((q) => q?.label === "費半");
  const vix = data.macro.find((q) => q?.label === "VIX");
  const observation = data.sentiment === "偏多"
    ? "美股科技股氣氛偏多，台股開盤可優先觀察台積電、AI伺服器與半導體族群。"
    : data.sentiment === "偏空"
      ? "美股科技股承壓，今日台股宜控制追價，留意權值股與高估值AI股波動。"
      : "市場呈現震盪，今日台股可能個股表現，優先觀察量價與台積電走勢。";

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#f8fbff", padding: "58px 52px", display: "flex", flexDirection: "column", color: "#111827", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 58, fontWeight: 800, color: "#1d4ed8" }}>☀️ 老爸早安股市快報</div>
          <div style={{ fontSize: 26, color: "#64748b", marginTop: 10 }}>{date}｜市場情緒：{data.sentiment}</div>
        </div>
        <div style={{ fontSize: 70 }}>📈</div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 30 }}>
        <div style={{ ...box, flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#ea580c", marginBottom: 8 }}>🇺🇸 美國四大指數</div>
          {data.indices.map((item) => <MetricRow key={item.label} item={item} />)}
        </div>
        <div style={{ ...box, flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#7c3aed", marginBottom: 8 }}>🌍 商品與指標</div>
          {data.macro.slice(0, 5).map((item) => <MetricRow key={item.label} item={item} />)}
        </div>
      </div>

      <div style={{ ...box, marginTop: 22 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#059669", marginBottom: 8 }}>💻 重要科技股</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {data.tech.map((item) => {
            const positive = (item?.changePercent ?? 0) >= 0;
            return (
              <div key={item.label} style={{ width: "23%", background: positive ? "#fff1f2" : "#ecfdf5", borderRadius: 18, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 23, color: "#334155" }}>{item.label}</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: positive ? "#dc2626" : "#059669", marginTop: 6 }}>{formatPercent(item.changePercent)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
        <div style={{ ...box, flex: 1, background: "#eff6ff" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8" }}>🔎 今日台股觀察</div>
          <div style={{ fontSize: 27, lineHeight: 1.5, marginTop: 14 }}>{observation}</div>
        </div>
        <div style={{ ...box, width: "36%", background: "#fffbeb" }}>
          <div style={{ fontSize: 26, color: "#92400e" }}>關鍵訊號</div>
          <div style={{ fontSize: 24, marginTop: 12 }}>台積電ADR：{formatPercent(tsm?.changePercent)}</div>
          <div style={{ fontSize: 24, marginTop: 8 }}>費半：{formatPercent(sox?.changePercent)}</div>
          <div style={{ fontSize: 24, marginTop: 8 }}>VIX：{formatNumber(vix?.price)}</div>
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 20 }}>
        <span>資料來源：Yahoo Finance｜自動產生，非投資建議</span>
        <span>Johnny AI Investment Agent</span>
      </div>
    </div>,
    { width: 1080, height: 1920 },
  );
}
