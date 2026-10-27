// Lighthouse mobile e desktop sobre o dist/ servido localmente, 3 execuções cada, mediana.
// Uso: npm run lighthouse            (local)
//      npm run lighthouse -- --url=https://koepseladvogados.com/   (URL publicada)
//      RUNS=5 npm run lighthouse
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { ROOT } from './lib/content.mjs';
import { startServer } from './serve.mjs';

const RUNS = Number(process.env.RUNS) || 3;
const argUrl = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const OUT = path.join(ROOT, 'relatorios', 'lighthouse');
fs.mkdirSync(OUT, { recursive: true });

let server;
let url = argUrl;
if (!url) {
  server = await startServer(4174);
  url = 'http://localhost:4174/';
  // aquece o cache de compressão do preview (a 1ª requisição comprime; as medidas não devem pagar isso)
  for (const enc of ['br', 'gzip']) await fetch(url, { headers: { 'accept-encoding': enc } }).then((r) => r.arrayBuffer());
}

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const summary = {};

for (const form of (process.env.FORMS || 'mobile,desktop').split(',')) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const opts = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATS };
    let r;
    // falha de gravação do trace (ex.: NO_NAVSTART) é do Lighthouse, não da página: repete até 2 vezes
    for (let t = 0; t < 3; t++) {
      r = await lighthouse(url, opts, form === 'desktop' ? desktopConfig : undefined);
      if (!r.lhr.runtimeError) break;
      console.warn(`${form} #${i + 1}: ${r.lhr.runtimeError.code}, repetindo`);
    }
    const lhr = r.lhr;
    if (lhr.runtimeError) { console.warn(`${form} #${i + 1}: ${lhr.runtimeError.code} nas 3 tentativas; fora da mediana`); continue; }
    fs.writeFileSync(path.join(OUT, `${form}-${i + 1}.json`), r.report);
    const a = lhr.audits;
    const failing = Object.values(a).filter((x) => x.score !== null && x.score < 1 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').map((x) => `${x.id}(${x.score})`);
    runs.push({
      scores: Object.fromEntries(CATS.map((c) => [c, Math.round(lhr.categories[c].score * 100)])),
      lcp: a['largest-contentful-paint'].numericValue,
      fcp: a['first-contentful-paint'].numericValue,
      cls: a["cumulative-layout-shift"].numericValue ?? 0,
      tbt: a['total-blocking-time'].numericValue,
      si: a['speed-index'].numericValue,
      bytes: a['total-byte-weight'].numericValue,
      lcpEl: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet,
      failing,
    });
    console.log(`${form} #${i + 1}:`, JSON.stringify(runs.at(-1).scores), `LCP ${Math.round(runs.at(-1).lcp)}ms CLS ${runs.at(-1).cls.toFixed(3)} TBT ${Math.round(runs.at(-1).tbt)}ms`, failing.length ? `| abaixo de 1: ${failing.join(', ')}` : '');
  }
  // mediana pela nota de performance (desempate por LCP)
  if (!runs.length) throw new Error(`Nenhuma execução válida em ${form}`);
  const sorted = [...runs].sort((x, y) => x.scores.performance - y.scores.performance || y.lcp - x.lcp);
  summary[form] = { median: sorted[Math.floor(sorted.length / 2)], runs };
}

await chrome.kill();
server?.close();
fs.writeFileSync(path.join(OUT, 'resumo.json'), JSON.stringify({ url, quando: new Date().toISOString(), runs: RUNS, ...summary }, null, 2));

console.log('\nMediana (' + RUNS + ' execuções):');
console.log('| Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Peso |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const [f, s] of Object.entries(summary)) {
  const m = s.median;
  console.log(`| ${f} | ${m.scores.performance} | ${m.scores.accessibility} | ${m.scores['best-practices']} | ${m.scores.seo} | ${(m.lcp / 1000).toFixed(2)} s | ${m.cls.toFixed(3)} | ${Math.round(m.tbt)} ms | ${(m.bytes / 1024).toFixed(0)} KB |`);
}
