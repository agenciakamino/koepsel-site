// Cabeçalhos HTTP: fonte única para o .htaccess (produção) e para o servidor de preview local.

export function csp({ scriptHashes = [], styleHashes = [], analytics = false, preview = false }) {
  const g = analytics ? ' https://www.googletagmanager.com' : '';
  const gc = analytics ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' : '';
  const d = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.map((h) => `'${h}'`).join(' ')}${g}`.trim(),
    `style-src 'self' ${styleHashes.map((h) => `'${h}'`).join(' ')}`.trim(),
    `img-src 'self'${gc}`,
    "font-src 'self'",
    `connect-src 'self'${gc}`,
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];
  if (!preview) d.push('upgrade-insecure-requests');
  return d.join('; ');
}

export function securityHeaders(opts) {
  const h = {
    'Content-Security-Policy': csp(opts),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  };
  if (!opts.preview) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

export function cacheControl(urlPath) {
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (/\.(html?)$/.test(urlPath) || urlPath.endsWith('/')) return 'no-cache';
  if (/\.(png|ico|jpg|webmanifest)$/.test(urlPath)) return 'public, max-age=86400';
  return 'public, max-age=3600';
}

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// .htaccess para Apache/cPanel
export function htaccess({ host, headers }) {
  const hdr = Object.entries(headers)
    .filter(([k]) => k !== 'Strict-Transport-Security')
    .map(([k, v]) => `  Header always set ${k} "${v.replace(/"/g, '\\"')}"`)
    .join('\n');
  return `# Koepsel Advogados: gerado por scripts/build.mjs (não editar à mão; edite scripts/lib/headers.mjs)
# Canonical: https://${host}/ (sem www). Requer Apache 2.4 com mod_rewrite, mod_headers e mod_deflate ou mod_brotli.

Options -Indexes -MultiViews
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset utf-8

<IfModule mod_mime.c>
  AddType image/avif .avif
  AddType image/webp .webp
  AddType font/woff2 .woff2
  AddType application/manifest+json .webmanifest
  AddType text/markdown .md
  AddType text/plain .txt
  AddCharset utf-8 .html .css .js .txt .md .xml .webmanifest
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  # Host canônico (sem www): qualquer outro host vai direto para https://${host}
  RewriteCond %{HTTP_HOST} !^${host.replace(/\./g, '\\.')}$ [NC]
  RewriteRule ^ https://${host}%{REQUEST_URI} [L,R=301,NE]
  # HTTPS forçado (considera proxy/CDN que termina o TLS e repassa X-Forwarded-Proto)
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !^https$ [NC]
  RewriteRule ^ https://${host}%{REQUEST_URI} [L,R=301,NE]
  # /index.html vira /
  RewriteCond %{THE_REQUEST} \\s/+(.*/)?index\\.html[\\s?] [NC]
  RewriteRule ^(.*/)?index\\.html$ /$1 [L,R=301]
</IfModule>

<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/css text/plain text/markdown text/javascript application/javascript application/json application/ld+json application/manifest+json application/xml image/svg+xml image/x-icon
</IfModule>
# gzip só quando não houver brotli (os dois juntos comprimiriam duas vezes)
<IfModule !mod_brotli.c>
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css text/plain text/markdown text/javascript application/javascript application/json application/ld+json application/manifest+json application/xml image/svg+xml image/x-icon
  </IfModule>
</IfModule>

<IfModule mod_headers.c>
${hdr}
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains" "expr=%{HTTPS} == 'on'"
  Header unset X-Powered-By

  <If "%{REQUEST_URI} =~ m#^/assets/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
  <ElseIf "%{REQUEST_URI} =~ m#(\\.html|/)$#">
    Header set Cache-Control "no-cache"
  </ElseIf>
  <ElseIf "%{REQUEST_URI} =~ m#\\.(png|ico|jpg|webmanifest)$#">
    Header set Cache-Control "public, max-age=86400"
  </ElseIf>
  <Else>
    Header set Cache-Control "public, max-age=3600"
  </Else>
  <FilesMatch "\\.(txt|md)$">
    Header set X-Robots-Tag "noindex"
  </FilesMatch>
</IfModule>
`;
}
