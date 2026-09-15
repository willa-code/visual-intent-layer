import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRevision } from '../artifact/revision.js';
import type { OpenArtifactInput, ReviewService } from '../mcp/service.js';
import { fetchAppRevision } from '../mcp/service.js';
import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import { SessionRecords, type SessionRecord } from './sessions.js';

export type LocalServiceOptions = {
  dataDir: string;
  reviewService: ReviewService;
  port?: number;
};

export type OpenedSession = {
  sessionId: string;
  reviewUrl: string;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  capability: string;
};

export type LocalService = {
  baseUrl: string;
  address: string;
  port: number;
  openSession(input: OpenArtifactInput): Promise<OpenedSession>;
  stop(): Promise<void>;
};

const MAX_API_BODY_BYTES = 1024 * 1024;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

export async function startLocalService(options: LocalServiceOptions): Promise<LocalService> {
  mkdirSync(options.dataDir, { recursive: true });
  const sessions = new SessionRecords(options.dataDir);
  const server = createServer((request, response) => {
    void handleRequest(request, response, options.reviewService, sessions).catch((error: unknown) => {
      sendText(response, 500, error instanceof Error ? error.message : 'internal error');
    });
  });
  const port = await listen(server, options.port ?? 3742);
  const baseUrl = `http://127.0.0.1:${port}`;

  async function openSession(input: OpenArtifactInput): Promise<OpenedSession> {
    const opened = await options.reviewService.openArtifact(input, baseUrl);
    return {
      sessionId: opened.sessionId,
      reviewUrl: opened.reviewUrl,
      artifact: opened.artifact,
      capability: opened.capability
    };
  }

  async function stop(): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
  }

  return { baseUrl, address: '127.0.0.1', port, openSession, stop };
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolvePromise(address.port);
      } else {
        rejectPromise(new Error('Failed to determine bound port'));
      }
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  review: ReviewService,
  sessions: SessionRecords
): Promise<void> {
  if (!isAllowedHost(request)) {
    sendText(response, 403, 'Forbidden: untrusted Host');
    return;
  }
  if (!isAllowedOrigin(request)) {
    sendText(response, 403, 'Forbidden: untrusted Origin');
    return;
  }
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/health') {
    sendText(response, 200, 'ok');
    return;
  }
  if (method === 'GET' && url.pathname.startsWith('/ui/')) {
    serveUiAsset(response, url.pathname.slice('/ui/'.length));
    return;
  }
  const reviewMatch = /^\/review\/([^/]+)$/.exec(url.pathname);
  if (method === 'GET' && reviewMatch) {
    const session = sessions.authorized(reviewMatch[1]!, url.searchParams.get('cap'));
    if (!session) {
      sendText(response, 401, 'Unauthorized: missing or invalid session capability');
      return;
    }
    serveReviewShell(response, session);
    return;
  }
  const artifactMatch = /^\/artifact\/([^/]+)$/.exec(url.pathname);
  if (method === 'GET' && artifactMatch) {
    const session = sessions.authorized(artifactMatch[1]!, url.searchParams.get('cap'));
    if (!session) {
      sendText(response, 401, 'Unauthorized: missing or invalid session capability');
      return;
    }
    serveArtifact(response, session);
    return;
  }
  const assetMatch = /^\/assets\/([^/]+)\/(.+)$/.exec(url.pathname);
  if (method === 'GET' && assetMatch) {
    const session = sessions.authorized(assetMatch[1]!, url.searchParams.get('cap'));
    if (!session) {
      sendText(response, 401, 'Unauthorized: missing or invalid session capability');
      return;
    }
    serveAsset(response, session, decodeURIComponent(assetMatch[2]!));
    return;
  }
  if (url.pathname === '/api/intents' && method === 'POST') {
    const session = authorizedApiSession(request, url, sessions);
    if (!session) {
      sendText(response, 401, 'Unauthorized: missing or invalid session capability');
      return;
    }
    const body = await readBoundedBody(request, response);
    if (body === undefined) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendText(response, 400, 'Invalid JSON body');
      return;
    }
    const envelopeJson = (parsed as { envelope?: unknown })['envelope'] ?? parsed;
    try {
      const submitted = await review.submitIntent(envelopeJson, { host: 'browser' });
      sendJson(response, 200, {
        envelopeId: submitted.envelopeId,
        status: submitted.status,
        delivery: submitted.delivery.label
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'submit failed';
      sendText(response, message.startsWith('Invalid Visual Intent Envelope') ? 400 : 409, message);
    }
    return;
  }
  const statusMatch = /^\/api\/intents\/([^/]+)$/.exec(url.pathname);
  if (method === 'GET' && statusMatch) {
    const session = authorizedApiSession(request, url, sessions);
    if (!session) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    try {
      sendJson(response, 200, review.getIntent(decodeURIComponent(statusMatch[1]!)));
    } catch (error) {
      sendText(response, 404, error instanceof Error ? error.message : 'not found');
    }
    return;
  }
  const resolutionsMatch = /^\/api\/intents\/([^/]+)\/resolutions$/.exec(url.pathname);
  if (method === 'POST' && resolutionsMatch) {
    const session = authorizedApiSession(request, url, sessions);
    if (!session) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const body = await readBoundedBody(request, response);
    if (body === undefined) {
      return;
    }
    const parsed = JSON.parse(body) as { revision?: string; candidates?: ResolutionCandidate[] };
    if (typeof parsed.revision !== 'string' || !Array.isArray(parsed.candidates)) {
      sendText(response, 400, 'Expected { revision: string, candidates: ResolutionCandidate[] }');
      return;
    }
    try {
      const envelopeId = decodeURIComponent(resolutionsMatch[1]!);
      const record = review.store.get(envelopeId);
      if (!record) {
        sendText(response, 404, `Unknown envelope ${envelopeId}`);
        return;
      }
      review.store.recordSourceRevision(envelopeId, parsed.revision);
      const resolutions = record.envelope.targets.map((target) => {
        const result = resolveTarget(target, parsed.candidates ?? []);
        return {
          targetId: target.targetId,
          outcome: result.outcome,
          candidateCount: result.candidates.length
        };
      });
      const updated = review.store.recordResolution(envelopeId, resolutions);
      sendJson(response, 200, { envelopeId, status: updated.status, resolutions: updated.resolutions });
    } catch (error) {
      sendText(response, 400, error instanceof Error ? error.message : 'resolution failed');
    }
    return;
  }
  const verifyMatch = /^\/api\/intents\/([^/]+)\/verify$/.exec(url.pathname);
  if (method === 'POST' && verifyMatch) {
    const session = authorizedApiSession(request, url, sessions);
    if (!session) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const body = await readBoundedBody(request, response);
    if (body === undefined) {
      return;
    }
    const parsed = JSON.parse(body) as { verdict?: string; successorId?: string };
    const verdict = parsed.verdict;
    if (!isVerdict(verdict)) {
      sendText(response, 400, 'Invalid verdict: expected approve, reject, another-pass, supersede, or obsolete');
      return;
    }
    try {
      const record = review.store.verify(decodeURIComponent(verifyMatch[1]!), verdict, {
        successorId: parsed.successorId
      });
      sendJson(response, 200, { envelopeId: record.envelopeId, status: record.status });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 'verification refused');
    }
    return;
  }
  const sessionMatch = /^\/api\/sessions\/([^/]+)$/.exec(url.pathname);
  if (method === 'GET' && sessionMatch) {
    const session = sessions.authorized(sessionMatch[1]!, url.searchParams.get('cap'));
    if (!session) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    sendJson(response, 200, await sessionStatus(session));
    return;
  }
  sendText(response, 404, 'Not found');
}

function isVerdict(value: unknown): value is 'approve' | 'reject' | 'another-pass' | 'supersede' | 'obsolete' {
  return (
    value === 'approve' ||
    value === 'reject' ||
    value === 'another-pass' ||
    value === 'supersede' ||
    value === 'obsolete'
  );
}

function authorizedApiSession(
  request: IncomingMessage,
  url: URL,
  sessions: SessionRecords
): SessionRecord | undefined {
  const headerCap = request.headers['x-session-cap'];
  const cap = (Array.isArray(headerCap) ? headerCap[0] : headerCap) ?? url.searchParams.get('cap');
  const sessionId = sessionIdFrom(request, url);
  if (!sessionId) {
    return undefined;
  }
  return sessions.authorized(sessionId, cap);
}

function sessionIdFrom(request: IncomingMessage, url: URL): string | undefined {
  const header = request.headers['x-session-id'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return fromHeader ?? url.searchParams.get('session') ?? undefined;
}

function isAllowedHost(request: IncomingMessage): boolean {
  const host = (request.headers['host'] ?? '').toLowerCase();
  return (
    host.startsWith('127.0.0.1:') ||
    host === '127.0.0.1' ||
    host.startsWith('localhost:') ||
    host === 'localhost' ||
    host.startsWith('[::1]')
  );
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers['origin'];
  if (!origin) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  return (
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1') &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  );
}

function artifactFile(session: SessionRecord): string | undefined {
  if (session.kind !== 'saved-html' || !session.source.startsWith('file://')) {
    return undefined;
  }
  return session.source.slice('file://'.length);
}

async function sessionStatus(session: SessionRecord): Promise<Record<string, unknown>> {
  const absolute = artifactFile(session);
  if (absolute) {
    try {
      const bytes = readFileSync(absolute);
      const revision = computeRevision(bytes, []);
      return {
        sessionId: session.sessionId,
        artifactId: session.artifactId,
        openedRevision: session.revision,
        currentRevision: revision,
        changed: revision !== session.revision
      };
    } catch {
      return {
        sessionId: session.sessionId,
        artifactId: session.artifactId,
        openedRevision: session.revision,
        currentRevision: session.revision,
        changed: false,
        unreadable: true
      };
    }
  }
  if (session.kind === 'react-vite-app') {
    try {
      const revision = await fetchAppRevision(session.source);
      return {
        sessionId: session.sessionId,
        artifactId: session.artifactId,
        openedRevision: session.revision,
        currentRevision: revision,
        changed: revision !== session.revision
      };
    } catch {
      return {
        sessionId: session.sessionId,
        artifactId: session.artifactId,
        openedRevision: session.revision,
        currentRevision: session.revision,
        changed: false,
        unreadable: true
      };
    }
  }
  return {
    sessionId: session.sessionId,
    artifactId: session.artifactId,
    openedRevision: session.revision,
    currentRevision: session.revision,
    changed: false
  };
}

function serveReviewShell(response: ServerResponse, session: SessionRecord): void {
  const template = readUiFile('shell.html');
  const artifactSrc = `/artifact/${session.sessionId}?cap=${session.capability}`;
  const html = template
    .replaceAll('__SESSION_ID__', escapeHtml(session.sessionId))
    .replaceAll('__CAPABILITY__', escapeHtml(session.capability))
    .replaceAll('__ARTIFACT_SRC__', escapeHtml(artifactSrc))
    .replaceAll('__ARTIFACT_NAME__', escapeHtml(session.displayName))
    .replaceAll('__ARTIFACT_REVISION__', escapeHtml(session.revision));
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'self'; frame-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

function serveArtifact(response: ServerResponse, session: SessionRecord): void {
  const absolute = artifactFile(session);
  if (!absolute) {
    if (session.kind === 'react-vite-app') {
      serveAppRelay(response, session);
      return;
    }
    sendText(response, 501, 'Unknown artifact kind');
    return;
  }
  if (!existsSync(absolute)) {
    sendText(response, 404, 'Artifact file no longer exists');
    return;
  }
  const confined = confinePath(dirnameOf(absolute), absolute);
  if (!confined) {
    sendText(response, 403, 'Artifact path escapes its directory');
    return;
  }
  const bytes = readFileSync(confined);
  if (bytes.byteLength > MAX_ASSET_BYTES) {
    sendText(response, 413, 'Artifact exceeds the bounded size for local review');
    return;
  }
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      "sandbox allow-scripts allow-same-origin; default-src 'none'; script-src 'unsafe-inline' 'self'; style-src 'unsafe-inline' 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'",
    'x-content-type-options': 'nosniff'
  });
  response.end(bytes);
}

function serveAppRelay(response: ServerResponse, session: SessionRecord): void {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Application review relay</title><style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0}.note{font:12px system-ui;padding:.4rem .8rem;background:#fef3c7}</style></head><body><div class="note">Reviewing the running app at ${escapeHtml(session.source)}. Cross-origin selection needs the instrumented adapter runtime; Rendered Grounding stays available.</div><iframe title="Running application" src="${escapeHtml(session.source)}"></iframe></body></html>`;
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      "default-src 'self'; frame-src http://127.0.0.1:* http://localhost:* https://127.0.0.1:* https://localhost:*; style-src 'unsafe-inline'",
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

function serveAsset(response: ServerResponse, session: SessionRecord, requested: string): void {
  const absolute = artifactFile(session);
  if (!absolute) {
    sendText(response, 501, 'Only saved HTML artifacts serve local assets');
    return;
  }
  const base = dirnameOf(absolute);
  const confined = confinePath(base, join(base, requested));
  if (!confined || !existsSync(confined)) {
    sendText(response, 403, 'Asset path is outside the artifact directory');
    return;
  }
  const stat = lstatSync(confined);
  if (stat.size > MAX_ASSET_BYTES) {
    sendText(response, 413, 'Asset exceeds the bounded size for local review');
    return;
  }
  const bytes = readFileSync(confined);
  response.writeHead(200, {
    'content-type': MIME[extname(confined).toLowerCase()] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff'
  });
  response.end(bytes);
}

export function confinePath(baseDir: string, requestedPath: string): string | undefined {
  const base = resolve(baseDir);
  const resolved = resolve(base, requestedPath);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    return undefined;
  }
  try {
    if (existsSync(resolved)) {
      const real = realpathSync(resolved);
      const realBase = realpathSync(base);
      if (real !== realBase && !real.startsWith(realBase + sep)) {
        return undefined;
      }
      return real;
    }
    return resolved;
  } catch {
    return undefined;
  }
}

function serveUiAsset(response: ServerResponse, name: string): void {
  if (!/^[\w.-]+\.(js|css)$/.test(name)) {
    sendText(response, 404, 'Not found');
    return;
  }
  try {
    const bytes = readUiFile(name);
    response.writeHead(200, {
      'content-type': name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8',
      'x-content-type-options': 'nosniff'
    });
    response.end(bytes);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

function readUiFile(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, '..', 'ui', name), join(here, 'ui', name)];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf8');
    } catch {
      continue;
    }
  }
  throw new Error(`UI asset missing: ${name}`);
}

async function readBoundedBody(request: IncomingMessage, response: ServerResponse): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    total += buffer.byteLength;
    if (total > MAX_API_BODY_BYTES) {
      sendText(response, 413, 'Request body exceeds 1MB');
      return undefined;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(text);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(value, null, 2));
}

function dirnameOf(path: string): string {
  const index = path.lastIndexOf(sep);
  return index === -1 ? '.' : path.slice(0, index) || sep;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
