export interface Feature {
  title: string;
  body: string;
  icon: string;
}
export interface Section {
  eyebrow: string;
  title: string;
  body: string;
  asset: string;
  features: Feature[];
}
export interface Page {
  slug: string;
  title: string;
  audience: string;
  metaTitle: string;
  metaDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    accent: string;
    body: string;
    asset: string;
  };
  sections: Section[];
  cta: string;
  faqCategories: string[];
}
export interface Article {
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  readingMinutes: number;
  excerpt: string;
  featuredImage: string;
  body: { title: string; paragraphs: string[] }[];
  related: string[];
  seo: { title: string; description: string };
}
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}
export interface Evidence {
  id: string;
  titleFa: string;
  titleEn: string;
  evidenceType: string;
  journal: string;
  year: number;
  category: string;
  summary: string;
  keyFinding: string;
  authors: string[];
  sourceType: string;
  sourceUrl: string;
  doi: string;
  system: string;
  picoRelevance: string;
  relevanceType: string;
  verifiedAt: string;
  image: string | null;
  imageAlt: string;
}
export interface Asset {
  id: string;
  page: string[];
  section: string;
  purpose: string;
  composition: string;
  ratio: string;
  dimensions: string;
  type: string;
  mustProvide: boolean;
  src: string;
  status: string;
  alt: string;
}
