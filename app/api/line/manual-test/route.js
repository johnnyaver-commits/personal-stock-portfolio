import { NextResponse } from "next/server";
import { pushLineMessages, reportImageUrls } from "@/lib/line-push";

const KEY = "manual-test-20260805-1521";

export async function GET(request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== KEY) return NextResponse.json({ ok: false }, { status: 401 });

  const morning = reportImageUrls("/api/reports/morning");
  const evening = reportImageUrls("/api/reports/evening");

  await pushLineMessages([
    { type: "image", ...morning },
    { type: "text", text: "☀️ 第一階段正式版測試：老爸早安股市快報" },
    { type: "image", ...evening },
    { type: "text", text: "📊 第一階段正式版測試：每日 AI 投資日報" },
  ]);

  return NextResponse.json({ ok: true });
}
