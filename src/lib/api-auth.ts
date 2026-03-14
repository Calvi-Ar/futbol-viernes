import { auth } from "./auth";
import { getUserRoleInGroup, type GroupRole } from "./bigquery";

export type ApiContext = {
  userId: string;
  email: string;
  groupId: string;
  role: GroupRole;
};

/**
 * Extracts the authenticated user and their role in the requested group.
 * The group is passed via the `x-group-id` header.
 * Returns null if unauthenticated or not a member of the group.
 */
export async function getApiContext(): Promise<ApiContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) return null;

  const groupId =
    (await getHeaderValue("x-group-id")) ?? "";
  if (!groupId) return null;

  const role = await getUserRoleInGroup(session.user.id, groupId);
  if (!role) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    groupId,
    role,
  };
}

async function getHeaderValue(name: string): Promise<string | null> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return h.get(name);
}
