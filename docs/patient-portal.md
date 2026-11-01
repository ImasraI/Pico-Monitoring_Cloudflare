# Patient portal additions

The patient portal includes the staged questionnaire from the supplied offline HTML, message replies, urgent reports linked to uploaded scan images, and a visual journey for child/teen reward modes. Adult mode retains the formal treatment list. Existing scheduling, upload validation and reward rules remain authoritative.

## Data and deployment

- `drizzle/0009_patient_portal.sql` adds `patient_intakes` and optional reply/scan references on messages. Existing patient identities, passwords, scans and messages are preserved.
- Questionnaire drafts are stored by the authenticated API. The client keeps unsaved changes in memory only. A revision number rejects concurrent overwrites with HTTP 409. Canonical name and birth date come from the physician-managed record.
- Only the patient and their assigned doctor can read this questionnaire. Doctor edits require `patients.manage`. It is a health-history form, not an electronic consent or medical diagnosis.
- Urgent reports create the scan, image rows and linked message together in a database batch after private image uploads succeed. An urgent report is an unscored free scan. There are no simulated scans or automatic doctor replies.
- Deploy **both** the Cloudflare frontend and Oracle backend. Build the backend with `node scripts/build-oracle.mjs`; deploy `dist/oracle` using the existing process in `deploy/oracle/README.md`. Back up the production data before applying schema changes. Do not upload any local test database.
- An authenticated `GET /api?op=portal.capabilities` returns `version: 1`, `intake`, `replies` and `urgentScans`. The Oracle public `/healthz` response includes `portalVersion: 1`. These are release signals, not authorization bypasses. Frontend compatibility guards keep old-server features from pretending to save successfully.

## Education and store catalogs

`public/portal-content.json` intentionally contains empty item/product lists. No reference media, product prices, patient examples or claimed doctor recommendations were imported. Catalogs can be filled with reviewed real content later:

- Education item: `{ "id": "unique-id", "title": "...", "topic": "...", "type": "slides", "description": "...", "slides": [{ "text": "...", "image": "/reviewed-image.webp", "alt": "..." }] }`. A video item uses `type: "video"` and an HTTPS `url` to its original source.
- Product: `{ "id": "unique-id", "title": "...", "description": "...", "category": "...", "price": 100000, "order": 1, "popularity": 0 }`. Prices are in toman.
- Recommendation: `{ "treatmentType": "aligner", "text": "..." }`. Only publish recommendations reviewed for that treatment category. Individual recommendations need a future physician-managed workflow.

Search, content-type/topic filters, slide navigation, store category/sort filters and an in-memory selection basket are ready. Order placement and payments are explicitly unavailable; this release does not claim checkout support.

## Verification

Run `node --test tests/portal-migration.test.mjs`. For API verification, run `node tests/portal.integration.mjs` against a localhost backend with `DANTO_TEST_URL`, `DANTO_TEST_ADMIN_PHONE`, and `DANTO_TEST_ADMIN_PASSWORD` set privately in the session. The suite uses synthetic local accounts only.

## Production verification — 2026-11-01

Both repositories contain the same portal release. Cloudflare Workers Builds completed successfully. The Oracle timer delivered the same backend files as the tested local build, migration `0009_patient_portal.sql` is applied, public `/healthz` reports `portalVersion: 1`, and authenticated requests through the website return all three portal capabilities as enabled. Direct backend API access still returns HTTP 403 without the server-side proxy credential. The owner verification session was signed out; no new production test accounts were created.
