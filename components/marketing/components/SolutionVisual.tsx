import { useEffect, useRef, useState } from "react";
import { assets } from "../content";
import { Icon } from "./Icon";
import "../styles/solutions.css";

export type MockupKind = "dashboard" | "review" | "app" | "guidance" | "kids" | "avatar" | "game" | "reward" | "education" | "family" | "privacy";

function AvatarArt() {
  return (
    <svg viewBox="0 0 180 160" className="kids-avatar-art" aria-hidden="true">
      <circle cx="90" cy="80" r="70" fill="#dceee8" />
      <path d="M45 140c4-26 21-40 45-40s41 14 45 40" fill="#00747b" />
      <ellipse cx="90" cy="72" rx="35" ry="40" fill="#f0e5d4" />
      <path d="M55 67c-9-43 74-58 72 5-6-9-13-22-15-28-13 17-28 20-57 23" fill="#173e47" />
      <circle cx="78" cy="76" r="3" fill="#173e47" /><circle cx="103" cy="76" r="3" fill="#173e47" />
      <path d="M81 90q10 8 20 0" fill="none" stroke="#173e47" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ActivityPath() {
  return <div className="mock-activity-path">{["آماده‌سازی", "ثبت تصویر", "ارسال", "بررسی پزشک"].map((label,i)=>
    <div key={label}><span className={i<2?"done":""}><Icon name={i<2?"check":i===2?"camera":"eye"} size={20}/></span><small>{label}</small></div>
  )}</div>;
}

function DashboardMock({ review = false }: { review?: boolean }) {
  return (
    <div className="mock-dashboard" aria-hidden="true">
      <aside><b dir="ltr">PM</b><span>بیماران</span><span>پیگیری‌ها</span><span>پیام‌ها</span></aside>
      <div className="mock-dashboard-content">
        <div className="mock-toolbar"><strong>{review?"مرور پرونده نمونه":"نمای کلی بیماران"}</strong><Icon name="eye" size={20}/></div>
        {review ? <>
          <div className="mock-review-images">{["روبه‌رو","راست","چپ"].map(label=><div key={label}><Icon name="braces" size={54}/><small>{label}</small></div>)}</div>
          <div className="mock-timeline"><span>ثبت تصویر</span><span>مرور پزشک</span><span>راهنمایی بیمار</span></div>
          <div className="mock-message"><Icon name="message" size={22}/><span>قدم بعدی، طبق نظر ارتودنتیست</span></div>
        </> : <>
          <div className="mock-overview"><span>تصاویر دریافت‌شده</span><span>نیازمند مرور تیم</span><span>پیگیری برنامه‌ریزی‌شده</span></div>
          <div className="mock-patient-list">{["الف","ب","پ"].map((name,i)=><div key={name}><span className="mock-patient-avatar">{name}</span><strong>پرونده نمونه {name}</strong><small>{["برای بررسی پزشک","منتظر ثبت تصویر","پیام تیم درمان"][i]}</small></div>)}</div>
          <div className="mock-message"><Icon name="calendar" size={22}/><span>تصویر، برنامه و پیگیری در کنار هم</span></div>
        </>}
      </div>
    </div>
  );
}

function PhoneMock({ kind }: { kind: "app" | "guidance" | "kids" }) {
  return (
    <div className="mock-phone-stage" aria-hidden="true">
      <div className="mock-phone">
        <div className="mock-phone-speaker" />
        <div className="mock-phone-top"><b dir="ltr">{kind==="kids"?"PM Kids":"PM App"}</b><Icon name="message" size={18}/></div>
        {kind==="kids" ? <><AvatarArt/><strong>هر قدم، یک همراهی</strong><ActivityPath/><div className="mock-message">آماده برای قدم بعدی، با کمک خانواده</div></> :
          kind==="guidance" ? <><div className="mock-training"><Icon name="book" size={56}/><strong>راهنمای ثبت تصویر</strong><span>آماده‌سازی · نور مناسب · برنامه مطب</span></div><div className="mock-message"><Icon name="message" size={20}/><span>پیام و راهنمایی تیم درمان</span></div><ActivityPath/></> :
          <><div className="mock-capture"><Icon name="braces" size={82}/><span>نمای مورد نیاز برای پایش</span></div><strong>تصاویر را طبق برنامه ثبت کنید</strong><ActivityPath/><span className="mock-action">مسیر ثبت تصویر</span></>}
        <div className="mock-phone-bottom"><Icon name="phone" size={18}/><Icon name="calendar" size={18}/><Icon name="message" size={18}/></div>
      </div>
      <div className="mock-floating-note"><Icon name={kind==="kids"?"check":"calendar"} size={22}/><span>{kind==="kids"?"همراهی خانواده":"برنامه تعیین‌شده توسط مطب"}</span></div>
    </div>
  );
}

function KidsDetail({ kind }: { kind: MockupKind }) {
  if(kind==="avatar") return <div className="kids-detail" aria-hidden="true"><AvatarArt/><strong>آواتار، همراه مسیر</strong><div className="mock-swatches"><i/><i/><i/></div></div>;
  if(kind==="game") return <div className="kids-detail" aria-hidden="true"><Icon name="target" size={48}/><strong>قدم‌ها را بشناسیم</strong><ActivityPath/><span className="mock-action">فعالیت بعدی، طبق برنامه پزشک</span></div>;
  if(kind==="reward") return <div className="kids-detail" aria-hidden="true"><div className="mock-reward-badge"><Icon name="check" size={52}/></div><strong>همکاری منظم، قابل تقدیر است</strong><p>پاداش برای همراهی؛ نه نتیجه درمان</p></div>;
  if(kind==="education") return <div className="kids-detail" aria-hidden="true"><Icon name="book" size={54}/><strong>برای ثبت تصویر آماده شویم</strong><div className="mock-learning-cards"><span><Icon name="phone"/>تلفن</span><span><Icon name="camera"/>تصویر</span><span><Icon name="message"/>راهنمایی</span></div></div>;
  return <div className="kids-detail" aria-hidden="true"><div className="mock-family"><AvatarArt/><AvatarArt/></div><strong>کودک و خانواده، در یک مسیر</strong><span>آموزش را با هم مرور کنیم</span></div>;
}

export function SolutionVisual({ assetId, kind }: { assetId: string; kind: MockupKind }) {
  const asset = assets.find(a=>a.id===assetId);
  const ratio = asset?.ratio.replace(":", "/") || "5/4";
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const outer = frame.current, inner = stage.current;
    if (!outer || !inner) return;
    const fit = () => {
      const style = getComputedStyle(outer);
      const width = outer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = outer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setScale(Math.min(1, width / inner.offsetWidth, height / inner.offsetHeight));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer); observer.observe(inner); fit();
    return () => observer.disconnect();
  }, [asset?.src, kind]);
  return (
    <figure className={`solution-visual solution-visual-${kind}`} aria-label={asset?.alt}>
      <div ref={frame} className="solution-visual-frame" style={{aspectRatio:ratio}}>
        {asset?.src ? <img src={asset.src} alt={asset.alt} width="1200" height={asset.ratio==="4:3"?"900":asset.ratio==="16:10"?"750":"960"} loading="lazy" decoding="async" /> :
          <div ref={stage} className="solution-visual-stage" style={{transform:`scale(${scale})`}}>
          {kind==="dashboard" || kind==="review" ? <DashboardMock review={kind==="review"}/> :
          kind==="app" || kind==="guidance" || kind==="kids" ? <PhoneMock kind={kind}/> :
          kind==="privacy" ? <div className="mock-privacy" aria-hidden="true"><Icon name="lock" size={70}/><div><Icon name="research" size={38}/><Icon name="eye" size={38}/><Icon name="message" size={38}/></div><span>اطلاعات درمان · دسترسی مسئولانه · محرمانگی</span></div> :
          <KidsDetail kind={kind}/>}</div>}
      </div>
      <figcaption>{asset?.src ? "تصویر ارائه‌شده برای معرفی؛ اطلاعات و دسترسی واقعی در محیط سامانه بررسی می‌شود." :
        kind==="privacy" ? "تصویر مفهومی؛ این تصویر نشان‌دهنده استاندارد یا تأییدیه امنیتی نیست." :
        "ماکاپ موقت؛ رابط و داده‌ها نمایشی‌اند و تصویر واقعی محصول نیست."}</figcaption>
    </figure>
  );
}
