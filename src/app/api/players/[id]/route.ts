import { NextResponse } from "next/server";
import { updatePlayer, deletePlayer } from "@/lib/bigquery";
import type { Player } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const player = (await request.json()) as Player;
    if (player.id !== id) {
      return NextResponse.json(
        { ok: false, error: "URL id and body player.id must match" },
        { status: 400 }
      );
    }
    await updatePlayer(player);
    return NextResponse.json({ ok: true, message: "Player updated." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deletePlayer(id);
    return NextResponse.json({ ok: true, message: "Player deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
