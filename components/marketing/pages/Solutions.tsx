import type { Page, Feature } from "../content/types";
import { Hero, SectionHeading, FeatureGrid, CTA, ButtonLink } from "../components/Sections";
import { SolutionVisual, type MockupKind } from "../components/SolutionVisual";
import { Icon } from "../components/Icon";
import { Link } from "../navigation";
import { solutions } from "../content/navigation";

const introductions: Record<string, string> = {
  "/scanbox": "ابزار ثبت تصاویر داخل دهان، در شروع مسیر پایش.",
  "/dashboard": "مرور پرونده‌ها و هماهنگی پیگیری، برای ارتودنتیست و تیم مطب.",
  "/app": "ثبت تصویر، برنامه درمان و ارتباط با مطب، در مسیر بیمار.",
  "/kids": "تجربه متناسب با سن، برای همکاری کودک و همراهی خانواده.",
};

export function SolutionLinks({ current }: { current?: string }) {
  return <div className={`solution-links ${current ? "solution-links-related" : ""}`}>{solutions.filter(s=>s.to!==current).map(s=>
    <article className="solution-link-card" key={s.to}>
      <Icon name={s.icon} size={28}/><h3 dir="ltr">{s.label}</h3>
      <p>{introductions[s.to]}</p>
      <Link className="text-link" to={s.to}>آشنایی بیشتر <Icon name="arrow" size={18}/></Link>
    </article>
  )}</div>;
}

type GalleryItem = { id: string; kind: MockupKind; title: string; body: string };
type SolutionContent = {
  name: string; kind: MockupKind; heroAsset: string; context: string;
  title: string; body: string; features: Feature[];
  split: { eyebrow: string; title: string; body: string; asset: string; kind: MockupKind };
  workflow: Feature[]; gallery?: GalleryItem[];
};

const content: Record<string, SolutionContent> = {
  "/dashboard": {
    name: "PM Dashboard", kind: "dashboard", heroAsset: "PM-DASHBOARD-PREVIEW-01",
    context: "محیط کاری ارتودنتیست و تیم مطب در اکوسیستم Pico Monitoring.",
    title: "اطلاعات مرتبط، در کنار پرونده بیمار.",
    body: "وقتی تصویر، برنامه و پیام بیمار در یک مسیر قابل مرور قرار می‌گیرند، تیم درمان می‌تواند پیگیری را با شناخت بهتری از پرونده انجام دهد.",
    features: [
      {title:"نمای کلی بیماران",body:"مرور پرونده‌ها، آخرین تصاویر و وضعیت پیگیری؛ برای پیدا کردن قدم بعدی هر بیمار.",icon:"eye"},
      {title:"تصاویر و روند درمان",body:"دیدن تصاویر ثبت‌شده در کنار برنامه و مراحل درمان؛ با بررسی ارتودنتیست.",icon:"camera"},
      {title:"ارتباط و هماهنگی",body:"پیام‌ها، یادداشت‌ها و زمان پیگیری به تیم کمک می‌کنند مسیر بیمار را دنبال کند.",icon:"message"},
    ],
    split: {eyebrow:"از تصویر تا پیگیری",title:"بررسی روشن‌تر، با زمینه‌ای از مسیر درمان.",
      body:"تصویر جدید را در کنار اطلاعات پرونده و مراحل درمان مرور کنید. مواردی که نیاز به توجه دارند با بررسی تیم مشخص می‌شوند؛ پیگیری، پیام یا مراجعه حضوری بر اساس نظر ارتودنتیست انجام می‌شود.",
      asset:"PM-DASHBOARD-REVIEW-01",kind:"review"},
    workflow: [
      {title:"مرور وضعیت",body:"پرونده و آخرین اطلاعات بیمار را ببینید.",icon:"eye"},
      {title:"بررسی تصاویر",body:"نماهای ثبت‌شده را در زمینه درمان ارزیابی کنید.",icon:"camera"},
      {title:"تعیین قدم بعدی",body:"برنامه یا پیگیری لازم را با نظر پزشک مشخص کنید.",icon:"calendar"},
      {title:"ارتباط با بیمار",body:"راهنمایی را از مسیر ارتباط با مطب منتقل کنید.",icon:"message"},
    ],
  },
  "/app": {
    name:"PM App", kind:"app", heroAsset:"PM-APP-PREVIEW-01",
    context:"مسیر بیمار در Pico Monitoring؛ همراه با برنامه و راهنمایی تیم درمان.",
    title:"بیمار بداند چه کاری، چه زمانی و با چه راهنمایی انجام دهد.",
    body:"PM App نقطه ارتباط بیمار با مسیر پایش است؛ از ثبت تصاویر طبق برنامه مطب تا دیدن مراحل درمان و گفت‌وگو با تیم.",
    features: [
      {title:"ثبت تصویر از خانه",body:"تصاویر مورد نیاز را با PM ScanBoxᴾʳᵒ، طبق آموزش و برنامه تعیین‌شده توسط مطب ثبت کنید.",icon:"camera"},
      {title:"برنامه و قدم بعدی",body:"مراحل درمان و زمان ثبت تصویر را دنبال کنید. یادآوری‌ها به همراهی منظم‌تر با برنامه کمک می‌کنند.",icon:"calendar"},
      {title:"ارتباط با تیم درمان",body:"پیام و راهنمایی مطب را در مسیر درمان دریافت کنید و پرسش‌های خود را با تیم مطرح کنید.",icon:"message"},
    ],
    split:{eyebrow:"آموزش، پیش از تصویربرداری",title:"ثبت تصویر، با یک مسیر قابل فهم.",
      body:"راهنمایی مطب به بیمار کمک می‌کند برای تصویربرداری آماده شود، نماهای مورد نیاز را بشناسد و تصاویر را برای بررسی ارسال کند. شکل نهایی راهنمای درون رابط و جزئیات تجربه بیمار با تیم PM بررسی می‌شود.",
      asset:"PM-APP-GUIDANCE-01",kind:"guidance"},
    workflow:[
      {title:"آشنایی با برنامه",body:"آموزش و زمان‌بندی تعیین‌شده توسط مطب را مرور کنید.",icon:"book"},
      {title:"آماده‌سازی و ثبت",body:"تلفن و ابزار را طبق راهنما آماده کنید و تصاویر را ثبت کنید.",icon:"phone"},
      {title:"ارسال به مطب",body:"تصاویر را وارد مسیر پایش و بررسی تیم درمان کنید.",icon:"camera"},
      {title:"دریافت راهنمایی",body:"قدم بعدی را بر اساس پیام و نظر ارتودنتیست دنبال کنید.",icon:"message"},
    ],
  },
  "/kids": {
    name:"PM Kids", kind:"kids", heroAsset:"PM-KIDS-PREVIEW-01",
    context:"PM Kids تجربه کودکان در اکوسیستم PM است؛ اپلیکیشن یا محصولی مستقل نیست. متن و جزئیات این تجربه، اولیه و نیازمند بازبینی تیم PM هستند.",
    title:"همکاری با درمان، متناسب با سن و با همراهی خانواده.",
    body:"قدم‌های قابل فهم، شخصی‌سازی محدود و تشویق کنترل‌شده می‌توانند به کودک کمک کنند برنامه تعیین‌شده توسط مطب را بهتر دنبال کند.",
    features:[
      {title:"تجربه متناسب با سن",body:"زبان ساده‌تر و مسیر واضح‌تر برای شناخت فعالیت بعدی، بدون پیچیده کردن برنامه درمان.",icon:"phone"},
      {title:"انگیزه برای همراهی",body:"آواتار، امتیاز و پاداش در خدمت همکاری منظم قرار می‌گیرند؛ پاداش، وعده نتیجه درمان نیست.",icon:"target"},
      {title:"نقش خانواده",body:"والدین یا سرپرست در آموزش، آماده‌سازی و پیگیری برنامه کودک، متناسب با نیاز او مشارکت می‌کنند.",icon:"message"},
    ],
    split:{eyebrow:"بخشی از مسیر بیمار",title:"یک تجربه همراه، در همان اکوسیستم.",
      body:"آموزش، یادآوری و نمایش قدم بعدی، در کنار برنامه پزشک معنا پیدا می‌کنند. میزان استقلال کودک و نقش خانواده باید با سن، آموزش و نظر تیم درمان هماهنگ باشد.",
      asset:"PM-KIDS-FAMILY-01",kind:"family"},
    workflow:[
      {title:"مرور با خانواده",body:"برنامه و راهنمایی مطب را با کمک والدین بشناسیم.",icon:"book"},
      {title:"آماده شدن",body:"برای فعالیت تعیین‌شده و ثبت تصویر آماده شویم.",icon:"phone"},
      {title:"انجام قدم بعدی",body:"طبق برنامه پزشک در مسیر درمان همراه بمانیم.",icon:"camera"},
      {title:"تشویق همکاری",body:"همکاری منظم را با تشویق متناسب و کنترل‌شده دنبال کنیم.",icon:"check"},
    ],
    gallery:[
      {id:"PM-KIDS-PREVIEW-01",kind:"kids",title:"نمای تجربه کودک",body:"قدم بعدی و یادآوری‌های برنامه، با زبان قابل فهم‌تر."},
      {id:"PM-KIDS-AVATAR-01",kind:"avatar",title:"آواتار و شخصی‌سازی",body:"انتخاب‌های محدود برای حس همراهی و آشنایی با محیط."},
      {id:"PM-KIDS-GAME-01",kind:"game",title:"گیمیفیکیشن کنترل‌شده",body:"نمایش پیشرفت در فعالیت‌ها؛ بدون رقابت درباره نتیجه درمان."},
      {id:"PM-KIDS-REWARD-01",kind:"reward",title:"امتیاز و پاداش",body:"تشویق پایبندی به فعالیت‌های تعیین‌شده، با کنترل تیم درمان."},
      {id:"PM-KIDS-EDUCATION-01",kind:"education",title:"آموزش ساده و قابل فهم",body:"جهت اولیه برای توضیح آمادگی و ثبت تصویر؛ محتوای نهایی باید بازبینی شود."},
      {id:"PM-KIDS-FAMILY-01",kind:"family",title:"تعامل کودک و والدین",body:"مرور راهنما و همراهی خانواده، متناسب با سن و شرایط کودک."},
    ],
  },
};

export function SolutionPage({ page }: { page: Page }) {
  const data=content[page.slug];
  return <div className="solution-page">
    <Hero page={page} visual={<SolutionVisual assetId={data.heroAsset} kind={data.kind}/>} visualKicker={data.name}/>
    <section className="section"><div className="container">
      <p className="solution-context">{data.context}</p>
      <SectionHeading eyebrow="در مسیر مراقبت متصل" title={data.title} body={data.body}/>
      <FeatureGrid features={data.features}/>
    </div></section>
    <section className="section wash split-section"><div className="container split-grid">
      <div><SectionHeading eyebrow={data.split.eyebrow} title={data.split.title} body={data.split.body}/>
        <ButtonLink to="/contact">گفت‌وگو درباره {data.name}</ButtonLink></div>
      <SolutionVisual assetId={data.split.asset} kind={data.split.kind}/>
    </div></section>
    <section className="section"><div className="container">
      <SectionHeading eyebrow="قدم‌های مرتبط" title={page.slug==="/dashboard"?"در خدمت جریان کار مطب":"در مسیر برنامه تعیین‌شده توسط مطب"} center/>
      <ol className="workflow-grid solution-workflow">{data.workflow.map(step=><li key={step.title}>
        <Icon name={step.icon} size={28}/><h3>{step.title}</h3><p>{step.body}</p>
      </li>)}</ol>
      <p className="section-note">پایش مکمل مراقبت حضوری است. بررسی و تصمیم درمانی با ارتودنتیست است.</p>
    </div></section>
    {data.gallery && <section className="section wash"><div className="container">
      <SectionHeading eyebrow="نگاهی به تجربه کودک" title="همراهی، با قدم‌های ساده‌تر." body="این نماها، ماکاپ‌های مستقل و قابل جایگزینی هستند. جزئیات آموزش، یادآوری و تعامل خانواده پس از بازبینی تیم نهایی می‌شوند."/>
      <div className="solution-gallery">{data.gallery.map(item=><article key={item.id}>
        <SolutionVisual assetId={item.id} kind={item.kind}/><h3>{item.title}</h3><p>{item.body}</p>
      </article>)}</div>
    </div></section>}
    <section className="section"><div className="container">
      <SectionHeading eyebrow="راهکارهای ما" title="اجزای یک مسیر متصل"/>
      <SolutionLinks current={page.slug}/>
    </div></section>
    <CTA title={page.cta}/>
  </div>;
}
