import { NextResponse } from "next/server";
import { getBigQueryClient, PROJECT_ID, DATASET_ID, MATCHES_TABLE_ID, MATCHES_SCHEMA } from "@/lib/bigquery";

const TABLE_FULL = `\`${PROJECT_ID}.${DATASET_ID}.${MATCHES_TABLE_ID}\``;

/**
 * POST /api/cleanup-matches
 * Recreates the matches table with the updated schema (scorers.team field).
 * Preserves existing match data.
 */
export async function POST() {
  try {
    const bigquery = await getBigQueryClient();
    const dataset = bigquery.dataset(DATASET_ID);

    // 1. Read all existing matches
    const [rows] = await bigquery.query({
      query: `SELECT * FROM ${TABLE_FULL}`,
    });

    // 2. Drop and recreate with new schema
    await dataset.table(MATCHES_TABLE_ID).delete();
    await dataset.createTable(MATCHES_TABLE_ID, { schema: MATCHES_SCHEMA });

    // 3. Re-insert existing matches with DML
    for (const r of rows as Record<string, unknown>[]) {
      const nv = (k: string) => {
        const v = r[k];
        if (v && typeof v === "object" && "value" in v) return (v as { value: unknown }).value;
        return v;
      };
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const sqlStr = (v: unknown) => (v == null ? "NULL" : `'${esc(String(v))}'`);

      const matchId = String(nv("match_id") ?? "");
      const date = String(nv("date") ?? "");
      const placeName = nv("place_name");
      const status = String(nv("status") ?? "pending");
      const goalsA = Number(nv("goals_team_a") ?? 0);
      const goalsB = Number(nv("goals_team_b") ?? 0);
      const notes = nv("notes");

      const rawTeamA = (r.team_a_player_ids ?? []) as (string | { value: string })[];
      const rawTeamB = (r.team_b_player_ids ?? []) as (string | { value: string })[];
      const teamAIds = rawTeamA.map((id) => {
        if (typeof id === "object" && id !== null && "value" in id) return String(id.value);
        return String(id);
      });
      const teamBIds = rawTeamB.map((id) => {
        if (typeof id === "object" && id !== null && "value" in id) return String(id.value);
        return String(id);
      });

      const teamASQL = teamAIds.length === 0 ? "[]" : "[" + teamAIds.map((id) => `'${esc(id)}'`).join(", ") + "]";
      const teamBSQL = teamBIds.length === 0 ? "[]" : "[" + teamBIds.map((id) => `'${esc(id)}'`).join(", ") + "]";

      const rawScorers = (r.scorers ?? []) as Record<string, unknown>[];
      const teamASet = new Set(teamAIds);
      const scorersSQL = rawScorers.length === 0
        ? "[]"
        : "[" + rawScorers.map((s) => {
            const pid = String(s.player_id ?? "");
            const pname = String(s.player_name ?? "");
            const goals = Number(s.goals ?? 0);
            const team = s.team ? String(s.team) : (teamASet.has(pid) ? "a" : "b");
            return `STRUCT('${esc(pid)}' AS player_id, '${esc(pname)}' AS player_name, ${goals} AS goals, '${esc(team)}' AS team)`;
          }).join(", ") + "]";

      await bigquery.query({
        query: `INSERT INTO ${TABLE_FULL}
          (match_id, date, place_name, status, goals_team_a, goals_team_b,
           team_a_player_ids, team_b_player_ids, scorers, notes, created_at)
          VALUES (
            ${sqlStr(matchId)}, ${sqlStr(date)}, ${sqlStr(placeName)}, ${sqlStr(status)},
            ${goalsA}, ${goalsB}, ${teamASQL}, ${teamBSQL}, ${scorersSQL},
            ${sqlStr(notes)}, CURRENT_TIMESTAMP()
          )`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Matches table recreated. ${(rows as unknown[]).length} match(es) migrated.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
