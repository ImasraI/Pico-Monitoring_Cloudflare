import type { Page } from "../content/types";
import {
  Hero,
  SplitSection,
  Workflow,
  FAQBlock,
  CTA,
} from "../components/Sections";
import { ScanBox } from "./ScanBox";
export function Product({ page }: { page: Page }) {
  if (page.slug === "/scanbox") return <ScanBox page={page} />;
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
      <FAQBlock categories={page.faqCategories} limit={4} />
      <CTA title={page.cta} patient={page.slug === "/patients"} />
    </>
  );
}
