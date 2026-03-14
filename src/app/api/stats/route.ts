import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/bigquery";

export async function GET() {
  try {
    const stats = await getPlayerStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
