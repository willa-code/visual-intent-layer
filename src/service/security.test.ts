import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createReviewService } from '../mcp/service.js';
import { confinePath, startLocalService, type LocalService } from './http.js';

const running: LocalService[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()!.stop();
  }
});

async function openedSession(artifactPath: string): Promise<{ service: LocalService; reviewUrl: string; cap: string; sessionId: string }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'vil-sec-'));
  const review = createReviewService({ dataDir });
  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  running.push(service);
  const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
  return { service, reviewUrl: opened.reviewUrl, cap: opened.capability, sessionId: opened.sessionId };
}

describe('security boundary', () => {
  it('sandboxes hostile artifacts without top navigation or network', async () => {
    const { service, reviewUrl } = await openedSession('fixtures/malicious/exfil-attempt.html');
    const response = await fetch(reviewUrl.replace('/review/', '/artifact/'));
    expect(response.status).toBe(200);
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('sandbox');
    expect(csp).not.toContain('allow-top-navigation');
    expect(csp).toContain("connect-src 'none'");
  });

  it('serves the review shell with a restrictive policy', async () => {
    const { reviewUrl } = await openedSession('fixtures/gallery.html');
    const response = await fetch(reviewUrl);
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('refuses symlink escapes from the artifact directory', () => {
    const outside = mkdtempSync(join(tmpdir(), 'vil-outside-'));
    const secret = join(outside, 'secret.txt');
    writeFileSync(secret, 'top secret', 'utf8');
    const inner = mkdtempSync(join(tmpdir(), 'vil-inner-'));
    const link = join(inner, 'evil-link');
    symlinkSync(secret, link);
    expect(confinePath(inner, link)).toBeUndefined();
    const good = join(inner, 'ok.css');
    writeFileSync(good, 'body {}', 'utf8');
    expect(confinePath(inner, good)).toBeDefined();
  });

  it('rejects oversized artifacts and assets', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-big-'));
    const big = join(dir, 'big.html');
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(big, `<!doctype html><html><body>${'x'.repeat(6 * 1024 * 1024)}</body></html>`, 'utf8');
    const { service, reviewUrl } = await openedSession(big);
    const response = await fetch(reviewUrl.replace('/review/', '/artifact/'));
    expect(response.status).toBe(413);
    void service;
  });

  it('caps API request bodies', async () => {
    const { service, sessionId, cap } = await openedSession('fixtures/gallery.html');
    const response = await fetch(`${service.baseUrl}/api/intents?session=${sessionId}&cap=${cap}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope: { padding: 'x'.repeat(2 * 1024 * 1024) } })
    });
    expect(response.status).toBe(413);
  });
});
