import { NextResponse } from "next/server";
import { getBigQueryClient, PROJECT_ID, DATASET_ID, PLAYERS_TABLE_ID, PLAYERS_SCHEMA } from "@/lib/bigquery";

const TABLE_FULL = `\`${PROJECT_ID}.${DATASET_ID}.${PLAYERS_TABLE_ID}\``;

/**
 * POST /api/cleanup-players
 * Deduplicates the players table: keeps only the latest row per player_id,
 * drops deleted_at column by recreating the table with the clean schema.
 */
export async function POST() {
  try {
    const bigquery = await getBigQueryClient();
    const dataset = bigquery.dataset(DATASET_ID);

    // 1. Read deduplicated data
    const [rows] = await bigquery.query({
      query: `
        SELECT player_id, name, age, is_goalie, preferred_position,
               stamina, control, shot, dribble, defense, created_at, updated_at
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY updated_at DESC) AS rn
          FROM ${TABLE_FULL}
        ) WHERE rn = 1
      `,
    });

    // 2. Drop existing table
    const table = dataset.table(PLAYERS_TABLE_ID);
    await table.delete();

    // 3. Recreate with clean schema (no deleted_at)
    await dataset.createTable(PLAYERS_TABLE_ID, { schema: PLAYERS_SCHEMA });

    // 4. Re-insert deduplicated rows via DML
    for (const r of rows as Record<string, unknown>[]) {
      const nv = (k: string) => {
        const v = r[k];
        if (v && typeof v === "object" && "value" in v) return (v as { value: unknown }).value;
        return v;
      };
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const playerId = String(nv("player_id") ?? "");
      const name = String(nv("name") ?? "");
      const age = nv("age") != null ? String(Math.round(Number(nv("age")))) : "NULL";
      const isGoalie = Boolean(nv("is_goalie")) ? "TRUE" : "FALSE";
      const pos = nv("preferred_position") != null ? `'${esc(String(nv("preferred_position")))}'` : "NULL";

      await bigquery.query({
        query: `INSERT INTO ${TABLE_FULL}
          (player_id, name, age, is_goalie, preferred_position, stamina, control, shot, dribble, defense, created_at, updated_at)
          VALUES (
            '${esc(playerId)}', '${esc(name)}', ${age}, ${isGoalie}, ${pos},
            ${nv("stamina") ?? 3}, ${nv("control") ?? 3}, ${nv("shot") ?? 3},
            ${nv("dribble") ?? 3}, ${nv("defense") ?? 3},
            CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
          )`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Cleaned up: ${(rows as unknown[]).length} unique player(s) kept.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
