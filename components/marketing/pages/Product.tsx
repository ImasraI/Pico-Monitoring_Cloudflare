import type { Page } from "../content/types";
import {
  Hero,
  SplitSection,
  Workflow,
  FAQBlock,
  CTA,
  SectionHeading,
} from "../components/Sections";
import { AssetPlaceholder } from "../components/Visual";
export function Product({ page }: { page: Page }) {
  return (
    <>
      <Hero page={page} />
      {page.slug === "/patients" && <Workflow patient />}
      {page.sections.map((s, i) => (
        <SplitSection section={s} index={i} key={s.title} />
      ))}
      {["/monitoring", "/orthodontists", "/clinics"].includes(page.slug) && (
        <Workflow />
      )}
      {page.slug === "/scanbox" && (
        <>
          <Workflow scanbox />
          <section className="section wash">
            <div className="container">
              <SectionHeading
                eyebrow="نگاه نزدیک‌تر"
                title="جزئیات محصول، با تصاویر واقعی."
                body="این جایگاه‌ها برای تصاویر تأییدشده PM ScanBox آماده‌اند. مشخصات فنی، اجزا و بسته‌بندی پس از تأیید تیم محصول منتشر می‌شوند."
              />
              <div className="asset-gallery" data-reveal-group="80">
                {[
                  "PM-SCANBOX-PHONE-01",
                  "PM-PATIENT-USAGE-01",
                  "PM-SCANBOX-PACK-01",
                  "PM-SCANBOX-PARTS-01",
                  "PM-SCANBOX-INSTRUCTION-01",
                ].map((id) => (
                  <AssetPlaceholder key={id} assetId={id} reveal="zoom" />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      <FAQBlock categories={page.faqCategories} limit={4} />
      <CTA title={page.cta} patient={page.slug === "/patients"} />
    </>
  );
}
