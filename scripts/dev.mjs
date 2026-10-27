// Desenvolvimento: build + preview + rebuild automático ao salvar (src/, scripts/, assets-origem/).
// Recarregue o navegador depois de salvar; não há live reload de propósito (zero JS extra na página).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/content.mjs';

const build = () => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], { stdio: 'inherit', cwd: ROOT }).status === 0;

if (!build()) process.exit(1);
const { startServer } = await import('./serve.mjs');
const server = await startServer();
console.log(`\nPreview em http://localhost:${server.address().port} (Ctrl+C para sair)\n`);

let timer;
for (const dir of ['src', 'scripts', 'assets-origem']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => { console.log(`\nAlterado: ${dir}/${file}. Gerando de novo...`); build(); }, 150);
  });
}
