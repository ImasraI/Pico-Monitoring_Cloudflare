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
