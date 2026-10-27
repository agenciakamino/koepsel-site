// JSON-LD, robots.txt, sitemap.xml, llms.txt, llms-full.txt e manifest, todos do mesmo content.json.
import { isPending } from './content.mjs';
import { waLink } from './html.mjs';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function jsonld(c, { abs, ogUrl, heroUrl, logoUrl }) {
  const id = (k) => abs(`/#${k}`);
  const org = id('escritorio');
  const areas = c.areas.itens.map((a) => a.titulo);
  const people = c.socias.map((p) => {
    const person = {
      '@type': 'Person',
      '@id': id(p.id),
      name: p.nome,
      jobTitle: p.cargo,
      worksFor: { '@id': org },
      knowsAbout: p.areas,
    };
    if (!isPending(p.oab)) person.identifier = { '@type': 'PropertyValue', propertyID: 'OAB/SC', value: p.oab };
    return person;
  });
  for (const m of c.equipe) {
    if (isPending(m.nomeCompleto)) continue; // só entra com nome completo confirmado
    const person = { '@type': 'Person', '@id': id(m.id), name: m.nomeCompleto, jobTitle: m.cargo, worksFor: { '@id': org }, knowsAbout: m.areas };
    if (!isPending(m.oab)) person.identifier = { '@type': 'PropertyValue', propertyID: 'OAB/SC', value: m.oab };
    people.push(person);
  }
  const business = {
    '@type': 'LegalService',
    '@id': org,
    name: c.site.nome,
    alternateName: c.site.nomeGoogle,
    description: c.site.resumoEntidade,
    url: abs('/'),
    telephone: c.contato.telefoneSchema,
    image: [heroUrl, ogUrl],
    logo: { '@type': 'ImageObject', url: logoUrl },
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${c.endereco.rua}, ${c.endereco.local}`,
      addressLocality: c.endereco.cidade,
      addressRegion: c.endereco.uf,
      postalCode: c.endereco.cep,
      addressCountry: c.endereco.pais,
    },
    geo: { '@type': 'GeoCoordinates', latitude: c.endereco.latitude, longitude: c.endereco.longitude },
    hasMap: c.google.mapa,
    openingHoursSpecification: c.horario.faixas.map((f) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: c.horario.diasUteis.map((d) => DAYS[d]),
      opens: f.abre,
      closes: f.fecha,
    })),
    areaServed: { '@type': 'City', name: `${c.endereco.cidade}, ${c.endereco.uf}` },
    knowsAbout: areas,
    knowsLanguage: 'pt-BR',
    founder: c.socias.map((p) => ({ '@id': id(p.id) })),
    employee: people.map((p) => ({ '@id': p['@id'] })),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: c.contato.telefoneSchema,
      url: waLink(c, c.whatsapp.padrao),
      availableLanguage: 'pt-BR',
    },
    sameAs: [c.contato.instagram, c.google.mapa],
  };
  if (!isPending(c.sociedade.fundacao)) business.foundingDate = c.sociedade.fundacao;
  if (!isPending(c.sociedade.oab)) business.identifier = { '@type': 'PropertyValue', propertyID: 'OAB/SC', value: c.sociedade.oab };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      business,
      ...people,
      { '@type': 'WebSite', '@id': id('website'), url: abs('/'), name: c.site.nome, inLanguage: c.site.idioma, publisher: { '@id': org } },
      {
        '@type': 'WebPage',
        '@id': id('pagina'),
        url: abs('/'),
        name: c.site.titulo,
        description: c.site.descricao,
        inLanguage: c.site.idioma,
        isPartOf: { '@id': id('website') },
        about: { '@id': org },
        primaryImageOfPage: { '@type': 'ImageObject', url: heroUrl },
      },
      {
        '@type': 'FAQPage',
        '@id': id('duvidas'),
        isPartOf: { '@id': id('pagina') },
        inLanguage: c.site.idioma,
        mainEntity: c.faq.itens.map((f) => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })),
      },
    ],
  };
}

export function robots(c, { abs }) {
  const treino = c.robos.permitirTreinoIA ? 'Allow: /' : 'Disallow: /';
  return `# ${c.site.nome}: robots.txt (gerado de src/content.json)

# Busca e ações pedidas por usuários (assistentes que buscam a página para responder alguém): liberados
User-agent: Googlebot
User-agent: Bingbot
User-agent: Applebot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
Allow: /

# Treinamento de modelos de IA: ${c.robos.permitirTreinoIA ? 'permitido' : 'bloqueado'} (src/content.json > robos.permitirTreinoIA)
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
${treino}

User-agent: *
Allow: /

Sitemap: ${abs('/sitemap.xml')}
`;
}

export function sitemap(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${p.loc}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function manifest(c) {
  return JSON.stringify({
    name: c.site.nome,
    short_name: 'Koepsel',
    description: c.site.descricao,
    lang: c.site.idioma,
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#F7F4EE',
    theme_color: c.site.corTema,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2) + '\n';
}

const addr = (c) => `${c.endereco.rua}, ${c.endereco.local}, ${c.endereco.bairro}, ${c.endereco.cidade}/${c.endereco.uf}, CEP ${c.endereco.cep}`;

function equipeMd(c) {
  const lines = c.socias.map((p) => `- **${p.nome}** (${p.cargo.toLowerCase()}, "${p.apelido.toLowerCase()}"): ${p.areas.join(', ')}.${isPending(p.oab) ? '' : ` OAB/SC ${p.oab}.`}`);
  for (const m of c.equipe) lines.push(`- **${isPending(m.nomeCompleto) ? m.nomeExibicao : m.nomeCompleto}** (${m.cargo.toLowerCase()}): ${m.areas.join(', ')}.${isPending(m.oab) ? '' : ` OAB/SC ${m.oab}.`}`);
  return lines.join('\n');
}

export function llms(c, { abs }) {
  return `# ${c.site.nome}

> ${c.site.resumoEntidade}

Atendimento com hora marcada, ${c.horario.resumo.replace(/^Seg a sex/, 'de segunda a sexta')}, no fuso de Brasília. Contato pelo WhatsApp ${c.contato.telefoneExibicao}. O escritório não promete resultado de causa; a primeira conversa serve para entender a situação e explicar os caminhos possíveis.

## Contato e agendamento

- [Conversar pelo WhatsApp](${waLink(c, c.whatsapp.padrao)}): ${c.contato.telefoneExibicao}, forma principal de agendar
- [Telefone](tel:${c.contato.telefone}): ${c.contato.telefoneExibicao}
- [Como chegar](${c.google.rota}): ${addr(c)}
- [Perfil no Google](${c.google.mapa}): horários, rota e avaliações
- [Instagram](${c.contato.instagram}): ${c.contato.instagramUsuario}

## Páginas

- [Site](${abs('/')}): quem somos, sócias, áreas de atuação, horários, endereço e perguntas frequentes
- [Conteúdo completo em Markdown](${abs('/llms-full.txt')}): o mesmo conteúdo do site em texto limpo

## Áreas de atuação

${c.areas.itens.map((a) => `- ${a.titulo}: ${a.descricao}`).join('\n')}

## Opcional

- [Política de privacidade](${abs('/politica-de-privacidade/')})
`;
}

export function llmsFull(c, { abs }) {
  return `# ${c.site.nome}

> ${c.site.resumoEntidade}

Site oficial: ${abs('/')}

## Quem somos

${c.escritorio.titulo} ${c.escritorio.tituloDestaque}

${c.escritorio.texto}

## Equipe

${equipeMd(c)}

${c.socias.map((p) => `### ${p.nome}\n\n${p.texto}\n\n> "${p.citacao}"`).join('\n\n')}

## Áreas de atuação em ${c.endereco.cidade}

${c.areas.itens.map((a) => `### ${a.titulo}\n\n${a.descricao} Responsável: ${a.responsaveis}.\n\nPara pedir orientação: [WhatsApp](${waLink(c, c.whatsapp.area.replace('{area}', a.titulo))}).`).join('\n\n')}

## Como trabalhamos

${c.banda.linha1} ${c.banda.linha2} ${c.banda.texto}

## Endereço, horários e contato

- Endereço: ${addr(c)}
- Coordenadas: ${c.endereco.latitude}, ${c.endereco.longitude}
- Horário: ${c.horario.resumo} (segunda a sexta). Sábado e domingo: fechado. Atendimento com hora marcada.
- Telefone e WhatsApp: ${c.contato.telefoneExibicao} (${c.contato.telefone})
- WhatsApp direto: ${waLink(c, c.whatsapp.padrao)}
- Google Maps: ${c.google.mapa}
- Instagram: ${c.contato.instagram}

## Como agendar

Envie uma mensagem pelo WhatsApp ${c.contato.telefoneExibicao}. O atendimento pode continuar pelo WhatsApp ou ser marcado presencialmente na ${c.endereco.local}, no ${c.endereco.bairro}, em ${c.endereco.cidade}/${c.endereco.uf}.

## Perguntas frequentes

${c.faq.itens.map((f) => `### ${f.pergunta}\n\n${f.resposta}`).join('\n\n')}

## Aviso

${c.rodape.aviso}
`;
}
