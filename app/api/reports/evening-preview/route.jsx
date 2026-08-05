import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", weekday: "short" }).format(new Date());
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#eef2ff", color: "#312e81", fontFamily: "sans-serif", padding: 34 }}>
      <div style={{ fontSize: 82 }}>📊</div>
      <div style={{ fontSize: 42, fontWeight: 800, marginTop: 18, textAlign: "center" }}>每日 AI 投資日報</div>
      <div style={{ fontSize: 27, marginTop: 18 }}>{date}</div>
      <div style={{ fontSize: 23, marginTop: 30, color: "#475569", textAlign: "center" }}>009826・ETF比較・AI產業觀察</div>
    </div>,
    { width: 512, height: 512 },
  );
}
