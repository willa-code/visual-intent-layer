import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createReviewService } from '../mcp/service.js';
import { confinePath, startLocalService, type LocalService } from './http.js';

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

const running: LocalService[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()!.stop();
  }
});

async function setup(): Promise<{ service: LocalService; baseUrl: string }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-'));
  const review = createReviewService({ dataDir });
  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  running.push(service);
  return { service, baseUrl: service.baseUrl };
}

describe('local service', () => {
  it('binds to loopback only', async () => {
    const { service } = await setup();
    expect(service.address).toBe('127.0.0.1');
  });

  it('serves health without a capability', async () => {
    const { baseUrl } = await setup();
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('ok');
  });

  it('refuses review routes without a valid session capability', async () => {
    const { baseUrl } = await setup();
    const response = await fetch(`${baseUrl}/review/session-nope`);
    expect(response.status).toBe(401);
  });

  it('opens a session and serves the review shell with the capability', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-shell-'));
    const review = createReviewService({ dataDir });
    const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
    running.push(service);
    const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    expect(opened.reviewUrl).toContain('cap=');
    const response = await fetch(opened.reviewUrl);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Explore');
    expect(html).toContain('Select');
  });

  it('serves the artifact sandboxed in an isolated frame', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-artifact-'));
    const review = createReviewService({ dataDir });
    const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
    running.push(service);
    const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const artifactUrl = opened.reviewUrl.replace('/review/', '/artifact/');
    const response = await fetch(artifactUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain('sandbox');
    expect(await response.text()).toContain('Summer gallery');
  });

  it('rejects cross-origin browser requests', async () => {
    const { baseUrl } = await setup();
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://evil.example.com' }
    });
    expect(response.status).toBe(403);
  });

  it('rejects requests with a foreign Host header', async () => {
    const { service } = await setup();
    const status = await rawStatus('GET /health HTTP/1.1\r\nHost: evil.example.com\r\nConnection: close\r\n\r\n', service.port);
    expect(status).toBe(403);
  });

  it('never serves files outside the artifact directory', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-http-confine-'));
    const review = createReviewService({ dataDir });
    const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
    running.push(service);
    const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const cap = opened.reviewUrl.split('cap=')[1];
    const response = await fetch(`${service.baseUrl}/assets/${opened.sessionId}/..%2F..%2Fpackage.json?cap=${cap}`);
    expect(response.status).not.toBe(200);
    expect(confinePath('/tmp/review', '/tmp/review/../package.json')).toBeUndefined();
    expect(confinePath('/tmp/review', '/etc/passwd')).toBeUndefined();
    expect(confinePath('/tmp/review', '/tmp/review/style.css')).toBeDefined();
  });
});
