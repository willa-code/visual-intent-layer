import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, type AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReviewService } from '../mcp/service.js';
import { autoOpenSuppressed } from './browser.js';
import { confinePath, startLocalService, type LocalService } from './http.js';

const running: LocalService[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()!.stop();
  }
});

async function setup(): Promise<{ service: LocalService; baseUrl: string; dataDir: string }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-'));
  const review = createReviewService({ dataDir });
  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  running.push(service);
  return { service, baseUrl: service.baseUrl, dataDir };
}

async function openGallery(service: LocalService): Promise<{ sessionId: string; capability: string; reviewUrl: string; artifactId: string; revision: string }> {
  const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
  return {
    sessionId: opened.sessionId,
    capability: opened.capability,
    reviewUrl: opened.reviewUrl,
    artifactId: opened.artifact.id,
    revision: opened.artifact.revision
  };
}

type CapturedRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

function startStubApp(initialBody: string): Promise<{
  url: string;
  setBody: (next: string) => void;
  stop: () => Promise<void>;
  requests: CapturedRequest[];
  wsMessages: string[];
}> {
  let body = initialBody;
  let origin = '';
  const requests: CapturedRequest[] = [];
  const wsMessages: string[] = [];
  const upgradeSockets = new Set<import('node:stream').Duplex>();
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => {
      const captured: CapturedRequest = {
        method: request.method ?? 'GET',
        url: request.url ?? '/',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8')
      };
      requests.push(captured);
      if (captured.url.startsWith('/echo')) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            method: captured.method,
            body: captured.body,
            custom: request.headers['x-custom'] ?? null,
            cookie: request.headers['cookie'] ?? null,
            host: request.headers['host'] ?? null
          })
        );
        return;
      }
      if (captured.url.startsWith('/redirect')) {
        response.writeHead(302, { location: `${origin}redirected/here?x=1` });
        response.end();
        return;
      }
      if (captured.url.startsWith('/offsite')) {
        response.writeHead(302, { location: 'https://example.com/away' });
        response.end();
        return;
      }
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(body);
    });
  });
  server.on('upgrade', (_request, socket) => {
    upgradeSockets.add(socket);
    socket.on('close', () => upgradeSockets.delete(socket));
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: stub\r\n\r\n'
    );
    socket.on('data', (chunk) => {
      wsMessages.push(chunk.toString('utf8'));
      socket.write(chunk);
    });
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      origin = `http://127.0.0.1:${address.port}/`;
      resolvePromise({
        url: origin,
        setBody: (next) => {
          body = next;
        },
        stop: () =>
          new Promise<void>((done) => {
            for (const socket of upgradeSockets) {
              socket.destroy();
            }
            server.close(() => done());
            server.closeAllConnections?.();
          }),
        requests,
        wsMessages
      });
    });
  });
}

function rawStatus(payload: string, port: number): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const socket = connect(port, '127.0.0.1', () => socket.write(payload));
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
    });
    socket.on('close', () => {
      const match = /^HTTP\/1\.1 (\d+)/.exec(data);
      if (match) {
        resolvePromise(Number(match[1]));
      } else {
        rejectPromise(new Error(`Unparseable response: ${data.slice(0, 120)}`));
      }
    });
    socket.on('error', rejectPromise);
  });
}

function upgradeThroughProxy(
  port: number,
  path: string,
  cookie: string
): Promise<{ status: number; echoed: boolean }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const socket = connect(port, '127.0.0.1');
    const probe = 'ping-through-proxy';
    let text = '';
    let probeSent = false;
    const timer = setTimeout(() => {
      socket.destroy();
      rejectPromise(new Error(`Upgrade timed out: ${text.slice(0, 200)}`));
    }, 5000);
    socket.on('connect', () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\nCookie: ${cookie}\r\n\r\n`
      );
    });
    socket.on('data', (chunk) => {
      text += chunk.toString('utf8');
      if (!probeSent && text.includes('\r\n\r\n')) {
        probeSent = true;
        socket.write(probe);
        return;
      }
      if (probeSent && text.includes(probe)) {
        clearTimeout(timer);
        socket.destroy();
        const match = /^HTTP\/1\.1 (\d+)/.exec(text);
        resolvePromise({ status: match ? Number(match[1]) : 0, echoed: true });
      }
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
  });
}

describe('local service boundary', () => {
  it('binds to loopback only and serves health without a capability', async () => {
    const { service, baseUrl } = await setup();
    expect(service.address).toBe('127.0.0.1');
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('ok');
  });

  it('refuses review routes without a valid session capability', async () => {
    const { baseUrl } = await setup();
    expect((await fetch(`${baseUrl}/review/session-nope`)).status).toBe(401);
  });

  it('ends a session so its capability stops authorizing, without touching another session', async () => {
    const { service, baseUrl } = await setup();
    const opened = await openGallery(service);
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    expect((await fetch(`${baseUrl}/api/sessions/${opened.sessionId}?${auth}`)).status).toBe(200);
    expect((await fetch(`${opened.reviewUrl}`)).status).toBe(200);

    expect(
      (await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/end?${auth}`, { method: 'POST' })).status
    ).toBe(200);
    expect((await fetch(`${baseUrl}/api/sessions/${opened.sessionId}?${auth}`)).status).toBe(401);
    expect((await fetch(`${opened.reviewUrl}`)).status).toBe(401);
    expect(
      (await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/end?${auth}`, { method: 'POST' })).status
    ).toBe(401);

    const other = await openGallery(service);
    const otherAuth = `session=${other.sessionId}&cap=${other.capability}`;
    expect((await fetch(`${baseUrl}/api/sessions/${other.sessionId}/annotations?${otherAuth}`)).status).toBe(200);
    expect((await fetch(`${other.reviewUrl}`)).status).toBe(200);
  });

  it('rejects cross-origin browser requests and foreign Host headers', async () => {
    const { service, baseUrl } = await setup();
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://evil.example.com' } });
    expect(response.status).toBe(403);
    const status = await rawStatus('GET /health HTTP/1.1\r\nHost: evil.example.com\r\nConnection: close\r\n\r\n', service.port);
    expect(status).toBe(403);
  });

  it('never serves files outside the artifact directory', () => {
    expect(confinePath('/tmp/review', '/tmp/review/../package.json')).toBeUndefined();
    expect(confinePath('/tmp/review', '/etc/passwd')).toBeUndefined();
    expect(confinePath('/tmp/review', '/tmp/review/style.css')).toBeDefined();
  });

  it('suppresses automatic opening by environment variable', () => {
    const previous = process.env['VISUAL_INTENT_NO_OPEN'];
    process.env['VISUAL_INTENT_NO_OPEN'] = '1';
    expect(autoOpenSuppressed()).toBe(true);
    process.env['VISUAL_INTENT_NO_OPEN'] = '0';
    expect(autoOpenSuppressed()).toBe(false);
    if (previous === undefined) {
      delete process.env['VISUAL_INTENT_NO_OPEN'];
    } else {
      process.env['VISUAL_INTENT_NO_OPEN'] = previous;
    }
  });
});

describe('session expiry', () => {
  it('expires an idle review, renews it on an act and never on the poll, then reopens it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-expiry-'));
      const review = createReviewService({ dataDir });
      const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
      running.push(service);
      const { sessionId, capability, revision } = await openGallery(service);
      const auth = `session=${sessionId}&cap=${capability}`;
      const expiresAt = () => review.sessions.verifyCapability(sessionId, capability)?.expiresAt;

      expect(expiresAt()).toBe('2026-01-08T00:00:00.000Z');
      await fetch(`${service.baseUrl}/api/sessions/${sessionId}?${auth}`);
      expect(expiresAt()).toBe('2026-01-08T00:00:00.000Z');

      vi.setSystemTime(new Date('2026-01-05T00:00:00.000Z'));
      const act = await fetch(`${service.baseUrl}/api/sessions/${sessionId}/adopted?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision })
      });
      expect(act.status).toBe(200);
      expect(expiresAt()).toBe('2026-01-12T00:00:00.000Z');

      vi.setSystemTime(new Date('2026-01-13T00:00:00.000Z'));
      expect((await fetch(`${service.baseUrl}/api/sessions/${sessionId}?${auth}`)).status).toBe(401);

      const reopened = await fetch(`${service.baseUrl}/api/sessions/${sessionId}/reopen?${auth}`, { method: 'POST' });
      expect(reopened.status).toBe(200);
      expect((await fetch(`${service.baseUrl}/api/sessions/${sessionId}?${auth}`)).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses to reopen a session that was ended rather than expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-ended-'));
      const review = createReviewService({ dataDir });
      const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
      running.push(service);
      const { sessionId, capability } = await openGallery(service);
      const auth = `session=${sessionId}&cap=${capability}`;
      expect((await fetch(`${service.baseUrl}/api/sessions/${sessionId}/end?${auth}`, { method: 'POST' })).status).toBe(200);

      const reopened = await fetch(`${service.baseUrl}/api/sessions/${sessionId}/reopen?${auth}`, { method: 'POST' });
      expect(reopened.status).toBe(409);
      expect(await reopened.text()).toMatch(/ended/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('review shell and asset graph', () => {
  it('serves the shell with capability and prints the review URL', async () => {
    const { service } = await setup();
    const opened = await openGallery(service);
    expect(opened.reviewUrl).toContain('cap=');
    const response = await fetch(opened.reviewUrl);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-artifact-revision');
    expect(html).toContain('/ui/shell.js');
    expect(html).toContain('/ui/shell.css');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('set-cookie')).toBeTruthy();
  });

  it('serves every module the shell needs, so its scripts can actually run', async () => {
    const { baseUrl } = await setup();
    for (const asset of ['shell.js', 'shell.css', 'artifact-layer.js']) {
      const response = await fetch(`${baseUrl}/ui/${asset}`);
      expect(response.status, `${asset} should load`).toBe(200);
      expect((await response.text()).length).toBeGreaterThan(100);
    }
  });

  it('names a navigation off the reviewed document instead of serving an un-instrumented page', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-one-doc-'));
    writeFileSync(join(dir, 'page.html'), '<!doctype html><html><body><a href="second.html">Second</a></body></html>', 'utf8');
    writeFileSync(join(dir, 'second.html'), '<!doctype html><html><body><h1>Second document</h1></body></html>', 'utf8');
    const { service } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: join(dir, 'page.html') });
    const reviewed = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, {
      headers: { 'x-session-cap': opened.capability }
    });
    const reviewedHtml = await reviewed.text();
    expect(reviewedHtml).toContain('/ui/artifact-layer.js');
    expect(reviewedHtml).toContain(`data-address-base="/artifact/${opened.sessionId}"`);

    const offDocument = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}/second.html`, {
      headers: { 'x-session-cap': opened.capability }
    });
    expect(offDocument.status).toBe(200);
    const body = await offDocument.text();
    expect(body).toContain('leaves the reviewed document');
    expect(body).toContain(`/artifact/${opened.sessionId}`);
    expect(body).not.toContain('/ui/artifact-layer.js');
    expect(body).not.toContain('Second document');
  });

  it('serves the dev-only gallery route without linking it from product navigation', async () => {
    const { service, baseUrl } = await setup();
    const galleryResponse = await fetch(`${baseUrl}/gallery`);
    expect(galleryResponse.status).toBe(200);
    expect(await galleryResponse.text()).toContain('gallery.js');
    const shell = await (await fetch((await openGallery(service)).reviewUrl)).text();
    expect(shell).not.toContain('gallery.js');
    expect(shell).not.toContain('href="/gallery"');
  });
});

describe('artifact fidelity', () => {
  it('serves the artifact sandboxed, with runtime data fetches blocked and the interaction layer injected', async () => {
    const { service } = await setup();
    const opened = await openGallery(service);
    const response = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, {
      headers: { 'x-session-cap': opened.capability }
    });
    expect(response.status).toBe(200);
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('sandbox');
    expect(csp).not.toContain('allow-top-navigation');
    expect(csp).toContain("connect-src 'none'");
    const html = await response.text();
    expect(html).toContain('Summer gallery');
    expect(html).toContain('/ui/artifact-layer.js');
    expect(html).toContain(`data-revision="${opened.revision}"`);
  });

  it('rewrites relative and root-relative URLs so the artifact keeps its own assets', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-fidelity-'));
    writeFileSync(join(dir, 'styles.css'), 'body { color: #123; }', 'utf8');
    writeFileSync(
      join(dir, 'page.html'),
      '<!doctype html><html><head><link rel="stylesheet" href="styles.css" /></head><body><img src="/images/logo.png" /><p>Hello</p></body></html>',
      'utf8'
    );
    const { service } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: join(dir, 'page.html') });
    const html = await (
      await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, { headers: { 'x-session-cap': opened.capability } })
    ).text();
    expect(html).toContain(`href="/artifact/${opened.sessionId}/styles.css"`);
    expect(html).toContain(`src="/artifact/${opened.sessionId}/images/logo.png"`);
    const css = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}/styles.css`, {
      headers: { 'x-session-cap': opened.capability }
    });
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toContain('text/css');
  });

  it('permits the declared remote stylesheet, font and image origins while keeping data requests blocked', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-remote-'));
    writeFileSync(
      join(dir, 'page.html'),
      `<!doctype html><html><head>
        <link rel="stylesheet" href="https://cdn.example.com/site.css" />
        <style>@font-face { font-family: X; src: url(https://fonts.example.net/x.woff2); }</style>
      </head><body><img src="https://images.example.org/hero.png" /><script>fetch('https://api.example.com/data')</script></body></html>`,
      'utf8'
    );
    const { service } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: join(dir, 'page.html') });
    const artifact = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, {
      headers: { 'x-session-cap': opened.capability }
    });
    const csp = artifact.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('https://cdn.example.com');
    expect(csp).toContain('https://fonts.example.net');
    expect(csp).toContain('https://images.example.org');
    expect(csp).toContain("connect-src 'none'");

    const policy = (await (
      await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/policy`, {
        headers: { 'x-session-cap': opened.capability }
      })
    ).json()) as { contactsRemote: boolean; remoteOrigins: string[] };
    expect(policy.contactsRemote).toBe(true);
    expect(policy.remoteOrigins).toContain('https://cdn.example.com');
  });

  it('serves the revision the direction was written against for before/after comparison', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-before-'));
    writeFileSync(join(dir, 'page.html'), '<!doctype html><html><body><button>Before</button></body></html>', 'utf8');
    const { service } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: join(dir, 'page.html') });
    await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, { headers: { 'x-session-cap': opened.capability } });
    writeFileSync(join(dir, 'page.html'), '<!doctype html><html><body><button>After</button></body></html>', 'utf8');
    const before = await (
      await fetch(`${service.baseUrl}/artifact/${opened.sessionId}/before`, { headers: { 'x-session-cap': opened.capability } })
    ).text();
    expect(before).toContain('Before');
    expect(before).toContain('data-mode="before"');
  });
});

describe('Annotation API', () => {
  it('creates a durable Annotation, queues it, sends one batch, and verifies it by hand', async () => {
    const { service, baseUrl } = await setup();
    const opened = await openGallery(service);
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const createResponse = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        targets: [
          {
            targetId: 't-1',
            kind: 'element',
            grounding: {
              selectors: ['main > button'],
              boundingBox: { x: 1, y: 2, width: 3, height: 4 },
              semanticRole: 'button',
              accessibleName: 'Buy',
              structuralContext: { ancestorChain: ['body', 'main'], siblingIndex: 0, siblingCount: 1 }
            },
            provenanceConfidence: 'unavailable'
          }
        ]
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as { annotation: { annotationId: string } };

    const patched = (await (
      await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}?${auth}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Make the button bigger.' })
      })
    ).json()) as { annotation: { note: string } };
    expect(patched.annotation.note).toBe('Make the button bigger.');

    const queueResponse = await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/queue?${auth}`, { method: 'POST' });
    expect(queueResponse.status).toBe(200);

    const sendResponse = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/send?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'next-pass' })
    });
    expect(sendResponse.status).toBe(200);
    const sent = (await sendResponse.json()) as { envelopeId: string; annotationIds: string[] };
    expect(sent.annotationIds).toEqual([created.annotation.annotationId]);

    const resend = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/send?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'next-pass' })
    });
    expect(resend.status).toBe(409);
    expect(await resend.text()).toMatch(/nothing to send/i);

    const resolved = (await (
      await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/resolve?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revision: opened.revision,
          candidates: [
            {
              nodeId: 'node-1',
              selectors: ['main > button'],
              tag: 'button',
              semanticRole: 'button',
              accessibleName: 'Buy',
              text: 'Buy',
              ancestorChain: ['body', 'main'],
              siblingIndex: 0,
              siblingCount: 1,
              boundingBox: { x: 1, y: 2, width: 3, height: 4 }
            }
          ]
        })
      })
    ).json()) as { resolutions: Array<{ match: string }> };
    expect(resolved.resolutions[0]?.match).toBe('exact');

    const verified = await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/verify?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verdict: 'approve' })
    });
    expect(verified.status).toBe(200);
    expect(((await verified.json()) as { annotation: { state: string } }).annotation.state).toBe('verified');
  });

  it('refuses an oversized or disallowed attachment visibly without reading it', async () => {
    const { service, baseUrl } = await setup();
    const opened = await openGallery(service);
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const created = (await (
      await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targets: [
            {
              targetId: 't-1',
              kind: 'element',
              renderedGrounding: { selectors: ['main'], boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
              provenanceConfidence: 'unavailable'
            }
          ]
        })
      })
    ).json()) as { annotation: { annotationId: string } };

    const refused = await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/attachments?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/pdf' },
      body: Buffer.alloc(2048)
    });
    expect(refused.status).toBe(415);
    expect(await refused.text()).toMatch(/not an allowed/i);

    const oversizeStatus = await rawStatus(
      `POST /api/annotations/${created.annotation.annotationId}/attachments?session=${opened.sessionId}&cap=${opened.capability} HTTP/1.1\r\n` +
        `Host: 127.0.0.1:${service.port}\r\n` +
        'Content-Type: image/png\r\n' +
        `Content-Length: ${10 * 1024 * 1024}\r\n` +
        'Connection: close\r\n\r\n',
      service.port
    );
    expect(oversizeStatus).toBe(415);
  });

  it('caps API request bodies', async () => {
    const { service, baseUrl } = await setup();
    const opened = await openGallery(service);
    const response = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?session=${opened.sessionId}&cap=${opened.capability}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) })
    });
    expect(response.status).toBe(413);
  });
});

describe('proxied application', () => {
  it('serves the application through the review origin with a policy that lets it work', async () => {
    const app = await startStubApp(
      '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><button id="cta">Ship it</button></body></html>'
    );
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const artifact = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, {
        headers: { 'x-session-cap': opened.capability },
        redirect: 'manual'
      });
      expect(artifact.status).toBe(302);
      expect(artifact.headers.get('location')).toBe(`/app/${opened.sessionId}/`);

      const proxied = await fetch(`${service.baseUrl}/app/${opened.sessionId}/`, {
        headers: { 'x-session-cap': opened.capability }
      });
      expect(proxied.status).toBe(200);
      const html = await proxied.text();
      expect(html).toContain('Ship it');
      expect(html).toContain(`/app/${opened.sessionId}/style.css`);
      expect(html).toContain('/ui/artifact-layer.js');
      const policy = proxied.headers.get('content-security-policy') ?? '';
      expect(policy).toContain("connect-src 'self'");
      expect(policy).toContain("form-action 'self'");
      expect(policy).not.toContain("connect-src 'none'");

      const disclosure = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/policy?cap=${opened.capability}`)
      ).json()) as { kind: string; application?: { permits: string[]; note: string } };
      expect(disclosure.kind).toBe('proxied-application');
      expect(disclosure.application?.permits.join(' ')).toMatch(/review origin/i);
    } finally {
      await app.stop();
    }
  });

  it('forwards method, body and headers, and removes the review capability', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const response = await fetch(`${service.baseUrl}/app/${opened.sessionId}/echo`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-custom': 'kept',
          'x-session-cap': opened.capability,
          cookie: `vil_cap=${opened.capability}; theme=dark`
        },
        body: 'name=Ada&note=hello'
      });
      expect(response.status).toBe(200);
      const captured = (await response.json()) as { method: string; body: string; custom: string; cookie: string; host: string };
      expect(captured.method).toBe('POST');
      expect(captured.body).toBe('name=Ada&note=hello');
      expect(captured.custom).toBe('kept');
      expect(captured.cookie).toBe('theme=dark');
      expect(captured.host).not.toBe(`127.0.0.1:${service.port}`);
    } finally {
      await app.stop();
    }
  });

  it('forwards other browser methods instead of coercing them to GET', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const response = await fetch(`${service.baseUrl}/app/${opened.sessionId}/echo`, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain', 'x-session-cap': opened.capability },
        body: 'replace-me'
      });
      const captured = (await response.json()) as { method: string; body: string };
      expect(captured.method).toBe('PUT');
      expect(captured.body).toBe('replace-me');
    } finally {
      await app.stop();
    }
  });

  it('rewrites an upstream-origin redirect back to the proxy origin', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const response = await fetch(`${service.baseUrl}/app/${opened.sessionId}/redirect`, {
        headers: { 'x-session-cap': opened.capability },
        redirect: 'manual'
      });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(`/app/${opened.sessionId}/redirected/here?x=1`);
    } finally {
      await app.stop();
    }
  });

  it('refuses a redirect that leaves the review origin', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const response = await fetch(`${service.baseUrl}/app/${opened.sessionId}/offsite`, {
        headers: { 'x-session-cap': opened.capability },
        redirect: 'manual'
      });
      expect(response.status).toBe(502);
    } finally {
      await app.stop();
    }
  });

  it('proxies the application update channel through the review origin', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const { status, echoed } = await upgradeThroughProxy(
        service.port,
        `/app/${opened.sessionId}/hmr`,
        `vil_cap=${opened.capability}`
      );
      expect(status).toBe(101);
      expect(echoed).toBe(true);
      expect(app.wsMessages.join('')).toContain('ping-through-proxy');
    } finally {
      await app.stop();
    }
  });

  it('refuses a non-loopback upstream origin', async () => {
    const { service } = await setup();
    await expect(service.openSession({ kind: 'react-vite-app', url: 'https://prod.example.com/' })).rejects.toThrow(
      /loopback/i
    );
  });

  it('derives a file-level revision from a supplied source root, and says it is file-level', async () => {
    const app = await startStubApp('<h1>app</h1>');
    const root = mkdtempSync(join(tmpdir(), 'vil-app-src-'));
    writeFileSync(join(root, 'App.tsx'), 'export const App = () => null;\n', 'utf8');
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    writeFileSync(join(root, 'node_modules', 'dep.js'), 'dependency\n', 'utf8');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url, sourceRoot: root });
      const before = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { revisionBasis: string; changed: boolean; currentRevision: string };
      expect(before.revisionBasis).toBe('files');
      writeFileSync(join(root, 'App.tsx'), 'export const App = () => null; // edited\n', 'utf8');
      const after = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { changed: boolean; currentRevision: string };
      expect(after.changed).toBe(true);
      expect(after.currentRevision).not.toBe(before.currentRevision);
      writeFileSync(join(root, 'node_modules', 'dep.js'), 'dependency changed\n', 'utf8');
      const ignored = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { currentRevision: string };
      expect(ignored.currentRevision).toBe(after.currentRevision);
    } finally {
      await app.stop();
    }
  });

  it('observes revision changes in a running local app with no source root', async () => {
    const app = await startStubApp('<h1>version one</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const before = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { changed: boolean, revisionBasis: string };
      expect(before.changed).toBe(false);
      expect(before.revisionBasis).toBe('document');
      app.setBody('<h1>version two longer body</h1>');
      const after = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { changed: boolean };
      expect(after.changed).toBe(true);
    } finally {
      await app.stop();
    }
  });

  it('records the revision the artifact reports as the Adopted Revision, and stamps a new Annotation with it', async () => {
    const app = await startStubApp('<h1>app</h1>');
    try {
      const { service, baseUrl } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
      const reported = (await (
        await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/adopted?${auth}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ revision: 'blake3:' + 'a'.repeat(64) })
        })
      ).json()) as { adoptedRevision: string };
      expect(reported.adoptedRevision).toBe('blake3:' + 'a'.repeat(64));

      const created = (await (
        await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            targets: [
              {
                targetId: 't-1',
                kind: 'element',
                renderedGrounding: { selectors: ['h1'], boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
                provenanceConfidence: 'unavailable',
                runtimeState: { address: 'settings?tab=2' }
              }
            ]
          })
        })
      ).json()) as { annotation: { writtenRevision: string; targets: Array<{ runtimeState?: { address?: string } }> } };
      expect(created.annotation.writtenRevision).toBe('blake3:' + 'a'.repeat(64));
      expect(created.annotation.targets[0]?.runtimeState?.address).toBe('settings?tab=2');
    } finally {
      await app.stop();
    }
  });
});

describe('port selection', () => {
  it('names the port and the next action when a requested port is already in use', async () => {
    const first = await setup();
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-conflict-'));
    await expect(
      startLocalService({ dataDir, reviewService: createReviewService({ dataDir }), port: first.service.port })
    ).rejects.toThrow(new RegExp(`Port ${first.service.port} is already in use.*--port`, 's'));
  });

  it('binds an operating-system-chosen port when asked for port 0', async () => {
    const { service } = await setup();
    expect(service.port).toBeGreaterThan(0);
    expect(service.baseUrl).toBe(`http://127.0.0.1:${service.port}`);
  });
});

describe('oversized artifacts', () => {
  it('refuses an artifact larger than the bounded size', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-big-'));
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'big.html'), `<!doctype html><html><body>${'x'.repeat(6 * 1024 * 1024)}</body></html>`, 'utf8');
    const { service } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: join(dir, 'big.html') });
    const response = await fetch(`${service.baseUrl}/artifact/${opened.sessionId}`, {
      headers: { 'x-session-cap': opened.capability }
    });
    expect(response.status).toBe(413);
    void readFileSync;
  });
});
describe('reload adopts the revision without moving the session revision', () => {
  it('keeps annotation-route authorisation after a reload, and before/after never resolve to one revision', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-adopt-'));
    const file = join(dir, 'page.html');
    writeFileSync(file, '<!doctype html><html><body><button class="cta">Before</button></body></html>', 'utf8');
    const { service, baseUrl } = await setup();
    const opened = await service.openSession({ kind: 'saved-html', path: file });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;

    await fetch(`${baseUrl}/artifact/${opened.sessionId}`, { headers: { 'x-session-cap': opened.capability } });

    const created = (await (
      await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targets: [
            {
              targetId: 't-1',
              kind: 'element',
              renderedGrounding: { selectors: ['button.cta'], boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
              provenanceConfidence: 'unavailable'
            }
          ]
        })
      })
    ).json()) as { annotation: { annotationId: string; writtenRevision: string } };
    await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/queue?${auth}`, { method: 'POST' });
    await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/send?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'next-pass' })
    });

    writeFileSync(file, '<!doctype html><html><body><button class="cta">After a real change</button></body></html>', 'utf8');
    const before = (await (await fetch(`${baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)).json()) as {
      openedRevision: string;
      adoptedRevision: string;
      currentRevision: string;
      changed: boolean;
    };
    expect(before.changed).toBe(true);
    expect(before.openedRevision).toBe(opened.artifact.revision);
    expect(before.adoptedRevision).toBe(opened.artifact.revision);

    const reloaded = (await (
      await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/reload?${auth}`, { method: 'POST' })
    ).json()) as { adoptedRevision: string; currentRevision: string; openedRevision: string; changed: boolean };
    expect(reloaded.changed).toBe(false);
    expect(reloaded.openedRevision).toBe(opened.artifact.revision);
    expect(reloaded.adoptedRevision).toBe(reloaded.currentRevision);
    expect(reloaded.adoptedRevision).not.toBe(opened.artifact.revision);

    const stillAuthorised = await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}?${auth}`);
    expect(stillAuthorised.status).toBe(200);

    const after = await (
      await fetch(`${baseUrl}/artifact/${opened.sessionId}`, { headers: { 'x-session-cap': opened.capability } })
    ).text();
    const beforeDoc = await (
      await fetch(`${baseUrl}/artifact/${opened.sessionId}/before`, { headers: { 'x-session-cap': opened.capability } })
    ).text();
    expect(after).toContain('After a real change');
    expect(beforeDoc).toContain('Before');
    expect(after).not.toBe(beforeDoc);
  });
});

describe('delivery intent the surface cannot produce', () => {
  it('a draft intent creates no batch and moves no Annotation, and a delivered Annotation cannot be edited in place', async () => {
    const { service, baseUrl } = await setup();
    const opened = await openGallery(service);
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const created = (await (
      await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targets: [
            {
              targetId: 't-1',
              kind: 'element',
              renderedGrounding: { selectors: ['main'], boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
              provenanceConfidence: 'unavailable'
            }
          ]
        })
      })
    ).json()) as { annotation: { annotationId: string } };

    const draft = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/send?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'draft' })
    });
    expect(draft.status).toBe(400);
    expect(await draft.text()).toMatch(/Next-Pass Intent/);
    const afterDraft = (await (await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)).json()) as {
      annotations: Array<{ state: string }>;
      passes: unknown[];
    };
    expect(afterDraft.annotations[0]?.state).toBe('draft');
    expect(afterDraft.passes).toHaveLength(0);

    await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}/queue?${auth}`, { method: 'POST' });
    await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/send?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'next-pass' })
    });

    const patch = await fetch(`${baseUrl}/api/annotations/${created.annotation.annotationId}?${auth}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'rewritten in place' })
    });
    expect(patch.status).toBe(400);
    expect(await patch.text()).toMatch(/cannot be edited in place/);

    const amended = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/amend?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ annotationId: created.annotation.annotationId, note: 'amended instead' })
    });
    expect(amended.status).toBe(200);
    expect((await amended.json()) as Record<string, unknown>).toMatchObject({ intent: 'steering' });

    const interrupted = await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/interruptions?${auth}`, { method: 'POST' });
    expect(interrupted.status).toBe(200);
    expect((await interrupted.json()) as Record<string, unknown>).toMatchObject({ interruptionId: expect.stringMatching(/^int-/) });

    const agent = (await (await fetch(`${baseUrl}/api/sessions/${opened.sessionId}/agent?cap=${opened.capability}`)).json()) as {
      pendingInterruption: boolean;
      channel: string;
    };
    expect(agent.pendingInterruption).toBe(true);
    expect(['held-call', 'next-check-in']).toContain(agent.channel);
  });
});
