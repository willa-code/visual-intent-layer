import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { createReviewService } from '../mcp/service.js';
import { startLocalService, type LocalService } from './http.js';

const running: LocalService[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()!.stop();
  }
});

describe('observe, re-resolve, verify', () => {
  it('submits an envelope, observes a new revision, re-resolves, and verifies by hand', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-verify-'));
    const review = createReviewService({ dataDir });
    const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
    running.push(service);
    const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;

    const envelope = {
      ...structuredClone(representativeEnvelope),
      artifact: {
        id: opened.artifact.id,
        kind: 'saved-html',
        revision: opened.artifact.revision,
        displayName: 'gallery.html'
      }
    };
    const submitted = await fetch(`${service.baseUrl}/api/intents?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope })
    });
    expect(submitted.status).toBe(200);

    const statusBefore = await fetch(`${service.baseUrl}/api/intents/${envelope.envelopeId}?${auth}`);
    expect(((await statusBefore.json()) as { status: string }).status).toBe('host-accepted');

    const resolutions = await fetch(`${service.baseUrl}/api/intents/${envelope.envelopeId}/resolutions?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        revision: 'blake3:1'.padEnd(71, '1'),
        candidates: [
          {
            nodeId: 'node-5',
            selectors: ['main > button.checkout-submit'],
            tag: 'button',
            semanticRole: 'button',
            accessibleName: 'Place order',
            text: 'Place order',
            ancestorChain: ['body', 'main.gallery-page', 'div.wrapper'],
            siblingIndex: 0,
            siblingCount: 1,
            boundingBox: { x: 320, y: 120, width: 200, height: 44 }
          },
          {
            nodeId: 'node-6',
            selectors: ['main p.shipping-note'],
            tag: 'p',
            semanticRole: 'paragraph',
            accessibleName: 'Order now. Arrives Thursday if you order today.',
            text: 'Order now. Arrives Thursday if you order today.',
            ancestorChain: ['body', 'main.gallery-page'],
            siblingIndex: 3,
            siblingCount: 5,
            boundingBox: { x: 320, y: 540, width: 420, height: 22 }
          }
        ]
      })
    });
    expect(resolutions.status).toBe(200);
    const resolved = (await resolutions.json()) as {
      status: string;
      resolutions: Array<{ targetId: string; outcome: string }>;
    };
    expect(resolved.resolutions).toHaveLength(2);
    expect(resolved.resolutions.map((entry) => entry.outcome)).toEqual(['recovered', 'recovered']);

    const verified = await fetch(`${service.baseUrl}/api/intents/${envelope.envelopeId}/verify?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verdict: 'approve' })
    });
    expect(verified.status).toBe(200);
    expect(((await verified.json()) as { status: string }).status).toBe('verified');
  });
});
