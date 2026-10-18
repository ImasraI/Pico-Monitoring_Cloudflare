import type { Page } from "../content/types";
import { assets } from "../content";
import copy from "../content/pm-ai.json";
import { Hero, CTA } from "../components/Sections";
import { Icon } from "../components/Icon";
import { Link } from "../navigation";

function AiTitle({ title }: { title: string }) {
  return title.endsWith("PM Kids")
    ? <>{title.slice(0, -7)}<bdi dir="ltr" className="ai-product-name">PM Kids</bdi></>
    : title;
}

function AiImage({ assetId, card = false }: { assetId: string; card?: boolean }) {
  const asset = assets.find((item) => item.id === assetId)!;
  const thumbnail = asset.src.replace(".webp", "-card.webp");
  return (
    <img
      src={card ? thumbnail : asset.src}
      srcSet={`${thumbnail} 480w, ${asset.src} 1200w`}
      sizes={card
        ? "(max-width: 600px) 46vw, (max-width: 1100px) 30vw, 230px"
        : "(max-width: 767px) 92vw, 560px"}
      width={card ? 480 : 1200}
      height={card ? 320 : 800}
      alt={asset.alt}
      loading="lazy"
      decoding="async"
    />
  );
}

export function PmAiPage({ page }: { page: Page }) {
  return (
    <div className="pm-ai-page">
      <Hero page={page} />
      <section className="section ai-capabilities" aria-labelledby="ai-capabilities-title">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">از تصویر تا همراهی بیمار</span>
            <h2 id="ai-capabilities-title">نقش هوش مصنوعی در مسیر پایش</h2>
            <p>هر موضوع را انتخاب کنید تا توضیحات آن را در ادامه همین صفحه بخوانید.</p>
          </div>
          <nav className="ai-card-grid" aria-label="موضوعات PM AI">
            {copy.features.map((feature) => (
              <Link
                key={feature.id}
                to={`#${feature.id}`}
                className="ai-capability-card"
                aria-labelledby={`${feature.id}-card-title`}
              >
                <AiImage assetId={feature.assetId} card />
                <div className="ai-card-caption">
                  <h3 id={`${feature.id}-card-title`}><AiTitle title={feature.title} /></h3>
                  <Icon name="arrow" size={19} />
                </div>
              </Link>
            ))}
          </nav>
          <p className="ai-image-note">تصاویر مفهومی و تولیدشده با هوش مصنوعی‌اند؛ تصویر واقعی محصول یا نتیجه تحلیل بالینی نیستند.</p>
        </div>
      </section>
      {copy.features.map((feature, index) => (
        <section
          key={feature.id}
          id={feature.id}
          className={`section split-section ai-detail ${index % 2 === 0 ? "wash" : "reverse"}`}
          aria-labelledby={`${feature.id}-title`}
          tabIndex={-1}
        >
          <div className="container split-grid">
            <div className="ai-detail-copy section-heading">
              {feature.id === "intraoral-analysis" && <span className="eyebrow">در حال ارزیابی</span>}
              <h2 id={`${feature.id}-title`}><AiTitle title={feature.title} /></h2>
              <p>{feature.body}</p>
            </div>
            <figure className="ai-illustration">
              <AiImage assetId={feature.assetId} />
              <figcaption>تصویر مفهومی موقت؛ تصویر واقعی محصول یا خروجی تحلیل بالینی نیست.</figcaption>
            </figure>
          </div>
        </section>
      ))}
      <section className="section ai-clinical-role" aria-labelledby="ai-clinical-role-title">
        <div className="container">
          <div className="section-heading center">
            <span className="eyebrow">در کنار تیم درمان</span>
            <h2 id="ai-clinical-role-title">تصمیم بالینی، همچنان با ارتودنتیست.</h2>
            <p>هوش مصنوعی نقش پشتیبان دارد. تفسیر تصاویر، انتخاب قدم بعدی و تصمیم درمانی بر عهده ارتودنتیست است و پایش از راه دور جایگزین معاینه و مراقبت حضوری نمی‌شود.</p>
          </div>
        </div>
      </section>
      <CTA title={page.cta} />
    </div>
  );
}
