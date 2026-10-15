import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { readFile, writeFile, mkdir, unlink, rename } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export const dataDir = resolve(process.env.DATA_DIR || './data');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const sqlite = new DatabaseSync(resolve(dataDir, 'danto.sqlite'));
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
class Statement {
  constructor(query, values = []) { this.query = query; this.values = values; }
  bind(...values) { return new Statement(this.query, values); }
  first(column) { const row = sqlite.prepare(this.query).get(...this.values) ?? null; return Promise.resolve(column && row ? row[column] : row); }
  all() { return Promise.resolve({ success: true, results: sqlite.prepare(this.query).all(...this.values) }); }
  execute() { const result = sqlite.prepare(this.query).run(...this.values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) }, results: [] }; }
  run() { return Promise.resolve(this.execute()); }
}
const root = resolve(dataDir, 'files');
function filePath(key) {
  const path = resolve(root, key);
  if (!path.startsWith(root + sep)) throw new Error('Invalid object key');
  return path;
}
export const env = {
  DANTO_SETUP_KEY: process.env.DANTO_SETUP_KEY,
  DB: {
    prepare(query) { return new Statement(query); },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(s => s.execute()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  },
  BUCKET: {
    async put(key, stream) {
      const path = filePath(key), temporary = path + '.' + randomUUID() + '.tmp';
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      try { await writeFile(temporary, Buffer.from(await new Response(stream).arrayBuffer()), { mode: 0o600 }); await rename(temporary, path); }
      finally { await unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
    },
    async get(key) { try { return { body: new Uint8Array(await readFile(filePath(key))) }; } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
    async delete(key) { await unlink(filePath(key)).catch(e => { if (e.code !== 'ENOENT') throw e; }); },
  },
};
