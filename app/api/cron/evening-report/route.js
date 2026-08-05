import { NextResponse } from "next/server";
import { runEveningReportPipeline } from "@/lib/evening-report-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request) {
  const auth = request.headers.get("authorization");
  const custom = request.headers.get("x-push-secret");
  const allowedSecrets = [process.env.CRON_SECRET, process.env.PUSH_API_SECRET].filter(Boolean);
  return allowedSecrets.some(
    (secret) => auth === `Bearer ${secret}` || custom === secret,
  );
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const result = await runEveningReportPipeline();
    return NextResponse.json({
      ok: true,
      report: "evening",
      reportDate: result.report.reportDate,
      imageUrl: result.urls.originalContentUrl,
      previewUrl: result.urls.previewImageUrl,
      line: result.line,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Evening report push failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
