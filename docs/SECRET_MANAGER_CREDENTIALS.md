# Store BigQuery credentials in Secret Manager

This guide explains how to store the BigQuery service account key in **Secret Manager** and configure the app to use it. The app will fetch the key from the secret at runtime instead of reading a JSON file from disk.

---

## Why use Secret Manager?

- **No key files on disk** – credentials stay in GCP; no JSON keys to copy or commit.
- **Easier rotation** – update the secret version without redeploying.
- **Same pattern in production** – e.g. Cloud Run uses a service account that only needs permission to *read* the secret; the key inside the secret is used for BigQuery.

---

## 1. Enable APIs

In [Google Cloud Console](https://console.cloud.google.com/) (project **ataxe-reports**):

1. **Secret Manager API**  
   [Enable it](https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=ataxe-reports).

2. **BigQuery API**  
   [Enable it](https://console.cloud.google.com/apis/library/bigquery.googleapis.com?project=ataxe-reports) if not already.

---

## 2. Create the BigQuery service account (key goes in the secret)

This account is used only for BigQuery; its key will be stored in Secret Manager.

1. Go to **IAM & Admin** → **Service Accounts**:  
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=ataxe-reports  

2. **Create Service Account**  
   - Name: e.g. `futbol-bigquery-writer`  
   - Click **Create and Continue**.

3. **Add role:** **BigQuery Admin** (or **BigQuery Data Editor** + **BigQuery Job User**).  
   Click **Done**.

4. Open the new service account → **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**.  
   Save the downloaded JSON file somewhere safe (you will paste its contents into a secret in the next section; you can delete the file afterward).

---

## 3. Create the secret and store the key

1. Go to **Security** → **Secret Manager**:  
   https://console.cloud.google.com/security/secret-manager?project=ataxe-reports  

2. Click **Create secret**.

3. **Name:** `futbol-bigquery-credentials` (or another name; you’ll use it in `BIGQUERY_CREDENTIALS_SECRET`).

4. **Secret value:**  
   Open the JSON key file you downloaded, select all, and paste the **entire contents** (one line or pretty-printed, both work).  
   Do not add extra quotes or characters; it must be valid JSON.

5. Click **Create**.

6. (Optional) For automatic versioning you can use `latest` in the app; Secret Manager always has a version (e.g. `versions/1`). The app uses `versions/latest` by default.

---

## 4. Who can read the secret?

The identity that **runs the app** must be able to read this secret. Grant **Secret Manager Secret Accessor** on the secret to that identity.

### Option A: Local development (your user)

1. In Secret Manager, open the secret **futbol-bigquery-credentials**.
2. Go to **Permissions** (or use IAM).
3. **Grant access** to your user (e.g. `your-email@gmail.com`) with role **Secret Manager Secret Accessor**  
   (or grant the role at project level if you prefer).

Then use Application Default Credentials when running the app locally:

```bash
gcloud auth application-default login
```

Do **not** set `GOOGLE_APPLICATION_CREDENTIALS` if you use ADC; the app will use your user to read the secret and then use the key inside the secret for BigQuery.

### Option B: Local development (separate “app” service account)

1. Create a second service account, e.g. `futbol-app-local`.
2. Give it only **Secret Manager Secret Accessor** on the secret **futbol-bigquery-credentials** (no BigQuery role).
3. Download its JSON key and set:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/futbol-app-local.json
   ```
   The app will use this key to call Secret Manager and fetch the BigQuery key from the secret.

### Option C: Production (e.g. Cloud Run)

1. In **Cloud Run** → your service → **Permissions**, the service uses a service account (e.g. default compute SA or a custom one).
2. Grant that service account **Secret Manager Secret Accessor** on the secret **futbol-bigquery-credentials**.

No key file is needed on the container; the service account identity is used to read the secret.

---

## 5. Configure the app

In `.env.local` (or your deployment env):

```env
GCP_PROJECT_ID=ataxe-reports
BIGQUERY_DATASET=futbol_viernes

# Use the secret (full name or just secret id)
BIGQUERY_CREDENTIALS_SECRET=projects/ataxe-reports/secrets/futbol-bigquery-credentials/versions/latest
```

Or only the secret id (project and `versions/latest` are added by the app):

```env
BIGQUERY_CREDENTIALS_SECRET=futbol-bigquery-credentials
```

Do **not** set `GOOGLE_APPLICATION_CREDENTIALS` when using ADC (Option A).  
Do set it when using a key file for the identity that has Secret Accessor (Option B or C with custom SA key).

---

## 6. Run the app and create dataset/tables

1. Start the app:
   ```bash
   npm run dev
   ```

2. Create dataset and tables:
   ```bash
   curl -X POST http://localhost:3000/api/setup-bigquery
   ```

If something fails, see **Troubleshooting** below.

---

## 7. Summary

| Step | Action |
|------|--------|
| 1 | Enable Secret Manager API and BigQuery API. |
| 2 | Create SA with BigQuery Admin, download its JSON key. |
| 3 | In Secret Manager, create secret `futbol-bigquery-credentials` with the **full JSON key** as value. |
| 4 | Grant **Secret Manager Secret Accessor** on that secret to the identity that runs the app (your user, or an “app” SA, or Cloud Run SA). |
| 5 | Set `BIGQUERY_CREDENTIALS_SECRET` in `.env.local` (and optionally `GOOGLE_APPLICATION_CREDENTIALS` only if using an app SA key). |
| 6 | Run the app and call `POST /api/setup-bigquery`. |

---

## 8. Troubleshooting

| Error | What to do |
|-------|------------|
| `Could not load the default credentials` | For local: run `gcloud auth application-default login`. Or set `GOOGLE_APPLICATION_CREDENTIALS` to a key that has **Secret Manager Secret Accessor**. |
| `Permission denied` / 403 on Secret Manager | Grant the identity that runs the app the role **Secret Manager Secret Accessor** on the secret (or on the project). |
| `Secret payload is empty` | The secret value must be the full JSON key file content. Create a new version of the secret and paste the entire JSON. |
| BigQuery 403 after reading secret | The JSON in the secret must be the key of a service account that has **BigQuery Admin** (or Data Editor + Job User). |
