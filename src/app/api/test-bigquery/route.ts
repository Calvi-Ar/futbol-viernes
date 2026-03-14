import { NextResponse } from "next/server";
import { getBigQueryClient, DATASET_ID } from "@/lib/bigquery";

/**
 * GET /api/test-bigquery
 * Verifies BigQuery connection and that the configured dataset and tables exist.
 */
export async function GET() {
  try {
    const bigquery = await getBigQueryClient();
    const dataset = bigquery.dataset(DATASET_ID);
    const [exists] = await dataset.exists();
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: `Dataset "${DATASET_ID}" not found. Run POST /api/setup-bigquery first.` },
        { status: 404 }
      );
    }
    const [tables] = await dataset.getTables();
    const tableIds = tables.map((t) => t.id);
    return NextResponse.json({
      ok: true,
      dataset: DATASET_ID,
      tables: tableIds,
      message: "BigQuery connection OK.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
