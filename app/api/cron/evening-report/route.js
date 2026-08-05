import { NextResponse } from "next/server";
import { pushLineMessages, reportImageUrls } from "@/lib/line-push";

function authorized(request) {
  const secret = process.env.PUSH_API_SECRET;
  const auth = request.headers.get("authorization");
  const custom = request.headers.get("x-push-secret");
  return Boolean(secret && (auth === `Bearer ${secret}` || custom === secret));
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const images = reportImageUrls("/api/reports/evening");
    await pushLineMessages([
      { type: "image", ...images },
      { type: "text", text: "📊 每日 AI 投資日報已更新\n包含 009826、ETF 比較與長期投資觀察。" },
    ]);
    return NextResponse.json({ ok: true, report: "evening", ...images });
  } catch (error) {
    console.error("Evening report push failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
