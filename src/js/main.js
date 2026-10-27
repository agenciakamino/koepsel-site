// Comportamento do site. Todo o conteúdo já vem no HTML; aqui só entram refinamentos.
// Dados de horário chegam por data-attributes gerados no build a partir de src/content.json.
import { computeStatus, applyStatus, readHorario } from './status.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const io = (cb, opts) => new IntersectionObserver(cb, opts);

// Status "Aberto agora / Abre amanhã" (o do hero já foi aplicado inline; aqui entram os demais e o dia de hoje)
function status() {
  const h = readHorario();
  if (!h) return;
  const s = computeStatus(h[0], h[1]);
  applyStatus(s);
  const row = $(`.hours [data-d="${s.d}"]`);
  if (row) row.classList.add('today');
  // atualiza a cada minuto enquanto a página está aberta
  setTimeout(status, 60000 - (Date.now() % 60000));
}

// Nav sólida ao rolar (sentinela, sem listener de scroll)
function nav() {
  const navEl = $('#nav');
  const s = $('#topo-sentinela');
  if (!navEl || !s) return;
  io(([e]) => navEl.classList.toggle('solid', !e.isIntersecting)).observe(s);
}

// aria-current na âncora da seção visível
function current() {
  const links = $$('.nav ul a[href^="#"]');
  if (!links.length) return;
  const map = new Map(links.map((a) => [a.hash.slice(1), a]));
  const obs = io((entries) => {
    entries.forEach((e) => {
      const a = map.get(e.target.id);
      if (!a) return;
      if (e.isIntersecting) {
        links.forEach((l) => l.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'location');
      } else if (a.hasAttribute('aria-current')) a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
}

// Menu mobile: <dialog> modal (foco preso e Esc fecham nativamente)
function menu() {
  const btn = $('.menu-btn');
  const dlg = $('#menu');
  if (!btn || !dlg) return;
  btn.addEventListener('click', () => { dlg.showModal(); btn.setAttribute('aria-expanded', 'true'); });
  dlg.addEventListener('close', () => btn.setAttribute('aria-expanded', 'false'));
  $('.close', dlg).addEventListener('click', () => dlg.close());
  $$('a', dlg).forEach((a) => a.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  matchMedia('(min-width: 1121px)').addEventListener('change', (e) => { if (e.matches && dlg.open) dlg.close(); });
}

// Carrossel de avaliações: scroll-snap nativo + botões + setas
function carousel() {
  const track = $('#rtrack');
  if (!track) return;
  const prev = $('#rprev');
  const next = $('#rnext');
  const step = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 20 : track.clientWidth; };
  const go = (dir) => track.scrollBy({ left: dir * step() });
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
    next.setAttribute('aria-disabled', String(track.scrollLeft >= max));
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  let t;
  track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sync, 80); }, { passive: true });
  addEventListener('resize', sync, { passive: true });
  sync();
}

// Reveal: só quando o navegador não tem scroll-driven animations (o CSS só esconde com .motion)
function reveal() {
  if (CSS.supports('animation-timeline: view()')) return;
  const obs = io((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach((el) => obs.observe(el));
}

// Botões flutuantes somem enquanto a meta do hero, o CTA final ou o rodapé estão na tela (evita cobrir texto; os links são os mesmos)
function fabs() {
  const fab = $$('.fab');
  const zones = $$('.hero .meta, .final, .foot');
  if (!fab.length || !zones.length) return;
  const vis = new Set();
  const obs = io((entries) => {
    entries.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
    fab.forEach((f) => f.classList.toggle('off', vis.size > 0));
  });
  zones.forEach((z) => obs.observe(z));
}

// Contagem curta da nota quando o selo entra na tela (largura fixa: tabular-nums, mesmo nº de dígitos)
function countUp() {
  const el = $('[data-count]');
  if (!el || !document.documentElement.classList.contains('motion')) return;
  const alvo = parseFloat(el.dataset.count);
  const obs = io(([e]) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      const v = alvo * (1 - (1 - k) ** 3);
      el.textContent = v.toFixed(1).replace('.', ',');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 });
  obs.observe(el);
}

// Eventos de conversão: só disparam se alguém configurou window.dataLayer (desligado por padrão)
function conversions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-event]');
    if (!a || !Array.isArray(window.dataLayer)) return;
    window.dataLayer.push({ event: a.dataset.event, origem: a.dataset.origem || '' });
  });
}

// Botão do rodapé: liga e desliga as animações e lembra a escolha neste navegador
function motionToggle() {
  const root = document.documentElement;
  $$('[data-motion-toggle]').forEach((btn) => {
    const sync = () => { btn.textContent = root.classList.contains('motion') ? btn.dataset.on : btn.dataset.off; };
    sync();
    btn.addEventListener('click', () => {
      const on = root.classList.toggle('motion');
      try { localStorage.setItem('koepsel-animacoes', on ? 'on' : 'off'); } catch { /* modo privado: vale só nesta visita */ }
      $$('[data-motion-toggle]').forEach((b) => { b.textContent = on ? b.dataset.on : b.dataset.off; });
    });
  });
}

for (const f of [status, nav, current, menu, carousel, reveal, fabs, countUp, conversions, motionToggle]) {
  try { f(); } catch (err) { console.warn('[koepsel]', f.name, err); }
}
