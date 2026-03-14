import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/bigquery";
import { getApiContext } from "@/lib/api-auth";

export async function GET() {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stats = await getPlayerStats(ctx.groupId);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
