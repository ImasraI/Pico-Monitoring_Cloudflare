import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.DANTO_TEST_URL || 'http://127.0.0.1:4173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run against a local preview only.');
const readContent = async name => JSON.parse(await readFile(new URL(`../components/marketing/content/${name}.json`, import.meta.url), 'utf8'));
const pages = await readContent('pages');
const articles = await readContent('articles');
const routes = [...pages.map(p => ({path: p.slug, title: p.metaTitle})), ...articles.map(a => ({path: `/articles/${a.slug}`, title: a.seo.title}))];
const known = new Set([...routes.map(r => r.path), '/danto.html']);
const rendered = new Map();
const links = [];
const origin = 'https://picomonitoring.ir';
let checks = 0;
for (const route of routes) {
  const response = await fetch(base + route.path);
  assert.equal(response.status, 200, route.path);
  const raw = await response.text();
  const html = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(html, /<html[^>]*lang="fa"[^>]*dir="rtl"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, route.path + ': one main heading');
  assert.ok(html.includes(`<title>${route.title}</title>`), route.path + ': server title');
  assert.match(html, /<meta[^>]*name="description"[^>]*content="[^"]+"/);
  assert.ok(html.includes(origin + route.path), route.path + ': canonical URL');
  assert.ok(html.includes(origin + '/assets/social.jpg'), route.path + ': sharing image');
  assert.ok(!html.includes('ورود به سامانه در حال آماده'), route.path + ': login enabled');
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m => m[1].replaceAll('&amp;', '&'));
  assert.ok(anchors.includes('/danto.html'), route.path + ': dashboard login');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, route.path + ': unique IDs');
  rendered.set(route.path, new Set(ids));
  for (const href of anchors) if (!/^(?:https?:|tel:|mailto:)/.test(href)) links.push({ from: route.path, href });
  const json = [...raw.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.ok(json.some(d => d['@type'] === (route.path === '/faq' ? 'FAQPage' : route.path.startsWith('/articles/') ? 'Article' : 'Organization')), route.path + ': structured data');
  checks += 11;
}
for (const {from, href} of links) {
  const target = new URL(href, base + from);
  assert.ok(known.has(target.pathname), `${from}: unknown destination ${href}`);
  if (target.hash) assert.ok(rendered.get(target.pathname)?.has(decodeURIComponent(target.hash.slice(1))), `${from}: missing anchor ${href}`);
  checks++;
}
const sitemap = await (await fetch(base + '/sitemap.xml')).text();
for (const {path} of routes) assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`), path + ': sitemap');
assert.ok(!sitemap.includes('/danto.html') && !sitemap.includes('/api'));
const robots = await (await fetch(base + '/robots.txt')).text();
assert.ok(robots.includes('Disallow: /api') && robots.includes('Disallow: /danto.html') && robots.includes(origin + '/sitemap.xml'));
const missing = await fetch(base + '/missing-public-page');
assert.equal(missing.status, 404);
const missingHtml = await missing.text();
assert.ok(missingHtml.includes('این صفحه پیدا نشد') && missingHtml.includes('noindex'));
for (const path of ['/danto.html', '/fonts/vazirmatn-arabic.woff2', '/fonts/vazirmatn-latin.woff2', '/fonts/vazirmatn-latin-ext.woff2', '/assets/social.jpg', '/assets/favicon.svg']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.arrayBuffer()).byteLength > 0, path);
  checks++;
}
console.log(`Public website verified: ${routes.length} routes, ${checks} checks; SSR, links, metadata, sitemap, 404, assets and active dashboard entry.`);
