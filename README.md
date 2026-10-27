# Koepsel Advogados: site

Site institucional do escritório **Koepsel Advogados** (Blumenau/SC), em HTML, CSS e JavaScript puros,
gerado por um build em Node que entrega arquivos 100% estáticos.

**Prévia para aprovação:** https://agenciakamino.github.io/koepsel-site/
(endereço provisório, fora do Google de propósito; o endereço definitivo será o domínio do escritório)

## Resultado

Medido com Lighthouse 13.5, mediana de 3 execuções, animações ligadas:

| Dispositivo | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | Peso total |
|---|---|---|---|---|---|---|---|
| Celular (4G simulado) | 100 | 100 | 100 | 100 | 1,9 s | 0 | 164 KB |
| Desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 161 KB |

Primeira carga no celular: 16 KB de HTML, CSS e JS comprimidos e uma foto de 69 KB. Mais 42 verificações
automáticas (`npm test`) passam: acessibilidade com axe-core, site completo sem JavaScript, teclado,
contraste sobre foto, layout estável, dados estruturados e arquivos para buscadores e IA.

## O que o site tem

**Design.** Segue o protótipo aprovado pelo escritório: paleta, tipografia, composição e textos. A única
mudança de texto foi a troca de travessões por pontuação comum. Ajustes de engenharia (contraste,
tamanho mínimo de texto, áreas de toque) sem alterar o visual.

**Desempenho.**
- Imagens em AVIF e WebP com várias larguras, o navegador escolhe a menor adequada.
- Fontes hospedadas no próprio site, com fallback de métricas calculadas para a página não "pular".
- CSS essencial dentro do HTML (nenhuma requisição bloqueando a pintura) e 2 KB de JavaScript.
- Cache de 1 ano nos arquivos com hash no nome e HTML sempre revalidado.

**SEO.**
- Título, descrição, canonical, Open Graph e favicon completos.
- Dados estruturados (JSON-LD) de escritório de advocacia, advogadas, FAQ e página, com endereço,
  telefone e horários iguais aos da página.
- `sitemap.xml`, `robots.txt` e página 404 própria.
- SEO local para Blumenau e áreas de atuação, com HTML completo que não depende de JavaScript.

**Preparado para agentes de IA.**
- Todo o conteúdo está no HTML, sem precisar executar scripts.
- `llms.txt` e `llms-full.txt` gerados do mesmo conteúdo.
- `robots.txt` com política por robô: busca e ações pedidas por usuários liberadas; treinamento de
  modelos configurável.

**Funcional.**
- Links reais de WhatsApp (com mensagem diferente por origem do clique) e de telefone.
- Status "Aberto agora" pelo fuso de Brasília, menu mobile acessível, carrossel de avaliações e FAQ.
- Animações discretas, com botão no rodapé para desativá-las.
- Página de política de privacidade e 404 com o mesmo design.

**Segurança.** Quando hospedado em Apache, o `.htaccess` gerado força HTTPS, define o domínio canônico
e aplica cabeçalhos de segurança, incluindo CSP sem `unsafe-inline`.

## Como rodar

Requer Node 22 ou mais novo e, para `test` e `lighthouse`, o Google Chrome instalado.

```bash
npm ci
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Gera o site, abre em http://localhost:4173 e gera de novo ao salvar |
| `npm run build` | Gera a pasta `dist/` |
| `npm run preview` | Serve `dist/` com os cabeçalhos de produção (CSP, cache, brotli) |
| `npm run check` | Lista pendências de conteúdo e procura travessão; `-- --prod` falha se houver pendência |
| `npm test` | Verificação completa (axe, sem JS, teclado, contraste, JSON-LD, screenshots) |
| `npm run lighthouse` | Lighthouse mobile e desktop, 3 execuções (`-- --url=https://...` mede uma URL publicada) |
| `npm run previa` | Grava uma animação curta do site em `relatorios/` |

## Editar o conteúdo

Todo texto do site, das meta tags, do JSON-LD e do `llms.txt` vem de **`src/content.json`**. Edite só
os valores entre aspas, rode `npm run build` e `npm run check`.

- Dado que ainda falta fica como `[[PENDENTE: descrição]]`. No site aparece como "a confirmar" e não
  entra nos dados estruturados. `npm run check -- --prod` bloqueia a publicação definitiva enquanto
  houver algum.
- Nunca usar travessão: o `check` falha se encontrar um.
- Links só `https:`, `tel:` ou `mailto:`; o build recusa outros esquemas.

## Trocar as imagens

As imagens de origem ficam em `assets-origem/`. Para usar um original melhor, salve o arquivo com o
**mesmo nome** em `assets-origem/hd/` (por exemplo `assets-origem/hd/team.jpg`) e rode o build: ele passa
a usá-lo e gera tamanhos maiores sozinho (nunca amplia além da fonte). Para o logo em vetor, salve
`assets-origem/hd/logow.svg`.

| Arquivo | Uso |
|---|---|
| `team` | foto principal no topo da página |
| `duo` | seção "Onde estamos" |
| `and`, `lir` | retratos das sócias |
| `logow`, `logo` | logo (versão branca e colorida) |
| `sym`, `symw` | símbolo: favicon, ícones, imagem de compartilhamento e marca d'água |

## Publicação

**Prévia (GitHub Pages).** Todo push na branch `main` publica sozinho, via
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). O build usa `BASE_PATH=/koepsel-site`, que
ajusta os caminhos para a subpasta, marca todas as páginas com `noindex` e bloqueia robôs. Para gerar
a mesma versão localmente:

```bash
BASE_PATH=/koepsel-site SITE_URL=https://agenciakamino.github.io/koepsel-site npm run build
```

**Produção (domínio do escritório).** Depende de domínio e hospedagem definidos.

1. `npm run check -- --prod` precisa passar (sem pendências de conteúdo).
2. `npm run build` (use `SITE_URL=https://outro-dominio.com npm run build` se o domínio mudar).
3. Enviar **todo** o conteúdo de `dist/` para a raiz pública, **incluindo o `.htaccess`** (arquivo oculto).
4. Medir a URL final com `npm run lighthouse -- --url=https://dominio/` e validar os dados estruturados
   no Rich Results Test.

Hospedagens que não usam Apache (Netlify, Cloudflare Pages, Vercel) precisam dos mesmos cabeçalhos em
formato próprio; veja [docs/DECISOES.md](docs/DECISOES.md).

## Estrutura

```
src/content.json        todo o conteúdo editável
src/styles/             estilos (as @font-face entram no build)
src/js/                 comportamento (main.js) e status de horário
scripts/build.mjs       build; scripts/lib/ tem templates, imagens, fontes, SEO e cabeçalhos
scripts/check.mjs       trava de pendências e de travessão
scripts/verify.mjs      verificação automática (npm test)
scripts/lighthouse.mjs  medição de desempenho (npm run lighthouse)
assets-origem/          imagens de origem (a subpasta hd/ substitui quando existir)
docs/DECISOES.md        decisões técnicas, medições e verificação em detalhe
.github/workflows/      publicação da prévia no GitHub Pages
```

## Licença

Código e conteúdo desenvolvidos pela [Agência Kamino](https://github.com/agenciakamino) para a Koepsel
Advogados. Todos os direitos reservados; as marcas, fotos e textos pertencem ao escritório.
