// Servidor de preview do dist/ com os mesmos cabeçalhos do .htaccess (CSP, cache) e compressão brotli/gzip.
// Uso: npm run preview   (PORT=4173 por padrão)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib/content.mjs';
import { securityHeaders, cacheControl, MIME } from './lib/headers.mjs';

const DIST = path.join(ROOT, 'dist');
const COMPRESSIBLE = /\.(html|css|js|json|webmanifest|txt|md|xml|svg|ico)$/;

// Comprime uma vez por arquivo/versão, como uma hospedagem com cache faria; comprimir brotli nível 11
// a cada requisição somava dezenas de ms ao TTFB e fazia o Lighthouse oscilar com a carga da máquina.
const cache = new Map();
function compressed(file, body, enc) {
  const key = `${file}|${fs.statSync(file).mtimeMs}|${enc}`;
  if (!cache.has(key)) cache.set(key, enc === 'br' ? zlib.brotliCompressSync(body) : zlib.gzipSync(body, { level: 9 }));
  return cache.get(key);
}

export function startServer(port = Number(process.env.PORT) || 4173) {
  const server = http.createServer((req, res) => {
    // relido a cada requisição: os hashes da CSP mudam a cada build
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, '.cache', 'build-meta.json'), 'utf8'));
    const sec = securityHeaders({ ...meta, preview: true });
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, urlPath);
    if (!file.startsWith(DIST)) { res.writeHead(400).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: urlPath + '/' }).end(); return; }
      file = path.join(file, 'index.html');
    }
    let status = 200;
    if (!fs.existsSync(file)) { status = 404; file = path.join(DIST, '404.html'); urlPath = '/404.html'; }
    const ext = path.extname(file);
    let body = fs.readFileSync(file);
    const headers = { ...sec, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl(urlPath), Vary: 'Accept-Encoding' };
    const ae = req.headers['accept-encoding'] || '';
    if (COMPRESSIBLE.test(ext)) {
      const enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : null;
      if (enc) { body = compressed(file, body, enc); headers['Content-Encoding'] = enc; }
    }
    headers['Content-Length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const s = await startServer();
  console.log(`Preview em http://localhost:${s.address().port}`);
}
