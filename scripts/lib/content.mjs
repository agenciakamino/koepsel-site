// Leitura do arquivo de conteúdo e helpers de pendência.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const CONTENT_FILE = path.join(ROOT, 'src', 'content.json');

export const PENDING_RE = /\[\[PENDENTE(?::\s*([^\]]*))?\]\]/g;

export function loadContent() {
  return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
}

export const isPending = (v) => typeof v === 'string' && /\[\[PENDENTE/.test(v);

// Texto visível de um dado que pode estar pendente
export const shown = (v, fallback = 'a confirmar') => (isPending(v) ? fallback : v);

// Lista [{caminho, descricao}] de todas as pendências do conteúdo
export function listPending(obj = loadContent(), base = '') {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(PENDING_RE)) out.push({ caminho: p, descricao: (m[1] || '').trim() || '(sem descrição)' });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!k.startsWith('_')) walk(x, p ? `${p}.${k}` : k); }
  };
  walk(obj, base);
  return out;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

// URLs vindas do content.json: só https, tel e mailto, sempre escapadas para atributo
export function url(v, schemes = ['https:', 'tel:', 'mailto:']) {
  let u;
  try { u = new URL(v); } catch { throw new Error(`URL inválida em src/content.json: ${v}`); }
  if (!schemes.includes(u.protocol)) throw new Error(`Esquema não permitido em src/content.json: ${v}`);
  return esc(u.href);
}

export const tel = (v) => {
  if (!/^\+\d{10,15}$/.test(v)) throw new Error(`Telefone inválido em src/content.json (use +55DDDNUMERO): ${v}`);
  return `tel:${v}`;
};
