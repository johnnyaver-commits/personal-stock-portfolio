import { NextResponse } from "next/server";
import { searchYahooSymbols } from "@/lib/yahooFinance";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: await searchYahooSymbols(query) });
}
