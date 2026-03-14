import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { BigQuery } from "@google-cloud/bigquery";

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? "ataxe-reports";

/**
 * Full resource name of the secret that holds the BigQuery service account key JSON.
 * Set BIGQUERY_CREDENTIALS_SECRET to use Secret Manager (e.g. projects/ataxe-reports/secrets/futbol-bigquery-credentials/versions/latest).
 */
function getCredentialsSecretName(): string | null {
  const v = process.env.BIGQUERY_CREDENTIALS_SECRET?.trim();
  if (!v) return null;
  return v.startsWith("projects/")
    ? v
    : `projects/${PROJECT_ID}/secrets/${v}/versions/latest`;
}

let cachedBigQueryClient: BigQuery | null = null;

/**
 * Fetches the BigQuery service account key JSON from Secret Manager.
 */
async function getCredentialsFromSecretManager(secretName: string): Promise<Record<string, unknown>> {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: secretName });
  const payload = version.payload?.data;
  if (!payload) {
    throw new Error("Secret payload is empty");
  }
  const raw =
    typeof payload === "string" ? payload : Buffer.from(payload as Uint8Array).toString("utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Returns a BigQuery client.
 * - If BIGQUERY_CREDENTIALS_SECRET is set: fetches the service account key from
 *   Secret Manager and uses it (cached for subsequent calls).
 * - Otherwise: uses GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials.
 */
export async function getBigQueryClient(): Promise<BigQuery> {
  const secretName = getCredentialsSecretName();
  if (secretName) {
    if (cachedBigQueryClient) {
      return cachedBigQueryClient;
    }
    const credentials = await getCredentialsFromSecretManager(secretName);
    cachedBigQueryClient = new BigQuery({
      projectId: PROJECT_ID,
      credentials,
    });
    return cachedBigQueryClient;
  }
  return new BigQuery({ projectId: PROJECT_ID });
}
