// Fontes hospedadas localmente (WOFF2, subset latino do Fontsource, cobre os acentos do português)
// e fontes de fallback com métricas ajustadas para não haver deslocamento na troca.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import lato from '@capsizecss/metrics/lato';
import tenor from '@capsizecss/metrics/tenorSans';
import arial from '@capsizecss/metrics/arial';
import { ROOT } from './content.mjs';

const FS = path.join(ROOT, 'node_modules', '@fontsource');
const FACES = [
  { family: 'Tenor Sans', weight: 400, file: path.join(FS, 'tenor-sans', 'files', 'tenor-sans-latin-400-normal.woff2'), id: 'tenor-400' },
  { family: 'Lato', weight: 300, file: path.join(FS, 'lato', 'files', 'lato-latin-300-normal.woff2'), id: 'lato-300' },
  { family: 'Lato', weight: 400, file: path.join(FS, 'lato', 'files', 'lato-latin-400-normal.woff2'), id: 'lato-400' },
  { family: 'Lato', weight: 700, file: path.join(FS, 'lato', 'files', 'lato-latin-700-normal.woff2'), id: 'lato-700' },
];
// Mesmo unicode-range do subset latino do Fontsource
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const pct = (n) => `${(n * 100).toFixed(2)}%`;

function fallback(name, font, base = arial, factor = 1) {
  const sizeAdjust = ((font.xWidthAvg / font.unitsPerEm) / (base.xWidthAvg / base.unitsPerEm)) * factor;
  const upm = font.unitsPerEm * sizeAdjust;
  return `@font-face{font-family:"${name}";src:local("Arial"),local("ArialMT"),local("Liberation Sans"),local("Helvetica");size-adjust:${pct(sizeAdjust)};ascent-override:${pct(font.ascent / upm)};descent-override:${pct(Math.abs(font.descent) / upm)};line-gap-override:${pct(font.lineGap / upm)}}`;
}

export function buildFonts(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = {};
  const css = [];
  for (const f of FACES) {
    const buf = fs.readFileSync(f.file);
    const name = `${f.id}.${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)}.woff2`;
    fs.writeFileSync(path.join(outDir, name), buf);
    files[f.id] = { url: `/assets/fonts/${name}`, bytes: buf.length };
    css.push(`@font-face{font-family:"${f.family}";font-style:normal;font-weight:${f.weight};font-display:swap;src:url(/assets/fonts/${name}) format("woff2");unicode-range:${LATIN}}`);
  }
  // xWidthAvg é medido em minúsculas; nas caixas altas espaçadas (nav, rótulos) o Arial ficava 2,6% mais
  // largo que o Lato e deslocava os links da nav na troca de fonte. Fator medido no Chrome com os textos reais.
  css.push(fallback('Lato Fallback', lato), fallback('Lato Caps Fallback', lato, arial, 0.9742), fallback('Tenor Sans Fallback', tenor));
  return { css: css.join('\n'), files };
}
