import { NextResponse } from "next/server";
import { createTransaction, listTransactions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ transactions: listTransactions() });
}

export async function POST(request) {
  const body = await request.json();
  if (!body.symbol || !["buy", "sell"].includes(body.type) || Number(body.quantity) <= 0 || Number(body.price) <= 0) {
    return NextResponse.json({ message: "symbol, type, price and quantity are required" }, { status: 400 });
  }
  return NextResponse.json({ transaction: createTransaction(body) }, { status: 201 });
}
