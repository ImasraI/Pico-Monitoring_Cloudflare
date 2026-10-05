import type { Metadata } from "next";
import { pages, articles, faqs } from "./content";
import { config } from "./config";

export const publicPaths = [...pages.map((p) => p.slug), ...articles.map((a) => `/articles/${a.slug}`)];

export function metadataFor(pathname: string): Metadata {
  const page = pages.find((p) => p.slug === pathname);
  const article = articles.find((a) => pathname === `/articles/${a.slug}`);
  const title = article?.seo.title || page?.metaTitle || "صفحه پیدا نشد | Pico Monitoring";
  const description = article?.seo.description || page?.metaDescription || "صفحه مورد نظر پیدا نشد.";
  const url = `${config.siteUrl}${pathname}`;
  return {
    title, description,
    robots: { index: !!(page || article), follow: true },
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: config.brand, locale: "fa_IR",
      type: article ? "article" : "website",
      images: [{ url: `${config.siteUrl}/assets/social.jpg`, width: 1200, height: 630, alt: config.brand }],
      ...(article ? { publishedTime: article.date, authors: [article.author] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [`${config.siteUrl}/assets/social.jpg`] },
  };
}

export function structuredDataFor(pathname: string) {
  const article = articles.find((a) => pathname === `/articles/${a.slug}`);
  if (article) return {
    "@context": "https://schema.org", "@type": "Article", headline: article.title,
    datePublished: article.date, author: { "@type": "Organization", name: article.author },
    mainEntityOfPage: `${config.siteUrl}${pathname}`,
  };
  if (pathname === "/faq") return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return {
    "@context": "https://schema.org", "@type": "Organization",
    name: config.brand, url: config.siteUrl, telephone: config.phones[0],
  };
}
