import { useState } from "react";
import { Link } from "../navigation";
import { articles, categories, persianNumber } from "../content";
import type { Page, Article } from "../content/types";
import {
  Hero,
  SectionHeading,
  ResourceCard,
  CTA,
  ButtonLink,
} from "../components/Sections";
import { Visual } from "../components/Visual";
import { Icon } from "../components/Icon";
const normalize = (s: string) =>
  s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .toLocaleLowerCase()
    .trim();
export function ResourceListing({ page }: { page: Page }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("همه");
  const result = articles.filter(
    (a) =>
      (category === "همه" || a.category === category) &&
      normalize(`${a.title} ${a.excerpt} ${a.category}`).includes(
        normalize(query),
      ),
  );
  const featured = articles[0];
  return (
    <>
      <Hero page={page} />
      {page.slug === "/resources" && (
        <section className="section resource-shortcuts">
          <div className="container shortcut-grid" data-reveal-group="110">
            {[
              {
                to: "/articles",
                icon: "book",
                title: "مقالات و راهنماها",
                body: "برای ارتودنتیست، بیمار و تیم مطب",
              },
              {
                to: "/evidence",
                icon: "research",
                title: "شواهد و پژوهش",
                body: "منابع خارجی، با ارجاع و محدودیت",
              },
              {
                to: "/faq",
                icon: "message",
                title: "پرسش‌های متداول",
                body: "پاسخ‌های کوتاه برای شروع شناخت",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-reveal="up"
                data-spotlight
              >
                <Icon name={item.icon} size={30} />
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <Icon name="arrow" size={22} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="section featured-section">
        <div className="container featured-article">
          <Visual assetId={featured.featuredImage} reveal="mask" />
          <div data-reveal="up">
            <span className="eyebrow">راهنمای پیشنهادی</span>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <ButtonLink to={`/articles/${featured.slug}`}>
              مطالعه راهنما
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="section wash" id="articles">
        <div className="container">
          <div className="section-header-row">
            <SectionHeading
              eyebrow="دانش، در دسترس شما"
              title="تازه‌ترین راهنماها"
            />
            <label className="search-field">
              <span className="sr-only">جست‌وجوی مقالات</span>
              <Icon name="search" size={20} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جست‌وجو در منابع..."
                aria-label="جست‌وجوی مقالات"
              />
            </label>
          </div>
          <div className="filters" aria-label="دسته‌بندی مقالات">
            {["همه", ...categories].map((c) => (
              <button
                key={c}
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="result-count" role="status">
            {persianNumber(result.length)} مقاله
          </p>
          {result.length ? (
            <div className="resources-grid" data-reveal-group="120">
              {result.map((a) => (
                <ResourceCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="search" size={32} />
              <h3>مقاله‌ای با این جست‌وجو پیدا نشد.</h3>
              <p>عبارت یا دسته‌بندی دیگری را امتحان کنید.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("همه");
                }}
              >
                نمایش همه مقالات
              </button>
            </div>
          )}
        </div>
      </section>
      <CTA title={page.cta} />
    </>
  );
}
export function ArticleDetail({ article }: { article: Article }) {
  const [shared, setShared] = useState("");
  const related = articles.filter((a) => article.related.includes(a.slug));
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared("پیوند مقاله کپی شد.");
    } catch {
      setShared("کپی خودکار ممکن نشد؛ پیوند را از نوار آدرس کپی کنید.");
    }
  }
  return (
    <>
      <section className="article-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="مسیر صفحه">
            <Link to="/">خانه</Link>
            <span>/</span>
            <Link to="/articles">مقالات</Link>
            <span>/</span>
            <span>{article.category}</span>
          </nav>
          <span className="eyebrow">{article.category}</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta" data-reveal="up">
            <span>{article.author}</span>
            <time dateTime={article.date}>
              {new Date(`${article.date}T12:00:00+03:30`).toLocaleDateString(
                "fa-IR",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Asia/Tehran",
                },
              )}
            </time>
            <span>{persianNumber(article.readingMinutes)} دقیقه مطالعه</span>
            <button onClick={share} className="text-link">
              <Icon name="copy" size={17} /> کپی پیوند
            </button>
          </div>
          <p role="status" className="share-status">
            {shared}
          </p>
        </div>
      </section>
      <article className="container article-layout">
        <div className="article-content">
          <Visual assetId={article.featuredImage} />
          {article.body.map((s, i) => (
            <section id={`article-section-${i}`} key={s.title} data-reveal="up">
              <h2>{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <aside className="article-note" data-reveal="up">
            <Icon name="eye" />
            <p>
              این مطلب برای آشنایی با مسیر پایش تهیه شده است. برنامه و تصمیم
              درمانی را از ارتودنتیست خود دریافت کنید.
            </p>
          </aside>
        </div>
        <aside className="article-toc" data-scrollspy>
          <h2>در این راهنما</h2>
          {article.body.map((s, i) => (
            <a href={`#article-section-${i}`} key={s.title}>
              {s.title}
            </a>
          ))}
          <Link className="text-link" to="/articles">
            همه مقالات <Icon name="arrow" size={18} />
          </Link>
        </aside>
      </article>
      <section className="section wash">
        <div className="container">
          <SectionHeading eyebrow="ادامه مطالعه" title="راهنماهای مرتبط" />
          <div className="resources-grid" data-reveal-group="120">
            {related.map((a) => (
              <ResourceCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}
