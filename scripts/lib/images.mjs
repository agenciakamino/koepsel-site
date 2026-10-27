// Pipeline de imagens: AVIF + WebP + JPEG/PNG responsivos a partir de assets-origem/.
// Se existir assets-origem/hd/<nome>.<ext>, ele substitui a fonte automaticamente.
// Nunca amplia: larguras acima da fonte são descartadas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT } from './content.mjs';

const SRC = path.join(ROOT, 'assets-origem');
const CACHE = path.join(ROOT, '.cache', 'img');
const EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'];

const QUALITY = { avif: { quality: 60, effort: 7, chromaSubsampling: '4:2:0' }, webp: { quality: 80, effort: 6 }, jpeg: { quality: 82, mozjpeg: true }, png: { compressionLevel: 9, palette: true, quality: 90, effort: 10 } };

export function findSource(name) {
  for (const dir of [path.join(SRC, 'hd'), SRC]) {
    for (const ext of EXTS) {
      const p = path.join(dir, name + ext);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error(`Imagem de origem não encontrada: ${name}`);
}

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

async function encode(input, fmt, opts) {
  let img = sharp(input, { density: 300 }).rotate();
  if (opts.width) img = img.resize({ width: opts.width, withoutEnlargement: true });
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  if (fmt === 'avif') return img.avif({ ...QUALITY.avif, ...(opts.quality && { quality: opts.quality }) }).toBuffer();
  if (fmt === 'webp') return img.webp({ ...QUALITY.webp, alphaQuality: 90, ...(opts.quality && { quality: opts.quality }) }).toBuffer();
  if (fmt === 'png') return img.png(QUALITY.png).toBuffer();
  return img.jpeg(QUALITY.jpeg).toBuffer();
}

// Gera variantes e grava em dist/assets/img. Retorna metadados para o HTML.
export async function responsive(name, { widths, formats, outDir, fallback, quality = {} }) {
  const file = findSource(name);
  const input = fs.readFileSync(file);
  const meta = await sharp(input).metadata();
  const srcW = meta.width;
  let ws = [...new Set(widths.map((w) => Math.min(w, srcW)))].sort((a, b) => a - b);
  const fb = fallback || (meta.hasAlpha ? 'png' : 'jpeg');
  const fmts = [...formats, fb];
  const key = hash(Buffer.concat([input, Buffer.from(JSON.stringify({ ws, fmts, QUALITY, quality }))]));
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const out = { name, width: srcW, height: meta.height, source: path.relative(ROOT, file), sets: {} };
  for (const fmt of fmts) {
    out.sets[fmt] = [];
    for (const w of ws) {
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      const cached = path.join(CACHE, `${name}-${w}-${key}.${ext}`);
      let buf;
      if (fs.existsSync(cached)) buf = fs.readFileSync(cached);
      else { buf = await encode(input, fmt, { width: w, quality: quality[fmt] }); fs.writeFileSync(cached, buf); }
      const fname = `${name}-${w}.${hash(buf)}.${ext}`;
      fs.writeFileSync(path.join(outDir, fname), buf);
      out.sets[fmt].push({ w, file: fname, bytes: buf.length });
    }
  }
  out.fallback = fb;
  return out;
}

// Ícones e imagem Open Graph gerados a partir do símbolo e do logo
export async function icons({ outDir, publicDir, bg, fg }) {
  fs.mkdirSync(outDir, { recursive: true });
  const sym = fs.readFileSync(findSource('sym'));
  const symw = fs.readFileSync(findSource('symw'));
  const logow = fs.readFileSync(findSource('logow'));

  const square = async (size, pad, background) => {
    const inner = Math.round(size * (1 - pad * 2));
    const glyph = await sharp(sym).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: glyph, gravity: 'center' }]).png(QUALITY.png).toBuffer();
  };
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const written = {};
  const put = (rel, buf) => { const p = path.join(publicDir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); written[rel] = buf.length; };

  const ico16 = await square(16, 0.02, transparent);
  const ico32 = await square(32, 0.04, transparent);
  const ico48 = await square(48, 0.04, transparent);
  put('favicon.ico', toIco([[16, ico16], [32, ico32], [48, ico48]]));
  put('favicon-32.png', ico32);
  put('apple-touch-icon.png', await square(180, 0.16, bg));
  put('icons/icon-192.png', await square(192, 0.14, bg));
  put('icons/icon-512.png', await square(512, 0.14, bg));
  put('icons/maskable-512.png', await square(512, 0.24, bg));

  // Open Graph 1200x630: símbolo grande em marca d'água + logo branco sobre o marinho
  const W = 1200, H = 630;
  const mark = await sharp(symw).resize({ height: 560 }).ensureAlpha().linear([1, 1, 1, 0.07], [0, 0, 0, 0]).toBuffer();
  const logo = await sharp(logow).resize({ width: 720 }).toBuffer();
  const og = await sharp({ create: { width: W, height: H, channels: 3, background: fg } })
    .composite([{ input: mark, gravity: 'center' }, { input: logo, gravity: 'center' }])
    .jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const ogName = `og-koepsel.${hash(og)}.jpg`;
  fs.writeFileSync(path.join(outDir, ogName), og);
  return { written, og: { file: ogName, width: W, height: H } };
}

// ICO com PNGs embutidos (aceito por todos os navegadores atuais)
function toIco(list) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(list.length, 4);
  const dir = Buffer.alloc(16 * list.length);
  let offset = 6 + dir.length;
  list.forEach(([size, png], i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...list.map((x) => x[1])]);
}
