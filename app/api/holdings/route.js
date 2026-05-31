import { NextResponse } from "next/server";
import { createHolding, listHoldings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ holdings: await listHoldings() });
}

export async function POST(request) {
  const body = await request.json();
  if (!body.symbol || Number(body.quantity) < 0 || Number(body.avg_cost) < 0) {
    return NextResponse.json({ message: "symbol, quantity and avg_cost are required" }, { status: 400 });
  }
  return NextResponse.json({ holding: await createHolding(body) }, { status: 201 });
}
