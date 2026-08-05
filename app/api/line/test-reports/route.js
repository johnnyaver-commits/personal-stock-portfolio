import { NextResponse } from "next/server";
import { pushLineMessages, reportImageUrl } from "@/lib/line-push";

const TEST_KEY = "first-stage-20260805";

export async function GET(request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== TEST_KEY) return NextResponse.json({ ok: false }, { status: 401 });

  const morning = reportImageUrl("/api/reports/morning");
  const evening = reportImageUrl("/api/reports/evening");
  await pushLineMessages([
    { type: "image", originalContentUrl: morning, previewImageUrl: morning },
    { type: "text", text: "✅ 第一階段測試：早安股市快報" },
    { type: "image", originalContentUrl: evening, previewImageUrl: evening },
    { type: "text", text: "✅ 第一階段測試：每日 AI 投資日報" },
  ]);
  return NextResponse.json({ ok: true });
}
