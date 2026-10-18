import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.DANTO_TEST_URL || 'http://127.0.0.1:4173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local preview.');
const { features } = JSON.parse(await readFile(new URL('../components/marketing/content/pm-ai.json', import.meta.url), 'utf8'));
const assets = JSON.parse(await readFile(new URL('../components/marketing/content/assets.json', import.meta.url), 'utf8'));
const response = await fetch(base + '/pm-ai');
assert.equal(response.status, 200);
const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const cards = html.match(/<nav[^>]*aria-label="موضوعات PM AI"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(cards, 'The capability cards are a named navigation landmark.');
const targets = [...cards.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
assert.equal(targets.length, 5, 'Exactly five real anchor links.');
assert.equal(new Set(targets).size, 5);
assert.deepEqual(targets, features.map(feature => feature.id));
let totalBytes = 0;
for (const feature of features) {
  const section = html.match(new RegExp(`<section[^>]*id="${feature.id}"[^>]*>[\\s\\S]*?</section>`))?.[0];
  assert.ok(section, feature.id + ': explanation is rendered before any interaction.');
  assert.match(section, /tabindex="-1"/, 'Fragment destinations can receive keyboard focus.');
  assert.ok(section.replace(/<[^>]*>/g, '').includes(feature.title));
  assert.ok(section.includes(feature.body), feature.id + ': complete supplied paragraph.');
  assert.doesNotMatch(section, /<details\b|\shidden(?:\s|=|>)|aria-hidden="true"/);
  assert.doesNotMatch(feature.title, /^[0-9۰-۹]/);
  const asset = assets.find(item => item.id === feature.assetId);
  assert.ok(asset?.alt && asset.src && asset.ratio === '3:2');
  for (const src of [asset.src, asset.src.replace('.webp', '-card.webp')]) {
    const image = await fetch(base + src);
    assert.equal(image.status, 200, src);
    assert.match(image.headers.get('content-type'), /image\/webp/);
    const bytes = new Uint8Array(await image.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WEBP');
    totalBytes += bytes.length;
  }
}
assert.ok(totalBytes < 500_000, 'All responsive images together stay below 500 KB.');
assert.equal((html.match(/<img\b[^>]*src="\/assets\/pm-ai\//g) || []).length, 10);
assert.match(html, /این قابلیت پس از تکمیل ارزیابی‌ها به مجموعه قابلیت‌های Pico Monitoring اضافه خواهد شد/);
assert.match(html, /تجربه درمان برای همه بیماران یکسان نیست/);
assert.match(html, /توجه به نقش والدین/);
assert.doesNotMatch(html, /کارت‌ها باید از نظر اندازه|این مسترپرامپت|پرامپت تصویر کارت/);
assert.match(html, /تصمیم بالینی، همچنان با ارتودنتیست/);
assert.ok((await (await fetch(base + '/sitemap.xml')).text()).includes('/pm-ai'));
console.log(`PM AI verified: five accessible anchor cards, five complete SSR explanations, future capability wording, sitemap, and ten responsive WebP assets (${totalBytes} bytes).`);
