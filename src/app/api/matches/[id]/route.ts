import { NextResponse } from "next/server";
import { updateMatch, deleteMatch } from "@/lib/bigquery";
import type { Match } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/matches/[id] – update a match in BigQuery
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const match = (await request.json()) as Match;
    if (match.id !== id) {
      return NextResponse.json(
        { ok: false, error: "URL id and body match.id must match" },
        { status: 400 }
      );
    }
    await updateMatch(match);
    return NextResponse.json({ ok: true, message: "Match updated." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/matches/[id] – remove a match from BigQuery
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteMatch(id);
    return NextResponse.json({ ok: true, message: "Match deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
