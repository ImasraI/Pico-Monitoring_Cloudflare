import type { Page } from "../content/types";
import { Link } from "../navigation";
import { ButtonLink, FAQBlock, SectionHeading } from "../components/Sections";
import { Icon } from "../components/Icon";
import {
  scanboxImages, scanboxValue, scanboxIntroduction, scanboxSteps,
  scanboxClinicalCopy, scanboxClinicalViews, scanboxFAQs, scanboxProductName,
} from "../content/scanbox";
import "../styles/scanbox.css";

function ProductImage({ image, eager = false }: {
  image: { src: string; alt: string };
  eager?: boolean;
}) {
  return (
    <figure className="scanbox-product-image">
      <img src={image.src} alt={image.alt} width={1024} height={1024}
        loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} />
      <figcaption>ماکاپ موقت؛ طراحی نهایی محصول ممکن است متفاوت باشد.</figcaption>
    </figure>
  );
}

function Copy({ paragraphs }: { paragraphs: string[] }) {
  return <div className="scanbox-copy">{paragraphs.map(p => <p key={p}>{p}</p>)}</div>;
}

export function ScanBox({ page }: { page: Page }) {
  return (
    <div className="scanbox-page">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span />{scanboxProductName}</span>
            <h1>{page.hero.title}<br />{" "}<em>{page.hero.accent}</em></h1>
            <p>{page.hero.body}</p>
            <div className="hero-actions">
              <ButtonLink to="/contact">درخواست دمو</ButtonLink>
              <Link className="text-link" to="#scanbox-steps">
                {scanboxProductName} چگونه کار می‌کند؟ <Icon name="arrow" size={20} />
              </Link>
            </div>
            <div className="hero-footnote"><span className="small-dot" />
              تصویربرداری در خانه. بررسی از راه دور. تصمیم با ارتودنتیست.
            </div>
          </div>
          <div className="hero-visual">
            <span className="visual-kicker" dir="ltr">{scanboxProductName}</span>
            <ProductImage image={scanboxImages.hero} eager />
            <div className="hero-visual-bottom">
              <span>بیمار <i /> تصویر <i /> ارتودنتیست</span>
              <span dir="ltr">Pico Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section split-section" aria-labelledby="scanbox-value-title">
        <div className="container split-grid">
          <div className="section-heading">
            <span className="eyebrow">نگاهی به مسیر مراقبت</span>
            <h2 id="scanbox-value-title">هر پیگیری، الزاماً به یک صندلی دندانپزشکی نیاز ندارد</h2>
          </div>
          <Copy paragraphs={scanboxValue} />
        </div>
      </section>

      <section className="section split-section wash reverse">
        <div className="container split-grid">
          <div>
            <SectionHeading eyebrow="ابزار تصویربرداری Pico Monitoring" title="این، PM ScanBoxᴾʳᵒ است" />
            <Copy paragraphs={scanboxIntroduction} />
          </div>
          <ProductImage image={scanboxImages.product} />
        </div>
      </section>

      <section className="section workflow-section" id="scanbox-steps">
        <div className="container">
          <SectionHeading eyebrow="مسیر پایش"
            title="از PM ScanBoxᴾʳᵒ تا بررسی پزشک؛ با کمک هوش مصنوعی"
            body="یک مسیر شش‌مرحله‌ای که از آموزش و ثبت تصاویر شروع می‌شود، با کمک Artificial Intelligence (هوش مصنوعی) برای پایش آماده می‌شود و در نهایت به بررسی و تصمیم ارتودنتیست می‌رسد." center />
          <ol className="workflow-grid six scanbox-workflow">
            {scanboxSteps.map((step, i) => (
              <li key={step.title} className={step.ai ? "scanbox-ai-step" : undefined}>
                <Icon name={step.icon} size={30} />
                {step.ai && <span className="scanbox-ai-badge"><b dir="ltr">AI</b> هوش مصنوعی</span>}
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {i < scanboxSteps.length - 1 && <span className="scanbox-step-connector" aria-hidden="true"><Icon name="arrow" size={22} /></span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section wash">
        <div className="container">
          <SectionHeading eyebrow="نماهای مورد نیاز پایش" title="مجموعه‌ای از تصاویر، بر اساس نیاز واقعی پایش" />
          <Copy paragraphs={scanboxClinicalCopy} />
          <p className="scanbox-image-note">تصاویر آموزشی موقت از مدل دندانی؛ این‌ها تصاویر بیمار یا خروجی واقعی PM ScanBoxᴾʳᵒ نیستند.</p>
          <div className="scanbox-clinical-gallery">
            {scanboxClinicalViews.map(view => (
              <figure key={view.id}>
                <img src={view.src} alt={view.alt} width={640} height={640} loading="lazy" />
                <figcaption>{view.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div className="container split-grid">
          <div>
            <SectionHeading eyebrow="آماده برای ارائه در مطب" title="تجربه PM، از جعبه شروع می‌شود" />
            <Copy paragraphs={[
              "PM ScanBoxᴾʳᵒ با بسته‌بندی اختصاصی و آماده ارائه به مطب تحویل می‌شود؛ تا محصول از لحظه دریافت توسط تیم درمان تا زمانی که به دست بیمار می‌رسد، بخشی از یک تجربه حرفه‌ای و یکپارچه باشد.",
              "طراحی‌شده برای مطب، آماده برای بیمار.",
            ]} />
          </div>
          <ProductImage image={scanboxImages.packaging} />
        </div>
      </section>

      <section className="section wash">
        <div className="container">
          <SectionHeading eyebrow="نگاهی به ابزار" title="از آماده‌سازی تا ثبت تصویر." body="جایگاه‌های مستقل برای تصاویر نهایی محصول و تجربه بیمار؛ این نماهای موقت، تصویر محصول یا بیمار واقعی و راهنمای تأییدشده استفاده نیستند."/>
          <div className="scanbox-concept-gallery">
            {[
              {image:scanboxImages.use,title:"نمای مفهومی استفاده"},
              {image:scanboxImages.components,title:"نمای مفهومی اجزا"},
              {image:scanboxImages.patient,title:"نمای مفهومی تجربه بیمار"},
            ].map(item=><article key={item.title}><ProductImage image={item.image}/><h3>{item.title}</h3></article>)}
          </div>
        </div>
      </section>
      <FAQBlock items={scanboxFAQs} title="پرسش‌های متداول" body="برای جزئیات اجرای پایش، با تیم Pico Monitoring گفت‌وگو کنید." />
      <section className="cta-section">
        <div className="container cta-inner">
          <div>
            <span className="eyebrow">همکاری با پیکو مانیتورینگ</span>
            <h2>{page.cta}</h2>
            <p>یک گفت‌وگو درباره نیازهای شما، مسیر اجرای پایش و نقش PM ScanBoxᴾʳᵒ.</p>
          </div>
          <ButtonLink to="/contact">درخواست دمو</ButtonLink>
        </div>
      </section>
    </div>
  );
}
