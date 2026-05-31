import { NextResponse } from "next/server";
import { listQuotes } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbol") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (!symbols.length) {
    return NextResponse.json({ message: "symbol query parameter is required" }, { status: 400 });
  }

  return NextResponse.json({ quotes: listQuotes(symbols) });
}
