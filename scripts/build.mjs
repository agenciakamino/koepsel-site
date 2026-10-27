// Build estático: src/ + assets-origem/ -> dist/ (HTML, CSS inline, JS, imagens, fontes, SEO, .htaccess).
// Uso: npm run build   (variáveis opcionais: SITE_URL, GTM_ID, GA4_ID)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import * as esbuild from 'esbuild';
import { ROOT, loadContent, listPending } from './lib/content.mjs';
import { responsive, icons, findSource } from './lib/images.mjs';
import { buildFonts } from './lib/fonts.mjs';
import { homePage, privacyPage, notFoundPage } from './lib/html.mjs';
import { jsonld, robots, sitemap, manifest, llms, llmsFull } from './lib/seo.mjs';
import { securityHeaders, htaccess } from './lib/headers.mjs';

const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');
const t0 = Date.now();
const sha256 = (s) => 'sha256-' + crypto.createHash('sha256').update(s).digest('base64');
const short = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
// Prévia no GitHub Pages: o site mora numa subpasta (ex.: /koepsel-site). BASE_PATH reescreve os caminhos
// iniciados em "/" e liga o modo prévia (noindex, robots bloqueando tudo, sem .htaccess).
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const PREVIEW = Boolean(BASE);
const rebase = (txt) => !BASE ? txt : txt
  .replace(/(["'(,\s])\/(assets\/|favicon|apple-touch-icon|manifest\.webmanifest|llms|politica-de-privacidade|404\.html|#)/g, `$1${BASE}/$2`)
  .replace(/(href=)(["'])\/\2/g, `$1$2${BASE}/$2`);
const rebaseManifest = (txt) => !BASE ? txt : txt.replace(/"(start_url|scope|src)":\s*"\//g, `"$1": "${BASE}/`);
const write = (rel, data) => {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (typeof data === 'string' && /\.(html|webmanifest)$/.test(rel)) data = rel.endsWith('.html') ? rebase(data) : rebaseManifest(data);
  fs.writeFileSync(p, data);
};

const c = loadContent();
const siteUrl = (process.env.SITE_URL || c.site.url).replace(/\/$/, '');
const abs = (p) => siteUrl + p;
const host = new URL(siteUrl).host;
const GTM_ID = (process.env.GTM_ID || '').trim();
const GA4_ID = (process.env.GA4_ID || '').trim();
const analyticsOn = Boolean(GTM_ID || GA4_ID);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(ASSETS, { recursive: true });

// 1. Imagens
const imgDir = path.join(ASSETS, 'img');
const img = {
  team: await responsive('team', { widths: [480, 720, 960, 1184, 1600, 2400], formats: ['avif', 'webp'], outDir: imgDir, quality: { avif: 60, webp: 80 } }),
  duo: await responsive('duo', { widths: [560, 962, 1400], formats: ['avif', 'webp'], outDir: imgDir }),
  and: await responsive('and', { widths: [436, 800, 1200], formats: ['avif', 'webp'], outDir: imgDir }),
  lir: await responsive('lir', { widths: [436, 800, 1200], formats: ['avif', 'webp'], outDir: imgDir }),
  symw: await responsive('symw', { widths: [560], formats: ['webp'], outDir: imgDir }),
  logow: await logo('logow'),
};
const ico = await icons({ outDir: imgDir, publicDir: DIST, bg: '#F7F4EE', fg: c.site.corTema });

async function logo(name) {
  const src = findSource(name);
  if (src.endsWith('.svg')) {
    // vetor disponível: otimiza com SVGO (se instalado) e usa direto
    let svg = fs.readFileSync(src, 'utf8');
    try { const { optimize } = await import('svgo'); svg = optimize(svg, { multipass: true }).data; } catch { /* svgo opcional */ }
    const m = svg.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
    const file = `${name}.${short(svg)}.svg`;
    fs.mkdirSync(imgDir, { recursive: true });
    fs.writeFileSync(path.join(imgDir, file), svg);
    return { svg: file, width: m ? +m[1] : 560, height: m ? +m[2] : 135 };
  }
  return responsive(name, { widths: [160, 280, 340], formats: ['webp'], outDir: imgDir, fallback: 'png' });
}

// 2. Fontes
const fonts = buildFonts(path.join(ASSETS, 'fonts'));

// 3. CSS (inline: evita requisição bloqueante; um único bloco para todas as páginas)
const cssSrc = fonts.css + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'styles', 'site.css'), 'utf8');
const minCss = async (src) => (await esbuild.transform(src, { loader: 'css', minify: true, target: ['chrome111', 'firefox115', 'safari16.4'] })).code.trim();
const css = await minCss(cssSrc);
// política e 404 levam também o pages.css; a home fica sem ele (o HTML dela precisa caber na 1ª janela do TCP)
const cssPages = await minCss(cssSrc + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'styles', 'pages.css'), 'utf8'));

// 4. JS
const jsOut = await esbuild.build({ entryPoints: [path.join(ROOT, 'src', 'js', 'main.js')], bundle: true, minify: true, format: 'esm', target: ['es2020'], write: false, legalComments: 'none' });
const js = jsOut.outputFiles[0].text;
const jsName = `main.${short(js)}.js`;
write(`assets/js/${jsName}`, js);

// .js sempre; .motion salvo se o visitante desligou as animações no botão do rodapé (antes da primeira pintura)
const inlineScript = "(function(d){d.classList.add('js');var on=true;try{on=localStorage.getItem('koepsel-animacoes')!=='off'}catch(e){}if(on)d.classList.add('motion')})(document.documentElement)";
const statusOut = await esbuild.build({ entryPoints: [path.join(ROOT, 'src', 'js', 'status-inline.js')], bundle: true, minify: true, format: 'iife', target: ['es2020'], write: false, legalComments: 'none' });
const statusInline = statusOut.outputFiles[0].text.trim();
let analyticsTag = '';
if (analyticsOn) {
  const a = `(()=>{const g=${JSON.stringify(GTM_ID)},a=${JSON.stringify(GA4_ID)};window.dataLayer=window.dataLayer||[];const s=document.createElement('script');s.async=true;if(g){window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});s.src='https://www.googletagmanager.com/gtm.js?id='+g}else{window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',a);s.src='https://www.googletagmanager.com/gtag/js?id='+a}document.head.appendChild(s)})();`;
  const aName = `analytics.${short(a)}.js`;
  write(`assets/js/${aName}`, a);
  analyticsTag = `<script src="/assets/js/${aName}" defer></script>`;
  console.warn('\n[AVISO] Métricas ativadas (GTM_ID/GA4_ID). Pela LGPD isso exige banner de consentimento ANTES de carregar o script, e a política de privacidade precisa citar as ferramentas. Não publique sem isso.\n');
}

// 5. HTML
const heroSizes = '(max-aspect-ratio: 1184/1437) 82.4vh, 100vw';
const logoFile = img.logow.svg || img.logow.sets.png[img.logow.sets.png.length - 1].file;
const heroBig = img.team.sets.jpeg[img.team.sets.jpeg.length - 1].file;
const ctx = {
  c, img, abs, heroSizes, analyticsOn, preview: PREVIEW,
  assets: {
    css, cssPages, inlineScript, statusInline, js: `/assets/js/${jsName}`, og: ico.og, analytics: analyticsTag,
    preloadFonts: [fonts.files['tenor-400'].url],
  },
};
ctx.jsonld = jsonld(c, { abs, ogUrl: abs(`/assets/img/${ico.og.file}`), heroUrl: abs(`/assets/img/${heroBig}`), logoUrl: abs(`/assets/img/${logoFile}`) });

const pages = {
  'index.html': homePage(ctx),
  'politica-de-privacidade/index.html': privacyPage(ctx),
  '404.html': notFoundPage(ctx),
};
const tidy = (h) => h.replace(/\n\s+/g, '\n').replace(/>\n</g, '><').replace(/\n{2,}/g, '\n');
for (const [rel, html] of Object.entries(pages)) write(rel, tidy(html));

// 6. SEO e arquivos para agentes
const today = new Date().toISOString().slice(0, 10);
const privacyPending = /\[\[PENDENTE/.test(c.privacidade.corpo);
write('robots.txt', PREVIEW ? `# Prévia de aprovação (não é o site final): não indexar
User-agent: *
Disallow: /
` : robots(c, { abs }));
write('sitemap.xml', sitemap([{ loc: abs('/'), lastmod: today }, ...(privacyPending ? [] : [{ loc: abs('/politica-de-privacidade/'), lastmod: today }])]));
write('manifest.webmanifest', manifest(c));
write('llms.txt', llms(c, { abs }));
write('llms-full.txt', llmsFull(c, { abs }));

// 7. Cabeçalhos (CSP com hash dos blocos inline)
const hashes = { scriptHashes: [sha256(inlineScript), sha256(statusInline)], styleHashes: [sha256(css), sha256(cssPages)], analytics: analyticsOn };
if (!PREVIEW) write('.htaccess', htaccess({ host, headers: securityHeaders({ ...hashes, preview: false }) }));
fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.cache', 'build-meta.json'), JSON.stringify({ ...hashes, builtAt: new Date().toISOString() }, null, 2));

// 8. Relatório de peso
const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const br = (buf) => zlib.brotliCompressSync(buf).length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const index = fs.readFileSync(path.join(DIST, 'index.html'));
const heroAvif = img.team.sets.avif.map((v) => `${v.w}w ${kb(v.bytes)}`).join(', ');
const pend = listPending(c);
console.log(`Build ok em ${((Date.now() - t0) / 1000).toFixed(1)}s -> dist/`);
console.log(`  index.html: ${kb(index.length)} (gzip ${kb(gz(index))}, brotli ${kb(br(index))}); CSS inline ${kb(css.length)} (gzip ${kb(gz(Buffer.from(css)))})`);
console.log(`  JS: ${kb(js.length)} (gzip ${kb(gz(Buffer.from(js)))})`);
console.log(`  Hero AVIF: ${heroAvif}`);
console.log(`  Fonte de imagens: ${Object.values(img).map((i) => `${i.name || 'logo'}<-${i.source || 'svg'}`).join(', ')}`);
// a 1ª janela do TCP leva ~14,6 KB com cabeçalhos; acima disso o HTML custa uma ida e volta a mais
// e o LCP mobile simulado do Lighthouse sobe ~0,15 s (medido: nota 100 -> 99)
const indexBr = br(index);
if (indexBr > 13.8 * 1024) console.warn(`  [AVISO] index.html com brotli tem ${kb(indexBr)}: passou de 13,8 KB e não cabe mais na 1ª janela TCP. Enxugue texto, CSS ou JSON-LD.`);
if (pend.length) console.log(`  ${pend.length} pendência(s) no conteúdo (aparecem como "a confirmar"). Veja: npm run check`);
