import { NextResponse } from "next/server";
import { updateMatch, deleteMatch, canEdit } from "@/lib/bigquery";
import { getApiContext } from "@/lib/api-auth";
import type { Match } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canEdit(ctx.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const match = (await request.json()) as Match;
    if (match.id !== id) {
      return NextResponse.json({ ok: false, error: "URL id and body match.id must match" }, { status: 400 });
    }
    await updateMatch(match, ctx.groupId);
    return NextResponse.json({ ok: true, message: "Match updated." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const ctx = await getApiContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canEdit(ctx.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await deleteMatch(id, ctx.groupId);
    return NextResponse.json({ ok: true, message: "Match deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
