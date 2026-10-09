import { Link } from "../navigation";
import { useState } from "react";
import { categories, faqs, persianNumber, dateLabel } from "../content";
import type {
  Page,
  Feature,
  Section as SectionModel,
  Article,
  FAQ,
} from "../content/types";
import { Visual } from "./Visual";
import { Icon } from "./Icon";

export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`button ${secondary ? "secondary" : ""}`}
      data-magnetic
    >
      {children}
      <Icon name="arrow" size={19} />
    </Link>
  );
}
/* Decorative light field behind the hero. Purely presentational. */
export function Aurora() {
  return (
    <div className="pm-aurora" aria-hidden="true">
      <span className="pm-a1" />
      <span className="pm-a2" />
      <span className="pm-a3" />
      <span className="pm-grain" />
    </div>
  );
}
/* A slow band of the site's real subject categories. */
export function CapabilityMarquee() {
  const items = [...categories];
  return (
    <div className="pm-marquee">
      <div className="pm-marquee-track" aria-hidden="true">
        {[...items, ...items].map((item, index) => (
          <span className="pm-chip" key={`${item}-${index}`}>
            <i />
            {item}
          </span>
        ))}
      </div>
      <p className="sr-only">
        حوزه‌های محتوای پیکو مانیتورینگ: {items.join("، ")}
      </p>
    </div>
  );
}
/* Counts read from the content files, so no number is decorative. */
export function Stats({
  items,
}: {
  items: { value: number; label: string }[];
}) {
  return (
    <div className="pm-stats" data-reveal-group="110">
      {items.map((item) => (
        <div className="pm-stat" key={item.label} data-reveal="up" data-glow>
          <b data-counter={item.value} data-reveal="fade">
            {item.value.toLocaleString("fa-IR", { useGrouping: false })}
          </b>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
export function Hero({ page, contactLabel, visual, visualKicker }: { page: Page; contactLabel?: string; visual?: React.ReactNode; visualKicker?: string }) {
  const home = page.slug === "/";
  const simple = !page.hero.asset && !visual;
  return (
    <section
      className={`hero ${home ? "home-hero" : ""} ${simple ? "simple-hero" : ""}`}
    >
      <Aurora />
      <div className={`container ${simple ? "" : "hero-grid"}`}>
        <div className="hero-copy">
          <span className="eyebrow">
            <span />
            {page.hero.eyebrow}
          </span>
          <h1>
            {page.hero.title}
            <br />
            <em>{page.hero.accent}</em>
          </h1>
          <p>{page.hero.body}</p>
          {page.slug != "/contact" && (
            <div className="hero-actions">
              <ButtonLink to={page.slug === "/patients" ? "/faq" : "/contact"}>
                {contactLabel ?? (page.slug === "/patients" ? "پرسش‌های شما" : "درخواست دمو")}
              </ButtonLink>
              <Link
                className="text-link"
                to={
                  home
                    ? "/monitoring"
                    : page.slug === "/scanbox"
                      ? "#scanbox-steps"
                      : "/scanbox"
                }
              >
                {home
                  ? "با PM آشنا شوید"
                  : page.slug === "/scanbox"
                    ? "PM ScanBoxᴾʳᵒ چگونه کار می‌کند؟"
                    : "آشنایی با PM ScanBoxᴾʳᵒ"}
                <Icon name="arrow" size={20} />
              </Link>
            </div>
          )}
          {!simple && (
            <div className="hero-footnote">
              <span className="small-dot" /> تصمیم درمانی، همیشه با ارتودنتیست
            </div>
          )}
        </div>
        {!simple && (
          <div className="hero-visual" data-parallax="0.05">
            <span className="visual-kicker" dir="ltr">
              {visualKicker ?? (page.slug === "/scanbox"
                ? "PM ScanBoxᴾʳᵒ"
                : "CONNECTED ORTHODONTIC CARE")}
            </span>
            {visual ?? <Visual assetId={page.hero.asset} />}
            <div className="hero-visual-bottom">
              <span>
                بیمار <i /> تصویر <i /> ارتودنتیست
              </span>
              <span dir="ltr">PICO MONITORING</span>
            </div>
          </div>
        )}
      </div>
      {home && (
        <div className="hero-bottom">
          <div className="container">
            <span>مراقبت متصل، با قضاوت بالینی شما</span>
            <a href="#discover">
              کشف مسیر پایش{" "}
              <Icon
                name="arrow"
                size={16}
                style={{ transform: "rotate(-90deg)" }}
              />
            </a>
            <span dir="ltr">REMOTE ORTHODONTIC MONITORING</span>
          </div>
        </div>
      )}
    </section>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`section-heading ${center ? "center" : ""}`}
      data-reveal="up"
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}
export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="feature-grid" data-reveal-group="110">
      {features.map((feature) => (
        <div
          className="feature"
          key={feature.title}
          data-reveal="up"
          data-spotlight
        >
          <span className="feature-icon">
            <Icon name={feature.icon} size={28} />
          </span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </div>
      ))}
    </div>
  );
}
export function SplitSection({
  section,
  index = 0,
}: {
  section: SectionModel;
  index?: number;
}) {
  return (
    <section
      className={`section split-section ${index % 2 ? "wash reverse" : ""}`}
    >
      <div className="container split-grid">
        <div data-reveal="up">
          <SectionHeading
            eyebrow={section.eyebrow}
            title={section.title}
            body={section.body}
          />
          <div className="split-features">
            {section.features.map((f) => (
              <div key={f.title}>
                <Icon name={f.icon} size={23} />
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Visual assetId={section.asset} reveal="mask" />
      </div>
    </section>
  );
}
export function CTA({
  title = "پایش را متناسب با مطب شما بررسی کنیم.",
  patient = false,
  body,
  contactLabel,
}: {
  title?: string;
  patient?: boolean;
  body?: string;
  contactLabel?: string;
}) {
  return (
    <section className="cta-section">
      <div className="container cta-inner" data-reveal-group="120">
        <div data-reveal="up">
          <span className="eyebrow">
            {patient ? "قدم بعدی" : "همکاری با پیکو مانیتورینگ"}
          </span>
          <h2>{title}</h2>
          <p>
            {body ?? (patient
              ? "پایش درمان با هماهنگی مطب آغاز می‌شود. برای شناخت PM می‌توانید با تیم ما هم گفت‌وگو کنید."
              : "یک گفت‌وگو درباره نیازهای شما، مسیر اجرای پایش و نقش PM ScanBoxᴾʳᵒ.")}
          </p>
        </div>
        <span data-reveal="zoom"><ButtonLink to="/contact">
          {contactLabel ?? (patient ? "آشنایی بیشتر با PM" : "درخواست دمو")}
        </ButtonLink></span>
      </div>
    </section>
  );
}
const defaultSteps = [
  {
    title: "برنامه پایش",
    body: "ارتودنتیست مسیر پیگیری و زمان ثبت تصاویر را مشخص می‌کند.",
    icon: "calendar",
  },
  {
    title: "ثبت تصاویر",
    body: "بیمار با آموزش مطب و PM ScanBoxᴾʳᵒ تصویر ثبت می‌کند.",
    icon: "camera",
  },
  {
    title: "مرور اطلاعات",
    body: "تصاویر در مسیر پایش برای بررسی قرار می‌گیرند.",
    icon: "eye",
  },
  {
    title: "تصمیم بالینی",
    body: "ارتودنتیست درباره راهنمایی یا مراجعه بعدی تصمیم می‌گیرد.",
    icon: "check",
  },
];
export function Workflow({
  scanbox = false,
  patient = false,
}: {
  scanbox?: boolean;
  patient?: boolean;
}) {
  const steps = scanbox
    ? [
        {
          title: "دریافت PM ScanBoxᴾʳᵒ",
          body: "محصول و آموزش تأییدشده را از تیم مطب دریافت کنید.",
          icon: "phone",
        },
        {
          title: "آماده‌سازی تلفن",
          body: "طبق راهنمای محصول و شرایط سازگاری آماده شوید.",
          icon: "phone",
        },
        {
          title: "دنبال کردن آموزش",
          body: "مراحل تصویربرداری را طبق آموزش مطب انجام دهید.",
          icon: "book",
        },
        {
          title: "ثبت تصاویر",
          body: "نماهای مورد نیاز را طبق برنامه پزشک ثبت کنید.",
          icon: "camera",
        },
        {
          title: "ارسال برای پایش",
          body: "تصاویر را از مسیر تعیین‌شده در شروع پایش ارسال کنید.",
          icon: "message",
        },
        {
          title: "بررسی ارتودنتیست",
          body: "قدم بعدی درمان را پزشک مشخص می‌کند.",
          icon: "eye",
        },
      ]
    : patient
      ? [
          {
            title: "شروع با ارتودنتیست",
            body: "پزشک امکان پایش را برای درمان شما بررسی می‌کند.",
            icon: "eye",
          },
          {
            title: "دریافت PM ScanBoxᴾʳᵒ",
            body: "محصول را همراه آموزش استفاده دریافت می‌کنید.",
            icon: "phone",
          },
          {
            title: "ثبت تصاویر",
            body: "طبق زمان‌بندی و آموزش مطب تصویر ثبت می‌کنید.",
            icon: "camera",
          },
          {
            title: "بررسی روند درمان",
            body: "ارتودنتیست تصاویر و وضعیت شما را بررسی می‌کند.",
            icon: "eye",
          },
          {
            title: "راهنمایی در زمان نیاز",
            body: "پزشک درباره ادامه پیگیری یا مراجعه راهنمایی می‌کند.",
            icon: "message",
          },
        ]
      : defaultSteps;
  return (
    <section
      className="section workflow-section"
      id={scanbox ? "scanbox-steps" : "how-it-works"}
    >
      <div className="container">
        <SectionHeading
          eyebrow="مسیر پایش"
          title={
            scanbox
              ? "شش قدم، از PM ScanBoxᴾʳᵒ تا بررسی پزشک."
              : patient
                ? "پنج قدم، برای ارتباط با درمان."
                : "از ثبت تصویر تا قدم بعدی درمان."
          }
          body="یک مسیر روشن که با راهنمایی ارتودنتیست شروع می‌شود و با تصمیم او ادامه پیدا می‌کند."
          center
        />
        <div className="pm-rail" data-rail aria-hidden="true"><span /></div>
        <ol className={`workflow-grid ${scanbox ? "six" : ""}`} data-reveal-group="100">
          {steps.map((step) => (
            <li key={step.title} data-step data-reveal="up">
              <Icon name={step.icon} size={30} />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
export function FAQBlock({
  categories,
  limit,
  title = "پاسخ به چند پرسش مهم.",
  body = "برای جزئیات اجرای پایش، با تیم PM گفت‌وگو کنید.",
  items = faqs,
  filter = false,
}: {
  categories?: string[];
  limit?: number;
  title?: string;
  body?: string;
  items?: FAQ[];
  filter?: boolean;
}) {
  const [category, setCategory] = useState("همه");
  const all = items.filter(
    (f) => !categories?.length || categories.includes(f.category),
  );
  const visible = all
    .filter((f) => category === "همه" || category === f.category)
    .slice(0, limit);
  return (
    <section className="section faq-section">
      <div className="container faq-layout">
        <div>
          <SectionHeading
            eyebrow="پرسش‌های متداول"
            title={title}
            body={body}
          />
          <Link className="text-link" to="/contact">
            در ارتباط باشیم <Icon name="arrow" size={19} />
          </Link>
        </div>
        <div>
          {filter && (
            <div className="filters" aria-label="دسته‌بندی پرسش‌ها">
              {["همه", ...new Set(all.map((f) => f.category))].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="faq-list" data-reveal-group="70">
            {visible.map((f) => (
              <details key={f.id} data-reveal="fade">
                <summary>
                  {f.question}
                  <Icon name="plus" size={20} />
                </summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
          {limit && (
            <Link className="text-link faq-more" to="/faq">
              همه پرسش‌ها <Icon name="arrow" size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
export function ResourceCard({ article }: { article: Article }) {
  return (
    <article
      className="resource-card"
      data-reveal="up"
      data-spotlight
      data-glow
    >
      <Link
        to={`/articles/${article.slug}`}
        className="resource-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Visual assetId={article.featuredImage} compact />
      </Link>
      <div className="resource-meta">
        <span>{article.category}</span>
        <span>{persianNumber(article.readingMinutes)} دقیقه مطالعه</span>
      </div>
      <h3>
        <Link to={`/articles/${article.slug}`}>{article.title}</Link>
      </h3>
      <p>{article.excerpt}</p>
      <div className="resource-bottom">
        <time dateTime={article.date}>{dateLabel(article.date)}</time>
        <Link
          to={`/articles/${article.slug}`}
          aria-label={`مطالعه ${article.title}`}
        >
          <Icon name="arrow" size={22} />
        </Link>
      </div>
    </article>
  );
}
export function TestimonialPlaceholder() {
  return (
    <aside className="testimonial-placeholder">
      <Icon name="message" />
      <p>
        این جایگاه برای تجربه تأییدشده ارتودنتیست، پس از دریافت رضایت و منبع،
        آماده است.
      </p>
    </aside>
  );
}
