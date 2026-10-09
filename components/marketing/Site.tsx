"use client";

import { useEffect } from "react";
import { Link, PublicPathContext } from "./navigation";
import { pages, articles } from "./content";
import { Header, Footer } from "./components/Layout";
import { ScrollRuntime, PointerRuntime, ScrollProgress, BackToTop } from "./components/Motion";
import { Reveal } from "./components/Reveal";
import { Hero, FAQBlock } from "./components/Sections";
import { Home } from "./pages/Home";
import { Product } from "./pages/Product";
import { ArticleDetail } from "./pages/Articles";
import { SolutionPage } from "./pages/Solutions";
import { PrivacyPage } from "./pages/Privacy";
import { EvidencePage } from "./pages/Evidence";
import { Contact } from "./pages/Contact";

function PageContent({ pathname }: { pathname: string }) {
  const article = articles.find((a) => pathname === `/articles/${a.slug}`);
  if (article) return <ArticleDetail article={article} />;
  const page = pages.find((p) => p.slug === pathname);
  if (!page) return (
    <section className="section not-found container">
      <span className="eyebrow">۴۰۴</span>
      <h1>این صفحه پیدا نشد.</h1>
      <p>از صفحه خانه یا شواهد و پژوهش‌ها، مسیر خود را ادامه دهید.</p>
      <Link className="button" to="/">بازگشت به خانه</Link>
    </section>
  );
  if (pathname === "/") return <Home page={page} />;
  if (pathname === "/contact") return <Contact page={page} />;
  if (pathname === "/evidence") return <EvidencePage page={page} />;
  if (pathname === "/faq") return <><Hero page={page} /><FAQBlock filter title="از کجا شروع کنیم؟" /></>;
  if (pathname === "/privacy") return <PrivacyPage page={page}/>;
  if (["/dashboard", "/app", "/kids"].includes(pathname)) return <SolutionPage page={page}/>;
  return <Product page={page} />;
}

export default function Site({ pathname }: { pathname: string }) {
  useEffect(() => {
    if (!window.location.hash) document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);
  return (
    <PublicPathContext.Provider value={pathname}>
      <Reveal />
      <ScrollRuntime /><PointerRuntime /><ScrollProgress /><BackToTop />
      <Header key={pathname} />
      <main id="main" tabIndex={-1}><PageContent key={pathname} pathname={pathname} /></main>
      <Footer />
    </PublicPathContext.Provider>
  );
}
