# Decisões técnicas e medições

Complemento do [README](../README.md): o porquê das escolhas de engenharia, as medições e a verificação automática.

## Outras hospedagens (Netlify, Cloudflare Pages, Vercel)

- **Netlify / Cloudflare Pages:** criar `dist/_headers` com os mesmos cabeçalhos de
  `securityHeaders()` em `/*` e `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`;
  redirecionamento `www` para o domínio sem www em `_redirects` (`https://www.koepseladvogados.com/* https://koepseladvogados.com/:splat 301!`).
  A CSP muda a cada build (hashes), então o ideal é o build gerar esse arquivo: é uma função a mais em
  `headers.mjs`, igual à `htaccess()`.
- **Vercel:** os mesmos cabeçalhos em `vercel.json` (`headers` e `redirects`), também gerados no build.
- HTTPS, HTTP/2 e brotli já vêm ligados nessas plataformas.

## Métricas (desligadas)

Nenhum script de terceiros é carregado. Cada botão de WhatsApp tem `data-event="whatsapp_click"` e
`data-origem` (hero, nav, menu, socia-andressa, area-1 a area-6, banda, final, flutuante); se existir
`window.dataLayer`, o clique vira `{ event: 'whatsapp_click', origem }`.
Para ligar: `GTM_ID=GTM-XXXX npm run build` (ou `GA4_ID=G-XXXX`). O build injeta o script assíncrono,
libera os domínios do Google na CSP e **avisa que pela LGPD é preciso banner de consentimento antes
do carregamento** e citação na política de privacidade. O banner ainda não existe; não publicar com
métricas ligadas sem ele.

## Lighthouse

`npm run lighthouse` sobre o `dist/` servido localmente (preview com brotli e os cabeçalhos de
produção), Lighthouse 13.5, Chrome 156, 3 execuções, mediana, **com as animações ligadas**.
Medido em 2026-10-27.

| Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Peso total |
|---|---|---|---|---|---|---|---|---|
| Mobile | 100 | 100 | 100 | 100 | 1,88 s | 0 | 0 ms | 164 KB |
| Desktop | 100 | 100 | 100 | 100 | 0,43 s | 0 | 0 ms | 161 KB |

As 6 execuções deram 100 nas quatro categorias. **A URL final ainda não foi medida** (não há
hospedagem); rodar `npm run lighthouse -- --url=https://koepseladvogados.com/` depois de publicar.

**Correção de medições anteriores.** O Chrome sem interface que o Lighthouse usa herda a configuração
"Efeitos de animação" do Windows. Nesta máquina ela está desligada, então as medições feitas antes do
motion forçado (ver "Animações") mediram o site parado. Com as animações ligadas o mobile tinha caído
para 99, e a causa não era o motion: o HTML da home tinha passado de ~14,6 KB comprimido, o tamanho da
primeira janela do TCP, e o Lighthouse cobra uma ida e volta a mais (150 ms no 4G simulado). Foi
resolvido enxugando o HTML (CSS da política e da 404 fora da home, ícone do Instagram simplificado).
**O build avisa quando o `index.html` com brotli passar de 13,8 KB**: acima disso, enxugue antes de publicar.

O script repete sozinho uma execução quando o próprio Lighthouse falha ao gravar o trace
(`NO_NAVSTART`), o que acontece com frequência nesta máquina, e deixa fora da mediana o que falhar 3 vezes.
O preview comprime cada arquivo uma vez e guarda em cache, como uma hospedagem faria (comprimir brotli
nível 11 a cada requisição somava dezenas de ms ao tempo de resposta e fazia a nota oscilar).

**LCP mobile simulado acima da meta de 1,5 s.** A nota é 100, mas o LCP
simulado fica em 1,8 a 1,9 s; o real observado na mesma execução é cerca de 0,1 s. O modelo do
Lighthouse (4G lento, 1,6 Mbps) soma tudo que o navegador pede antes da primeira pintura: HTML com CSS
(14 KB), foto do hero (69 KB), Tenor Sans (19 KB), Lato 400 (24 KB) e os dois retratos (que o Chrome pede
antes por estarem perto da dobra). Testado e descartado: subset das fontes (economiza 4%),
`content-visibility` na seção seguinte (o Chrome faz o layout no primeiro quadro mesmo assim) e
preload do Lato (zera o último deslocamento de fonte, mas a fonte disputa banda com a foto e a nota cai para 99).

Primeira carga mobile: HTML com CSS crítico inline 13,4 KB (brotli) + JS 2,6 KB = 16 KB comprimidos
(meta: 50 KB); hero AVIF 69 KB.

## Animações

**Decisão de projeto: animar sempre e oferecer um botão para desligar.** O site ignora a
preferência do sistema (`prefers-reduced-motion`) e anima para todo mundo. No rodapé, "Desativar
animações" desliga tudo e a escolha fica salva no navegador do visitante (`localStorage`); o mesmo
botão vira "Ativar animações". Sem JavaScript nada anima e nada fica escondido.

Isso contraria o escopo inicial, que pedia para respeitar `prefers-reduced-motion`. O motion é curto
e não é piscante, então segue dentro de WCAG 2.2 AA; a recomendação AAA (2.3.3) e as boas práticas para
pessoas com sensibilidade vestibular pedem respeitar a preferência do sistema. O botão é a mitigação.
Para voltar ao comportamento anterior, basta o script inline do `<head>` (em `scripts/build.mjs`) não
pôr a classe `motion` quando `matchMedia('(prefers-reduced-motion: reduce)')` for verdadeiro.

`npm run previa` grava `relatorios/previa-motion.webp` com o motion completo.

## Verificação automática (`npm test`)

42 verificações, todas passando em 2026-10-27:

- axe-core (WCAG 2.0/2.1/2.2 A e AA + boas práticas): 0 violações na home (1440 e 390 px),
  na política de privacidade e na 404; console sem erros.
- JavaScript desligado: todos os textos (áreas, FAQ completo, avaliações, horários, endereço, sócias,
  aviso da OAB) estão no HTML; 14 links `wa.me` e 3 `tel:` reais; âncoras válidas; nada nasce invisível.
- Animações: ligadas mesmo com o sistema pedindo menos movimento; todos os reveals completam; o botão
  do rodapé desliga (tudo visível sem rolar), lembra a escolha após recarregar e religa.
- CLS ao carregar e rolar (390 e 1440 px) abaixo de 0,001, que é 0,000 na precisão do Lighthouse.
  Sobra cerca de 0,00001 na troca de fonte da nav (±1 px por palavra entre o fallback e o Lato).
- Teclado: ordem lógica, foco visível, "pular para o conteúdo", carrossel por setas e botões,
  FAQ por Enter, menu mobile abre, prende o foco e fecha com Esc devolvendo o foco ao botão.
- Contraste do texto sobre foto medido em pixel (fundo no percentil 98, texto escondido) em
  360, 390, 768, 1280, 1440 e 1920 px: pior caso 4,57:1.
- JSON-LD: um único `@graph` com `@id` estáveis, FAQPage idêntico ao FAQ visível, sem
  `AggregateRating`/`Review`; NAP igual na página, no JSON-LD e no `llms-full.txt`.
- `robots.txt`, `sitemap.xml`, `llms.txt` no formato, 404 com status 404, CSP sem `unsafe-inline`.
- Screenshots das 6 larguras em `relatorios/screens/` (hero e página inteira).

Validação externa do JSON-LD (validator.schema.org e Rich Results Test) fica para quando houver URL
pública: são serviços de terceiros e o código não foi enviado a eles.

## Decisões técnicas

- **Avaliações sem `AggregateRating`/`Review` no JSON-LD.** O Google não mostra estrelas para
  avaliações publicadas pelo próprio negócio local, e depoimentos são tema sensível no Provimento
  205/2021 do CFOAB. Ficam só como conteúdo visível, com nota e total fixos no `content.json`.
- **JSON-LD:** `LegalService` + `Person` (Andressa, Liriam) + `WebSite` + `WebPage` + `FAQPage`.
  OAB, `foundingDate` e a Dra. Ana só entram quando confirmados. Coordenadas do OpenStreetMap
  (a conferir no Google Maps).
- **Robôs:** busca e ação do usuário liberadas (Googlebot, Bingbot, Applebot, OAI-SearchBot,
  ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User); treinamento
  (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot) configurável, padrão permitir.
  Nomes conferidos na documentação oficial de cada fornecedor em 2026-10-27.
- **Não implementados, de propósito:** `Content-Signal` no `robots.txt` (proposta recente, sem suporte declarado pelos
  principais buscadores; dá para ligar depois se o escritório quiser restringir uso por IA); versão `.md` da
  página (o `llms-full.txt` já é o Markdown completo e é anunciado com `rel="alternate"`);
  `/.well-known/security.txt` (exige um e-mail de contato, pendente).
- **`llms.txt` e `llms-full.txt`** gerados do mesmo `content.json`, sem promessa de resultado;
  servidos com `X-Robots-Tag: noindex` para não concorrer com a página no Google.
- **Título:** um único `<h1>` com o eyebrow e a frase ("Escritório de advocacia · Blumenau · SC:
  Colo pra acolher. Garra pra lutar."), visual igual ao protótipo.
- **Status "Aberto agora":** o HTML traz "Seg a sex, 9h30 às 11h30 e 13h30 às 17h"; um script
  inline de 1 KB logo após o hero troca o texto antes da primeira pintura (sem deslocamento),
  e o JS principal atualiza o resto e repete a cada minuto. Fuso `America/Sao_Paulo`.
- **Tipografia:** Tenor Sans e Lato (400; 300 e 700 declarados, sem uso) em WOFF2 local, subset latino, `font-display:
  swap`, fallback Arial com `size-adjust` e `ascent/descent-override` calculados das métricas reais,
  mais um fallback próprio para as caixas altas espaçadas (nav, rótulos), medido no Chrome.
  Textos de 9,5 a 10,5 px subiram para 12 px; alvos de toque ampliados sem mudar o layout.
  O texto corrido era Lato 300 em cinza, difícil de ler em tela; passou para 400 (mesmo tamanho e cor).
  O botão "Ver no Google" e o dia de hoje na tabela de horários passaram de 700 para 400. Com isso a
  página baixa só um peso de Lato.
- **Imagens:** AVIF q60 (4:2:0), WebP q80, JPEG q82. A q42 anterior borrava cabelo e rostos.
  O limite que sobra é a resolução das fontes (hero 1184 px, retratos 436 px): só os originais resolvem.
- **Contraste:** `--suave` de `#6A7280` para `#626A77` (4,97:1 sobre o creme); texto legal do rodapé
  para `#8A93A2`. Sobre fotos: véu escuro preso ao bloco de texto do hero e gradientes nos retratos
  (o protótipo tinha um bug: o gradiente ficava por baixo da foto e nunca aparecia).
- **Motion:** só `transform` e `opacity`; reveals com `animation-timeline: view()` e
  IntersectionObserver como alternativa; parallax de 6% no hero via `scroll()`; nada escondido sem a
  classe `motion` (posta pelo script inline do `<head>`, ver "Animações"). Exceção consciente: a abertura do FAQ anima a altura (`interpolate-size`) porque é
  disparada pelo clique (não conta para CLS) e evita o salto.
- **Botões flutuantes** somem enquanto a meta do hero, o CTA final ou o rodapé estão na tela (os
  links são os mesmos e não cobrem texto); respeitam `safe-area-inset`.
- **Intervalos de horário:** o protótipo separava as horas com meia-risca; agora é "9h30 às 11h30".
