import { NextResponse } from "next/server";
import { getPlayersFromBigQuery, insertPlayer, canEdit } from "@/lib/bigquery";
import { getApiContext } from "@/lib/api-auth";
import type { Player } from "@/lib/types";

export async function GET() {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const players = await getPlayersFromBigQuery(ctx.groupId);
    return NextResponse.json(players);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canEdit(ctx.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const player = (await request.json()) as Player;
    if (!player?.id || !player?.name) {
      return NextResponse.json({ ok: false, error: "Body must be a player with id and name" }, { status: 400 });
    }
    await insertPlayer(player, ctx.groupId);
    return NextResponse.json({ ok: true, message: "Player added." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
