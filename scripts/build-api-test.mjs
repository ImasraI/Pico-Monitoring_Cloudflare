// Small local Worker harness for testing the complete API without the marketing SSR bundle.
import ts from 'typescript';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
await mkdir('work/api-test', { recursive: true });
for (const name of ['route', 'rewards', 'file-storage', 'admin']) {
  const source = (await readFile(`app/api/${name}.ts`, 'utf8'))
    .replace('"./rewards"', '"./rewards.mjs"').replace('"./file-storage"', '"./file-storage.mjs"').replace('"./admin"', '"./admin.mjs"');
  await writeFile(`work/api-test/${name}.mjs`, ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
}
await writeFile('work/api-test/worker.mjs', `import { GET, POST } from './route.mjs';\nexport default { fetch: request => request.method === 'POST' ? POST(request) : GET(request) };\n`);
const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
await writeFile('work/api-test/wrangler.json', JSON.stringify({
  name: 'pico-local-api-test', main: 'worker.mjs', compatibility_date: config.compatibility_date,
  compatibility_flags: config.compatibility_flags,
  d1_databases: config.d1_databases.map(db => ({ ...db, migrations_dir: resolve('drizzle') })),
}));
console.log('Local API test harness built in work/api-test');
