import { NextResponse } from "next/server";
import { getPlayersFromBigQuery, insertPlayer } from "@/lib/bigquery";
import type { Player } from "@/lib/types";

/**
 * GET /api/players – list all players from BigQuery (for team creation, etc.)
 */
export async function GET() {
  try {
    const players = await getPlayersFromBigQuery();
    return NextResponse.json(players);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/players – add a single player to BigQuery
 */
export async function POST(request: Request) {
  try {
    const player = (await request.json()) as Player;
    if (!player?.id || !player?.name) {
      return NextResponse.json(
        { ok: false, error: "Body must be a player with id and name" },
        { status: 400 }
      );
    }
    await insertPlayer(player);
    return NextResponse.json({ ok: true, message: "Player added." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
