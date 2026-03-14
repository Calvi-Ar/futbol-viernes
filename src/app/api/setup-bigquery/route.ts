import { NextResponse } from "next/server";
import { setupBigQuery } from "@/lib/bigquery";

/**
 * POST /api/setup-bigquery
 * Creates the BigQuery dataset (from BIGQUERY_DATASET) and tables (matches, players)
 * in the GCP project (GCP_PROJECT_ID). If using Secret Manager (BIGQUERY_CREDENTIALS_SECRET),
 * ADC or GOOGLE_APPLICATION_CREDENTIALS are required to fetch the secret.
 */
export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const result = await setupBigQuery();
    return NextResponse.json({
      ok: true,
      message: "Dataset and tables ready.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
