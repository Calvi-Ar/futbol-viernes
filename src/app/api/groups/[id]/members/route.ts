import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGroupMembers,
  getUserRoleInGroup,
  addMemberToGroup,
  updateMemberRole,
  removeMemberFromGroup,
  getUserByEmail,
  linkPlayerToMember,
  type GroupRole,
} from "@/lib/bigquery";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const role = await getUserRoleInGroup(session.user.id, groupId);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const members = await getGroupMembers(groupId);
  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const myRole = await getUserRoleInGroup(session.user.id, groupId);
  if (myRole !== "owner") {
    return NextResponse.json({ error: "Only the owner can add members" }, { status: 403 });
  }

  const body = (await req.json()) as { email: string; role?: GroupRole };
  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await getUserByEmail(body.email.trim());
  if (!user) {
    return NextResponse.json(
      { error: "User not found. They need to sign in at least once before being added." },
      { status: 404 }
    );
  }

  await addMemberToGroup(groupId, user.userId, body.role ?? "viewer");
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const myRole = await getUserRoleInGroup(session.user.id, groupId);
  if (myRole !== "owner") {
    return NextResponse.json({ error: "Only the owner can change roles" }, { status: 403 });
  }

  const body = (await req.json()) as {
    userId: string;
    role?: GroupRole;
    linkedPlayerId?: string | null;
  };

  if (body.linkedPlayerId !== undefined) {
    await linkPlayerToMember(groupId, body.userId, body.linkedPlayerId);
  }

  if (body.role !== undefined) {
    if (body.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }
    if (body.role === "owner") {
      return NextResponse.json({ error: "Cannot assign owner role" }, { status: 400 });
    }
    await updateMemberRole(groupId, body.userId, body.role);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: groupId } = await params;
  const myRole = await getUserRoleInGroup(session.user.id, groupId);
  if (myRole !== "owner") {
    return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await removeMemberFromGroup(groupId, userId);
  return NextResponse.json({ ok: true });
}
