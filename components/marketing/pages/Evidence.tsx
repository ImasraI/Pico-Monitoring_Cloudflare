import { useState } from "react";
import type { Page } from "../content/types";
import { evidence } from "../content";
import { Hero, CTA, SectionHeading } from "../components/Sections";
import { Icon } from "../components/Icon";
export function EvidencePage({ page }: { page: Page }) {
  const [category, setCategory] = useState("همه");
  const filtered = evidence.filter(
    (e) => category === "همه" || category === e.category,
  );
  return (
    <>
      <Hero page={page} />
      <section className="section">
        <div className="container">
          <div className="evidence-disclosure">
            <Icon name="research" size={28} />
            <div>
              <h2>مطالعات خارجی، با منبع مشخص</h2>
              <p>
                مقالات زیر درباره DentalMonitoring هستند. نتیجه آن‌ها به PM قابل
                تعمیم نیست و باید با توجه به روش مطالعه و محدودیت‌ها خوانده شود.
              </p>
            </div>
          </div>
          <div className="filters" aria-label="دسته‌بندی شواهد">
            {[
              "همه",
              "شواهد بالینی",
              "عملکرد محصول",
              "بهره‌وری مطب",
              "تجربه بیمار",
            ].map((c) => (
              <button
                key={c}
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="sr-only" role="status">
            {filtered.length.toLocaleString("fa-IR")} منبع
          </p>
          {filtered.length ? (
            <div className="evidence-grid">
              {filtered.map((e) => (
                <article className="evidence-card" key={e.id}>
                  <span className="evidence-tag">
                    شواهد خارجی · {e.category}
                  </span>
                  <span className="evidence-metric">{e.metric}</span>
                  <h2>{e.title}</h2>
                  <p>{e.summary}</p>
                  <div className="evidence-source">
                    <strong>{e.source}</strong>
                    <span>
                      {e.year.toLocaleString("fa-IR", { useGrouping: false })}
                    </span>
                  </div>
                  <p className="attribution">{e.attribution}</p>
                  <a
                    className="text-link"
                    href={e.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    مطالعه منبع اصلی <Icon name="arrow" size={20} />
                    <span className="sr-only"> در پنجره جدید</span>
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="book" size={32} />
              <h2>منبع بررسی‌شده‌ای در این دسته منتشر نشده است.</h2>
              <p>
                پس از بررسی منبع و دامنه ادعا، پژوهش‌های مرتبط به این بخش اضافه
                می‌شوند.
              </p>
            </div>
          )}
          <div className="pm-evidence">
            <SectionHeading
              eyebrow="ارزیابی اختصاصی PM"
              title="یک مسیر مستقل برای شواهد PM."
              body="در حال حاضر مطالعه بالینی اختصاصی PM برای انتشار در این وب‌سایت ارائه نشده است. این جایگاه برای ارزیابی‌های آینده با روش روشن، نتایج قابل ارجاع و محدودیت‌های مشخص آماده است."
            />
            <span className="outline-tag">شواهد اختصاصی، هنوز منتشر نشده</span>
          </div>
        </div>
      </section>
      <CTA title={page.cta} />
    </>
  );
}
