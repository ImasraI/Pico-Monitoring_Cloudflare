# Public website integration

Imported from the colleague's `pico-monitoring.zip` into the existing application. The standalone React Router/Vite project has been adapted to the current Next/Vinext server routes without installing a second framework or replacing the medical backend.

- Public UI, content registry and styling: `components/marketing/`.
- Root and named public routes: `app/page.tsx` and `app/[...slug]/page.tsx`.
- Server-rendered metadata and structured data: `components/marketing/metadata.ts`.
- Existing doctor/patient portal: `/danto.html`; linked from every public page.
- Contact numbers and canonical Site origin: `components/marketing/config.ts`.
- Local checks: `node tests/public-site.integration.mjs`.

Navigation uses native document links, including working hash links and browser back/forward, because the installed Vinext production Link shim failed client transitions during verification. Search, filters, mobile navigation and contact draft generation are hydrated React interactions within each page.

The three reference documents here preserve the colleague's asset, design and research handoff. Their original `src/` paths now correspond to `components/marketing/`. Login is active in this integrated version. Contact still prepares a local draft; there is no request delivery backend. Product illustrations remain explicitly conceptual until approved assets are supplied.

No patient records, scan uploads, passwords, environment files, dependency folders or prebuilt files from the ZIP are included in this import. Existing API authorization, D1 schema, migrations and R2 storage remain in use.
