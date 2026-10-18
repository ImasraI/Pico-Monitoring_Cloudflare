# PM AI conceptual images

These five temporary images were generated with the built-in image generation tool on 19 October 2026. They are conceptual illustrations, not patient photographs, diagnostic output, or screenshots of the product. The page captions and the future-availability wording must remain when images are replaced.

## Replacement paths

Each subject has a 1200 × 800 WebP for its explanation and a 480 × 320 WebP for its card. Both versions derive from the same generated 1536 × 1024 source composition. The page uses responsive sources, fixed aspect ratios and lazy loading. All ten files together total approximately 282 KB.

| Subject | Explanation image | Card image |
| --- | --- | --- |
| Standardization | `public/assets/pm-ai/image-standardization.webp` | `public/assets/pm-ai/image-standardization-card.webp` |
| Intraoral analysis | `public/assets/pm-ai/intraoral-analysis.webp` | `public/assets/pm-ai/intraoral-analysis-card.webp` |
| Case prioritization | `public/assets/pm-ai/case-prioritization.webp` | `public/assets/pm-ai/case-prioritization-card.webp` |
| Treatment adherence | `public/assets/pm-ai/treatment-adherence.webp` | `public/assets/pm-ai/treatment-adherence-card.webp` |
| Patient experience | `public/assets/pm-ai/patient-personalization.webp` | `public/assets/pm-ai/patient-personalization-card.webp` |

Replace the paired files with images of the same aspect ratio; no component redesign is needed. Update the corresponding `PM-AI-…-01` entry in `components/marketing/content/assets.json` when the alt text or illustration status changes. Text and anchor destinations are in `components/marketing/content/pm-ai.json`.

## Final generation prompts

Each request used the following shared prompt followed by its subject prompt below. Five separate built-in calls were made, with opaque backgrounds. No CLI or third-party image service was used.

### Shared prompt

Use case: stylized-concept. Create one polished, standalone 3:2 landscape editorial image for a professional Persian orthodontic monitoring website named Pico Monitoring. This is a temporary conceptual illustration, not a screenshot and not clinical evidence. Cohesive visual direction for the PM AI collection: deep midnight blue and dark petrol teal backgrounds (#0c2127, #12333e), restrained luminous aqua accents (#12a7ad, #6fd6d2), ivory and translucent glass materials. Minimal, premium medical technology editorial 3D illustration, carefully controlled soft lighting, generous clear space, calm composition, physically plausible forms. No words in any language, no typography, no logos, no watermarks, no readable numbers, no fake dashboards, no fabricated medical records, no diagnosis labels, no heatmaps suggesting clinical certainty. Subject centered with generous safe margins so the image also works as a cropped thumbnail.

### Image standardization

A schematic ceramic-white dental arch, viewed at a gentle three-quarter angle. Two translucent offset rectangular image framing planes gently align around it; faint precise geometric guides and a very subtle digital grid suggest image framing and standardization. Keep the dental arch clean and simplified, no blood, no surgical instruments, no realistic patient mouth.

### Intraoral analysis

An accurate but schematic ivory dental arch wearing a transparent clear aligner, with a second subtle glass inspection plane hovering above. Very fine visual outlines suggest assisted image review. Concept for a capability still under evaluation: do not depict detections, pathology, predictions, diagnostic colors, confident checkmarks or a real software interface.

### Case prioritization

A carefully arranged cluster of three freestanding abstract glass document panes at staggered depths, each with a small monochrome dental arch thumbnail silhouette and a few purely geometric divider strokes, not a software interface. One pane is gently brought forward by a small aqua light edge to suggest review priority. No text, numbers, charts, patient data, profile identities, urgent medical alerts or invented application UI.

### Treatment adherence

A sculptural horizontal path made of several softly glowing aqua timing nodes connected by a thin curved line above a deep blue surface. Beside a few nodes are small ivory abstract camera and calendar-like tiles with no dates, letters or numbers. Suggest continuity and timely photo follow-up, not a data chart. Sparse, precise, premium, geometric composition.

### Patient personalization

A warm, sophisticated editorial 3D illustration of an adolescent around 13 years old sitting comfortably beside a supportive parent, looking at a smartphone held naturally in the adolescent's hands. Phone screen faces them and is not readable. Calm, confident, friendly expressions, simple modern navy and soft aqua clothing, subtle warm ivory light. Appropriate healthcare family context, neither childish nor exaggerated cartoon. Keep characters natural and respectful, no dental procedure, no identifying likeness of any real person.
