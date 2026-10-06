# Deploy DANTO entirely on Cloudflare from Windows

This guide deploys the public marketing website and the existing DANTO patient/doctor application together: Vinext frontend and API, D1 database, and private R2 uploads. Oracle is not needed. The public address can be the free `workers.dev` hostname; you do not need to buy a domain.

The public marketing website remains at `/`. The patient/doctor application remains at `/danto.html`, and its API remains at `/api`. The Cloudflare build preserves both and writes its deployment configuration to `dist/server/wrangler.json`.

**Use these updated commands**, replacing the previous framework deployment settings:

| Cloudflare field | Value |
| --- | --- |
| Worker/project name | `pico-monitoring` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Root directory | Repository root (leave blank or `/`, depending on the form) |
| Production branch | Your actual deployment branch, commonly `main` |

The deploy command checks the database ID, applies unapplied D1 migrations, then publishes the Worker. It stops if migrations fail. It does not create a database or bucket automatically. Configured bindings come from the root `wrangler.json`; adding bindings only in the dashboard is insufficient for reproducible Git deployments.

Validation: the full marketing-site/application build and Wrangler deployment dry run passed. All five migrations applied to local D1. The standalone API previously passed 104 integration checks; the newer full-framework deployment still requires live login, file upload and public-page verification. The real D1 database has been created and configured, but no Worker has been published yet.

## 1. Start from Cloudflare's home page

1. Open [dash.cloudflare.com](https://dash.cloudflare.com/) and sign in.
2. Select the Cloudflare **account** you want to use. Stay at account level; you do not need to select a website/domain.
3. Locate **Workers & Pages** under **Compute** / **Compute & AI** in the left sidebar. If labels have moved, use the dashboard search to find the product by name.
4. If prompted, choose a Workers subdomain. This becomes part of `https://pico-monitoring.YOUR-SUBDOMAIN.workers.dev`.
5. Prepare the database and bucket below before starting the first Git build.

Official reference: [Workers Git builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

## 2. Create the D1 database

1. From the account sidebar, find **Storage & databases → D1 SQL Database**. You can also search for **D1**.
2. Click **Create database**.
3. Enter `pico-monitoring-db` as the database name and choose a location option appropriate to your deployment.
4. Click **Create**.
5. Open the database and copy its **Database ID / UUID** from the overview. It looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
6. Do not create tables manually. The deployment script will apply the five committed SQL migrations in `drizzle/`.

Official reference: [D1 setup](https://developers.cloudflare.com/d1/get-started/).

## 3. Enable R2 and create a private bucket

1. Go back to the account sidebar and open **Storage & databases → R2 Object Storage**.
2. If this is your first R2 use, complete the subscription/billing activation shown by Cloudflare. R2 has included free usage, but can bill for usage above it; review the displayed terms.
3. Click **Create bucket**.
4. Enter `pico-monitoring-files`. Choose **Standard** storage and a suitable location option.
5. Create the bucket.
6. Keep public access disabled: do not enable an `r2.dev` public URL or attach a public custom domain. Patient files are delivered by the authenticated API.
7. No S3 access keys or CORS settings are needed for this app. It uses the Worker R2 binding.

Official references: [Create R2 buckets](https://developers.cloudflare.com/r2/buckets/create-buckets/) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## 4. Put the resource configuration in your repository

On **Windows**, install Node.js 24 LTS if needed. Open PowerShell in your project:

```powershell
Set-Location C:\Users\Arsam\code\Pico-Monitoring
notepad wrangler.json
```

Replace **only** the placeholder database ID:

```json
"database_id": "00000000-0000-4000-8000-000000000000"
```

with the real UUID copied in step 2. Keep the binding names exactly `DB` and `BUCKET`. The database and bucket names must match the resources you created. If you use a different Worker name, change `name` here and use that identical name in the dashboard.

The database UUID is configuration, not a password. It may be committed. Do not commit account tokens, patient exports, or doctor setup keys.

Install dependencies and check the Cloudflare package locally:

```powershell
npm.cmd ci
npm.cmd run build:cloudflare
npx.cmd wrangler deploy --config dist/server/wrangler.json --dry-run
```

The dry run packages the application without publishing it or applying remote migrations. It does not prove your account permissions or remote database are correct.

Push **the prepared project changes and edited `wrangler.json`** to the repository connected to Cloudflare. Use your Git client to review the changes, commit, and push to your deployment branch. A local edit is not visible to Cloudflare until pushed. Keep the existing Oracle and developer launcher files if you still want those options; they are not used by this Cloudflare build.

## 5. Connect the Git repository and deploy

1. At Cloudflare account home, open **Workers & Pages**.
2. Click **Create application** and choose the option to import/connect a Git repository (for example **Continue with GitHub**). Select **Workers**, if asked to choose Workers versus Pages.
3. Authorize Cloudflare to access your repository if necessary, then select your repo.
4. Set the Worker name to **`pico-monitoring`**, matching `wrangler.json`.
5. Choose your production branch.
6. Set the **build command** to `npm run build:cloudflare`.
7. Set the **deploy command** to `npm run deploy:cloudflare`.
8. Leave the root directory at the repo root. Workers does not need a Pages output-directory field: the generated assets directory is defined in `dist/server/wrangler.json`.
9. If the form offers build variables, set `NODE_VERSION` to `24`. Otherwise set it under the Worker's Settings → Builds after creation and retry if necessary.
10. Use the generated build API token/default account authorization if offered. If you supply your own token, it needs permission to deploy Workers and assets, apply D1 migrations, and use the R2 bindings in this account. A Workers-only token can fail on the migration step.
11. Click **Deploy** / **Save and deploy** and watch the logs.

Expected log stages: dependency install → Cloudflare build → D1 migrations → Worker and asset upload. The final result includes your `workers.dev` URL. Subsequent pushes to the production branch repeat this process; already applied migrations are skipped.

If your repository is **already connected**, open its Worker → **Settings → Builds**, edit the build/deploy commands to the values above, and trigger a new build after pushing the root config. If the dashboard Worker has a different name, update the config to match it. This publishes the full application to that Worker, replacing any prior Oracle-proxy deployment there.

Official references: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) and [build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## 6. Add your doctor setup secret

The site can deploy without the setup secret, but creating a doctor account will fail until it is set.

1. Open **Workers & Pages → pico-monitoring → Settings → Variables and Secrets**.
2. Click **Add** and choose **Secret**.
3. Name it exactly **`DANTO_SETUP_KEY`**.
4. Enter a long random value from your password manager. Save this value privately; you will enter it when creating your doctor account.
5. Click **Save** / **Deploy** as prompted so it is available to the current Worker deployment.

This is a **runtime Worker secret**, not a Git build variable. Do not put it into `wrangler.json`, frontend code, or your Git repository. No `PROXY_SECRET`, `BACKEND_ORIGIN`, or Oracle address is needed.

Official reference: [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## 7. Check the bindings and open the site

1. Open the Worker's **Bindings** tab and confirm:
   - D1 binding **`DB`** points to `pico-monitoring-db`.
   - R2 binding **`BUCKET`** points to `pico-monitoring-files`.
   - The static-assets binding is **`ASSETS`**.
2. Open D1 → your database → **Console**. Run `SELECT name FROM sqlite_master WHERE type='table';`. You should see the application's tables, including `users`, `sessions`, `patient_profiles` and reward tables.
3. Open `https://pico-monitoring.YOUR-SUBDOMAIN.workers.dev/api?op=me` while signed out. HTTP 401 with the app login message is expected. This checks the API is reachable; finish the login/upload checks below to verify storage.
4. Click **Visit** on the Worker overview, or open its HTTPS URL directly.
5. Visit `/danto.html` and in DANTO choose doctor account creation, enter the setup secret, name, email and a password of at least 12 characters.
6. Create a test patient, sign out, log in with that patient's phone number and initial password, complete the profile, and upload a small test image.
7. Sign in as the doctor, check the patient record, review the scan and download the test file. Reload the page to confirm the session persists.
8. Once all doctor accounts are created, remove `DANTO_SETUP_KEY` from runtime secrets and publish the change. Restore a fresh secret later if you need to create another doctor.

Do not run the integration test against the public production URL; it is deliberately restricted to localhost and creates test accounts.

## 8. Optional custom domain

You can keep `workers.dev`. For a custom hostname, first add your domain to Cloudflare and activate its nameservers. Then open Worker → **Settings → Domains & Routes → Add → Custom Domain**, enter a hostname such as `app.example.com`, and follow the prompts. Visit the new HTTPS address. Frontend and API share the same hostname; no backend DNS record or CORS configuration is needed.

## 9. Preview branches and updates

For the initial deployment, use **production branch only**. Disable non-production builds under Settings → Builds / branch controls if they are enabled. Do not set the production deployment script as the non-production command: it applies migrations to the production database. Do not give public previews production DB/R2 bindings; use a separate Worker, database and bucket for staging.

For updates, commit and push the changed source and any new committed SQL migrations. Cloudflare rebuilds and applies pending migrations. Never edit an already applied SQL migration. A Worker rollback does not undo database changes; review migration compatibility before rolling back.

D1 provides [Time Travel recovery](https://developers.cloudflare.com/d1/reference/time-travel/). For an explicit database export from Windows:

```powershell
npx.cmd wrangler login
npx.cmd wrangler d1 export DB --remote --config wrangler.json --output work/danto-backup.sql
```

Create the ignored `work` directory first if missing. Store database exports and independent R2 object backups securely off the account, with restricted access. An SQL backup does not contain uploaded files. Local SQLite data created by `dev.bat` is not automatically uploaded to D1/R2.

## 10. Limits and troubleshooting

Start with a small test dataset and check Worker metrics/logs. The free Worker plan has a 10 ms CPU allowance per invocation, and this app performs password hashing. Cloudflare-only compatibility does not establish that every login/upload fits the free plan. If CPU-limit errors occur, consider Workers Paid and verify the affected workflow; do not weaken password hashing. See [Worker limits](https://developers.cloudflare.com/workers/platform/limits/) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

| Problem | Fix |
| --- | --- |
| Database placeholder error | Paste the real D1 UUID into root `wrangler.json`, commit, push and rebuild |
| Database/bucket not found | Confirm resource names and Cloudflare account match the config |
| R2 disabled | Activate R2 in the account dashboard |
| Permission error during migrations | Use a build deployment token authorized for D1 as well as Workers/R2 |
| Worker name mismatch | Dashboard project name must equal root config `name` |
| Missing table | Check migration logs and ensure `npm run deploy:cloudflare` was used |
| Doctor setup rejected | Add `DANTO_SETUP_KEY` as a runtime Secret; deploy it, then enter the exact value |
| Login fails with error 1102 | Check CPU usage and Worker plan limits |
| Changes missing | Push the changes to the configured production branch and inspect the latest build |
| `/api` gives an Oracle backend error | Old proxy deployed; use the new build and deploy commands in this guide |

## Optional Windows local test with real Cloudflare emulation

These commands use local D1 and R2, not your remote resources:

```powershell
npm.cmd run build:cloudflare
npm.cmd run db:cloudflare:local
Set-Content -Path .dev.vars -Value 'DANTO_SETUP_KEY="local-layout-test"'
npm.cmd run dev:cloudflare
```

Open `http://localhost:8787` for the public site and `/danto.html` for the patient application. In a second PowerShell window:

```powershell
$env:DANTO_TEST_URL = 'http://localhost:8787'
node tests/rewards.integration.mjs
```

The `.dev.vars` file is ignored by Git. Keep it local. Production secrets must be set in the Worker dashboard.
