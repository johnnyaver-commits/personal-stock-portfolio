import { NextResponse } from "next/server";
import { listPhisonShareholderTrend } from "@/lib/phisonShareholders";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listPhisonShareholderTrend());
}
