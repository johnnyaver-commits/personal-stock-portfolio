import { NextResponse } from "next/server";
import { deleteTransaction, updateTransaction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const transaction = await updateTransaction(id, body);
  if (!transaction) return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
  return NextResponse.json({ transaction });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const deleted = await deleteTransaction(id);
  if (!deleted) return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
