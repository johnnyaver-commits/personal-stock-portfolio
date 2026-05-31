import { NextResponse } from "next/server";
import { listOwners } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ owners: await listOwners() });
}
