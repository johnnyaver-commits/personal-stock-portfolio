import { NextResponse } from "next/server";
import { deleteHolding, getHolding, updateHolding } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const holding = await getHolding(id);
  if (!holding) return NextResponse.json({ message: "Holding not found" }, { status: 404 });
  return NextResponse.json({ holding });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const holding = await updateHolding(id, body);
  if (!holding) return NextResponse.json({ message: "Holding not found" }, { status: 404 });
  return NextResponse.json({ holding });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const deleted = deleteHolding(id);
  if (!deleted) return NextResponse.json({ message: "Holding not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
