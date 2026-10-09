import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base=process.env.DANTO_TEST_URL || "http://localhost:4173";
assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname), "Use a local preview.");
const read=async name=>JSON.parse(await readFile(new URL(`../components/marketing/content/${name}.json`,import.meta.url),"utf8"));
const pages=await read("pages"),articles=await read("articles"),assets=await read("assets");
const strip=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
const text=html=>html.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const expectedNav=["راهکارهای ما","برای شما","شواهد و پژوهش‌ها","امنیت و حریم خصوصی"];
const expectedSolutions=["/scanbox","/dashboard","/app","/kids"];
let checks=0;
for(const route of [...pages.map(p=>p.slug),...articles.map(a=>`/articles/${a.slug}`)]) {
  const response=await fetch(base+route); assert.equal(response.status,200,route);
  const html=strip(await response.text());
  assert.doesNotMatch(html, /href="\/(?:resources|articles)(?:[?#][^"]*)?"/,route+": removed index links");
  const visible=text(html).replaceAll("PM ScanBoxᴾʳᵒ","");
  assert.doesNotMatch(visible,/ScanBox|SCANBOX/i,route+": exact physical product name");
  assert.doesNotMatch(html,/class="[^"]*step-number/,route+": no decorative counters");
  const nav=html.match(/<nav[^>]*aria-label="ناوبری اصلی"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,route+": navigation");
  let last=-1;
  for(const label of expectedNav) { const next=nav.indexOf(label); assert.ok(next>last,route+": agreed right-to-left navigation"); last=next; }
  const desktopGroup=nav.match(/<div class="nav-dropdown">([\s\S]*?)<\/div>/)?.[1];
  const mobile=html.match(/<nav[^>]*aria-label="ناوبری موبایل"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  const footer=html.match(/<h2>راهکارهای ما<\/h2>([\s\S]*?)<\/div>/)?.[1];
  for(const [label,part] of [["desktop",desktopGroup],["mobile",mobile],["footer",footer]]) {
    assert.ok(part,route+":"+label);
    const links=[...part.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(links.slice(0,4),expectedSolutions,route+":"+label+" solutions order");
    if(label!=="mobile") assert.equal(links.length,4,route+": only four solutions");
  }
  for(const heading of html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/g)) {
    assert.doesNotMatch(text(heading[1]),/^[0-9۰-۹]{2}\s*[—–.-]/,route+": unnumbered heading");
  }
  checks+=15;
}
for(const [old,destination] of [["/resources","/privacy"],["/articles","/evidence"]]) {
  const response=await fetch(base+old,{redirect:"manual"});
  assert.equal(response.status,308,old+": permanent legacy redirect");
  assert.equal(new URL(response.headers.get("location"),base).pathname,destination);
}
const sitemap=await (await fetch(base+"/sitemap.xml")).text();
assert.doesNotMatch(sitemap,/<loc>[^<]*\/(resources|articles)<\/loc>/);
for(const route of ["/dashboard","/app","/kids","/privacy"]) {
  assert.ok(sitemap.includes(route));
  const html=strip(await (await fetch(base+route)).text());
  assert.match(html,/ماکاپ|تصویر مفهومی/);
  assert.match(html,/ارتودنتیست/);
}
const kids=text(strip(await (await fetch(base+"/kids")).text()));
assert.match(kids,/اپلیکیشن یا محصولی مستقل نیست/);
assert.match(kids,/اولیه و نیازمند بازبینی/);
const privacy=text(strip(await (await fetch(base+"/privacy")).text()));
assert.match(privacy,/جزئیات فنی و حقوقی پس از بررسی و تأیید/);
assert.match(privacy,/سیاست حقوقی نهایی یا تأییدیه امنیتی نیست/);
assert.doesNotMatch(privacy,/HIPAA|GDPR|۱۰۰٪|100%|AES/);
const app=text(strip(await (await fetch(base+"/app")).text()));
assert.doesNotMatch(app,/App Store|Google Play|دانلود از/);
for(const id of ["PM-KIDS-PREVIEW-01","PM-KIDS-AVATAR-01","PM-KIDS-GAME-01","PM-KIDS-REWARD-01","PM-KIDS-EDUCATION-01","PM-KIDS-FAMILY-01"]) {
  const asset=assets.find(a=>a.id===id);
  assert.ok(asset?.alt && asset.status && asset.ratio,id+": independent replaceable visual");
}
for(const file of ["hero","product","packaging","use-placeholder","components-placeholder","patient-placeholder"]) {
  const response=await fetch(`${base}/assets/scanbox/${file}.webp`);
  assert.equal(response.status,200,file); assert.ok((await response.arrayBuffer()).byteLength>0);
}
console.log(`Structure verified: ${checks} route checks; navigation, naming, legacy redirects, privacy copy, Kids scope and replaceable assets.`);
