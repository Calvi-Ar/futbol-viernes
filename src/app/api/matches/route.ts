import { NextResponse } from "next/server";
import { getPlayersFromBigQuery, getMatchesFromBigQuery, insertMatch, canEdit } from "@/lib/bigquery";
import { getApiContext } from "@/lib/api-auth";
import type { Match } from "@/lib/types";

export async function GET() {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const players = await getPlayersFromBigQuery(ctx.groupId);
    const matches = await getMatchesFromBigQuery(players, ctx.groupId);
    return NextResponse.json(matches);
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

    const match = (await request.json()) as Match;
    if (!match?.id || !match?.date || !match?.teams) {
      return NextResponse.json({ ok: false, error: "Body must be a match with id, date, and teams" }, { status: 400 });
    }
    await insertMatch(match, ctx.groupId);
    return NextResponse.json({ ok: true, message: "Match added." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
