# Homepage redesign: sources and replacement guide

Scope: public homepage only. Shared Header, Footer, navigation, contact configuration, FAQ implementation and internal page components are unchanged. `pages.json` changes only the homepage metadata. Existing brand typography, spacing tokens, colors and controls are inherited; all new CSS is prefixed `.pm-home`.

The supplied homepage brief supersedes the earlier request to implement the prototype's app features. The four HTML files are visual sources for this homepage, not new authenticated application screens. No demo authentication, AI diagnosis, shop/checkout or simulated scan completion is published as working functionality.

## Asset inventory

All new screenshots are static, optimized WebP images; their original scripts and embedded user data are not shipped. Source HTML remains outside public assets. Names, IDs and contact data have been replaced with generic sample values. Diagnostic AI observations were replaced with neutral sample workflow copy. Preview captions identify sample interfaces.

| Homepage use | Asset path | Source | Status / replacement |
|---|---|---|---|
| Hero, product, workflow and practice | `/assets/home/dashboard-list.webp` | PM dashboard 1.html, rendered at 1440 × 950 | Reference UI, anonymized sample data. Replace with approved dashboard capture at same ratio. |
| Product inset, workflow and practice | `/assets/home/dashboard-detail.webp` | PM dashboard 2.html, notes tab, 1440 × 950 | Reference UI, anonymized sample data. |
| Hero, app, patient experience and practice | `/assets/home/app-home.webp` | PM app.html, home screen, 360 × 772 | Reference UI; generic profile, avatars removed. |
| App second phone | `/assets/home/app-roadmap.webp` | PM app.html, roadmap screen, 360 × 772 | Reference UI; sample schedule, not measured treatment outcomes. |
| PM Kids phone | `/assets/home/kids-home.webp` | PM_Kids_Picoori_20_Final.html, home screen, 360 × 772 | Reference UI, generic sample identity. |
| PM Kids character | `/assets/home/picoori-original.webp` | Exact neutral frame from source PICOORI_FRAMES | Original character extracted directly, not redrawn. |
| Hero, hardware and final CTA | `/assets/scanbox/hero.webp` | Existing ScanBox page asset | Existing temporary product mockup, clearly labeled; original file untouched. |
| Hardware packaging | `/assets/scanbox/packaging.webp` | Existing ScanBox page asset | Existing temporary packaging mockup, clearly labeled; original untouched. |
| Process standardization and PM AI | `/assets/scanbox/clinical-front.webp` | Existing dental-model educational asset | Same image in both frames; CSS changes framing/brightness only. Explicitly a concept illustration, not an actual AI output or before/after treatment result. |
| Problem, process links, treatment methods and evidence | Inline existing Icon components + scoped CSS | Existing site vector system | Native code graphics; no new stock imagery or invented research numbers. |

The asset registry is `components/marketing/content/home.ts`; update `src`, `alt`, `width` and `height` to replace assets without rebuilding sections. Lower-page images are lazy loaded. Hero images have eager/high priority. No image-generation model was needed; existing product references covered the brief.

## Content and sources

The Persian homepage brief supplies the copy, section order, exact names, FAQ and metadata. Existing `/contact` remains the primary conversion route; it retains both existing phone numbers and its current request preparation flow. Product routes: `/scanbox`, `/dashboard`, `/app`, `/kids`; technology `/pm-ai`; audiences `/orthodontists` and `/patients`; process `/monitoring`; evidence `/evidence`. No inactive doctor search is introduced.

The supplemental Feature.docx, Business Model.docx, ارایه.docx and CRM HTML were not supplied with this request. No claims, private CRM records or unsupported capabilities were inferred from their absence. Existing site content and the four attached HTML references were used.

Local before-state source and screenshot were saved under ignored `work/home-before` and `work/home-references/homepage-before.png`. They are not published assets.

## Validation

Run `node tests/home-redesign.integration.mjs` against the local production Worker at port 22862 (or set `DANTO_TEST_URL`). It checks one H1, all required sections, product order, four FAQs, valid internal/hash links, existing phone links, named/-sized images and image responses. TypeScript and the full Cloudflare build must also pass. Browser review covers small/large phones, tablet, laptop and wide desktop, plus menu, FAQ keyboard activation, theme and image loading. Web-vitals targets in the brief are goals, not measured or claimed production guarantees.

Validated locally: TypeScript, Cloudflare production build, homepage integration (27 link targets and 9 image assets), and all 330 existing structure checks passed. Browser widths 360, 430, 768, 1280 and 1600 px showed no horizontal overflow; process cards switch from a vertical phone timeline to four desktop columns. Primary CTA starts at approximately 493, 489, 543, 613 and 645 px respectively. Mobile menu open/close, process anchor, keyboard Enter on FAQ, touch/click FAQ and both themes were checked. One test-only view-transition cancellation occurred when resizing during a theme animation; no shared behavior was changed.
