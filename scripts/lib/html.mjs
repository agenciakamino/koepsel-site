// Templates HTML. Todo o texto vem de src/content.json; aqui só há marcação.
import { esc, shown, isPending, url, tel } from './content.mjs';

// símbolos usados várias vezes (estrelas, logo do Google): definidos uma vez no topo do <body>
export const SPRITE = '<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><symbol id="i-star" viewBox="0 0 24 24"><path d="m12 2.6 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5-4.9-4.5 6.6-.8z"/></symbol><symbol id="i-g" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.2v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC04" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4.1-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4.1 3.1A7.2 7.2 0 0 1 12 4.8z"/></symbol></svg>';

export const ICON = {
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.1" y="3.1" width="17.8" height="17.8" rx="5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.2-.2-.2-.4-.3Z"/></svg>',
  google: '<svg class="glogo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-g"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-star"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 5l7 7-7 7"/></svg>',
};

const stars = (label = '5 de 5 estrelas') => `<span class="stars" role="img" aria-label="${esc(label)}">${ICON.star.repeat(5)}</span>`;
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export const waLink = (c, msg) => {
  if (!/^\d{10,15}$/.test(c.contato.whatsapp)) throw new Error('contato.whatsapp deve ter só dígitos (ex.: 5547997587166)');
  return `https://wa.me/${c.contato.whatsapp}?text=${encodeURIComponent(msg)}`;
};
const ext = 'target="_blank" rel="noopener"';

// <picture> com AVIF, WebP e fallback
export function picture(img, { alt, sizes, cls = '', eager = false, attrs = '' }) {
  const set = (fmt) => img.sets[fmt].map((v) => `/assets/img/${v.file} ${v.w}w`).join(', ');
  const fb = img.sets[img.fallback];
  const big = fb[fb.length - 1];
  const ratio = img.height / img.width;
  const load = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const sources = ['avif', 'webp'].filter((f) => img.sets[f]).map((f) => `<source type="image/${f}" srcset="${set(f)}" sizes="${sizes}">`).join('');
  return `<picture>${sources}<img${cls ? ` class="${cls}"` : ''} src="/assets/img/${big.file}" srcset="${set(img.fallback)}" sizes="${sizes}" width="${big.w}" height="${Math.round(big.w * ratio)}" alt="${esc(alt)}" ${load}${attrs ? ' ' + attrs : ''}></picture>`;
}

// Logo: SVG quando houver vetor em assets-origem/hd, senão PNG/WebP
export function logoImg(logo, { alt, height, eager = false }) {
  const w = Math.round((logo.width / logo.height) * height);
  const load = eager ? 'decoding="async"' : 'loading="lazy" decoding="async"';
  if (logo.svg) return `<img src="/assets/img/${logo.svg}" width="${w}" height="${height}" alt="${esc(alt)}" ${load}>`;
  return picture(logo, { alt, sizes: `${w}px`, eager: false, attrs: '' }).replace('loading="lazy" decoding="async"', load);
}

function head(ctx, { title, description, canonical, robots = 'index, follow', jsonld, preloadHero = false, ogType = 'website', page = false }) {
  const { c, assets, img } = ctx;
  const ogImg = ctx.abs(`/assets/img/${assets.og.file}`);
  const hero = img.team;
  const heroPreload = preloadHero
    ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${hero.sets.avif.map((v) => `/assets/img/${v.file} ${v.w}w`).join(', ')}" imagesizes="${ctx.heroSizes}" fetchpriority="high">`
    : '';
  const fontPreloads = assets.preloadFonts.map((u) => `<link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin>`).join('');
  return `<!doctype html>
<html lang="${esc(c.site.idioma)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${ctx.preview ? 'noindex, nofollow' : robots}">
<meta name="theme-color" content="${esc(c.site.corTema)}">
<meta name="format-detection" content="telephone=no">
<script>${assets.inlineScript}</script>
${heroPreload}${fontPreloads}
<style>${page ? assets.cssPages : assets.css}</style>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="text/markdown" href="/llms-full.txt" title="Conteúdo do site em Markdown">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(c.site.nome)}">
<meta property="og:locale" content="${esc(c.site.locale)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:width" content="${assets.og.width}">
<meta property="og:image:height" content="${assets.og.height}">
<meta property="og:image:alt" content="${esc(c.site.nome)}: escritório de advocacia em Blumenau/SC">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImg)}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
<script type="module" src="${assets.js}"></script>
${assets.analytics || ''}
</head>`;
}

function navBar(ctx, { home }) {
  const { c, img } = ctx;
  const href = (a) => esc(home ? `#${a}` : `/#${a}`);
  return `<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header>
<nav class="nav on-dark" id="nav" aria-label="Principal">
  <div class="wrap">
    <ul>${c.nav.map((n) => `<li><a href="${href(n.ancora)}">${esc(n.texto)}</a></li>`).join('')}</ul>
    <a class="logo" href="${home ? '#topo' : '/'}">${logoImg(img.logow, { alt: `${c.site.nome}, início`, height: 36, eager: true })}</a>
    <a class="cta" href="${waLink(c, c.whatsapp.padrao)}" ${ext} data-event="whatsapp_click" data-origem="nav">WhatsApp<span class="sr-only">: conversar com a ${esc(c.site.nome)}</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu">${ICON.menu}</button>
  </div>
</nav>
<dialog class="menu on-dark" id="menu" aria-label="Menu">
  <div class="mhead">${logoImg(img.logow, { alt: c.site.nome, height: 32 })}<button class="close" type="button" aria-label="Fechar menu">${ICON.close}</button></div>
  <ul>${c.nav.map((n) => `<li><a href="${href(n.ancora)}">${esc(n.texto)}</a></li>`).join('')}</ul>
  <div class="mfoot">
    <a class="ln" href="${waLink(c, c.whatsapp.padrao)}" ${ext} data-event="whatsapp_click" data-origem="menu">${esc(c.final.cta)}</a>
    <a class="ln" href="${tel(c.contato.telefone)}">${esc(c.contato.telefoneExibicao)}</a>
    <a class="ln" href="${url(c.contato.instagram)}" ${ext}>${esc(c.final.instagram)}</a>
  </div>
</dialog>
</header>`;
}

function footer(ctx, { home }) {
  const { c, img } = ctx;
  const href = (a) => esc(home ? `#${a}` : `/#${a}`);
  const s = c.socias;
  const ana = c.equipe[0];
  const oab = (v) => (isPending(v) ? 'OAB/SC a confirmar' : `OAB/SC ${esc(v)}`);
  return `<footer class="foot on-dark">
  <div class="wrap">
    <div class="fg">
      ${logoImg(img.logow, { alt: c.site.nome, height: 40 })}
      <nav aria-label="Rodapé"><ul>${c.nav.map((n) => `<li><a href="${href(n.ancora)}">${esc(n.texto)}</a></li>`).join('')}<li><a href="${url(c.contato.instagram)}" ${ext}>Instagram</a></li></ul></nav>
    </div>
    <div class="legal">
      <p>${esc(c.site.nome)} · ${esc(c.sociedade.tipo)} · registro ${isPending(c.sociedade.oab) ? 'OAB/SC a confirmar' : `OAB/SC ${esc(c.sociedade.oab)}`}. ${s.map((p) => `${esc(p.nome)}, ${oab(p.oab)}`).join(' · ')} · ${esc(ana.nomeExibicao)}, ${oab(ana.oab)}.<br>${esc(c.rodape.aviso)}</p>
      <p><a href="/politica-de-privacidade/">${esc(c.rodape.privacidade)}</a><br><button type="button" class="motion-toggle" data-motion-toggle data-on="${esc(c.rodape.animacoesDesligar)}" data-off="${esc(c.rodape.animacoesLigar)}">${esc(c.rodape.animacoesDesligar)}</button></p>
    </div>
  </div>
</footer>
<a class="fab ig on-dark off" href="${url(c.contato.instagram)}" ${ext} aria-label="Instagram da ${esc(c.site.nome)}">${ICON.ig}</a>
<a class="fab wa on-dark off" href="${waLink(c, c.whatsapp.padrao)}" ${ext} aria-label="Falar pelo WhatsApp" data-event="whatsapp_click" data-origem="flutuante">${ICON.wa}</a>`;
}

function statusSpan(c, { tag = 'span' } = {}) {
  return `<span class="st" data-st><span class="dot" aria-hidden="true"></span><${tag} data-st-txt>${esc(c.horario.resumo)}</${tag}></span>`;
}

// "Escritório de advocacia · Blumenau · SC": no celular a quebra cai no primeiro separador
const eyebrow = (t) => { const i = t.indexOf(' · '); return i < 0 ? esc(t) : `${esc(t.slice(0, i))}<span class="sep"> · </span>${esc(t.slice(i + 3))}`; };

export function homePage(ctx) {
  const { c, img } = ctx;
  const wa = (msg, origem) => `href="${waLink(c, msg)}" ${ext} data-event="whatsapp_click" data-origem="${origem}"`;
  const faixas = JSON.stringify(c.horario.faixas.map((f) => [minutes(f.abre), minutes(f.fecha)]));
  const metaItem = (m) => (m.includes('★') ? esc(m).replace('★', '<span aria-hidden="true">★</span><span class="sr-only">estrelas</span>') : esc(m));

  const body = `<body>
${SPRITE}
<div id="topo-sentinela" aria-hidden="true"></div>
${navBar(ctx, { home: true })}
<main id="conteudo" tabindex="-1">

<section class="hero on-dark" id="topo" aria-labelledby="titulo">
  <div class="bg">${picture(img.team, { alt: c.hero.alt, sizes: ctx.heroSizes, eager: true })}</div>
  <div class="inner">
    <h1 id="titulo"><span class="eyebrow">${eyebrow(c.hero.eyebrow)}</span><span class="sr-only">: </span><span class="big">${esc(c.hero.linha1)}<br><em>${esc(c.hero.linha2)}</em></span></h1>
    <div class="acts">
      <a class="ln" ${wa(c.whatsapp.situacao, 'hero')}>${esc(c.hero.cta)}</a>
      <a class="ln" href="#areas">${esc(c.hero.ctaAreas)}</a>
    </div>
    <ul class="meta" data-horario="${esc(faixas)}" data-dias="${esc(JSON.stringify(c.horario.diasUteis))}">
      <li>${statusSpan(c, { tag: 'b' })}</li>
      ${c.hero.meta.map((m) => `<li>${metaItem(m)}</li>`).join('')}
    </ul><script>${ctx.assets.statusInline}</script>
  </div>
</section>

<section class="statement" id="escritorio" aria-labelledby="t-escritorio">
  <div class="wrap rv">
    <p class="caps">${esc(c.escritorio.eyebrow)}</p>
    <h2 id="t-escritorio">${esc(c.escritorio.titulo)} <em>${esc(c.escritorio.tituloDestaque)}</em></h2>
    <p>${esc(c.escritorio.texto)}</p>
    <a class="ln" href="#socias">${esc(c.escritorio.link)}</a>
  </div>
</section>

<section class="duo cv" id="socias" aria-labelledby="t-socias">
  <h2 class="sr-only" id="t-socias">As sócias</h2>
  ${c.socias.map((p) => `<article class="cell on-dark">
    ${picture(img[p.foto], { alt: p.alt, sizes: '(max-width: 720px) 100vw, 50vw' })}
    <p class="tag">${esc(p.apelido)}</p>
    <div class="cap">
      <h3 class="nm"><a ${wa(p.whatsapp, esc(`socia-${p.id}`))}>${esc(p.nome)}<span class="sr-only">: falar pelo WhatsApp com a equipe</span></a></h3>
      <p class="rl">${p.areas.map(esc).join(' · ')}</p>
      <span class="go" aria-hidden="true">Falar com a equipe</span>
    </div>
  </article>`).join('\n  ')}
</section>

<section class="duo-note cv" aria-label="Sobre as sócias">
  <div class="wrap stg">
    ${c.socias.map((p) => `<div class="rv">
      <p class="lb">${esc(p.apelido)}</p>
      <p>${esc(p.texto)}</p>
      <p class="q">“${esc(p.citacao)}”</p>
    </div>`).join('\n    ')}
  </div>
</section>

<section class="areas cv" id="areas" aria-labelledby="t-areas">
  <div class="wrap">
    <div class="head rv">
      <p class="caps">${esc(c.areas.eyebrow)}</p>
      <h2 id="t-areas">${esc(c.areas.titulo)}</h2>
    </div>
    <ul class="stg">
      ${c.areas.itens.map((a, i) => `<li class="rv"><a ${wa(c.whatsapp.area.replace('{area}', a.titulo), `area-${i + 1}`)}><span class="n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(a.titulo)}</h3><span class="who"><span class="sr-only">Com </span>${esc(a.responsaveis)}</span><span class="d">${esc(a.descricao)}</span></a></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="band on-dark cv" aria-labelledby="t-banda">
  <img class="k" src="/assets/img/${img.symw.sets.webp[0].file}" width="${img.symw.width}" height="${img.symw.height}" alt="" loading="lazy" decoding="async">
  <div class="inner rv">
    <p class="caps">${esc(c.banda.eyebrow)}</p>
    <h2 id="t-banda">${esc(c.banda.linha1)}<br>${esc(c.banda.linha2)}</h2>
    <p>${esc(c.banda.texto)}</p>
    <a class="ln" ${wa(c.whatsapp.situacao, 'banda')}>${esc(c.banda.link)}</a>
  </div>
</section>

<section class="reviews on-dark cv" id="avaliacoes" aria-labelledby="t-aval">
  <div class="wrap">
    <div class="rv">
      <p class="caps">${esc(c.avaliacoes.eyebrow)}</p>
      <h2 id="t-aval">${esc(c.avaliacoes.titulo)}</h2>
      <div class="gbadge">
        ${ICON.google}
        <span><span class="num" data-count="${esc(c.avaliacoes.nota.replace(',', '.'))}">${esc(c.avaliacoes.nota)}</span><small>${esc(c.avaliacoes.total)} avaliações no Google</small></span>
        ${stars(`Nota ${c.avaliacoes.nota} de 5`)}
        <a class="vbtn" href="${url(c.google.avaliacoes)}" ${ext}>${esc(c.avaliacoes.botao)}<span class="sr-only">: avaliações da ${esc(c.site.nome)}</span></a>
      </div>
    </div>
    <ul class="rtrack rv" id="rtrack" tabindex="0" aria-label="Avaliações públicas do Google. Use as setas para navegar." aria-roledescription="carrossel">
      ${c.avaliacoes.itens.map((r, i) => `<li><figure class="rcard" aria-label="Avaliação ${i + 1} de ${c.avaliacoes.itens.length}">
        <div class="top">${stars()}${ICON.google}</div>
        <blockquote><p>“${esc(r.texto)}”</p></blockquote>
        <figcaption>${esc(r.autor)} · Avaliação no Google</figcaption>
      </figure></li>`).join('\n      ')}
    </ul>
    <div class="rnav no-js-hide">
      <button type="button" id="rprev" aria-controls="rtrack" aria-label="Avaliação anterior">${ICON.prev}</button>
      <button type="button" id="rnext" aria-controls="rtrack" aria-label="Próxima avaliação">${ICON.next}</button>
    </div>
  </div>
</section>

<section class="where cv" id="onde" aria-labelledby="t-onde">
  <div class="wrap">
    <div class="rv">
      <p class="caps">${esc(c.onde.eyebrow)}</p>
      <h2 id="t-onde">${esc(c.onde.titulo)}</h2>
      <p class="l">${esc(c.onde.texto1)}</p>
      <p class="l">${esc(c.onde.texto2)}</p>
      <h3 class="caps htitle">${esc(c.onde.horarioTitulo)}</h3>
      <dl class="hours">
        ${c.horario.dias.map(([d, nome]) => `<div data-d="${d}"><dt>${esc(nome)}</dt><dd>${c.horario.diasUteis.includes(d) ? esc(c.horario.faixasTexto) : esc(c.horario.fechado)}</dd></div>`).join('\n        ')}
      </dl>
    </div>
    <div class="gside rv">
      <figure class="gphoto">${picture(img[c.onde.foto], { alt: c.onde.alt, sizes: '(max-width: 820px) calc(100vw - 36px), 535px' })}</figure>
      <p class="caps">${esc(c.onde.googleEyebrow)}</p>
      <h3>${esc(c.onde.googleTitulo)}</h3>
      <p class="gt">${esc(c.onde.googleTexto)}</p>
      ${statusSpan(c)}
      <dl>
        <div><dt>${esc(c.onde.rotuloEndereco)}</dt><dd><address>${esc(c.endereco.ruaCurta)} · ${esc(c.endereco.local)}<br>${esc(c.endereco.bairro)} · ${esc(c.endereco.cidade)}/${esc(c.endereco.uf)} · ${esc(c.endereco.cep)}</address></dd></div>
        <div><dt>${esc(c.onde.rotuloTelefone)}</dt><dd><a href="${tel(c.contato.telefone)}">${esc(c.contato.telefoneExibicao)}</a></dd></div>
      </dl>
      <div class="links">
        <a class="ln" href="${url(c.google.rota)}" ${ext}>${esc(c.onde.links.rota)}<span class="sr-only"> até a ${esc(c.site.nome)}</span></a>
        <a class="ln" href="${url(c.google.mapa)}" ${ext}>${esc(c.onde.links.mapa)}</a>
        <a class="ln" href="${url(c.google.avaliacoes)}" ${ext}>${esc(c.onde.links.avaliacoes)}</a>
      </div>
    </div>
  </div>
</section>

<section class="faq cv" id="duvidas" aria-labelledby="t-faq">
  <div class="wrap">
    <h2 class="caps rv" id="t-faq">${esc(c.faq.eyebrow)}</h2>
    <div class="list stg">
      ${c.faq.itens.map((f, i) => `<details class="rv"${i === 0 ? ' open' : ''}><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="final on-dark cv" id="contato" aria-labelledby="t-final">
  <img class="k" src="/assets/img/${img.symw.sets.webp[0].file}" width="${img.symw.width}" height="${img.symw.height}" alt="" loading="lazy" decoding="async">
  <div class="wrap rv">
    <p class="caps">${esc(c.final.eyebrow)}</p>
    <h2 id="t-final">${esc(c.final.titulo)}</h2>
    <p>${esc(c.final.texto)}</p>
    <div class="acts">
      <a class="ln" ${wa(c.whatsapp.padrao, 'final')}>${esc(c.final.cta)}</a>
      <a class="ln" href="${url(c.contato.instagram)}" ${ext}>${esc(c.final.instagram)}<span class="sr-only"> da ${esc(c.site.nome)}</span></a>
    </div>
    <p class="ph"><a href="${tel(c.contato.telefone)}">${esc(c.contato.telefoneExibicao)}</a> · Seg a sex · ${esc(c.horario.faixasTexto)}</p>
  </div>
</section>

</main>
${footer(ctx, { home: true })}
</body>
</html>`;
  return head(ctx, {
    title: c.site.titulo,
    description: c.site.descricao,
    canonical: ctx.abs('/'),
    jsonld: ctx.jsonld,
    preloadHero: true,
  }) + '\n' + body;
}

export function privacyPage(ctx) {
  const { c } = ctx;
  const p = c.privacidade;
  const pend = isPending(p.corpo);
  const body = `<body class="page">
${navBar(ctx, { home: false })}
<main id="conteudo" tabindex="-1">
<article class="doc">
  <div class="wrap">
    <p class="caps">${esc(c.site.nome)}</p>
    <h1>${esc(p.titulo)}</h1>
    ${ctx.analyticsOn ? '' : `<p>${esc(p.introducao)}</p>`}
    ${pend ? '<p class="pend">O texto completo desta política está em preparação.</p>' : p.corpo.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('\n    ')}
    ${isPending(p.atualizadaEm) ? '' : `<p>Vigente desde ${esc(p.atualizadaEm)}.</p>`}
    <a class="ln" href="/">${esc(c.pagina404.voltar)}</a>
  </div>
</article>
</main>
${footer(ctx, { home: false })}
</body>
</html>`;
  return head(ctx, {
    title: `${p.titulo} | ${c.site.nome}`,
    description: p.descricao,
    canonical: ctx.abs('/politica-de-privacidade/'),
    robots: pend ? 'noindex, follow' : 'index, follow',
    page: true,
  }) + '\n' + body;
}

export function notFoundPage(ctx) {
  const { c } = ctx;
  const body = `<body class="page">
${navBar(ctx, { home: false })}
<main id="conteudo" tabindex="-1">
<section class="doc notfound">
  <div class="wrap">
    <p class="caps">Erro 404</p>
    <h1>${esc(c.pagina404.titulo)}</h1>
    <p>${esc(c.pagina404.texto)}</p>
    <a class="ln" href="/">${esc(c.pagina404.voltar)}</a>
  </div>
</section>
</main>
${footer(ctx, { home: false })}
</body>
</html>`;
  return head(ctx, {
    title: `${c.pagina404.titulo} | ${c.site.nome}`,
    description: c.pagina404.texto,
    canonical: ctx.abs('/404.html'),
    robots: 'noindex, follow',
    page: true,
  }) + '\n' + body;
}

export { shown };
