import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.DANTO_TEST_URL||'http://127.0.0.1:4176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const copy=JSON.parse(await readFile(new URL('../components/marketing/content/audiences.json',import.meta.url),'utf8'));
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
for(const [key,path] of [['orthodontists','/orthodontists'],['patients','/patients']]){
 const r=await fetch(base+path);assert.equal(r.status,200);const html=await r.text();const text=strip(html);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 for(const b of copy[key])for(const item of b.items)assert.ok(text.includes(item.text.replace(/\s+/g,' ')),item.text);
 assert.ok(!html.includes('href="/clinics"'));assert.ok(html.includes('تجربه درمان شما'));
 assert.ok(html.includes(path==='/patients'?'href="/find-orthodontist"':'href="/contact"'));
 assert.ok(!html.includes('PM Monitoring'));
}
const r=await fetch(base+'/find-orthodontist');assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('فهرست تأییدشده هنوز منتشر نشده است.'));assert.ok(html.includes('href="/contact"'));
assert.equal((await fetch(base+'/assets/audiences/placeholder-connected-care.webp')).status,200);
console.log('Audience content, routes, CTA destinations, navigation, empty directory and illustration verified.');
