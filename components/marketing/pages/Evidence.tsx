import { useState } from "react";
import type { Evidence, Page } from "../content/types";
import { evidence, persianNumber } from "../content";
import { Hero, CTA, SectionHeading } from "../components/Sections";
import { Visual } from "../components/Visual";
import { Icon } from "../components/Icon";
import "../styles/evidence.css";

const categories = [
  { label: "همه", icon: "research" },
  { label: "شواهد بالینی", icon: "check" },
  { label: "عملکرد فناوری", icon: "camera" },
  { label: "بهره‌وری مطب", icon: "calendar" },
  { label: "تجربه بیمار", icon: "message" },
];
const specialistLabel = "تماس با تیم تخصصی PM";

function EvidenceCard({ study }: { study: Evidence }) {
  return (
    <article className="evidence-card" aria-labelledby={study.id} data-reveal="up" data-spotlight data-glow>
      <div className="study-tags">
        <span className="evidence-tag">{study.category}</span>
        <span className="study-type">{study.evidenceType}</span>
      </div>
      <div className={study.image ? "study-introduction with-image" : "study-introduction"}>
        <div>
          <h3 id={study.id}>{study.titleFa}</h3>
          <p className="study-original-title" dir="ltr" lang="en">{study.titleEn}</p>
          <p className="study-summary">{study.summary}</p>
        </div>
        {study.image && (
          <img className="study-image" src={study.image} alt={study.imageAlt}
            width="480" height="360" loading="lazy" />
        )}
      </div>
      <div className="study-finding">
        <h4>یافته کلیدی</h4>
        <p>{study.keyFinding}</p>
      </div>
      <dl className="study-bibliography">
        <div><dt>نویسندگان</dt><dd dir="ltr" lang="en">{study.authors.join("; ")}</dd></div>
        <div><dt>مجله</dt><dd dir="ltr" lang="en">{study.journal}</dd></div>
        <div><dt>سال انتشار</dt><dd>{study.year.toLocaleString("fa-IR", { useGrouping: false })}</dd></div>
        <div><dt>شناسه DOI</dt><dd dir="ltr">{study.doi}</dd></div>
        <div className="study-setting"><dt>سامانه و زمینه مطالعه</dt><dd>{study.system}</dd></div>
      </dl>
      <div className="study-relevance">
        <h4>این پژوهش چه نقشی در رویکرد Pico Monitoring دارد؟</h4>
        <p>{study.picoRelevance}</p>
      </div>
      <a className="text-link study-source" href={study.sourceUrl} target="_blank" rel="noopener noreferrer">
        مطالعه منبع اصلی در {study.sourceType}
        <span className="sr-only">؛ {study.titleFa}، باز شدن در برگه جدید</span>
        <Icon name="arrow" size={18} />
      </a>
    </article>
  );
}

export function EvidencePage({ page }: { page: Page }) {
  const [category, setCategory] = useState("همه");
  const filtered = evidence.filter(study => category === "همه" || category === study.category);
  return (
    <div className="evidence-page">
      <Hero page={page} contactLabel={specialistLabel} />
      <section className="section evidence-categories" aria-label="دسته‌بندی شواهد">
        <div className="container">
          <SectionHeading eyebrow="مسیر مطالعه" title="شواهد را از زاویه نیاز خود ببینید."
            body="از پیامدهای بالینی و دقت فناوری تا جریان کار مطب و تجربه بیمار؛ هر موضوع، پرسش علمی متفاوتی دارد." />
          <div className="evidence-category-nav" role="group" aria-label="فیلتر دسته‌بندی شواهد">
            {categories.map(({ label, icon }) => {
              const count = label === "همه" ? evidence.length : evidence.filter(study => study.category === label).length;
              return (
                <button type="button" key={label} aria-pressed={category === label}
                  aria-controls="evidence-library" onClick={() => setCategory(label)}>
                  <Icon name={icon} size={25} />
                  <span>{label}</span>
                  <small>{persianNumber(count)} مقاله</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section evidence-library" id="evidence-library" aria-labelledby="evidence-library-title">
        <div className="container">
          <div className="evidence-library-heading">
            <div>
              <span className="eyebrow">پژوهش‌های منتشرشده</span>
              <h2 id="evidence-library-title">کتابخانه شواهد علمی</h2>
            </div>
            <p role="status" aria-live="polite" aria-atomic="true">
              {persianNumber(filtered.length)} مقاله · {category}
            </p>
          </div>
          <div className="evidence-grid" data-reveal-group="120">{filtered.map(study => <EvidenceCard key={study.id} study={study} />)}</div>
        </div>
      </section>
      <section className="section wash evidence-research" aria-labelledby="pico-research-title">
        <div className="container split-grid">
          <div>
            <span className="eyebrow">پژوهش‌های در حال انجام</span>
            <h2 id="pico-research-title">پژوهش‌های Pico Monitoring</h2>
            <p>چند پروژه پژوهشی مرتبط با پایش ارتودنسی در ایران با مشارکت تیم تخصصی Pico Monitoring در حال انجام است. اطلاعات و نتایج قابل انتشار این پژوهش‌ها پس از تکمیل فرآیند علمی، در این بخش منتشر خواهد شد.</p>
          </div>
          <Visual assetId="PM-RESEARCH-CURRENT-01" />
        </div>
      </section>
      <CTA title={page.cta} contactLabel={specialistLabel}
        body="درباره رویکرد علمی PM، مسیر اجرای پایش و کاربرد آن در جریان درمان ارتودنسی با تیم تخصصی Pico Monitoring در ارتباط باشید." />
    </div>
  );
}
