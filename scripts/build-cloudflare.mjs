import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const result = spawnSync(process.execPath, ['scripts/run-framework.mjs', 'build'], {
  stdio: 'inherit', env: { ...process.env, DANTO_CLOUDFLARE_DEPLOY: '1' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
