// Trava de publicação: lista pendências do conteúdo e procura travessões.
//   npm run check            avisa (desenvolvimento)
//   npm run check -- --prod  falha se restar qualquer pendência (antes de publicar)
//   npm run check -- --sync  reescreve o bloco automático do interno/PENDENCIAS.md (se existir)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listPending } from './lib/content.mjs';

const PROD = process.argv.includes('--prod');
const SYNC = process.argv.includes('--sync');
let fail = false;

// 1. Pendências
const pend = listPending();
if (pend.length) {
  console.log(`${PROD ? '✖' : '!'} ${pend.length} pendência(s) em src/content.json:`);
  for (const p of pend) console.log(`   - ${p.descricao}  (${p.caminho})`);
  if (PROD) fail = true;
} else console.log('✔ Nenhuma pendência no conteúdo.');

// 2. Travessão (U+2014) e meia-risca (U+2013) em tudo que vira texto público ou documentação
const DASH = new RegExp('[' + String.fromCharCode(0x2014, 0x2013) + ']');
const SCAN = ['src', 'scripts', 'dist', 'docs', 'README.md'];
const SKIP = new Set(['node_modules', '.git', '.cache', 'referencia']);
const TEXT = /\.(html|css|js|mjs|json|md|txt|xml|webmanifest|htaccess)$|^\.htaccess$/;
const hits = [];
const walk = (p) => {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) if (!SKIP.has(f)) walk(path.join(p, f)); return; }
  if (!TEXT.test(path.basename(p))) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    if (DASH.test(line)) hits.push(`${path.relative(ROOT, p)}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
};
SCAN.forEach((s) => walk(path.join(ROOT, s)));
if (hits.length) { fail = true; console.log(`✖ ${hits.length} travessão(ões) encontrados:`); hits.forEach((h) => console.log('   ' + h)); }
else console.log('✔ Nenhum travessão.');

// 3. Placeholder vazando no HTML publicado
const distHtml = ['index.html', '404.html', 'politica-de-privacidade/index.html', 'llms.txt', 'llms-full.txt'].map((f) => path.join(ROOT, 'dist', f)).filter(fs.existsSync);
const leaks = distHtml.filter((f) => fs.readFileSync(f, 'utf8').includes('[[PENDENTE'));
if (leaks.length) { fail = true; console.log('✖ Marcador [[PENDENTE]] apareceu no site gerado: ' + leaks.map((f) => path.relative(ROOT, f)).join(', ')); }
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) console.log('! dist/ não existe ainda: rode npm run build para checar o site gerado.');

// 4. PENDENCIAS.md espelha o conteúdo (bloco automático)
// interno/ é o repositório privado de gestão (fora deste repositório público); sem ele, esta etapa é pulada
const PF = path.join(ROOT, 'interno', 'PENDENCIAS.md');
const start = '<!-- check:inicio -->';
const end = '<!-- check:fim -->';
const block = `${start}\n${pend.length ? pend.map((p) => `- [ ] ${p.descricao} (\`${p.caminho}\`)`).join('\n') : '- Nenhuma pendência no conteúdo.'}\n${end}`;
if (fs.existsSync(PF)) {
const md = fs.readFileSync(PF, 'utf8');
const current = md.includes(start) ? md.slice(md.indexOf(start), md.indexOf(end) + end.length) : '';
if (current !== block) {
  if (SYNC) {
    fs.writeFileSync(PF, current ? md.replace(current, block) : md.trimEnd() + `\n\n## No conteúdo do site (gerado por \`npm run check -- --sync\`)\n\n${block}\n`);
    console.log('✔ PENDENCIAS.md sincronizado.');
  } else console.log('! PENDENCIAS.md está diferente do conteúdo. Rode: npm run check -- --sync');
} else console.log('✔ PENDENCIAS.md espelha o conteúdo.');
}

if (fail) { console.log(PROD ? '\nBloqueado para publicação.' : '\nCorrija os itens marcados com ✖.'); process.exit(1); }
console.log(PROD ? '\nLiberado para publicação.' : '\nOk para desenvolvimento.');
