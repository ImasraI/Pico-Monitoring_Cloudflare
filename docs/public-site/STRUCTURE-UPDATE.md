# Public website structure update

Implements the structure brief supplied in ساختار کلی.docx on the existing Pico marketing site. No deployment was requested or performed.

## Navigation and routes

The user resolved the brief's conflicting order explicitly. From the right: **راهکارهای ما → برای شما → شواهد و پژوهش‌ها → امنیت و حریم خصوصی**.

Solutions have a single ordered definition in `components/marketing/content/navigation.ts`: **PM ScanBoxᴾʳᵒ → PM Dashboard → PM App → PM Kids**. Desktop, mobile, footer and homepage consume this list. The desktop solutions disclosure opens on mouse entry (100 ms), closes after leaving the area (180 ms), and includes a small bridge above the menu. Native disclosure semantics retain Enter, Space and Escape support; Tab reaches each link. Mobile/tablet use native tap disclosures within the existing modal.

New independent pages: `/dashboard`, `/app`, `/kids`, `/privacy`. They use the existing Hero, headings, feature grid, workflow, buttons and CTA components, with the same Vazirmatn font, palette, spacing, radius and breakpoints. Existing clinical, audience, contact and FAQ routes remain. Decorative workflow counters are removed; real research dates/counts remain.

The Resources and article-index landings are removed from navigation, content, internal links and sitemap. Legacy `/resources` permanently redirects to `/privacy`; `/articles` redirects to `/evidence`. The six legitimate editorial article detail routes remain, including references and related-article navigation. Their breadcrumbs lead to Evidence. Evidence's 16-study dataset and presentation remain intact.

All public copy, FAQ labels, metadata and alt text referring to the physical product use **PM ScanBoxᴾʳᵒ**. Internal component names, paths and asset identifiers retain stable technical names.

## Content boundaries and review

Dashboard copy follows existing clinician functionality in `public/live.js`, `public/planner.js` and API routes: patient files, submitted scans, review, treatment steps, scheduling, messages and notes. Attention/prioritization is described as team review, without automated diagnosis or independent treatment decisions.

App copy follows the existing patient experience: scans, treatment roadmap, messages and reminders. The presentation does not claim native-store distribution. The final in-interface education presentation is explicitly subject to PM review.

Kids is an experience within PM, not a separate app/product. The existing rewards implementation includes age modes, avatars/preferences, points and doctor-managed rewards. The education/family presentation is an initial concept for review; it does not assert an existing independent parent portal. Initial Kids copy is clearly marked for team review.

Privacy is a principles page and explicitly unfinished pending technical/legal review. Data location, retention, deletion/export process, consent, role access and technical measures require approved details. No certification, HIPAA/GDPR compliance, particular encryption method or absolute security claim is made.

Positioning reference only: [DentalMonitoring](https://dentalmonitoring.com/dental-monitoring/) and [patient architecture](https://dentalmonitoring.com/for-patients/). No vendor text, proprietary claims or performance figures were copied.

## Replaceable visuals

Software concepts are editable React/CSS/SVG mockups in `components/marketing/components/SolutionVisual.tsx`. Their frame ratios, alt text and future screenshot paths are registered in `components/marketing/content/assets.json`. Set the asset's `src` to an approved local image path to replace the concept without redesigning the page. Update the alt text and status, and review the caption when replacing a mockup. A ResizeObserver fits each code mockup within its frame on all viewport sizes.

- Dashboard: `PM-DASHBOARD-PREVIEW-01`, `PM-DASHBOARD-REVIEW-01`.
- App: `PM-APP-PREVIEW-01`, `PM-APP-GUIDANCE-01`.
- Kids, six independent slots: `PM-KIDS-PREVIEW-01`, `PM-KIDS-AVATAR-01`, `PM-KIDS-GAME-01`, `PM-KIDS-REWARD-01`, `PM-KIDS-EDUCATION-01`, `PM-KIDS-FAMILY-01`.
- Privacy: `PM-PRIVACY-CONCEPT-01`.

The physical product's six independent paths are in `components/marketing/content/scanbox.ts`:

| Slot | File in public/assets/scanbox |
| --- | --- |
| Phone and product | hero.webp (existing) |
| Close view | product.webp (existing) |
| Packaging | packaging.webp (existing) |
| Use concept | use-placeholder.webp |
| Components concept | components-placeholder.webp |
| Patient/use concept | patient-placeholder.webp |

All placeholders are visibly identified as temporary concepts. Existing clinical teaching views and the ScanBox page copy are preserved. The new mannequin render is not a real patient or an approved usage tutorial; the exploded render is not an engineering specification. The patient slot initially uses a separate copy of the use concept so either can be replaced independently. WebP files are 1024 px square, converted without cropping from the generated originals.

## Image generation provenance

Built-in ImageGen, with the existing `public/assets/scanbox/hero.webp` concept as the visual reference. Two generated source renders were inspected before conversion:

1. `exec-ba3a249d-abad-4db8-a246-7e3f9d552289.png` → use-placeholder.webp and patient-placeholder.webp.
2. `exec-49bfc69d-ba65-4f95-98d0-6c49006b5319.png` → components-placeholder.webp.

Prompt for use concept:

> Use case: product-concept. Asset: temporary Pico Monitoring orthodontic imaging device use illustration, square. Use the attached existing concept render as visual reference for the white and teal device only. Create a premium editorial 3D illustration of a clearly synthetic adult mannequin, simplified face and shoulders, holding the concept white/teal phone-mounted imaging device near the mouth in a generic demonstration pose. Smartphone present. No claim of exact usage, no tutorial arrows, no text, no actual person or patient, no realistic clinical records, no diagnostics. Restrained mint background #edf5f1, deep ink #173e47 and teal #00747b accents, soft studio light, clean spacious composition, suitable medical brand website placeholder. Entire device visible, plausible proportions. Not a photograph of a real product. This will be explicitly captioned as a temporary fictional concept.

Prompt for components concept:

> Use case: product-concept. Asset: temporary square concept of components of a white and teal orthodontic smartphone imaging device. Use attached concept render only to match material, white surfaces, teal accents and broad silhouette. Render the concept device with a very restrained exploded view showing generic housing, a phone holder and an optical opening as detached conceptual shapes, no claim of engineering detail, no wires/chips/sensors/features, no labels or text. Pale mint #edf5f1 background, premium minimal 3D studio illustration, soft light, few elements, centered clean balanced composition. This is a replaceable fictional product-components placeholder, not a real engineering diagram.

## Validation

- Production build and TypeScript compilation pass.
- Scoped ESLint passes with no errors; four image-optimization suggestions remain consistent with the existing static-image approach.
- Public website integration: 20 routes, 1174 checks covering SSR, internal links, metadata, sitemap, 404, fonts/images and active dashboard entry.
- Evidence integration: 16 records, source metadata, SSR content, source links and evidence-specific contact labels.
- Structure integration: 300 route checks plus redirects, Kids scope, privacy boundaries and all six physical asset paths.
- Browser review: desktop 1440 px, tablet 768 px, mobile 390 px and narrow mobile 320 px. Tested native mobile disclosure, keyboard opening/closing and Tab to the first solution; mouse-entry opening and leaving-area closure. New visuals fit inside their frames without page overflow.
- Backend, authenticated doctor/patient functionality and contact handling were not modified.
