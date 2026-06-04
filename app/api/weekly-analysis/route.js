import { NextResponse } from "next/server";
import { generateWeeklyAnalysis, getLatestWeeklyAnalysis } from "@/lib/weeklyAnalysis";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ analysis: await getLatestWeeklyAnalysis() });
}

export async function POST() {
  return NextResponse.json({ analysis: await generateWeeklyAnalysis() });
}
