import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../app/api/file-storage.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { d1Files } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const migration = await readFile(new URL('../drizzle/0005_free_file_storage.sql', import.meta.url), 'utf8');
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON;'); sqlite.exec(migration);
  const statement = (query, args = []) => ({
    bind(...values) { return statement(query, values.map(v => v instanceof ArrayBuffer ? new Uint8Array(v) : v)); },
    async first() { return sqlite.prepare(query).get(...args) ?? null; },
    async run() { return sqlite.prepare(query).run(...args); },
    execute() { return sqlite.prepare(query).run(...args); },
  });
  const db = { prepare: statement, async batch(items) {
    sqlite.exec('BEGIN');
    try { const result = items.map(s => s.execute()); sqlite.exec('COMMIT'); return result; }
    catch (e) { sqlite.exec('ROLLBACK'); throw e; }
  } };
  return { sqlite, files: d1Files(db) };
}
const stream = bytes => new Blob([bytes]).stream();
test('multi-chunk file roundtrip, private-key lookup, and cascade deletion', async () => {
  const { sqlite, files } = setup();
  try {
    const bytes = new Uint8Array(3_100_123); bytes.fill(137); bytes[bytes.length - 1] = 219;
    await files.put('patient/scan/file', stream(bytes));
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM stored_file_chunks').get().n, 3);
    assert.deepEqual(new Uint8Array(await new Response((await files.get('patient/scan/file')).body).arrayBuffer()), bytes);
    assert.equal(await files.get('other/file'), null);
    assert.equal(sqlite.prepare('SELECT used_bytes FROM file_storage_quota').get().used_bytes, bytes.length);
    await files.delete('patient/scan/file'); await files.delete('patient/scan/file');
    assert.equal(await files.get('patient/scan/file'), null);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM stored_file_chunks').get().n, 0);
    assert.equal(sqlite.prepare('SELECT used_bytes FROM file_storage_quota').get().used_bytes, 0);
  } finally { sqlite.close(); }
});
test('quota exhaustion rolls back the complete upload and reservations', async () => {
  const { sqlite, files } = setup();
  try {
    sqlite.exec('UPDATE file_storage_quota SET used_bytes=399000000');
    await assert.rejects(files.put('too-large-for-quota', stream(new Uint8Array(2_000_000))));
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM stored_files').get().n, 0);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM stored_file_chunks').get().n, 0);
    assert.equal(sqlite.prepare('SELECT used_bytes FROM file_storage_quota').get().used_bytes, 399000000);
  } finally { sqlite.close(); }
});
test('oversized and duplicate files cannot corrupt existing data', async () => {
  const { sqlite, files } = setup();
  try {
    await assert.rejects(files.put('large', stream(new Uint8Array(10_000_001))), /10 MB/);
    await files.put('existing', stream(new Uint8Array([1, 2, 3])));
    await assert.rejects(files.put('existing', stream(new Uint8Array([4, 5]))));
    assert.deepEqual(new Uint8Array(await new Response((await files.get('existing')).body).arrayBuffer()), new Uint8Array([1, 2, 3]));
    assert.equal(sqlite.prepare('SELECT used_bytes FROM file_storage_quota').get().used_bytes, 3);
  } finally { sqlite.close(); }
});
