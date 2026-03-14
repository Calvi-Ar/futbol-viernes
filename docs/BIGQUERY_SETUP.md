# BigQuery setup – GCP project ataxe-reports

Step-by-step instructions to configure the GCP project, create the dataset, and create the tables for the Fútbol del Viernes app.

**Prefer storing credentials in Secret Manager?**  
See **[SECRET_MANAGER_CREDENTIALS.md](SECRET_MANAGER_CREDENTIALS.md)** for storing the BigQuery service account key in Secret Manager and configuring the app to use it (no key files on disk).

---

## 1. Prerequisites

- A Google Cloud account with access to the project **ataxe-reports** (or create a new project and use its ID instead).
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed (optional but useful).

---

## 2. Enable the BigQuery API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the project **ataxe-reports** (top bar).
3. Go to **APIs & Services** → **Library** (or open: https://console.cloud.google.com/apis/library ).
4. Search for **BigQuery API**.
5. Open it and click **Enable** (if it’s not already enabled).

---

## 3. Create a service account (recommended for the app)

1. Go to **IAM & Admin** → **Service Accounts**:  
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=ataxe-reports  
2. Click **Create Service Account**.
3. **Service account name:** e.g. `futbol-viernes-app`.
4. **Service account ID:** will be filled automatically (e.g. `futbol-viernes-app`).
5. Click **Create and Continue**.
6. **Grant access (optional):**
   - Click **Add another role**.
   - Add **BigQuery Admin** (or at least **BigQuery Data Editor** + **BigQuery Job User** if you prefer minimal permissions).
   - Click **Continue** → **Done**.
7. In the list, open the service account you just created.
8. Go to the **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**.  
   The JSON key file will download. Keep it secure and **do not commit it to git**.

---

## 4. Configure the app (local)

1. In the project root, copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set (optional; these are the defaults):
   ```env
   GCP_PROJECT_ID=ataxe-reports
   BIGQUERY_DATASET=futbol_viernes
   ```

3. **Either** use Secret Manager (see [SECRET_MANAGER_CREDENTIALS.md](SECRET_MANAGER_CREDENTIALS.md)):
   ```env
   BIGQUERY_CREDENTIALS_SECRET=futbol-bigquery-credentials
   ```
   **Or** point the app to your service account key file:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./service-account-ataxe-reports.json
   ```
   Or use an absolute path, e.g.:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/Users/tu-usuario/keys/ataxe-reports-bigquery.json
   ```

4. Ensure `.env.local` and any key file path are in `.gitignore` (Next.js ignores `.env*.local` by default; add the key filename if you put it in the repo folder).

---

## 5. Create the dataset and tables

The app exposes an API that creates the dataset and tables for you.

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. From another terminal, call the setup endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/setup-bigquery
   ```

3. Expected response:
   ```json
   {
     "ok": true,
     "message": "Dataset and tables ready.",
     "dataset": "futbol_viernes",
     "tablesCreated": ["matches", "players"]
   }
   ```
   - First run: both tables are created, so `tablesCreated` is `["matches", "players"]`.
   - Later runs: dataset and tables already exist, so `tablesCreated` is `[]`.

4. Verify in GCP:
   - Go to [BigQuery](https://console.cloud.google.com/bigquery?project=ataxe-reports).
   - In the left panel, open **ataxe-reports** → **futbol_viernes**.
   - You should see **matches** and **players**.

---

## 6. Alternative: create dataset and tables with gcloud (no app)

If you prefer not to use the app’s API:

1. Install and log in:
   ```bash
   gcloud auth application-default login
   gcloud config set project ataxe-reports
   ```

2. Create the dataset:
   ```bash
   bq mk --dataset --location=US ataxe-reports:futbol_viernes
   ```

3. Create the **matches** table (run in the project root where the app lives, so the schema path is correct, or adapt paths):
   ```bash
   bq mk --table \
     ataxe-reports:futbol_viernes.matches \
     match_id:STRING,date:DATE,place_name:STRING,status:STRING,goals_team_a:INTEGER,goals_team_b:INTEGER,team_a_player_ids:STRING,team_b_player_ids:STRING,scorers:RECORD,notes:STRING,created_at:TIMESTAMP
   ```
   Note: BigQuery CLI for nested/repeated fields is a bit involved; using the app’s `POST /api/setup-bigquery` is simpler and matches the app’s schema exactly.

So in practice, **using the app (section 5)** is the recommended way to create both the dataset and the tables.

---

## 7. Troubleshooting

| Problem | What to do |
|--------|------------|
| `Could not load the default credentials` | Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env.local` to the service account JSON path, or run `gcloud auth application-default login`. When using Secret Manager, the identity (ADC or that key) only needs **Secret Manager Secret Accessor** on the secret. |
| `Permission denied` / 403 | Ensure the service account (or your user) has **BigQuery Admin** (or **BigQuery Data Editor** + **BigQuery Job User**) on the project. |
| `Not found: Dataset` | Run `POST /api/setup-bigquery` again; it creates the dataset first, then the tables. |
| `Already exists: Table` | Normal. The API skips creating tables that already exist and returns `tablesCreated: []`. |

---

## 8. Summary checklist

- [ ] BigQuery API enabled in project **ataxe-reports**.
- [ ] Service account created with BigQuery Admin (or Data Editor + Job User).
- [ ] Credentials configured: **either** Secret Manager (`BIGQUERY_CREDENTIALS_SECRET`; see [SECRET_MANAGER_CREDENTIALS.md](SECRET_MANAGER_CREDENTIALS.md)) **or** key file path in `GOOGLE_APPLICATION_CREDENTIALS`.
- [ ] `npm run dev` and `curl -X POST http://localhost:3000/api/setup-bigquery` run successfully.
- [ ] Dataset **futbol_viernes** and tables **matches** and **players** visible in BigQuery console.
