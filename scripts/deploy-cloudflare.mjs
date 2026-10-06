import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
const database = config.d1_databases.find(binding => binding.binding === 'DB');
if (!database || !/^[a-f0-9-]{36}$/i.test(database.database_id) || database.database_id === '00000000-0000-4000-8000-000000000000') throw new Error('Set the real D1 database UUID in wrangler.json.');
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
for (const args of [
  ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.json'],
  ['deploy', '--config', 'dist/server/wrangler.json'],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
