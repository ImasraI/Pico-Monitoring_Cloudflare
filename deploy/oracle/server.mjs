import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { sqlite } from './runtime.mjs';
import { GET, POST } from './route.mjs';

sqlite.exec('CREATE TABLE IF NOT EXISTS _oracle_migrations (name TEXT PRIMARY KEY)');
for (const name of (await readdir(new URL('./migrations/', import.meta.url))).filter(n => n.endsWith('.sql')).sort()) {
  if (sqlite.prepare('SELECT name FROM _oracle_migrations WHERE name=?').get(name)) continue;
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    sqlite.exec(await readFile(new URL('./migrations/' + name, import.meta.url), 'utf8'));
    sqlite.prepare('INSERT INTO _oracle_migrations VALUES (?)').run(name);
    sqlite.exec('COMMIT');
  } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
}
if (process.argv.includes('--migrate-only')) { sqlite.close(); process.exit(0); }
const local = process.env.LOCAL_TEST === '1';
if (!local && (!process.env.PROXY_SECRET || process.env.PROXY_SECRET.length < 32 || !process.env.PUBLIC_ORIGIN?.startsWith('https://'))) throw new Error('Set PROXY_SECRET (32+ characters) and HTTPS PUBLIC_ORIGIN');
function authenticated(value) {
  const a = Buffer.from(value || ''), b = Buffer.from(process.env.PROXY_SECRET || '');
  return a.length === b.length && timingSafeEqual(a, b);
}
let active = 0;
const server = createServer(async (req, res) => {
  res.setHeader('X-Pico-Backend', 'oracle');
  if (active >= 8) { res.writeHead(503, { 'Retry-After': '5' }); res.end('Busy; retry shortly'); return; }
  active++;
  try {
    if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('{"ok":true}'); return; }
    if (!local && !authenticated(req.headers['x-danto-proxy-secret'])) { res.writeHead(403); res.end('Forbidden'); return; }
    const origin = local ? `http://127.0.0.1:${process.env.PORT || 3000}` : process.env.PUBLIC_ORIGIN;
    const url = new URL(req.url, origin);
    if (url.pathname !== '/api') {
      if (local && ['GET', 'HEAD'].includes(req.method)) {
        const root = resolve('dist/frontend');
        const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (path.startsWith(root + sep)) {
          try {
            const file = await readFile(path);
            const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
            res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            res.end(req.method === 'HEAD' ? undefined : file); return;
          } catch (e) { if (!['ENOENT', 'EISDIR'].includes(e.code)) throw e; }
        }
      }
      res.writeHead(404); res.end('Not found'); return;
    }
    if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, POST' }); res.end(); return; }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value !== undefined && !['host','x-danto-proxy-secret'].includes(key)) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 31_000_000) { res.writeHead(413); res.end('Request too large'); return; }
      chunks.push(chunk);
    }
    const request = new Request(url, { method: req.method, headers, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
    const response = await (req.method === 'GET' ? GET(request) : POST(request));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); if (!res.headersSent) res.writeHead(500); res.end('Internal server error'); }
  finally { active--; }
});
server.requestTimeout = 60_000;
server.headersTimeout = 15_000;
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Oracle API listening on loopback'));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { sqlite.close(); process.exit(0); }));
