import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserRoleInGroup,
  getOrCreateInviteCode,
  regenerateInviteCode,
} from "@/lib/bigquery";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const role = await getUserRoleInGroup(session.user.id, groupId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the owner can get invite links" }, { status: 403 });
  }

  const code = await getOrCreateInviteCode(groupId);
  return NextResponse.json({ code });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const role = await getUserRoleInGroup(session.user.id, groupId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the owner can regenerate invite links" }, { status: 403 });
  }

  const code = await regenerateInviteCode(groupId);
  return NextResponse.json({ code });
}
