import type { Page } from "../content/types";
import { Hero, SectionHeading, ButtonLink } from "../components/Sections";
import { SolutionVisual } from "../components/SolutionVisual";

const principles = [
  {title:"محرمانگی اطلاعات درمان",body:"تصاویر و اطلاعات پرونده بیمار باید در چارچوب مراقبت و پیگیری درمان استفاده شوند. حفظ محرمانگی، بخشی از مسئولیت تیم PM و تیم درمان است."},
  {title:"دسترسی متناسب با نقش",body:"ارتودنتیست و اعضای مجاز تیم درمان، در چارچوب نقش خود با اطلاعات بیمار کار می‌کنند. جزئیات سطح دسترسی و مسئولیت هر نقش باید در راهنمای تأییدشده سامانه مشخص شود."},
  {title:"استفاده مسئولانه از تصاویر",body:"ثبت و ارسال تصاویر باید طبق آموزش مطب و برای هدف مشخص پایش انجام شود. استفاده‌های دیگر، از جمله آموزش یا پژوهش، نیازمند تعیین چارچوب و رضایت متناسب هستند."},
  {title:"همکاری تیم و خانواده",body:"اطلاعات دسترسی و تصاویر درمانی باید با دقت مدیریت شوند. در تجربه کودکان، نقش والدین یا سرپرست و نحوه مشارکت آن‌ها باید روشن و متناسب با شرایط بیمار باشد."},
];

export function PrivacyPage({ page }: { page: Page }) {
  return <div className="solution-page">
    <Hero page={page} contactLabel="گفت‌وگو با تیم PM" visual={<SolutionVisual assetId="PM-PRIVACY-CONCEPT-01" kind="privacy"/>} visualKicker="Pico Monitoring"/>
    <section className="section"><div className="container">
      <SectionHeading eyebrow="اصول کلی" title="مراقبت مسئولانه از اطلاعات، در مسیر درمان." body="این صفحه اصول کلی را توضیح می‌دهد. جزئیات فنی و حقوقی پس از بررسی و تأیید تیم مسئول تکمیل و منتشر می‌شوند."/>
      <div className="privacy-principles">{principles.map(p=><article key={p.title}><h3>{p.title}</h3><p>{p.body}</p></article>)}</div>
    </div></section>
    <section className="section wash"><div className="container split-grid">
      <div><SectionHeading eyebrow="وضعیت این صفحه" title="جزئیات، پس از بررسی تخصصی." body="این متن، سیاست حقوقی نهایی یا تأییدیه امنیتی نیست. ادعای انطباق یا مشخصات فنی تأییدنشده در این صفحه ارائه نمی‌شود."/></div>
      <div><p>محل و مدت نگهداری داده، روند حذف و دریافت اطلاعات، رضایت بیمار، دسترسی‌ها و تدابیر فنی باید در اسناد تأییدشده توضیح داده شوند. این بخش‌ها هنوز در این صفحه نهایی نشده‌اند.</p>
        <p>برای پرسش درباره اطلاعات درمانی و بررسی شرایط همکاری، با تیم PM تماس بگیرید.</p>
        <ButtonLink to="/contact">تماس با تیم PM</ButtonLink>
      </div>
    </div></section>
  </div>;
}
