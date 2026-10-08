import { Link } from "../navigation";
import { articles } from "../content";
import type { Page } from "../content/types";
import {
  Hero,
  SplitSection,
  SectionHeading,
  FeatureGrid,
  Workflow,
  CTA,
  ResourceCard,
  FAQBlock,
  ButtonLink,
} from "../components/Sections";
import { Visual } from "../components/Visual";
import { Icon } from "../components/Icon";

export function Home({ page }: { page: Page }) {
  return (
    <div className="enhanced-home">
      <Hero page={page} />
      <section className="intro-strip" id="discover">
        <div className="container">
          <p>
            یک مسیر متصل برای <strong>ارتودنتیست، مطب و بیمار.</strong>
          </p>
          <div>
            <span>
              <Icon name="eye" size={19} /> دید بین مراجعات
            </span>
            <span>
              <Icon name="camera" size={19} /> تصاویر منظم‌تر
            </span>
            <span>
              <Icon name="message" size={19} /> پیگیری روشن‌تر
            </span>
          </div>
        </div>
      </section>
      <SplitSection section={page.sections[0]} />
      <section className="section wash">
        <div className="container">
          <SectionHeading
            eyebrow="راهکار، در خدمت مراقبت"
            title="مراقبت بهتر، از ارتباط بهتر شروع می‌شود."
            body="هدف پایش، نزدیک‌تر کردن اطلاعات بیمار به تصمیم بالینی شماست؛ با توجه به جریان کار مطب و تجربه بیمار."
            center
          />
          <FeatureGrid
            features={[
              {
                title: "برای ارتودنتیست",
                body: "دید بیشتر از آنچه بین مراجعات می‌گذرد؛ برای پیگیری متناسب با نیاز بیمار.",
                icon: "eye",
              },
              {
                title: "برای مطب و کلینیک",
                body: "مسیر روشن‌تر برای تیم و استفاده هدفمندتر از زمان بالینی.",
                icon: "target",
              },
              {
                title: "برای بیمار",
                body: "ارتباط با مطب، ثبت تصاویر از خانه و شناخت قدم بعدی درمان.",
                icon: "message",
              },
            ]}
          />
          <div className="audience-links">
            <Link to="/orthodontists">
              برای ارتودنتیست‌ها <Icon name="arrow" size={18} />
            </Link>
            <Link to="/clinics">
              برای کلینیک‌ها <Icon name="arrow" size={18} />
            </Link>
            <Link to="/patients">
              برای بیماران <Icon name="arrow" size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="care-preview section"><div className="container care-preview-grid"><div><span className="eyebrow">از آگاهی تا همراهی</span><h2>قدم بعدی درمان،<br />همیشه پیش چشم شما.</h2><p>تصاویر، برنامه درمان و گفت‌وگو با پزشک، در یک فضای یکپارچه برای پیگیری روزمره.</p><a className="button" href="/danto.html">ورود به سامانه <Icon name="arrow" size={19} /></a></div><div className="care-preview-card"><div className="care-preview-heading"><span className="care-pulse" /> نمایی از مسیر مراقبت <span className="preview-label">پیش‌نمایش</span></div><div className="care-preview-row"><span className="care-step">۰۱</span><div><strong>ثبت تصاویر</strong><p>تصاویر خود را طبق راهنمای پزشک ارسال کنید.</p></div><Icon name="camera" size={24} /></div><div className="care-preview-row"><span className="care-step">۰۲</span><div><strong>بررسی توسط پزشک</strong><p>تصمیم درمانی با ارتودنتیست شماست.</p></div><Icon name="eye" size={24} /></div><div className="care-preview-row"><span className="care-step">۰۳</span><div><strong>همراهی در ادامه مسیر</strong><p>برنامه و پیام‌های پزشک را دنبال کنید.</p></div><Icon name="message" size={24} /></div></div></div></section>
      <Workflow />
      <section className="section scanbox-showcase">
        <div className="container split-grid">
          <div>
            <span className="eyebrow light" dir="ltr">
              MEET PM SCANBOX
            </span>
            <h2>
              از تلفن بیمار،
              <br />
              تا نگاه بالینی شما.
            </h2>
            <p>
              PM ScanBox به ثبت منظم‌تر تصاویر داخل دهان کمک می‌کند؛ نقطه شروعی
              برای پیگیری روشن‌تر درمان، از هر جایی که بیمار حضور دارد.
            </p>
            <ButtonLink to="/scanbox" secondary>
              PM ScanBox را بشناسید
            </ButtonLink>
            <small>
              نحوه استفاده و سازگاری، طبق راهنمای تأییدشده محصول بررسی می‌شود.
            </small>
          </div>
          <Visual assetId="PM-SCANBOX-HERO-01" />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <SectionHeading
              eyebrow="هماهنگ با مسیر درمان"
              title="الاینر یا براکت، پیگیری اهمیت دارد."
            />
            <Link className="text-link" to="/monitoring">
              راهکار پایش <Icon name="arrow" size={20} />
            </Link>
          </div>
          <div className="treatment-grid">
            {[
              {
                to: "/aligners",
                title: "پایش الاینر",
                en: "ALIGNERS",
                asset: "PM-ALIGNER-01",
                body: "مرور تصاویر، توجه به نشستن الاینر و همراهی بیمار در هر مرحله درمان.",
              },
              {
                to: "/braces",
                title: "پایش براکت",
                en: "BRACES",
                asset: "PM-BRACES-01",
                body: "پیگیری وضعیت قابل مشاهده ابزار و بررسی نیاز به مراجعه با نظر ارتودنتیست.",
              },
            ].map((t) => (
              <article key={t.to} className="treatment-card">
                <Visual assetId={t.asset} compact />
                <div>
                  <span className="eyebrow" dir="ltr">
                    {t.en}
                  </span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  <Link className="text-link" to={t.to}>
                    بیشتر بدانید <Icon name="arrow" size={19} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="section-note">
            موضوعات پایش بیان‌شده، ادعای تشخیص خودکار PM نیستند. قابلیت‌های قابل
            ارائه در جلسه دمو بررسی می‌شوند.
          </p>
        </div>
      </section>
      <section className="section wash">
        <div className="container split-grid">
          <div>
            <SectionHeading
              eyebrow="تجربه بیمار"
              title="فاصله از مطب، فاصله از درمان نباشد."
              body="ثبت تصاویر از خانه، همراه با آموزش و برنامه مشخص، می‌تواند از رفت‌وآمدهای غیرضروری کم کند. بیمار همچنان برای معاینه و درمان لازم به مطب مراجعه می‌کند."
            />
            <ButtonLink to="/patients">تجربه بیمار را بشناسید</ButtonLink>
          </div>
          <Visual assetId="PM-PATIENT-UI-01" />
        </div>
      </section>
      <section className="section evidence-teaser">
        <div className="container">
          <span className="eyebrow">اعتماد، با شفافیت</span>
          <h2>
            شواهد را ببینید.
            <br />
            <em>منبع را هم ببینید.</em>
          </h2>
          <p>
            پژوهش‌های پایش از راه دور را با ارجاع روشن و توجه به محدودیت‌ها
            معرفی می‌کنیم. شواهد سامانه‌های دیگر، تأیید عملکرد PM نیستند.
          </p>
          <Link className="text-link" to="/evidence">
            شواهد و پژوهش <Icon name="arrow" size={21} />
          </Link>
          <div className="trust-points">
            <span>
              <Icon name="research" /> منابع قابل ارجاع
            </span>
            <span>
              <Icon name="eye" /> تفکیک شواهد خارجی
            </span>
            <span>
              <Icon name="check" /> تصمیم‌گیری ارتودنتیست
            </span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <SectionHeading
              eyebrow="منابع و راهنماها"
              title="برای پیگیری بهتر، بیشتر بدانید."
            />
            <Link className="text-link" to="/resources">
              همه منابع <Icon name="arrow" size={19} />
            </Link>
          </div>
          <div className="resources-grid">
            {articles.slice(0, 3).map((a) => (
              <ResourceCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </section>
      <FAQBlock categories={page.faqCategories} limit={2} />
      <CTA title={page.cta} />
    </div>
  );
}
