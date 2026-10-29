import assert from 'node:assert/strict';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:22862';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Run against local preview only');
const response=await fetch(base+'/');assert.equal(response.status,200);
const html=await response.text();
assert.match(html,/data-home-version="2026-10-redesign"/);
assert.equal([...html.matchAll(/<h1\b/g)].length,1);
const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<[^>]*>/g,' ');
for(const title of ['پیگیری ارتودنسی از خانه؛','درمان ارتودنسی، فقط در مطب پیش نمی‌رود.','از خانه بیمار تا تصمیم ارتودنتیست','چهار راهکار، یک تجربه متصل','وقت شما، برای تصمیم‌های مهم‌تر است.','هوش مصنوعی، در خدمت پایش دقیق‌تر','راهکاری متناسب با شیوه‌های مختلف درمان','تجربه درمان شما، فراتر از زمان مراجعه حضوری','پشتوانه علمی پایش از راه دور ارتودنسی','پرسش‌های پرتکرار','پیگیری هوشمندتر را به مطب خود بیاورید.']) assert.ok(text.includes(title),title);
const productNames=[...html.matchAll(/<h3 dir="ltr">([^<]+)<\/h3>/g)].map(m=>m[1]);assert.deepEqual(productNames,['PM ScanBoxᴾʳᵒ','PM Dashboard','PM App','PM Kids']);
assert.doesNotMatch(text,/DANTO|DM App|PM Monitoring/);
assert.doesNotMatch(html,/href="#"/);
for(const m of html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)) assert.doesNotMatch(m[1].replace(/<[^>]*>/g,''),/^\s*[0-9۰-۹]{2}\s*[.ـ–—-]/);
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const links=[...new Set([...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))];
for(const href of links){if(href.startsWith('#'))assert.ok(ids.has(href.slice(1)),href);else if(href.startsWith('/'))assert.equal((await fetch(base+href)).status,200,href);}
for(const phone of ['tel:09130280459','tel:09934938300'])assert.ok(links.includes(phone));
const imageTags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
for(const tag of imageTags){assert.match(tag,/alt="[^"]+"/);assert.match(tag,/width="\d+"/);assert.match(tag,/height="\d+"/);}
const images=[...new Set(imageTags.map(tag=>tag.match(/src="([^"]+)"/)?.[1]).filter(Boolean))];
for(const src of images){const r=await fetch(base+src);assert.equal(r.status,200,src);assert.ok((await r.arrayBuffer()).byteLength>100,src);}
const faqSection=html.match(/<section class="section faq-section">([\s\S]*?)<\/section>/)?.[1];assert.ok(faqSection);assert.equal((faqSection.match(/<details\b/g)||[]).length,4);
console.log(`Homepage integration passed: 11 sections, 4 ordered products, 4 FAQs, ${links.length} link targets and ${images.length} images.`);
