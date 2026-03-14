import { NextResponse } from "next/server";
import { getPlayersFromBigQuery, getMatchesFromBigQuery, insertMatch } from "@/lib/bigquery";
import type { Match } from "@/lib/types";

/**
 * GET /api/matches – list all matches from BigQuery (hydrated with players)
 */
export async function GET() {
  try {
    const players = await getPlayersFromBigQuery();
    const matches = await getMatchesFromBigQuery(players);
    return NextResponse.json(matches);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matches – add a single match to BigQuery
 */
export async function POST(request: Request) {
  try {
    const match = (await request.json()) as Match;
    if (!match?.id || !match?.date || !match?.teams) {
      return NextResponse.json(
        { ok: false, error: "Body must be a match with id, date, and teams" },
        { status: 400 }
      );
    }
    await insertMatch(match);
    return NextResponse.json({ ok: true, message: "Match added." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
