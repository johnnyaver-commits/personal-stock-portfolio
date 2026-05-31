import { NextResponse } from "next/server";
import { listPortfolioTrends } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const ownerId = new URL(request.url).searchParams.get("owner_id") ?? "all";
  return NextResponse.json({ trends: await listPortfolioTrends(ownerId) });
}
