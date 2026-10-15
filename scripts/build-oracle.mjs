import ts from 'typescript';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
await mkdir('dist/oracle', { recursive: true });
for (const name of ['route', 'rewards', 'admin', 'mobile', 'file-storage']) {
  const source = (await readFile(`app/api/${name}.ts`, 'utf8'))
    .replace('"cloudflare:workers"', '"./runtime.mjs"')
    .replace(/"\.\/(rewards|admin|mobile|file-storage)"/g, '"./$1.mjs"');
  await writeFile(`dist/oracle/${name}.mjs`, ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
}
await cp('deploy/oracle/runtime.mjs', 'dist/oracle/runtime.mjs');
await cp('deploy/oracle/server.mjs', 'dist/oracle/server.mjs');
await cp('drizzle', 'dist/oracle/migrations', { recursive: true });
await mkdir('dist/frontend', { recursive: true });
await cp('public', 'dist/frontend', { recursive: true });
await cp('public/danto.html', 'dist/frontend/index.html');
console.log('Built dist/oracle and dist/frontend');
