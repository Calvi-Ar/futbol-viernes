import { getBigQueryClient } from "./gcp-credentials";
import type { Player, Match } from "./types";

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? "ataxe-reports";
const DATASET_ID = process.env.BIGQUERY_DATASET ?? "futbol_viernes";

export { getBigQueryClient, PROJECT_ID, DATASET_ID };

/** Schema for the matches table */
export const MATCHES_SCHEMA = [
  { name: "match_id", type: "STRING", mode: "REQUIRED" },
  { name: "date", type: "DATE", mode: "REQUIRED" },
  { name: "place_name", type: "STRING", mode: "NULLABLE" },
  { name: "status", type: "STRING", mode: "REQUIRED" },
  { name: "goals_team_a", type: "INTEGER", mode: "REQUIRED" },
  { name: "goals_team_b", type: "INTEGER", mode: "REQUIRED" },
  {
    name: "team_a_player_ids",
    type: "STRING",
    mode: "REPEATED",
  },
  {
    name: "team_b_player_ids",
    type: "STRING",
    mode: "REPEATED",
  },
  {
    name: "scorers",
    type: "RECORD",
    mode: "REPEATED",
    fields: [
      { name: "player_id", type: "STRING", mode: "REQUIRED" },
      { name: "player_name", type: "STRING", mode: "REQUIRED" },
      { name: "goals", type: "INTEGER", mode: "REQUIRED" },
      { name: "team", type: "STRING", mode: "REQUIRED" },
    ],
  },
  { name: "notes", type: "STRING", mode: "NULLABLE" },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

/** Schema for the players table */
export const PLAYERS_SCHEMA = [
  { name: "player_id", type: "STRING", mode: "REQUIRED" },
  { name: "name", type: "STRING", mode: "REQUIRED" },
  { name: "age", type: "INTEGER", mode: "NULLABLE" },
  { name: "is_goalie", type: "BOOLEAN", mode: "REQUIRED" },
  { name: "preferred_position", type: "STRING", mode: "NULLABLE" },
  { name: "stamina", type: "INTEGER", mode: "REQUIRED" },
  { name: "control", type: "INTEGER", mode: "REQUIRED" },
  { name: "shot", type: "INTEGER", mode: "REQUIRED" },
  { name: "speed", type: "INTEGER", mode: "REQUIRED" },
  { name: "dribble", type: "INTEGER", mode: "REQUIRED" },
  { name: "defense", type: "INTEGER", mode: "REQUIRED" },
  { name: "fan_of", type: "STRING", mode: "NULLABLE" },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
  { name: "updated_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

/** Schema for the users table */
export const USERS_SCHEMA = [
  { name: "user_id", type: "STRING", mode: "REQUIRED" as const },
  { name: "email", type: "STRING", mode: "REQUIRED" as const },
  { name: "name", type: "STRING", mode: "REQUIRED" as const },
  { name: "avatar_url", type: "STRING", mode: "NULLABLE" as const },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" as const },
  { name: "updated_at", type: "TIMESTAMP", mode: "REQUIRED" as const },
];

/** Schema for the groups table */
export const GROUPS_SCHEMA = [
  { name: "group_id", type: "STRING", mode: "REQUIRED" as const },
  { name: "name", type: "STRING", mode: "REQUIRED" as const },
  { name: "created_by", type: "STRING", mode: "REQUIRED" as const },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" as const },
];

/** Schema for the group_members table */
export const GROUP_MEMBERS_SCHEMA = [
  { name: "group_id", type: "STRING", mode: "REQUIRED" as const },
  { name: "user_id", type: "STRING", mode: "REQUIRED" as const },
  { name: "role", type: "STRING", mode: "REQUIRED" as const },
  { name: "linked_player_id", type: "STRING", mode: "NULLABLE" as const },
  { name: "joined_at", type: "TIMESTAMP", mode: "REQUIRED" as const },
];

export const MATCHES_TABLE_ID = "matches";
export const PLAYERS_TABLE_ID = "players";
export const USERS_TABLE_ID = "users";
export const GROUPS_TABLE_ID = "groups";
export const GROUP_MEMBERS_TABLE_ID = "group_members";

const PLAYERS_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + PLAYERS_TABLE_ID + "`";
const MATCHES_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + MATCHES_TABLE_ID + "`";
const USERS_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + USERS_TABLE_ID + "`";
const GROUPS_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + GROUPS_TABLE_ID + "`";
const GROUP_MEMBERS_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + GROUP_MEMBERS_TABLE_ID + "`";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function createDatasetIfNotExists(): Promise<void> {
  const bigquery = await getBigQueryClient();
  const [datasets] = await bigquery.getDatasets();
  const exists = datasets.some((d) => d.id === DATASET_ID);
  if (!exists) {
    await bigquery.createDataset(DATASET_ID, { location: "US" });
  }
}

export async function createTablesIfNotExists(): Promise<{
  dataset: string;
  tablesCreated: string[];
}> {
  const bigquery = await getBigQueryClient();
  const dataset = bigquery.dataset(DATASET_ID);
  const tablesCreated: string[] = [];

  const matchesTable = dataset.table(MATCHES_TABLE_ID);
  const [matchesExists] = await matchesTable.exists().catch(() => [false]);
  if (!matchesExists) {
    await dataset.createTable(MATCHES_TABLE_ID, { schema: MATCHES_SCHEMA });
    tablesCreated.push(MATCHES_TABLE_ID);
  } else {
    await ensureMatchesScorerTeamField();
  }

  const [playersExists] = await dataset.table(PLAYERS_TABLE_ID).exists().catch(() => [false]);
  if (!playersExists) {
    await dataset.createTable(PLAYERS_TABLE_ID, { schema: PLAYERS_SCHEMA });
    tablesCreated.push(PLAYERS_TABLE_ID);
  }

  const [usersExists] = await dataset.table(USERS_TABLE_ID).exists().catch(() => [false]);
  if (!usersExists) {
    await dataset.createTable(USERS_TABLE_ID, { schema: USERS_SCHEMA });
    tablesCreated.push(USERS_TABLE_ID);
  }

  const [groupsExists] = await dataset.table(GROUPS_TABLE_ID).exists().catch(() => [false]);
  if (!groupsExists) {
    await dataset.createTable(GROUPS_TABLE_ID, { schema: GROUPS_SCHEMA });
    tablesCreated.push(GROUPS_TABLE_ID);
  }

  const [membersExists] = await dataset.table(GROUP_MEMBERS_TABLE_ID).exists().catch(() => [false]);
  if (!membersExists) {
    await dataset.createTable(GROUP_MEMBERS_TABLE_ID, { schema: GROUP_MEMBERS_SCHEMA });
    tablesCreated.push(GROUP_MEMBERS_TABLE_ID);
  }

  await ensureGroupIdColumns();

  return { dataset: DATASET_ID, tablesCreated };
}

async function ensureMatchesScorerTeamField(): Promise<void> {
  const bigquery = await getBigQueryClient();
  try {
    await bigquery.query({
      query: `ALTER TABLE ${MATCHES_TABLE_FULL} ADD COLUMN IF NOT EXISTS scorers.team STRING`,
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (!msg.includes("Already exists") && !msg.includes("duplicate")) {
      console.warn("Could not add scorers.team field:", msg);
    }
  }
}

async function ensureGroupIdColumns(): Promise<void> {
  const bigquery = await getBigQueryClient();
  for (const table of [PLAYERS_TABLE_FULL, MATCHES_TABLE_FULL]) {
    try {
      await bigquery.query({
        query: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS group_id STRING`,
      });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (!msg.includes("Already exists") && !msg.includes("duplicate")) {
        console.warn(`Could not add group_id to ${table}:`, msg);
      }
    }
  }
  try {
    await bigquery.query({
      query: `ALTER TABLE ${GROUPS_TABLE_FULL} ADD COLUMN IF NOT EXISTS invite_code STRING`,
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (!msg.includes("Already exists") && !msg.includes("duplicate")) {
      console.warn("Could not add invite_code to groups:", msg);
    }
  }

  for (const col of ["speed", "fan_of"]) {
    try {
      const colType = col === "fan_of" ? "STRING" : "INTEGER";
      await bigquery.query({
        query: `ALTER TABLE ${PLAYERS_TABLE_FULL} ADD COLUMN IF NOT EXISTS ${col} ${colType}`,
      });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (!msg.includes("Already exists") && !msg.includes("duplicate")) {
        console.warn(`Could not add ${col} to players:`, msg);
      }
    }
  }
}

export async function setupBigQuery(): Promise<{
  dataset: string;
  tablesCreated: string[];
}> {
  await createDatasetIfNotExists();
  return createTablesIfNotExists();
}

// ---------------------------------------------------------------------------
// Helpers: escape values for DML INSERT (no streaming API = no buffer issues)
// ---------------------------------------------------------------------------

function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sqlStr(v: string | null | undefined): string {
  return v == null ? "NULL" : `'${esc(v)}'`;
}

function sqlInt(v: number | null | undefined): string {
  return v == null ? "NULL" : String(Math.round(v));
}

function sqlBool(v: boolean): string {
  return v ? "TRUE" : "FALSE";
}

function sqlTs(): string {
  return "CURRENT_TIMESTAMP()";
}

function sqlArr(arr: string[]): string {
  if (arr.length === 0) return "[]";
  return "[" + arr.map((s) => `'${esc(s)}'`).join(", ") + "]";
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRecord = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
};

export async function upsertUser(user: UserRecord): Promise<void> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT user_id FROM ${USERS_TABLE_FULL} WHERE user_id = @id LIMIT 1`,
    params: { id: user.userId },
  });
  if ((rows as unknown[]).length > 0) {
    await bigquery.query({
      query: `UPDATE ${USERS_TABLE_FULL}
              SET name = ${sqlStr(user.name)},
                  avatar_url = ${sqlStr(user.avatarUrl)},
                  updated_at = ${sqlTs()}
              WHERE user_id = @id`,
      params: { id: user.userId },
    });
  } else {
    await bigquery.query({
      query: `INSERT INTO ${USERS_TABLE_FULL}
              (user_id, email, name, avatar_url, created_at, updated_at)
              VALUES (${sqlStr(user.userId)}, ${sqlStr(user.email)}, ${sqlStr(user.name)},
                      ${sqlStr(user.avatarUrl)}, ${sqlTs()}, ${sqlTs()})`,
    });
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT user_id, email, name, avatar_url FROM ${USERS_TABLE_FULL} WHERE email = @email LIMIT 1`,
    params: { email },
  });
  const list = rows as Record<string, unknown>[];
  if (list.length === 0) return null;
  const r = list[0];
  return {
    userId: String(r.user_id ?? ""),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    avatarUrl: String(r.avatar_url ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Groups & Membership
// ---------------------------------------------------------------------------

export type GroupRole = "owner" | "admin" | "viewer";

export type GroupRecord = {
  groupId: string;
  name: string;
  createdBy: string;
};

export type GroupMembership = {
  groupId: string;
  groupName: string;
  role: GroupRole;
  linkedPlayerId: string | null;
};

export async function createGroup(
  group: GroupRecord,
  ownerUserId: string
): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `INSERT INTO ${GROUPS_TABLE_FULL} (group_id, name, created_by, created_at)
            VALUES (${sqlStr(group.groupId)}, ${sqlStr(group.name)}, ${sqlStr(group.createdBy)}, ${sqlTs()})`,
  });
  await bigquery.query({
    query: `INSERT INTO ${GROUP_MEMBERS_TABLE_FULL} (group_id, user_id, role, joined_at)
            VALUES (${sqlStr(group.groupId)}, ${sqlStr(ownerUserId)}, 'owner', ${sqlTs()})`,
  });
}

export async function getGroupsForUser(userId: string): Promise<GroupMembership[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT gm.group_id, g.name AS group_name, gm.role, gm.linked_player_id
            FROM ${GROUP_MEMBERS_TABLE_FULL} gm
            JOIN ${GROUPS_TABLE_FULL} g ON gm.group_id = g.group_id
            WHERE gm.user_id = @userId
            ORDER BY g.name`,
    params: { userId },
  });
  return (rows as Record<string, unknown>[]).map((r) => ({
    groupId: String(r.group_id ?? ""),
    groupName: String(r.group_name ?? ""),
    role: String(r.role ?? "viewer") as GroupRole,
    linkedPlayerId: r.linked_player_id ? String(r.linked_player_id) : null,
  }));
}

export async function getUserRoleInGroup(
  userId: string,
  groupId: string
): Promise<GroupRole | null> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT role FROM ${GROUP_MEMBERS_TABLE_FULL}
            WHERE user_id = @userId AND group_id = @groupId LIMIT 1`,
    params: { userId, groupId },
  });
  const list = rows as Record<string, unknown>[];
  if (list.length === 0) return null;
  return String(list[0].role) as GroupRole;
}

export async function getGroupMembers(groupId: string): Promise<{
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: GroupRole;
  linkedPlayerId: string | null;
}[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT gm.user_id, u.email, u.name, u.avatar_url, gm.role, gm.linked_player_id
            FROM ${GROUP_MEMBERS_TABLE_FULL} gm
            JOIN ${USERS_TABLE_FULL} u ON gm.user_id = u.user_id
            WHERE gm.group_id = @groupId
            ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`,
    params: { groupId },
  });
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id ?? ""),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    avatarUrl: String(r.avatar_url ?? ""),
    role: String(r.role ?? "viewer") as GroupRole,
    linkedPlayerId: r.linked_player_id ? String(r.linked_player_id) : null,
  }));
}

export async function addMemberToGroup(
  groupId: string,
  userId: string,
  role: GroupRole = "viewer"
): Promise<void> {
  const bigquery = await getBigQueryClient();
  const existing = await getUserRoleInGroup(userId, groupId);
  if (existing) return;
  await bigquery.query({
    query: `INSERT INTO ${GROUP_MEMBERS_TABLE_FULL} (group_id, user_id, role, joined_at)
            VALUES (${sqlStr(groupId)}, ${sqlStr(userId)}, ${sqlStr(role)}, ${sqlTs()})`,
  });
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole
): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `UPDATE ${GROUP_MEMBERS_TABLE_FULL}
            SET role = ${sqlStr(role)}
            WHERE group_id = @groupId AND user_id = @userId`,
    params: { groupId, userId },
  });
}

export async function removeMemberFromGroup(
  groupId: string,
  userId: string
): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${GROUP_MEMBERS_TABLE_FULL}
            WHERE group_id = @groupId AND user_id = @userId`,
    params: { groupId, userId },
  });
}

export async function linkPlayerToMember(
  groupId: string,
  userId: string,
  playerId: string | null
): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `UPDATE ${GROUP_MEMBERS_TABLE_FULL}
            SET linked_player_id = ${sqlStr(playerId)}
            WHERE group_id = @groupId AND user_id = @userId`,
    params: { groupId, userId },
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${PLAYERS_TABLE_FULL} WHERE group_id = @groupId`,
    params: { groupId },
  });
  await bigquery.query({
    query: `DELETE FROM ${MATCHES_TABLE_FULL} WHERE group_id = @groupId`,
    params: { groupId },
  });
  await bigquery.query({
    query: `DELETE FROM ${GROUP_MEMBERS_TABLE_FULL} WHERE group_id = @groupId`,
    params: { groupId },
  });
  await bigquery.query({
    query: `DELETE FROM ${GROUPS_TABLE_FULL} WHERE group_id = @groupId`,
    params: { groupId },
  });
}

export async function migrateExistingDataToGroup(groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `UPDATE ${PLAYERS_TABLE_FULL} SET group_id = ${sqlStr(groupId)} WHERE group_id IS NULL`,
  });
  await bigquery.query({
    query: `UPDATE ${MATCHES_TABLE_FULL} SET group_id = ${sqlStr(groupId)} WHERE group_id IS NULL`,
  });
}

// ---------------------------------------------------------------------------
// Invite links
// ---------------------------------------------------------------------------

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getOrCreateInviteCode(groupId: string): Promise<string> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT invite_code FROM ${GROUPS_TABLE_FULL} WHERE group_id = @groupId LIMIT 1`,
    params: { groupId },
  });
  const existing = (rows as Record<string, unknown>[])[0]?.invite_code;
  if (existing) return String(existing);

  const code = generateInviteCode();
  await bigquery.query({
    query: `UPDATE ${GROUPS_TABLE_FULL} SET invite_code = ${sqlStr(code)} WHERE group_id = @groupId`,
    params: { groupId },
  });
  return code;
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  const bigquery = await getBigQueryClient();
  const code = generateInviteCode();
  await bigquery.query({
    query: `UPDATE ${GROUPS_TABLE_FULL} SET invite_code = ${sqlStr(code)} WHERE group_id = @groupId`,
    params: { groupId },
  });
  return code;
}

export async function getGroupByInviteCode(
  code: string
): Promise<{ groupId: string; name: string } | null> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT group_id, name FROM ${GROUPS_TABLE_FULL} WHERE invite_code = @code LIMIT 1`,
    params: { code },
  });
  const list = rows as Record<string, unknown>[];
  if (list.length === 0) return null;
  return {
    groupId: String(list[0].group_id ?? ""),
    name: String(list[0].name ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Auth helpers for API routes
// ---------------------------------------------------------------------------

export function canEdit(role: GroupRole | null): boolean {
  return role === "owner" || role === "admin";
}

// ---------------------------------------------------------------------------
// Players CRUD (all DML — no streaming insert)
// ---------------------------------------------------------------------------

function playerInsertSQL(p: Player, groupId: string): string {
  return `INSERT INTO ${PLAYERS_TABLE_FULL}
    (player_id, name, age, is_goalie, preferred_position, fan_of, stamina, control, shot, speed, dribble, defense, group_id, created_at, updated_at)
    VALUES (
      ${sqlStr(p.id)}, ${sqlStr(p.name)}, ${sqlInt(p.age)}, ${sqlBool(p.isGoalie)},
      ${sqlStr(p.preferredPosition)}, ${sqlStr(p.fanOf)},
      ${sqlInt(p.ratings.stamina)}, ${sqlInt(p.ratings.control)},
      ${sqlInt(p.ratings.shot)}, ${sqlInt(p.ratings.speed)}, ${sqlInt(p.ratings.dribble)}, ${sqlInt(p.ratings.defense)},
      ${sqlStr(groupId)}, ${sqlTs()}, ${sqlTs()}
    )`;
}

export async function insertPlayer(player: Player, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({ query: playerInsertSQL(player, groupId) });
}

export async function updatePlayer(player: Player, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${PLAYERS_TABLE_FULL} WHERE player_id = @id AND group_id = @groupId`,
    params: { id: player.id, groupId },
  });
  await bigquery.query({ query: playerInsertSQL(player, groupId) });
}

export async function deletePlayer(playerId: string, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${PLAYERS_TABLE_FULL} WHERE player_id = @id AND group_id = @groupId`,
    params: { id: playerId, groupId },
  });
}

// ---------------------------------------------------------------------------
// Matches CRUD (all DML)
// ---------------------------------------------------------------------------

function matchInsertSQL(m: Match, groupId: string): string {
  const scorersSQL =
    m.scorers.length === 0
      ? "[]"
      : "[" +
        m.scorers
          .map(
            (s) =>
              `STRUCT(${sqlStr(s.playerId)} AS player_id, ${sqlStr(s.playerName)} AS player_name, ${sqlInt(s.goals)} AS goals, ${sqlStr(s.team)} AS team)`
          )
          .join(", ") +
        "]";

  return `INSERT INTO ${MATCHES_TABLE_FULL}
    (match_id, date, place_name, status, goals_team_a, goals_team_b,
     team_a_player_ids, team_b_player_ids, scorers, notes, group_id, created_at)
    VALUES (
      ${sqlStr(m.id)}, ${sqlStr(m.date)}, ${sqlStr(m.place)}, ${sqlStr(m.status)},
      ${sqlInt(m.goalsA)}, ${sqlInt(m.goalsB)},
      ${sqlArr(m.teams.teamA.map((x) => x.id))},
      ${sqlArr(m.teams.teamB.map((x) => x.id))},
      ${scorersSQL},
      ${sqlStr(m.notes)}, ${sqlStr(groupId)}, ${sqlTs()}
    )`;
}

export async function insertMatch(match: Match, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({ query: matchInsertSQL(match, groupId) });
}

export async function updateMatch(match: Match, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${MATCHES_TABLE_FULL} WHERE match_id = @id AND group_id = @groupId`,
    params: { id: match.id, groupId },
  });
  await bigquery.query({ query: matchInsertSQL(match, groupId) });
}

export async function deleteMatch(matchId: string, groupId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${MATCHES_TABLE_FULL} WHERE match_id = @id AND group_id = @groupId`,
    params: { id: matchId, groupId },
  });
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

function normalizeValue<T>(v: T | { value: T } | null | undefined): T | null | undefined {
  if (v === null || v === undefined) return v;
  if (typeof v === "object" && v !== null && "value" in v) return (v as { value: T }).value;
  return v as T;
}

type PlayerRow = Record<string, unknown>;

function rowToPlayer(r: PlayerRow): Player {
  const nv = (key: string) => normalizeValue(r[key]);
  return {
    id: String(nv("player_id") ?? ""),
    name: String(nv("name") ?? ""),
    age: nv("age") != null ? Number(nv("age")) : undefined,
    isGoalie: Boolean(nv("is_goalie")),
    preferredPosition:
      (nv("preferred_position") as Player["preferredPosition"]) ?? undefined,
    fanOf: nv("fan_of") != null ? String(nv("fan_of")) : undefined,
    ratings: {
      stamina: Number(nv("stamina") ?? 3) as Player["ratings"]["stamina"],
      control: Number(nv("control") ?? 3) as Player["ratings"]["control"],
      shot: Number(nv("shot") ?? 3) as Player["ratings"]["shot"],
      speed: Number(nv("speed") ?? 3) as Player["ratings"]["speed"],
      dribble: Number(nv("dribble") ?? 3) as Player["ratings"]["dribble"],
      defense: Number(nv("defense") ?? 3) as Player["ratings"]["defense"],
    },
  };
}

export async function getPlayersFromBigQuery(groupId: string): Promise<Player[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT player_id, name, age, is_goalie, preferred_position, fan_of, stamina, control, shot, speed, dribble, defense
            FROM ${PLAYERS_TABLE_FULL}
            WHERE group_id = @groupId
            ORDER BY name`,
    params: { groupId },
  });
  return (rows as PlayerRow[]).map(rowToPlayer);
}

type MatchRow = Record<string, unknown>;

export async function getMatchesFromBigQuery(
  players: Player[],
  groupId: string
): Promise<Match[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT match_id, date, status, goals_team_a, goals_team_b,
                   team_a_player_ids, team_b_player_ids, scorers, notes, place_name
            FROM ${MATCHES_TABLE_FULL}
            WHERE group_id = @groupId
            ORDER BY date DESC, created_at DESC`,
    params: { groupId },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));
  return (rows as MatchRow[]).map((r) => {
    const nv = (key: string) => normalizeValue(r[key]);
    const rawA = (r.team_a_player_ids ?? []) as (string | { value: string })[];
    const rawB = (r.team_b_player_ids ?? []) as (string | { value: string })[];
    const idsA = rawA.map((id) => String(normalizeValue(id) ?? ""));
    const idsB = rawB.map((id) => String(normalizeValue(id) ?? ""));
    const teamA = idsA
      .map((id) => playerMap.get(id))
      .filter(Boolean) as Player[];
    const teamB = idsB
      .map((id) => playerMap.get(id))
      .filter(Boolean) as Player[];
    const goalsA = Number(nv("goals_team_a") ?? 0);
    const goalsB = Number(nv("goals_team_b") ?? 0);
    const rawScorers = (r.scorers ?? []) as Record<string, unknown>[];
    return {
      id: String(nv("match_id") ?? ""),
      date: String(nv("date") ?? ""),
      place: (nv("place_name") as string) ?? undefined,
      status: (String(nv("status") ?? "finalized")) as Match["status"],
      goalsA,
      goalsB,
      teams: {
        teamA,
        teamB,
        scoreA: goalsA,
        scoreB: goalsB,
        goaliesA: teamA.filter((p) => p.isGoalie).length,
        goaliesB: teamB.filter((p) => p.isGoalie).length,
      },
      scorers: rawScorers.map((s) => ({
        playerId: String(normalizeValue(s.player_id) ?? ""),
        playerName: String(normalizeValue(s.player_name) ?? ""),
        goals: Number(normalizeValue(s.goals) ?? 0),
        team: (String(normalizeValue(s.team) ?? "a")) as "a" | "b",
      })),
      notes: String(nv("notes") ?? ""),
    };
  });
}

// ---------------------------------------------------------------------------
// Statistics (computed from matches table)
// ---------------------------------------------------------------------------

export type PlayerStats = {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  matchesWon: number;
  totalGoals: number;
};

export async function getPlayerStats(groupId: string): Promise<PlayerStats[]> {
  const bigquery = await getBigQueryClient();

  const [rows] = await bigquery.query({
    params: { groupId },
    query: `
      WITH all_matches AS (
        SELECT match_id, goals_team_a, goals_team_b,
               team_a_player_ids, team_b_player_ids, scorers
        FROM ${MATCHES_TABLE_FULL}
        WHERE status = 'finalized' AND group_id = @groupId
      ),
      team_a_players AS (
        SELECT match_id, pid, goals_team_a, goals_team_b,
               CASE WHEN goals_team_a > goals_team_b THEN 1 ELSE 0 END AS won
        FROM all_matches, UNNEST(team_a_player_ids) AS pid
      ),
      team_b_players AS (
        SELECT match_id, pid, goals_team_a, goals_team_b,
               CASE WHEN goals_team_b > goals_team_a THEN 1 ELSE 0 END AS won
        FROM all_matches, UNNEST(team_b_player_ids) AS pid
      ),
      all_participations AS (
        SELECT match_id, pid AS player_id, won FROM team_a_players
        UNION ALL
        SELECT match_id, pid AS player_id, won FROM team_b_players
      ),
      participation_stats AS (
        SELECT player_id,
               COUNT(*) AS matches_played,
               SUM(won) AS matches_won
        FROM all_participations
        GROUP BY player_id
      ),
      scorer_goals AS (
        SELECT s.player_id, SUM(s.goals) AS total_goals
        FROM all_matches, UNNEST(scorers) AS s
        GROUP BY s.player_id
      ),
      player_names AS (
        SELECT player_id, name
        FROM ${PLAYERS_TABLE_FULL}
      )
      SELECT
        COALESCE(p.player_id, sg.player_id) AS player_id,
        COALESCE(pn.name, '') AS player_name,
        COALESCE(p.matches_played, 0) AS matches_played,
        COALESCE(p.matches_won, 0) AS matches_won,
        COALESCE(sg.total_goals, 0) AS total_goals
      FROM participation_stats p
      FULL OUTER JOIN scorer_goals sg ON p.player_id = sg.player_id
      LEFT JOIN player_names pn ON COALESCE(p.player_id, sg.player_id) = pn.player_id
      ORDER BY matches_played DESC, matches_won DESC, total_goals DESC
    `,
  });

  return (rows as Record<string, unknown>[]).map((r) => ({
    playerId: String(normalizeValue(r.player_id) ?? ""),
    playerName: String(normalizeValue(r.player_name) ?? ""),
    matchesPlayed: Number(normalizeValue(r.matches_played) ?? 0),
    matchesWon: Number(normalizeValue(r.matches_won) ?? 0),
    totalGoals: Number(normalizeValue(r.total_goals) ?? 0),
  }));
}
