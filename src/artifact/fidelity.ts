export type RemoteOrigins = {
  stylesheet: string[];
  font: string[];
  image: string[];
  other: string[];
};

export type FidelityAnalysis = {
  html: string;
  remote: RemoteOrigins;
};

const NON_NAVIGABLE = /^(data|blob|mailto|tel|javascript|about|chrome|chrome-extension|file):/i;
const URL_IN_CSS = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const IMPORT_IN_CSS = /@import\s+(?:url\(\s*)?(['"]?)([^'")]+)\1/gi;

export function emptyRemoteOrigins(): RemoteOrigins {
  return { stylesheet: [], font: [], image: [], other: [] };
}

export function rewriteHtml(
  html: string,
  assetBasePath: string,
  readLocalCss?: (relativePath: string) => string | undefined
): FidelityAnalysis {
  const remote = emptyRemoteOrigins();
  const base = assetBasePath.replace(/\/+$/, '');

  const withAttributes = html.replace(
    /(<[a-z][^>]*?\s)(src|href|poster|action|data-src)=("([^"]*)"|'([^']*)')/gi,
    (match, prefix: string, attribute: string, _raw: string, dq: string | undefined, sq: string | undefined) => {
      const value = dq ?? sq ?? '';
      const kind = attributeKind(prefix, attribute);
      const resolved = resolveUrl(value, base, kind, remote);
      const quote = dq !== undefined ? '"' : "'";
      return `${prefix}${attribute}=${quote}${resolved}${quote}`;
    }
  );

  const withSrcset = withAttributes.replace(
    /(<(?:img|source)[^>]*?\s)srcset=("([^"]*)"|'([^']*)')/gi,
    (match, prefix: string, _raw: string, dq: string | undefined, sq: string | undefined) => {
      const value = dq ?? sq ?? '';
      const rewritten = value
        .split(',')
        .map((part) => {
          const [url, ...descriptor] = part.trim().split(/\s+/);
          const resolved = resolveUrl(url ?? '', base, 'image', remote);
          return [resolved, ...descriptor].join(' ');
        })
        .join(', ');
      const quote = dq !== undefined ? '"' : "'";
      return `${prefix}srcset=${quote}${rewritten}${quote}`;
    }
  );

  const withInlineStyle = withSrcset.replace(
    /(<[a-z][^>]*?\sstyle=)("([^"]*)"|'([^']*)')/gi,
    (match, prefix: string, _raw: string, dq: string | undefined, sq: string | undefined) => {
      const value = dq ?? sq ?? '';
      const quote = dq !== undefined ? '"' : "'";
      return `${prefix}style=${quote}${rewriteCssUrls(value, base, remote)}${quote}`;
    }
  );

  const withLocalCss = withInlineStyle.replace(
    /<link\b[^>]*?\shref=("([^"]*)"|'([^']*)')[^>]*>/gi,
    (tag, _raw: string, dq: string | undefined, sq: string | undefined) => {
      if (!/rel\s*=\s*['"]?stylesheet/i.test(tag)) {
        return tag;
      }
      const href = dq ?? sq ?? '';
      const relative = localRelativePath(href, base);
      if (!relative || !readLocalCss) {
        return tag;
      }
      const css = readLocalCss(relative);
      if (css) {
        rewriteCssUrls(css, base, remote);
      }
      return tag;
    }
  );

  const withStyleBlocks = withLocalCss.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (tag, css: string) => {
    return tag.replace(css, rewriteCssUrls(css, base, remote));
  });

  return { html: withStyleBlocks, remote: dedupeOrigins(remote) };
}

export function injectArtifactLayerScript(
  html: string,
  sessionId: string,
  attributes: Record<string, string> = {}
): string {
  const extra = Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value.replace(/"/g, '&quot;')}"`)
    .join('');
  const script = `<script src="/ui/artifact-layer.js" data-session="${sessionId}"${extra} defer></script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  return `${html}\n${script}`;
}

export function rewriteCss(css: string, assetBasePath: string): { css: string; remote: RemoteOrigins } {
  const remote = emptyRemoteOrigins();
  const rewritten = rewriteCssUrls(css, assetBasePath.replace(/\/+$/, ''), remote);
  return { css: rewritten, remote: dedupeOrigins(remote) };
}

function rewriteCssUrls(css: string, base: string, remote: RemoteOrigins): string {
  const withImports = css.replace(IMPORT_IN_CSS, (match, _quote: string, url: string) => {
    const resolved = resolveUrl(url, base, 'stylesheet', remote);
    return match.replace(url, resolved);
  });
  return withImports.replace(URL_IN_CSS, (match, _quote: string, url: string) => {
    const resolved = resolveUrl(url, base, 'font', remote);
    return match.replace(url, resolved);
  });
}

function attributeKind(prefix: string, attribute: string): keyof RemoteOrigins {
  const lower = prefix.toLowerCase();
  if (/<link\b/.test(lower)) {
    return 'stylesheet';
  }
  if (/<(img|source|video|input)\b/.test(lower)) {
    return 'image';
  }
  if (/<script\b/.test(lower)) {
    return 'other';
  }
  if (attribute === 'action') {
    return 'other';
  }
  return 'other';
}

function resolveUrl(value: string, base: string, kind: keyof RemoteOrigins, remote: RemoteOrigins): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#') || NON_NAVIGABLE.test(trimmed)) {
    return value;
  }
  if (trimmed.startsWith('//')) {
    const host = trimmed.slice(2).split('/')[0];
    if (host) {
      addOrigin(remote[kind], `https://${host}`);
      addOrigin(remote[kind], `http://${host}`);
    }
    return value;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      addOrigin(remote[kind], new URL(trimmed).origin);
    } catch {
      return value;
    }
    return value;
  }
  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }
  try {
    const resolved = new URL(trimmed, `http://vil.local${base}/`);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return value;
  }
}

function localRelativePath(href: string, base: string): string | undefined {
  if (!href.startsWith(`${base}/`)) {
    return undefined;
  }
  const relative = href.slice(base.length + 1).split(/[?#]/)[0] ?? '';
  return relative.length > 0 ? safeDecode(relative) : undefined;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function addOrigin(list: string[], origin: string): void {
  if (!list.includes(origin)) {
    list.push(origin);
  }
}

function dedupeOrigins(remote: RemoteOrigins): RemoteOrigins {
  return {
    stylesheet: [...new Set(remote.stylesheet)],
    font: [...new Set(remote.font)],
    image: [...new Set(remote.image)],
    other: [...new Set(remote.other)]
  };
}

export function remoteOriginsList(remote: RemoteOrigins): string[] {
  return [...new Set([...remote.stylesheet, ...remote.font, ...remote.image, ...remote.other])];
}

export function contentSecurityPolicyFor(remote: RemoteOrigins): string {
  const style = ["'self'", "'unsafe-inline'", ...remote.stylesheet].join(' ');
  const font = ["'self'", 'data:', ...remote.font].join(' ');
  const image = ["'self'", 'data:', 'blob:', ...remote.image].join(' ');
  const media = ["'self'", 'blob:', ...remote.image].join(' ');
  return [
    'sandbox allow-scripts allow-same-origin',
    "default-src 'none'",
    `script-src 'self' 'unsafe-inline'`,
    `style-src ${style}`,
    `img-src ${image}`,
    `font-src ${font}`,
    `media-src ${media}`,
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "object-src 'none'"
  ].join('; ');
}

export function applicationContentSecurityPolicy(): string {
  return [
    'sandbox allow-scripts allow-same-origin allow-forms allow-popups',
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "base-uri 'self'",
    "frame-src 'self'",
    "object-src 'none'"
  ].join('; ');
}