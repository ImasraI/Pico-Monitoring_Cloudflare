import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.DANTO_TEST_URL || 'http://localhost:4173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local preview only');
const studies = JSON.parse(await readFile(new URL('../components/marketing/content/evidence.json', import.meta.url), 'utf8'));
assert.equal(new Set(studies.map(s => s.id)).size, studies.length, 'Stable unique study IDs');
const response = await fetch(base + '/evidence');
assert.equal(response.status, 200);
const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const cards = [...html.matchAll(/<article class="evidence-card"[^>]*>([\s\S]*?)<\/article>/g)].map(m => m[1]);
assert.equal(cards.length, studies.length, 'Every record is available in server-rendered content');
assert.ok(!html.includes('درخواست دمو'), 'All evidence-page contact labels changed, including shared chrome');
assert.ok(!html.includes('مطالعات خارجی، با منبع مشخص') && !html.includes('ارزیابی اختصاصی PM'));
assert.ok(html.includes('پژوهش‌های در حال انجام') && html.includes('پژوهش‌های Pico Monitoring'));
assert.ok(html.includes('فیلتر دسته‌بندی شواهد') && html.includes('aria-live="polite"'));
const required = ['category','evidenceType','titleFa','titleEn','summary','keyFinding','journal','year','authors','sourceType','sourceUrl','picoRelevance','image','imageAlt'];
for (const [i, study] of studies.entries()) {
  for (const field of required) assert.ok(Object.hasOwn(study, field), study.id + ': ' + field);
  for (const field of required.filter(f => !['image','imageAlt','year','authors'].includes(f))) assert.ok(study[field].trim().length, study.id + ': nonempty ' + field);
  assert.ok(Number.isInteger(study.year) && study.year <= 2026);
  assert.ok(study.authors.length && study.authors.every(a => a.trim().length));
  assert.ok(!JSON.stringify(study).includes('�'), 'No corrupt Unicode in scientific metadata');
  if (study.image) assert.ok(study.imageAlt.trim(), 'Future article images need alt text');
  const url = new URL(study.sourceUrl);
  assert.equal(url.protocol, 'https:');
  if (study.sourceType === 'PubMed') {
    assert.equal(url.hostname, 'pubmed.ncbi.nlm.nih.gov');
    assert.equal(study.id, 'pmid-' + url.pathname.replaceAll('/', ''));
  }
  const card = cards[i];
  const positions = ['study-tags', '<h3', 'study-original-title', 'study-summary', 'study-finding', 'study-bibliography', 'study-relevance', 'study-source'].map(s => card.indexOf(s));
  assert.ok(positions.every((p,j) => p >= 0 && (j === 0 || p > positions[j-1])), study.id + ': semantic content order');
  assert.ok(card.includes(study.sourceUrl) && card.includes('target="_blank"') && card.includes('rel="noopener noreferrer"'));
  assert.ok(card.includes(study.doi) && card.includes(study.year.toLocaleString('fa-IR', {useGrouping:false})));
}
const home = (await (await fetch(base + '/')).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
assert.ok(home.includes('درخواست دمو'), 'Shared contact override remains specific to evidence');
console.log('Evidence verified: ' + studies.length + ' records, source metadata, semantic order, SSR content, safe links and page-specific contact labels.');
