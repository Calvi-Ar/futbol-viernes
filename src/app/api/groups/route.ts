import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createGroup,
  getGroupsForUser,
  getUserRoleInGroup,
  deleteGroup,
  migrateExistingDataToGroup,
  insertPlayer,
  linkPlayerToMember,
} from "@/lib/bigquery";
import type { Player } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groups = await getGroupsForUser(session.user.id);
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name: string;
    migrateExisting?: boolean;
    player?: Player;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const groupId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await createGroup(
    { groupId, name: body.name.trim(), createdBy: session.user.id },
    session.user.id
  );

  if (body.migrateExisting) {
    await migrateExistingDataToGroup(groupId);
  }

  if (body.player?.name) {
    const player = body.player;
    player.id = player.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await insertPlayer(player, groupId);
    await linkPlayerToMember(groupId, session.user.id, player.id);
  }

  return NextResponse.json({ groupId, name: body.name.trim() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const role = await getUserRoleInGroup(session.user.id, groupId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete a group" }, { status: 403 });
  }

  await deleteGroup(groupId);
  return NextResponse.json({ ok: true });
}
