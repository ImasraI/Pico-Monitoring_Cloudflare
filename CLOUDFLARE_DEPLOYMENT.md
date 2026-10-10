# Full application on Cloudflare Free — no card or R2

The public website stays at `/`; the complete DANTO patient/doctor application stays at `/danto.html`, and its API at `/api`. Accounts, scans, treatment plans, rewards, messaging and private uploads remain available. This deployment uses Workers Free and D1 only. Do not activate R2 or a paid plan.

Files are split into BLOB chunks below D1's 2 MB row limit. Patient records and files share the **500 MB per-database limit**. The app caps file payloads at **400 MB** to reserve room for records/indexes. Actual database overhead and growing records can still reach the database limit. Each file retains the existing 10 MB limit. Uploads and their quota reservations are transactional; deletion releases file payload quota and deletes chunks.

This is a small deployment, not 200 GB of scan storage. Free quotas can cause requests to fail; the scripts do not subscribe you to paid usage. Official references: [Workers Free without a card](https://www.cloudflare.com/products/workers/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## Build settings

| Field | Value |
| --- | --- |
| Worker name | pico-monitoring |
| Build command | npm run build:cloudflare |
| Deploy command | npm run deploy:cloudflare |
| Root directory | / |
| Production branch | main |
| Preview builds | Disabled |
| Node version | 24 |

Root `wrangler.json` has the real D1 database UUID and no R2 binding. The build preserves the public website and produces `dist/server/wrangler.json`. Deployment applies pending D1 migrations using root config, then publishes using generated config. It stops if migrations fail.

## Dashboard steps

1. Sign in at dash.cloudflare.com and select your account.
2. Open Storage & databases → D1 SQLite Database. Create `pico-monitoring-db` if absent and put its UUID in root `wrangler.json`. This database has already been created and configured in the prepared repository.
3. **Skip R2 activation.** Do not enter payment details or select Workers Paid.
4. Push the prepared application, migration, configuration and scripts to your Git repository.
5. Open Workers & Pages → Create application → Continue with GitHub → select `PM-2006/Pico-Monitoring`.
6. Enter the build settings above. Disable Preview builds to avoid exposing production data through previews. Advanced settings → Path should be `/`.
7. Review the deployment API token permissions shown in Advanced settings. Cloudflare may offer to create a token automatically. Authorize it only after reviewing the access. The credential itself does not purchase a paid plan or R2 subscription.
8. Click Deploy and watch dependency installation, build, pending SQL migrations, and Worker upload. Applied migrations are skipped. `0005_free_file_storage.sql` adds the private file tables and quota.
9. If required, set build variable `NODE_VERSION=24` under Worker Settings → Builds and retry.
10. Open Worker Settings → Variables and Secrets. Add runtime **Secret** `DANTO_ADMIN_SETUP_KEY` with a random value of at least 32 characters; save/deploy it. Do not put it in Git or public/build variables.
11. Visit `/admin.html` and use “راه‌اندازی ادمین اولیه” to create the single primary administrator, with an unused email and a password of at least 12 characters. See [ADMIN_SETUP.md](ADMIN_SETUP.md). Remove the bootstrap secret afterwards; the old `DANTO_SETUP_KEY` is no longer used.
12. Create doctor accounts inside the administrator panel. Doctor self-registration is disabled even if the old key is still configured. Existing doctor accounts and patients are retained by migration `0006_admin_accounts.sql`.
13. Log in as the doctor at `/danto.html`, create a test patient, and test patient profile completion, scan upload and doctor review. Check admin access restrictions, suspension, password reset, logout, login and page reload.

If a Worker is already connected, update Settings → Builds to these commands and rebuild after pushing. The dashboard Worker name must match the root config. The default HTTPS workers.dev URL is enough; no purchased domain, Oracle server, `BUCKET`, `BACKEND_ORIGIN` or `PROXY_SECRET` is needed. [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Free runtime verification

Workers Free has request and CPU quotas. Password hashing and larger uploads must be checked on the real free runtime. A local build or dry run does not prove that every request fits its CPU quota. Password hashing is unchanged. If error 1102 occurs, investigate the workflow and adapt the implementation or practical upload size; do not enable a paid plan when no-card/no-charges is required.

Static marketing assets do not use D1 storage. Private file downloads pass through the authenticated API. Session cookies remain HttpOnly, Secure on HTTPS and SameSite=Strict.

## Storage usage and backups

In the D1 Console:

```sql
SELECT used_bytes, 400000000 AS file_payload_limit FROM file_storage_quota WHERE id=1;
```

Also check actual database size in D1 Overview. A database export now includes private file contents as well as patient records. From Windows:

```powershell
New-Item -ItemType Directory -Force work | Out-Null
npx.cmd wrangler login
npx.cmd wrangler d1 export DB --remote --config wrangler.json --output work/danto-backup.sql
```

Keep exports securely outside the Cloudflare account, with restricted access. The work directory is ignored by Git. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) is another recovery option within free retention limits. Existing R2 objects and local SQLite data are not automatically migrated. This account did not activate R2.

## Local testing

Storage tests cover multi-chunk round trips, cascade deletion, quota rollback, oversized-file rejection and duplicate safety. The framework build and dry run check packaging. Live public-page, login and upload checks are still required before deployment is verified.

```powershell
npm.cmd ci
npm.cmd run test:free-storage
npm.cmd run build:cloudflare
npx.cmd wrangler deploy --config dist/server/wrangler.json --dry-run
npm.cmd run db:cloudflare:local
Set-Content -Path .dev.vars -Value 'DANTO_ADMIN_SETUP_KEY="local-admin-bootstrap-test-key-2026"'
npm.cmd run dev:cloudflare
```

Open http://localhost:8787 and `/danto.html`. In another PowerShell window:

```powershell
$env:DANTO_TEST_URL='http://localhost:8787'
node tests/admin.integration.mjs
node tests/rewards.integration.mjs
```

Local emulated D1 is separate from production. Integration tests create accounts and must run on localhost. The local `.dev.vars` file is ignored. A timeout in the Windows emulator is not a passing runtime test; inspect logs and independently verify the deployed Worker.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| R2 billing prompt | Old config: both root and generated config must have no R2 bindings |
| Missing stored_files table | Apply migration 0005 using the deploy command |
| Migration permission denied | Git deployment token needs D1 edit access |
| Missing build script | Push package.json and the scripts before building |
| Administrator bootstrap rejected | Set DANTO_ADMIN_SETUP_KEY as a runtime secret; bootstrap is allowed only before an administrator exists |
| Missing doctor_access table | Apply migration 0006 before publishing the new Worker |
| Storage full | Check payload quota and actual D1 size; back up before removing uploads |
| Error 1102 | Worker CPU quota exceeded; investigate without enabling paid usage |
| Homepage becomes patient login | Use this repository's framework build, not the older static-only build |

Push source updates and new migration files to main for updates. Never edit an applied migration. Rolling back a Worker does not roll back database changes.
