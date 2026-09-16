import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, type AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
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

function startStubApp(initialBody: string): Promise<{ url: string; setBody: (next: string) => void; stop: () => Promise<void> }> {
  let body = initialBody;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(body);
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolvePromise({
        url: `http://127.0.0.1:${address.port}/`,
        setBody: (next) => {
          body = next;
        },
        stop: () => new Promise<void>((done) => server.close(() => done()))
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

describe('application mode proxy', () => {
  it('proxies a running local app through the review service origin and makes its DOM selectable', async () => {
    const app = await startStubApp('<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><button id="cta">Ship it</button></body></html>');
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

  it('observes revision changes in a running local app', async () => {
    const app = await startStubApp('<h1>version one</h1>');
    try {
      const { service } = await setup();
      const opened = await service.openSession({ kind: 'react-vite-app', url: app.url });
      const before = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { changed: boolean };
      expect(before.changed).toBe(false);
      app.setBody('<h1>version two longer body</h1>');
      const after = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
      ).json()) as { changed: boolean };
      expect(after.changed).toBe(true);
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