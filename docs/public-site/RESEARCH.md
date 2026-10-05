# Reference research and repository assessment

Reviewed 6 October 2026. Primary UX reference: current official DentalMonitoring website. Copy was rewritten from the supplied PM brief; no source text or proprietary assets were reproduced.

## Repository assessment

The existing repository is a Persian study application. Its React 19/TypeScript/Vite frontend uses Tailwind v4, a state-based `Screen` navigation model, shared page components, local account storage and API integration. Fonts are self-hosted Estedad and Vazirmatn. Its FastAPI backend has JWT/OAuth2 authentication, SQLAlchemy-style SQLite access and Chroma/RAG services. Deployment is a separate static frontend and VM-hosted backend with Caddy. Existing working-tree changes were present before this task.

The existing application domain and auth model are unsuitable for an independent orthodontic marketing site. The new `pico-monitoring/` sibling project keeps React, TypeScript, Vite and the existing licensed Vazirmatn font while giving the public website its own routes, content, assets, tokens, build and deployment boundary. No Boom application or backend source was edited. Plain scoped CSS is appropriate for precise reference-driven composition and avoids coupling to the study app's Tailwind components.

## Official pages and adaptation

| Official source                                               | Observed structure                                                                                                     | PM adaptation                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Home](https://dentalmonitoring.com/)                         | Wide hero, succinct CTA, platform benefits, product showcase, evidence, resources, final demo CTA, multi-column footer | Orthodontist-first home; no claims about customer counts, approvals or detection parameters                                               |
| [Monitoring](https://dentalmonitoring.com/dental-monitoring/) | Clinical benefits → workflow → aligners and braces → interface sections → ScanBox and patient experience               | Major monitoring page, treatment-specific pages and original conceptual interface placeholders                                            |
| [Patients](https://dentalmonitoring.com/for-patients/)        | Patient hero → how it works → convenience and connection → FAQs                                                        | Five-step patient journey, doctor-defined scan frequency, no unverified app download or compliance claim                                  |
| [Evidence](https://dentalmonitoring.com/evidence/)            | Research themes and attributed source cards                                                                            | Clinical evidence, product performance, practice efficiency and patient experience; clearly external studies; future PM evidence isolated |
| [Resources](https://dentalmonitoring.com/resources/)          | Editorial entry points to educational resources                                                                        | Searchable categories, featured article, article template, research and FAQs                                                              |
| [Contact](https://dentalmonitoring.com/contact-us/)           | Focused collaboration/demo conversion                                                                                  | Two supplied phone numbers, clear demo intent, no irrelevant sales funnel                                                                 |
| [Solutions](https://dentalmonitoring.com/our-solutions/)      | Product grouping and path to detailed workflow                                                                         | Monitoring, aligners, braces and PM ScanBox only                                                                                          |

Direct navigation to `/scanboxpro/` did not provide a useful current standalone reference. The live monitoring page and homepage provide the current ScanBox section structure. Do not claim that a standalone reference page was verified.

## Visual observations

The official desktop homepage has a white horizontal header, generous logo-to-menu spacing, teal/cyan as its main accent, large white hero headlines, broad product and image sections, generous negative space, and simple CTA geometry. Some reference media did not load completely in the automated browser; it is inappropriate to infer precise source animation timing from that state.

PM uses restrained teal, warm mint surfaces, dark clinical typography, wide split sections, minimal card decoration and a prominent original ScanBox visual. Persian RTL composition places the primary copy on the right and the main product visual on the left. The source's information hierarchy and section roles are adapted, rather than its unsupported regulatory claims or unrelated product family. The original reference's full-bleed photographic hero is adapted to a product-focused split hero because approved PM photography is unavailable. A strict photographic near-replica cannot be verified until those assets are supplied.

## External research selected

- [Oral hygiene, prospective study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8422366/): educational external-evidence card; no outcome percentage reused.
- [Retention, prospective feasibility study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8964474/): external evidence, 27 participants; limited sample and no PM attribution.

These sources concern DentalMonitoring. They do not validate PM. The separate business-model document described in the brief was not attached or found by filename search; strategic value therefore comes from the detailed concepts supplied in the master prompt.
