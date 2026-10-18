import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.DANTO_TEST_URL || 'http://127.0.0.1:4173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local preview.');
const copy = JSON.parse(await readFile(new URL('../components/marketing/content/privacy.json', import.meta.url), 'utf8'));
const assets = JSON.parse(await readFile(new URL('../components/marketing/content/assets.json', import.meta.url), 'utf8'));
const response = await fetch(base + '/privacy');
assert.equal(response.status, 200);
const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const text = html.replace(/<br\s*\/?\s*>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const main = html.match(/<main[^>]*>[\s\S]*?<\/main>/)?.[0];
assert.ok(main);
const strings = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : Object.entries(value).filter(([key]) => !['icon', 'assetId'].includes(key)).flatMap(([, value]) => strings(value));
for (const content of strings(copy)) assert.ok(text.includes(content), 'Approved copy: ' + content.slice(0, 50));
assert.equal((main.match(/<h1\b/g) || []).length, 1);
assert.equal((main.match(/<h2\b/g) || []).length, 8);
for (const heading of main.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/g)) {
  assert.doesNotMatch(heading[1].replace(/<[^>]*>/g, '').trim(), /^[0-9۰-۹]/);
}
assert.equal((main.match(/<ul\b/g) || []).length, 2, 'Two open editorial grids.');
assert.equal((main.match(/<ol\b/g) || []).length, 2, 'Two semantic treatment-data timelines.');
for (const type of ['use', 'retention']) {
  const list = main.match(new RegExp(`<ol[^>]*class="[^"]*privacy-${type}-path[^>]*>[\\s\\S]*?</ol>`))?.[0];
  assert.ok(list, type + ': distinct timeline class.');
  assert.equal((list.match(/<li\b/g) || []).length, 3);
}
assert.match(main, /پایان استفاده از حساب کاربری لزوماً به معنای حذف فوری تمام سوابق درمانی نیست/);
assert.match(main, /پس از تأمین رضایت‌ها یا مجوزهای لازم/);
assert.match(main, /در صورت جمع‌آوری/);
assert.doesNotMatch(main, /حقوق شما درباره اطلاعاتتان|HIPAA|GDPR|AES|ISO\s*27001|۱۰۰٪|100%|ناشناس‌سازی خودکار/);
assert.doesNotMatch(main, /Master Prompt|طراحی:|مرحله اول:|متن تکمیلی:|این بخش را/);
assert.match(main, /href="\/contact"/);
assert.match(main, /href="\/scanbox"/);
assert.equal((main.match(/<img\b/g) || []).length, 4);
let total = 0;
for (const asset of assets.filter(item => /^PM-PRIVACY-(HERO|PROCESSING|FAMILY|LIFECYCLE)-01$/.test(item.id))) {
  assert.ok(asset.alt && asset.ratio);
  for (const path of [asset.src, asset.src.replace('.webp', '-small.webp')]) {
    const image = await fetch(base + path);
    assert.equal(image.status, 200, path);
    assert.match(image.headers.get('content-type'), /image\/webp/);
    const bytes = new Uint8Array(await image.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WEBP');
    total += bytes.length;
  }
}
assert.ok(total > 0 && total < 450_000, 'Keep conceptual imagery lightweight.');
console.log(`Privacy verified: approved copy, eight sections, open grids, two three-step timelines, no unapproved technical guarantees, existing contact links and four responsive illustrations (${total} bytes).`);
