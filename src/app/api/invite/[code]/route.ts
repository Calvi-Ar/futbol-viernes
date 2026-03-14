import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGroupByInviteCode,
  addMemberToGroup,
  getUserRoleInGroup,
  insertPlayer,
  linkPlayerToMember,
} from "@/lib/bigquery";
import type { Player } from "@/lib/types";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;
  const group = await getGroupByInviteCode(code);
  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }
  return NextResponse.json({ groupName: group.name });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const group = await getGroupByInviteCode(code);
  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  let body: { player?: Player } = {};
  try {
    body = await req.json();
  } catch { /* no body is fine */ }

  const existingRole = await getUserRoleInGroup(session.user.id, group.groupId);
  if (existingRole) {
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      groupId: group.groupId,
      groupName: group.name,
    });
  }

  await addMemberToGroup(group.groupId, session.user.id, "viewer");

  if (body.player?.name) {
    const player = body.player;
    player.id = player.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await insertPlayer(player, group.groupId);
    await linkPlayerToMember(group.groupId, session.user.id, player.id);
  }

  return NextResponse.json({
    ok: true,
    alreadyMember: false,
    groupId: group.groupId,
    groupName: group.name,
  }, { status: 201 });
}
