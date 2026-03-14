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
  { name: "dribble", type: "INTEGER", mode: "REQUIRED" },
  { name: "defense", type: "INTEGER", mode: "REQUIRED" },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
  { name: "updated_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

export const MATCHES_TABLE_ID = "matches";
export const PLAYERS_TABLE_ID = "players";

const PLAYERS_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + PLAYERS_TABLE_ID + "`";
const MATCHES_TABLE_FULL = "`" + PROJECT_ID + "." + DATASET_ID + "." + MATCHES_TABLE_ID + "`";

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
// Players CRUD (all DML — no streaming insert)
// ---------------------------------------------------------------------------

function playerInsertSQL(p: Player): string {
  return `INSERT INTO ${PLAYERS_TABLE_FULL}
    (player_id, name, age, is_goalie, preferred_position, stamina, control, shot, dribble, defense, created_at, updated_at)
    VALUES (
      ${sqlStr(p.id)}, ${sqlStr(p.name)}, ${sqlInt(p.age)}, ${sqlBool(p.isGoalie)},
      ${sqlStr(p.preferredPosition)}, ${sqlInt(p.ratings.stamina)}, ${sqlInt(p.ratings.control)},
      ${sqlInt(p.ratings.shot)}, ${sqlInt(p.ratings.dribble)}, ${sqlInt(p.ratings.defense)},
      ${sqlTs()}, ${sqlTs()}
    )`;
}

export async function insertPlayer(player: Player): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({ query: playerInsertSQL(player) });
}

export async function updatePlayer(player: Player): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${PLAYERS_TABLE_FULL} WHERE player_id = @id`,
    params: { id: player.id },
  });
  await bigquery.query({ query: playerInsertSQL(player) });
}

export async function deletePlayer(playerId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${PLAYERS_TABLE_FULL} WHERE player_id = @id`,
    params: { id: playerId },
  });
}

// ---------------------------------------------------------------------------
// Matches CRUD (all DML)
// ---------------------------------------------------------------------------

function matchInsertSQL(m: Match): string {
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
     team_a_player_ids, team_b_player_ids, scorers, notes, created_at)
    VALUES (
      ${sqlStr(m.id)}, ${sqlStr(m.date)}, ${sqlStr(m.place)}, ${sqlStr(m.status)},
      ${sqlInt(m.goalsA)}, ${sqlInt(m.goalsB)},
      ${sqlArr(m.teams.teamA.map((x) => x.id))},
      ${sqlArr(m.teams.teamB.map((x) => x.id))},
      ${scorersSQL},
      ${sqlStr(m.notes)}, ${sqlTs()}
    )`;
}

export async function insertMatch(match: Match): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({ query: matchInsertSQL(match) });
}

export async function updateMatch(match: Match): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${MATCHES_TABLE_FULL} WHERE match_id = @id`,
    params: { id: match.id },
  });
  await bigquery.query({ query: matchInsertSQL(match) });
}

export async function deleteMatch(matchId: string): Promise<void> {
  const bigquery = await getBigQueryClient();
  await bigquery.query({
    query: `DELETE FROM ${MATCHES_TABLE_FULL} WHERE match_id = @id`,
    params: { id: matchId },
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
    ratings: {
      stamina: Number(nv("stamina") ?? 3) as Player["ratings"]["stamina"],
      control: Number(nv("control") ?? 3) as Player["ratings"]["control"],
      shot: Number(nv("shot") ?? 3) as Player["ratings"]["shot"],
      dribble: Number(nv("dribble") ?? 3) as Player["ratings"]["dribble"],
      defense: Number(nv("defense") ?? 3) as Player["ratings"]["defense"],
    },
  };
}

export async function getPlayersFromBigQuery(): Promise<Player[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT player_id, name, age, is_goalie, preferred_position, stamina, control, shot, dribble, defense
            FROM ${PLAYERS_TABLE_FULL}
            ORDER BY name`,
  });
  return (rows as PlayerRow[]).map(rowToPlayer);
}

type MatchRow = Record<string, unknown>;

export async function getMatchesFromBigQuery(
  players: Player[]
): Promise<Match[]> {
  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({
    query: `SELECT match_id, date, status, goals_team_a, goals_team_b,
                   team_a_player_ids, team_b_player_ids, scorers, notes, place_name
            FROM ${MATCHES_TABLE_FULL}
            ORDER BY date DESC, created_at DESC`,
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

export async function getPlayerStats(): Promise<PlayerStats[]> {
  const bigquery = await getBigQueryClient();

  const [rows] = await bigquery.query({
    query: `
      WITH all_matches AS (
        SELECT match_id, goals_team_a, goals_team_b,
               team_a_player_ids, team_b_player_ids, scorers
        FROM ${MATCHES_TABLE_FULL}
        WHERE status = 'finalized'
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
