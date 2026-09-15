import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createReviewService } from '../src/mcp/service.js';
import { startLocalService, type LocalService } from '../src/service/http.js';
import { buildEnvelope } from '../src/ui/composer.js';

const running: LocalService[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()!.stop();
  }
});

describe('Visual Direction Loop (primary seam)', () => {
  it('opens, selects, delivers, observes a revision, re-resolves, and verifies', async () => {
    const workdir = mkdtempSync(join(tmpdir(), 'vil-loop-'));
    const artifactPath = join(workdir, 'page.html');
    copyFileSync('fixtures/gallery.html', artifactPath);
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-loop-data-'));
    const review = createReviewService({ dataDir });
    const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
    running.push(service);

    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    expect(opened.reviewUrl).toContain('/review/');
    const shell = await fetch(opened.reviewUrl);
    expect(shell.status).toBe(200);
    expect(await shell.text()).toContain('Select');

    const envelope = buildEnvelope({
      envelopeId: 'env-loop-1',
      idempotencyKey: 'idem-loop-1',
      artifact: {
        id: opened.artifact.id,
        kind: 'saved-html',
        revision: opened.artifact.revision,
        displayName: 'page.html'
      },
      targets: [
        {
          targetId: 't-1',
          kind: 'element',
          grounding: {
            selectors: ['main > button.checkout-submit'],
            boundingBox: { x: 320, y: 480, width: 200, height: 44, viewportWidth: 1280, viewportHeight: 800 },
            semanticRole: 'button',
            accessibleName: 'Place order'
          },
          label: 'Place order button'
        }
      ],
      direction: 'Make the Place order button impossible to miss.',
      deliveryIntent: 'next-pass'
    });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const submitted = await fetch(`${service.baseUrl}/api/intents?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope })
    });
    expect(submitted.status).toBe(200);

    await review.acknowledgeIntent('env-loop-1', 'agent-1');
    expect(review.getIntent('env-loop-1').status).toBe('agent-acknowledged');

    writeFileSync(
      artifactPath,
      (await (await fetch(opened.reviewUrl.replace('/review/', '/artifact/'))).text()).replace(
        '<button class="checkout-submit"',
        '<div class="wrapper"><button class="checkout-submit"'
      ).replace('</button>', '</button></div>')
    );
    const sessionStatus = (await (
      await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`)
    ).json()) as { changed: boolean; currentRevision: string };
    expect(sessionStatus.changed).toBe(true);

    const resolutions = await fetch(`${service.baseUrl}/api/intents/env-loop-1/resolutions?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        revision: sessionStatus.currentRevision,
        candidates: [
          {
            nodeId: 'node-1',
            selectors: ['main > div.wrapper > button.checkout-submit'],
            tag: 'button',
            semanticRole: 'button',
            accessibleName: 'Place order',
            text: 'Place order',
            ancestorChain: ['body', 'main.gallery-page', 'div.wrapper'],
            siblingIndex: 0,
            siblingCount: 1,
            boundingBox: { x: 320, y: 120, width: 200, height: 44 }
          }
        ]
      })
    });
    const resolved = (await resolutions.json()) as {
      resolutions: Array<{ targetId: string; outcome: string }>;
    };
    expect(resolved.resolutions[0]!.outcome).toBe('recovered');

    const verified = await fetch(`${service.baseUrl}/api/intents/env-loop-1/verify?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verdict: 'approve' })
    });
    expect(((await verified.json()) as { status: string }).status).toBe('verified');

    const restarted = createReviewService({ dataDir });
    expect(restarted.getIntent('env-loop-1').status).toBe('verified');
  });
});
