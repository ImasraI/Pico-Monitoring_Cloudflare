import type { Page, Feature } from "../content/types";
import { assets } from "../content";
import copy from "../content/privacy.json";
import { Aurora, ButtonLink } from "../components/Sections";
import { Icon } from "../components/Icon";
import { Link } from "../navigation";
import { scanboxProductName } from "../content/scanbox";

function PrivacyImage({ assetId, hero = false }: { assetId: string; hero?: boolean }) {
  const asset = assets.find((item) => item.id === assetId)!;
  return (
    <figure className="privacy-image">
      <img
        src={asset.src}
        srcSet={`${asset.src.replace(".webp", "-small.webp")} 640w, ${asset.src} 1200w`}
        sizes="(max-width: 767px) 92vw, 560px"
        width={1200}
        height={asset.ratio === "3:2" ? 800 : 675}
        alt={asset.alt}
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : "auto"}
        decoding="async"
      />
      <figcaption>تصویر مفهومی موقت؛ تصویر واقعی محصول، بیمار یا گواهی امنیتی نیست.</figcaption>
    </figure>
  );
}

function Paragraphs({ values }: { values: string[] }) {
  return <>{values.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</>;
}

function EditorialGrid({ items }: { items: Feature[] }) {
  return (
    <ul className="privacy-editorial-grid" role="list">
      {items.map((item) => (
        <li key={item.title}>
          <Icon name={item.icon} size={23} />
          <div><h3>{item.title}</h3><p>{item.body}</p></div>
        </li>
      ))}
    </ul>
  );
}

function PrivacyTimeline({ items, vertical = false, label }: { items: Feature[]; vertical?: boolean; label: string }) {
  return (
    <ol className={`privacy-timeline ${vertical ? "privacy-retention-path" : "privacy-use-path"}`} aria-label={label}>
      {items.map((item) => (
        <li key={item.title}>
          {!vertical && <span className="privacy-process-node"><Icon name={item.icon} size={23} /></span>}
          <h3>{item.title}</h3><p>{item.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function PrivacyPage({ page }: { page: Page }) {
  return (
    <div className="privacy-page">
      <section className="hero privacy-hero">
        <Aurora />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span />{copy.hero.label}</span>
            <h1>{page.hero.title}<br /><em>{page.hero.accent}</em></h1>
            <Paragraphs values={copy.hero.paragraphs} />
            <div className="hero-actions">
              <ButtonLink to="/contact">گفت‌وگو با تیم PM</ButtonLink>
              <Link className="text-link" to="/scanbox">آشنایی با {scanboxProductName}<Icon name="arrow" size={19} /></Link>
            </div>
          </div>
          <div className="hero-visual"><PrivacyImage assetId={copy.hero.assetId} hero /></div>
        </div>
      </section>
      <section className="section privacy-section" id="privacy-collected" aria-labelledby="privacy-collected-title">
        <div className="container">
          <div className="section-heading"><h2 id="privacy-collected-title">{copy.collected.title}</h2></div>
          <EditorialGrid items={copy.collected.items} />
        </div>
      </section>
      <section className="section privacy-section" id="privacy-use" aria-labelledby="privacy-use-title">
        <div className="container">
          <div className="section-heading"><h2 id="privacy-use-title">{copy.use.title}</h2></div>
          <PrivacyTimeline items={copy.use.items} label="مسیر استفاده از اطلاعات" />
          <p className="privacy-section-note">{copy.use.note}</p>
        </div>
      </section>
      <section className="section privacy-section" id="privacy-access" aria-labelledby="privacy-access-title">
        <div className="container">
          <div className="section-heading"><h2 id="privacy-access-title">{copy.access.title}</h2></div>
          <EditorialGrid items={copy.access.items} />
          <p className="privacy-section-note">{copy.access.note}</p>
        </div>
      </section>
      <section className="section privacy-section" id="privacy-protection" aria-labelledby="privacy-protection-title">
        <div className="container">
          <div className="privacy-editorial-text">
            <div className="section-heading"><h2 id="privacy-protection-title">{copy.protection.title}</h2></div>
            <Paragraphs values={copy.protection.paragraphs} />
          </div>
        </div>
      </section>
      <section className="section privacy-section" id="privacy-retention" aria-labelledby="privacy-retention-title">
        <div className="container">
          <div className="section-heading"><h2 id="privacy-retention-title">{copy.retention.title}</h2><p>{copy.retention.intro}</p></div>
          <div className="privacy-retention-grid">
            <PrivacyTimeline items={copy.retention.items} vertical label="چرخه نگهداری اطلاعات" />
            <PrivacyImage assetId={copy.retention.assetId} />
          </div>
          <p className="privacy-section-note">{copy.retention.note}</p>
        </div>
      </section>
      <section className="section split-section reverse privacy-section privacy-family" id="privacy-children" aria-labelledby="privacy-children-title">
        <div className="container split-grid">
          <div className="privacy-copy">
            <div className="section-heading"><h2 id="privacy-children-title">{copy.children.title}</h2></div>
            <Paragraphs values={copy.children.paragraphs} />
          </div>
          <PrivacyImage assetId={copy.children.assetId} />
        </div>
      </section>
      <section className="section privacy-section" id="privacy-research" aria-labelledby="privacy-research-title">
        <div className="container">
          <div className="section-heading"><h2 id="privacy-research-title">{copy.research.title}</h2></div>
          <div className="split-grid">
            <div className="privacy-copy privacy-research-copy">
              <Paragraphs values={copy.research.paragraphs} />
            </div>
            <PrivacyImage assetId={copy.research.assetId} />
          </div>
        </div>
      </section>
      <section className="section privacy-contact" id="privacy-contact" aria-labelledby="privacy-contact-title">
        <div className="container privacy-editorial-text">
          <div className="section-heading"><h2 id="privacy-contact-title">{copy.contact.title}</h2><p>{copy.contact.body}</p></div>
          <ButtonLink to="/contact">تماس با تیم PM</ButtonLink>
        </div>
      </section>
    </div>
  );
}
