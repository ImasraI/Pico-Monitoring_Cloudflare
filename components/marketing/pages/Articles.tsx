import { useState } from "react";
import { Link } from "../navigation";
import { articles, persianNumber } from "../content";
import type { Article } from "../content/types";
import { SectionHeading, ResourceCard, CTA } from "../components/Sections";
import { Visual } from "../components/Visual";
import { Icon } from "../components/Icon";
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
            <Link to="/evidence">شواهد و پژوهش‌ها</Link>
            <span>/</span>
            <span>{article.category}</span>
          </nav>
          <span className="eyebrow">{article.category}</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta">
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
            <section id={`article-section-${i}`} key={s.title}>
              <h2>{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <aside className="article-note">
            <Icon name="eye" />
            <p>
              این مطلب برای آشنایی با مسیر پایش تهیه شده است. برنامه و تصمیم
              درمانی را از ارتودنتیست خود دریافت کنید.
            </p>
          </aside>
        </div>
        <aside className="article-toc">
          <h2>در این راهنما</h2>
          {article.body.map((s, i) => (
            <a href={`#article-section-${i}`} key={s.title}>
              {s.title}
            </a>
          ))}
          <Link className="text-link" to="/evidence">
            شواهد و پژوهش‌ها <Icon name="arrow" size={18} />
          </Link>
        </aside>
      </article>
      <section className="section wash">
        <div className="container">
          <SectionHeading eyebrow="ادامه مطالعه" title="راهنماهای مرتبط" />
          <div className="resources-grid">
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
