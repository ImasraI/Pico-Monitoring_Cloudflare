import pageData from "./pages.json";
import articleData from "./articles.json";
import faqData from "./faq.json";
import evidenceData from "./evidence.json";
import assetData from "./assets.json";
import type { Page, Article, FAQ, Evidence, Asset } from "./types";
export const pages: Page[] = pageData;
export const articles: Article[] = articleData;
export const faqs: FAQ[] = faqData;
export const evidence: Evidence[] = evidenceData;
export const assets: Asset[] = assetData;
export const categories = [
  "پایش از راه دور",
  "الاینر",
  "براکت",
  "تجربه بیمار",
  "فناوری",
  "پژوهش",
  "راهنمای ارتودنتیست‌ها",
];
export const persianNumber = (n: number) => n.toLocaleString("fa-IR");
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+03:30`).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  });
