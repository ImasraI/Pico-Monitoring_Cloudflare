# PM Design Bible

## Direction and rationale

The site introduces remote orthodontic monitoring to clinicians first, practices second and patients third. Broad sections and clear typographic hierarchy make the workflow understandable before asking for a demo. Teal follows the reference's clinical technology character; warm pale surfaces make long Persian text easier to scan. Product imagery owns substantial space because ScanBox is the tangible bridge between the patient and clinical review.

## Tokens

Source of truth: `src/styles/tokens.css`.

| Role                 | Value                             | Purpose                                                |
| -------------------- | --------------------------------- | ------------------------------------------------------ |
| Brand teal           | `#009fa8`                         | Accent, illustration detail, small emphasis            |
| Accessible dark teal | `#00747b`                         | Buttons and links, stronger contrast on light surfaces |
| Clinical ink         | `#173e47`                         | Headings and primary text                              |
| Body                 | `#526970`                         | Long readable copy                                     |
| Muted                | `#5a7076`                         | Captions and secondary metadata                        |
| Mint                 | `#edf5f1`                         | Hero and connective sections                           |
| Pale                 | `#f5f8f6`                         | Alternating sections and forms                         |
| Line                 | `#d8e5e1`                         | Quiet structure without heavy shadows                  |
| Content maximum      | `1200px`                          | Consistent section rhythm                              |
| Gutter               | `clamp(20px,4.6vw,72px)`          | Breathing room across desktop sizes                    |
| Section spacing      | `104px`, 85px laptop, 65px mobile | Broad reference-inspired pacing                        |
| Radius               | `6px`                             | Controlled clinical geometry                           |
| Motion               | `200ms` controls; 500ms reveal    | Feedback and gentle entrance                           |

## Typography

Self-hosted variable Vazirmatn, weights 300–800, separate Persian and Latin subsets. SIL Open Font License accompanies the files. One family keeps RTL and Latin PM labels consistent. Hero 36–62px desktop, 39px mobile, 33px at the smallest breakpoint; section headings 28–42px; body 17px desktop and 15–16px mobile; captions 9–13px. Persian headlines use generous line height and modest negative tracking. Technical English appears only when helpful.

## Grid and responsive rules

Hero: two approximately equal columns, 65px gap, clinician copy on the right, product on the left. Content splits: two equal columns and 85px gap. Feature and resource sections: three columns; treatments and evidence: two. Workflow: four steps, or three columns for six ScanBox steps. Footer: five columns. At 1050px, header switches to a mobile navigation dialog. At 767px, hero/splits/resources/treatments/contact stack into one column. Workflow remains two columns to retain sequence without excessive page length. At 374px, form fields stack and UI mockups scale down.

## Component intent

- Header: persistent product/audience/resource paths with a clear demo CTA; login is a configurable independent application link.
- Mobile navigation: native modal dialog, focus containment, Escape dismissal, scroll locking and grouped disclosures. Reading and tab order remain RTL-aware.
- Hero: category, headline, concise value, clear CTA and original replaceable visual; no anonymous decorative stock photos.
- Image/text split: explains one clinical or operational idea and its practical value, paired with its relevant visual role.
- Feature grid: compares clinician, practice and patient value without fake statistics.
- ScanBox showcase: prominent teal section and large product placeholder; physical specifications are deliberately omitted.
- Conceptual UI: browser/phone frames communicate an intended workflow, with a visible conceptual label; they do not expose clinical application functionality.
- Resource card: category, reading time, title, short excerpt, genuine authored date and a clear article link.
- Evidence card: theme, study type/limited sample metric, source, year, summary, explicit external attribution and a primary-source link.
- FAQ: native keyboard-accessible disclosure; no custom state required to read answers.
- Contact: semantic labels, required fields, mobile phone validation, local request drafting, copy and download; direct phone contact remains the operative pathway.
- Footer: brand, product, audience, educational and contact navigation; no fabricated social accounts or legal pages.
- Testimonial placeholder: reusable but omitted from the live pages until a verified quotation and permission exist.

## Imagery and assets

Standard visual ratio 5:4; editorial cards 16:10; treatment thumbnails 16:9; product gallery 4:3. The large asymmetric corner treatment is limited to the main product showcase. SVG/CSS schematics are original assets; photos and final clinical UI must replace them through `assets.json`. Captions distinguish illustration from actual device or software. Images have semantic Persian descriptions; directional arrows point toward the RTL continuation direction.

## Interaction and accessibility

Semantic header/nav/main/article/footer, one h1 per route, skip link, visible 3px focus ring, logical focus on navigation, native input labels, status/live feedback and keyboard-operated filters. Dark teal is used for text and primary buttons to preserve contrast. Reduced-motion mode removes transition/reveal animation and smooth scrolling. Hover movement is 2–4px, with no counters, particles, 3D effects or autoplay carousel. Information is available without animation and in prerendered HTML.
