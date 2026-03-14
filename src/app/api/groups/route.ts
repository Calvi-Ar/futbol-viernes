import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createGroup,
  getGroupsForUser,
  migrateExistingDataToGroup,
} from "@/lib/bigquery";

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

  const body = (await req.json()) as { name: string; migrateExisting?: boolean };
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

  return NextResponse.json({ groupId, name: body.name.trim() }, { status: 201 });
}
