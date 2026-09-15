import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
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

async function opened(artifactPath: string): Promise<{ service: LocalService; cap: string; sessionId: string }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'vil-sec-'));
  const review = createReviewService({ dataDir });
  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  running.push(service);
  const session = await service.openSession({ kind: 'saved-html', path: artifactPath });
  return { service, cap: session.capability, sessionId: session.sessionId };
}

describe('security boundary', () => {
  it('sandboxes a hostile exfiltration artifact without top navigation or network', async () => {
    const { service, cap, sessionId } = await opened('fixtures/malicious/exfil-attempt.html');
    const response = await fetch(`${service.baseUrl}/artifact/${sessionId}`, { headers: { 'x-session-cap': cap } });
    expect(response.status).toBe(200);
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('sandbox');
    expect(csp).not.toContain('allow-top-navigation');
    expect(csp).toContain("connect-src 'none'");
  });

  it('refuses a symlink that escapes the artifact directory', () => {
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

  it('does not permit a declared remote origin to become a data channel', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-sec-remote-'));
    writeFileSync(
      join(dir, 'page.html'),
      '<!doctype html><html><head><link rel="stylesheet" href="https://cdn.example.com/a.css"></head><body>x</body></html>',
      'utf8'
    );
    const { service, cap, sessionId } = await opened(join(dir, 'page.html'));
    const response = await fetch(`${service.baseUrl}/artifact/${sessionId}`, { headers: { 'x-session-cap': cap } });
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('https://cdn.example.com');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("base-uri 'none'");
  });

  it('confines the asset route to the artifact directory', async () => {
    const { service, cap, sessionId } = await opened('fixtures/gallery.html');
    const response = await fetch(`${service.baseUrl}/artifact/${sessionId}/..%2F..%2Fpackage.json`, {
      headers: { 'x-session-cap': cap }
    });
    expect(response.status).not.toBe(200);
  });
});