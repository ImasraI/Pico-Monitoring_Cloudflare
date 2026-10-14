import { useState } from "react";
import copy from "../content/audiences.json";
import directory from "../content/specialists.json";
import { ButtonLink } from "../components/Sections";
import { Visual } from "../components/Visual";
import { solutions } from "../content/navigation";
import { config } from "../config";
import { Link } from "../navigation";

type Item = { kind: string; text: string };
type Block = { items: Item[]; cta: string | null };
const productLink = (text: string) => solutions.find(s => text.includes(s.label))?.to;
function Content({ items }: { items: Item[] }) {
 return <>{items.map((item,i) => item.kind === "link" ? <Link key={i} className="text-link" to={productLink(item.text) || "/contact"}>{item.text}</Link> : item.kind === "heading" ? <h3 key={i}>{item.text}</h3> : <p key={i}>{item.text}</p>)}</>;
}
export function AudiencePage({ patient }: { patient: boolean }) {
 const blocks: Block[] = patient ? copy.patients : copy.orthodontists;
 const hero=blocks[0];
 const target=patient?"/find-orthodontist":"/contact";
 return <div className="audience-page"><section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">{hero.items[0].text}</span><h1>{hero.items[1].text}</h1>{hero.items.slice(2).map((item,i)=><p key={i}>{item.text}</p>)}<ButtonLink to={target}>{hero.cta}</ButtonLink></div><figure className="audience-hero-image"><img src="/assets/audiences/placeholder-connected-care.webp" width="1536" height="1024" alt={patient?"تصویرسازی مفهومی همراهی بیمار و خانواده با پزشک در پایش از راه دور":"تصویرسازی مفهومی ارتباط ارتودنتیست با بیمار در فاصله بین مراجعات"}/><figcaption>تصویرسازی موقت و مفهومی؛ عکس واقعی محصول یا افراد نیست.</figcaption></figure></div></section>
 {blocks.slice(1).map((block,index)=>{
  const faq=block.items[0]?.text==='پرسش‌های رایج';
  const toolSection=block.items.some(x=>x.kind==='link');
  const groups: Item[][]=[]; let current:Item[]=[];
  for(const item of block.items.slice(1)){if(item.kind==='heading'&&current.length){groups.push(current);current=[];}current.push(item);}if(current.length)groups.push(current);
  return <section key={index} className={`section ${index%2===0?'wash':''}`}><div className="container"><div className="section-heading" data-reveal><h2>{block.items[0]?.text}</h2></div>
   {faq?<div className="audience-faq">{groups.map((g,i)=><details key={i}><summary>{g[0].text}</summary><Content items={g.slice(1)}/></details>)}</div>:
   toolSection?<div className="audience-products">{groups.map((g,i)=><article key={i} className="audience-card" data-reveal><Content items={g}/></article>)}</div>:
   <div className={index===0?'audience-benefits':'audience-editorial'}>{groups.map((g,i)=><article key={i} data-reveal><Content items={g}/></article>)}</div>}
   {!faq&&!toolSection&&index===1&&<div className="audience-concept"><Visual assetId={patient?'PM-PATIENT-UI-01':'PM-DASHBOARD-PREVIEW-01'}/></div>}
   {block.cta&&<div className="audience-action"><ButtonLink to={target}>{block.cta}</ButtonLink></div>}
  </div></section>;
 })}</div>;
}
type Specialist={id:string;name:string;city:string;specialty:string;contactUrl:string;image?:string};
export function SpecialistDirectory(){
 const records=directory as Specialist[];
 const [city,setCity]=useState('');
 const cities=[...new Set(records.map(r=>r.city))].sort((a,b)=>a.localeCompare(b,'fa'));
 const filtered=records.filter(r=>!city||r.city===city);
 return <div className="audience-page"><section className="hero simple-hero"><div className="container"><span className="eyebrow">انتخاب آگاهانه‌تر</span><h1>ارتودنتیست‌های همکار در شهر شما</h1><p>تخصص، تجربه و تناسب برنامه درمان با نیاز شما را بررسی کنید. معرفی در این فهرست، تضمین نتیجه درمان نیست.</p><label className="directory-filter">شهر<select value={city} onChange={e=>setCity(e.target.value)}><option value="">همه شهرها</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label></div></section><section className="section"><div className="container" aria-live="polite">{filtered.length?<div className="audience-products">{filtered.map(r=><article className="audience-card" key={r.id}>{r.image&&<img src={r.image} alt={r.name} width="160" height="160" loading="lazy"/>}<h2>{r.name}</h2><p>{r.specialty} · {r.city}</p><a className="text-link" href={r.contactUrl}>اطلاعات تماس</a></article>)}</div>:<div className="audience-empty"><h2>فهرست تأییدشده هنوز منتشر نشده است.</h2><p>برای اطلاع از ارتودنتیست‌های همکار در شهر خود با تیم پیکو مانیتورینگ تماس بگیرید. اطلاعات افراد بدون تأیید منتشر نمی‌شود.</p><ButtonLink to="/contact">تماس با پیکو مانیتورینگ</ButtonLink><p>{config.phones.map(phone=><a key={phone} href={`tel:${phone}`} dir="ltr">{phone} </a>)}</p></div>}</div></section></div>;
}
