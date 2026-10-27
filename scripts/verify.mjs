// Verificação automática do dist/ servido localmente (npm test).
// axe-core, JavaScript desligado, animações ligadas/desligadas (botão do rodapé), teclado, menu, carrossel, CLS,
// contraste de texto sobre foto, JSON-LD x conteúdo visível, links e screenshots em 6 larguras.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import sharp from 'sharp';
import { ROOT, loadContent } from './lib/content.mjs';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = path.join(ROOT, 'relatorios');
const SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const c = loadContent();
const server = await startServer(4175);
const BASE = 'http://localhost:4175';
const browser = await puppeteer.launch({ executablePath: chromeLauncher.Launcher.getInstallations()[0], headless: true, args: ['--no-first-run', '--hide-scrollbars'] });
const results = [];
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log(`${pass ? '✔' : '✖'} ${name}${info ? ': ' + info : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// reduce: animações desligadas pelo botão do rodapé (preferência salva); osReduce: sistema pedindo menos movimento
async function open(url, { width = 1440, height = 900, js = true, reduce = false, osReduce = false, mobile = false, bypassCSP = false } = {}) {
  // contexto novo por página: a preferência de animação salva no localStorage não vaza entre testes
  const page = await (await browser.createBrowserContext()).newPage();
  if (bypassCSP) await page.setBypassCSP(true); // só a sonda de contraste precisa alterar estilos
  await page.setJavaScriptEnabled(js);
  await page.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: osReduce ? 'reduce' : 'no-preference' }]);
  if (reduce) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('koepsel-animacoes', 'off'); } catch { /* sem storage */ } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE + url, { waitUntil: 'networkidle0' });
  page.__errors = errors;
  return page;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 400));
  });
}

// 1. axe-core (sem movimento para não pegar elementos no meio de uma transição)
for (const [url, vp] of [['/', { width: 1440, height: 900 }], ['/', { width: 390, height: 844, mobile: true }], ['/politica-de-privacidade/', { width: 1440 }], ['/404.html', { width: 390, height: 844, mobile: true }]]) {
  const page = await open(url, { ...vp, reduce: true });
  await scrollThrough(page);
  await page.evaluate(AXE); // injeta a biblioteca axe-core local (node_modules) na página de teste
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  ok(`axe ${url} ${vp.width}px`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`).join('; ') || `${r.passes.length} regras ok, ${r.incomplete.length} para revisão manual`);
  ok(`console sem erros ${url} ${vp.width}px`, page.__errors.length === 0, page.__errors.join(' | '));
  await page.close();
}

// 2. JavaScript desligado: todo o conteúdo e todos os links presentes
{
  const page = await open('/', { js: false });
  const d = await page.evaluate(() => ({
    // textContent: o que crawlers e agentes leem (innerText omite <details> fechados e seções fora da tela)
    text: document.body.textContent.replace(/\s+/g, ' '),
    wa: [...document.querySelectorAll('a[href^="https://wa.me/"]')].map((a) => a.href),
    tel: document.querySelectorAll('a[href^="tel:"]').length,
    deadHash: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h !== '#' && !document.getElementById(h.slice(1))),
    emptyHref: document.querySelectorAll('a[href="#"], a:not([href])').length,
    hidden: [...document.querySelectorAll('main *')].filter((el) => !el.closest('[aria-hidden="true"]') && el.checkVisibility() && getComputedStyle(el).opacity === '0').map((el) => el.outerHTML.slice(0, 80)),
    h1: document.querySelectorAll('h1').length,
  }));
  const T = d.text.toLowerCase();
  const need = [
    ...c.areas.itens.map((a) => a.titulo), ...c.faq.itens.map((f) => f.pergunta), ...c.faq.itens.map((f) => f.resposta),
    ...c.avaliacoes.itens.map((r) => r.autor), ...c.horario.dias.map((x) => x[1]), c.horario.resumo, c.endereco.cep, c.contato.telefoneExibicao,
    ...c.socias.map((s) => s.nome), c.escritorio.texto, c.rodape.aviso,
  ];
  const missing = need.filter((t) => !T.includes(t.toLowerCase()));
  ok('sem JS: todo o conteúdo no HTML', missing.length === 0, missing.length ? 'faltando: ' + missing.join(' | ') : `${need.length} trechos conferidos`);
  ok('sem JS: links reais de WhatsApp e telefone', d.wa.length >= 10 && d.tel >= 2 && d.emptyHref === 0, `${d.wa.length} wa.me, ${d.tel} tel:, ${d.emptyHref} href vazios`);
  ok('sem JS: âncoras internas válidas', d.deadHash.length === 0, d.deadHash.join(', '));
  ok('sem JS: nada nasce invisível', d.hidden.length === 0, d.hidden.join(' | '));
  ok('um único <h1>', d.h1 === 1, String(d.h1));
  const texts = [...new Set(d.wa.map((u) => decodeURIComponent(new URL(u).searchParams.get('text'))))];
  ok('textos do wa.me', texts.every((t) => t.startsWith('Olá')), texts.join(' | '));
  await page.close();
}

// 3. Movimento: desligado pelo botão mostra tudo de imediato; ligado revela ao rolar, inclusive com o sistema pedindo menos movimento
{
  const page = await open('/', { reduce: true });
  const n = await page.evaluate(() => [...document.querySelectorAll('.rv')].filter((el) => getComputedStyle(el).opacity !== '1').length);
  ok('animações desligadas: conteúdo visível sem rolar', n === 0, `${n} elementos .rv não visíveis`);
  await page.close();
  const p2 = await open('/', { osReduce: true });
  const forced = await p2.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.classList.contains('motion'));
  ok('anima mesmo com o sistema pedindo menos movimento', forced);
  const before = await p2.evaluate(() => [...document.querySelectorAll('.rv')].filter((el) => getComputedStyle(el).opacity !== '1').length);
  await scrollThrough(p2);
  const after = await p2.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('.rv')) {
      el.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 1300));
      if (parseFloat(getComputedStyle(el).opacity) < 0.98) out.push(el.className);
    }
    return out;
  });
  ok('motion: reveal ao entrar na tela', before > 0 && after.length === 0, `${before} escondidos no início, ${after.length} não revelados ao centralizar`);
  ok('console sem erros com motion', p2.__errors.length === 0, p2.__errors.join(' | '));
  await p2.close();

  // botão do rodapé: desliga, lembra após recarregar, liga de novo
  const p3 = await open('/', { width: 390, height: 844, mobile: true });
  const label0 = await p3.$eval('[data-motion-toggle]', (b) => b.textContent);
  await p3.$eval('[data-motion-toggle]', (b) => { b.scrollIntoView(); b.focus(); });
  await p3.keyboard.press('Enter');
  const off = await p3.evaluate(() => ({ motion: document.documentElement.classList.contains('motion'), label: document.querySelector('[data-motion-toggle]').textContent, hidden: [...document.querySelectorAll('.rv')].filter((el) => getComputedStyle(el).opacity !== '1').length }));
  await p3.reload({ waitUntil: 'networkidle0' });
  const kept = await p3.evaluate(() => !document.documentElement.classList.contains('motion'));
  await p3.$eval('[data-motion-toggle]', (b) => b.click());
  const back = await p3.evaluate(() => document.documentElement.classList.contains('motion') && localStorage.getItem('koepsel-animacoes') === 'on');
  ok('botão de animações: desliga, lembra e religa', !off.motion && off.hidden === 0 && kept && back && off.label !== label0, `${label0} -> ${off.label}`);
  await p3.close();
}

// 4. CLS ao carregar e rolar (mobile e desktop, com motion)
for (const vp of [{ width: 390, height: 844, mobile: true }, { width: 1440, height: 900 }]) {
  const page = await open('/', vp);
  await sleep(2500);
  await scrollThrough(page);
  const cls = await page.evaluate(() => window.__cls);
  // < 0,001 = 0,000 na precisão do Lighthouse; sobra ~0,00001 da troca de fonte na nav (±1 px por palavra)
  ok(`CLS ${vp.width}px`, cls < 0.001, cls.toFixed(6));
  await page.close();
}

// 5. Teclado, menu mobile e carrossel
{
  const page = await open('/', { reduce: true });
  const order = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      const ring = (e) => { const s = getComputedStyle(e); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; };
      const cell = el.closest('.cell');
      const visible = ring(el) || (cell && ring(cell));
      return `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}[${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24)}]${visible ? '' : ' SEM-FOCO-VISÍVEL'}`;
    }));
  }
  ok('teclado: ordem e foco visível (14 primeiros)', !order.some((o) => o.includes('SEM-FOCO')), order.join(' > '));
  // pular para o conteúdo
  await page.goto(BASE + '/?skip', { waitUntil: 'networkidle0' });
  await page.keyboard.press('Tab');
  await sleep(150);
  const skip = await page.evaluate(() => document.activeElement.classList.contains('skip') && document.activeElement.getBoundingClientRect().top >= 0);
  await page.keyboard.press('Enter');
  const target = await page.evaluate(() => document.activeElement.id || location.hash);
  ok('link "pular para o conteúdo" visível ao foco', skip && /conteudo/.test(target), target);

  // carrossel
  await page.focus('#rtrack');
  const s0 = await page.$eval('#rtrack', (t) => t.scrollLeft);
  const prevDis = await page.$eval('#rprev', (b) => b.getAttribute('aria-disabled'));
  await page.keyboard.press('ArrowRight'); await sleep(700);
  const s1 = await page.$eval('#rtrack', (t) => t.scrollLeft);
  await page.click('#rnext'); await sleep(700);
  const s2 = await page.$eval('#rtrack', (t) => t.scrollLeft);
  await page.click('#rprev'); await sleep(700);
  const s3 = await page.$eval('#rtrack', (t) => t.scrollLeft);
  ok('carrossel: setas e botões', s0 <= 4 && prevDis === 'true' && s1 > s0 && s2 > s1 && s3 < s2, `scroll ${s0} > ${s1} > ${s2} > ${s3}; anterior desabilitado no início: ${prevDis}`);

  // FAQ por teclado
  const faq = await page.evaluate(() => { const s = document.querySelectorAll('.faq summary')[1]; s.focus(); return true; });
  await page.keyboard.press('Enter'); await sleep(300);
  const opened = await page.evaluate(() => document.querySelectorAll('.faq details')[1].open);
  ok('FAQ abre pelo teclado', faq && opened);
  await page.close();

  const m = await open('/', { width: 390, height: 844, mobile: true, reduce: true });
  await m.focus('.menu-btn');
  await m.keyboard.press('Enter'); await sleep(200);
  const st = await m.evaluate(() => ({ open: document.getElementById('menu').open, exp: document.querySelector('.menu-btn').getAttribute('aria-expanded') }));
  const inside = [];
  for (let i = 0; i < 12; i++) { await m.keyboard.press('Tab'); inside.push(await m.evaluate(() => !!document.activeElement.closest('#menu') || document.activeElement === document.body)); }
  await m.keyboard.press('Escape'); await sleep(200);
  const st2 = await m.evaluate(() => ({ open: document.getElementById('menu').open, exp: document.querySelector('.menu-btn').getAttribute('aria-expanded'), focus: document.activeElement.className }));
  ok('menu mobile: abre, prende o foco, Esc fecha', st.open && st.exp === 'true' && inside.every(Boolean) && !st2.open && st2.exp === 'false' && st2.focus.includes('menu-btn'), JSON.stringify({ st, st2 }));
  await m.close();
}

// 6. Contraste do texto sobre foto (pixel mais claro do fundo, percentil 98)
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
for (const vp of [{ width: 360, height: 780, mobile: true }, { width: 390, height: 844, mobile: true }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  const page = await open('/', { ...vp, reduce: true, bypassCSP: true });
  const sels = ['.hero .eyebrow', '.hero .big', '.hero .big em', '.hero .acts .ln', '.hero .meta li', '.duo .tag', '.duo .nm', '.duo .rl', '.nav .cta', '.nav .logo'];
  const worst = [];
  for (const sel of sels) {
    const items = await page.$$(sel);
    for (const h of items) {
      await h.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await sleep(150);
      const info = await h.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
        el.style.setProperty('color', 'transparent', 'important');
        el.style.setProperty('text-shadow', 'none', 'important');
        el.querySelectorAll('*').forEach((k) => { k.style.setProperty('color', 'transparent', 'important'); k.style.setProperty('text-shadow', 'none', 'important'); k.style.setProperty('border-color', 'transparent', 'important'); });
        el.style.setProperty('border-color', 'transparent', 'important');
        el.classList.add('__probe');
        const y = Math.max(0, r.y);
        // parte visível do elemento, em coordenadas do documento (como o clip do puppeteer espera)
        return { x: Math.max(0, r.x) + scrollX, y: y + scrollY, w: Math.min(r.right, innerWidth) - Math.max(0, r.x), h: Math.min(r.bottom, innerHeight) - y, color: m.slice(0, 3) };
      });
      await sleep(120); // a regra de reduced-motion aplica transição curtíssima em todas as propriedades
      if (info.w < 2 || info.h < 2 || sel === '.nav .logo') { await h.evaluate((el) => el.removeAttribute('style')); continue; }
      // captureBeyondViewport:false mantém o layout (seções com content-visibility não são renderizadas pela captura)
      const buf = await page.screenshot({ clip: { x: info.x, y: info.y, width: info.w, height: info.h }, type: 'png', captureBeyondViewport: false });
      const { data } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const ls = [];
      for (let i = 0; i < data.length; i += 3) ls.push(lum([data[i], data[i + 1], data[i + 2]]));
      ls.sort((a, b) => a - b);
      const bg = ls[Math.floor(ls.length * 0.98)];
      const cr = ratio(lum(info.color), bg);
      worst.push({ sel, cr: +cr.toFixed(2) });
      if (cr < 4.5) { fs.mkdirSync(path.join(OUT, 'contraste'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'contraste', `${vp.width}-${sel.replace(/[^a-z]+/gi, '_')}-${worst.length}.png`), buf); }
      await h.evaluate((el) => { el.removeAttribute('style'); el.querySelectorAll('*').forEach((k) => k.removeAttribute('style')); });
    }
  }
  const min = worst.reduce((a, b) => (b.cr < a.cr ? b : a), { cr: 99 });
  ok(`contraste sobre foto ${vp.width}px`, min.cr >= 4.5, `pior: ${min.sel} ${min.cr}:1 (${worst.length} medições)`);
  await page.close();
}

// 7. JSON-LD espelha o conteúdo visível e NAP consistente
{
  const page = await open('/', { js: false });
  const d = await page.evaluate(() => ({
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)),
    faq: [...document.querySelectorAll('.faq details')].map((x) => [x.querySelector('summary').textContent.trim(), x.querySelector('p').textContent.trim()]),
    text: document.body.textContent.replace(/\s+/g, ' '),
  }));
  const g = d.ld[0]['@graph'];
  const ids = g.map((n) => n['@id']);
  const faqNode = g.find((n) => n['@type'] === 'FAQPage');
  const same = JSON.stringify(faqNode.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])) === JSON.stringify(d.faq);
  const biz = g.find((n) => n['@type'] === 'LegalService');
  const llms = fs.readFileSync(path.join(ROOT, 'dist', 'llms-full.txt'), 'utf8');
  const nap = [c.contato.telefoneExibicao, c.endereco.cep, 'Rodolfo Ferraz, 76'].every((t) => d.text.includes(t) && llms.includes(t)) && biz.address.postalCode === c.endereco.cep && biz.telephone === c.contato.telefoneSchema;
  ok('JSON-LD: um @graph, @id únicos', d.ld.length === 1 && new Set(ids).size === ids.length, ids.join(', '));
  ok('JSON-LD: FAQPage idêntico ao FAQ visível', same);
  ok('JSON-LD: sem AggregateRating/Review', !JSON.stringify(g).includes('Rating') && !JSON.stringify(g).includes('"Review"'));
  ok('NAP igual na página, JSON-LD e llms-full.txt', nap);
  await page.close();
}

// 8. Arquivos para robôs
{
  const get = async (p) => { const r = await fetch(BASE + p); return { status: r.status, type: r.headers.get('content-type'), body: await r.text(), csp: r.headers.get('content-security-policy') }; };
  const robots = await get('/robots.txt');
  const sm = await get('/sitemap.xml');
  const llms = await get('/llms.txt');
  const nf = await get('/nao-existe');
  ok('robots.txt com Sitemap e grupos de IA', robots.status === 200 && /Sitemap: https:\/\//.test(robots.body) && ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'].every((b) => robots.body.includes(`User-agent: ${b}`)));
  ok('sitemap.xml válido', sm.status === 200 && /^<\?xml/.test(sm.body) && (sm.body.match(/<loc>/g) || []).length >= 1);
  ok('llms.txt no formato (H1 + citação + seções)', /^# .+\n\n> .+/.test(llms.body) && (llms.body.match(/^## /gm) || []).length >= 2);
  ok('404 com status 404 e mesmo design', nf.status === 404 && nf.body.includes('Página não encontrada'));
  const home = await get('/');
  ok('CSP sem unsafe-inline', home.csp && !home.csp.includes('unsafe-inline'), home.csp?.slice(0, 90) + '...');
}

// 9. Screenshots nas 6 larguras (com movimento reduzido para retratar o estado final)
for (const [w, h, mobile] of [[360, 780, true], [390, 844, true], [768, 1024, false], [1280, 800, false], [1440, 900, false], [1920, 1080, false]]) {
  const page = await open('/', { width: w, height: h, mobile, reduce: true, bypassCSP: true });
  await page.screenshot({ path: path.join(SHOTS, `hero-${w}.png`) });
  // a captura de página inteira não renderiza seções com content-visibility fora da tela
  await page.addStyleTag({ content: '.cv{content-visibility:visible!important}' });
  await scrollThrough(page);
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(300);
  await page.screenshot({ path: path.join(SHOTS, `full-${w}.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
  await page.close();
}
ok('screenshots gravados', true, path.relative(ROOT, SHOTS));

await browser.close();
server.close();
fs.writeFileSync(path.join(OUT, 'verificacao.json'), JSON.stringify({ quando: new Date().toISOString(), results }, null, 2));
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} verificações ok.`);
process.exit(fails.length ? 1 : 0);
