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
    const images = reportImageUrls("/api/reports/morning");
    await pushLineMessages([
      { type: "image", ...images },
      { type: "text", text: "☀️ 老爸早安股市快報已更新\n掌握美股、科技股與今日台股觀察。" },
    ]);
    return NextResponse.json({ ok: true, report: "morning", ...images });
  } catch (error) {
    console.error("Morning report push failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
