import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createReviewService } from '../src/mcp/service.js';
import { startLocalService, type LocalService } from '../src/service/http.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const ARTIFACT_V1 = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Loop artifact</title>
    <style>
      body { margin: 0; background: rgb(250, 250, 250); font-family: system-ui, sans-serif; }
      .checkout-submit { color: rgb(9, 8, 7); font-size: 20px; padding: 12px 20px; }
    </style>
  </head>
  <body>
    <main class="checkout">
      <h1>Checkout</h1>
      <img class="logo" src="logo.png" alt="Logo" />
      <button class="checkout-submit" type="button">Place order</button>
      <p class="shipping-note">Order now. Arrives Thursday if you order today.</p>
    </main>
  </body>
</html>`;

let browser: Browser;
let service: LocalService;
let page: Page;
let artifactDir: string;
let artifactPath: string;
let dataDir: string;
const problems: string[] = [];

async function launch(): Promise<Browser> {
  const channel = process.env['PW_CHANNEL'] ?? (process.env['CI'] ? undefined : 'chrome');
  return channel ? chromium.launch({ channel }) : chromium.launch();
}

beforeAll(async () => {
  artifactDir = mkdtempSync(join(tmpdir(), 'vil-browser-artifact-'));
  artifactPath = join(artifactDir, 'page.html');
  writeFileSync(artifactPath, ARTIFACT_V1, 'utf8');
  writeFileSync(join(artifactDir, 'logo.png'), PNG);

  dataDir = mkdtempSync(join(tmpdir(), 'vil-browser-data-'));
  const review = createReviewService({ dataDir, waitMs: 2000 });
  service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  browser = await launch();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await service?.stop();
});

describe('Visual Direction Loop (primary seam: a real browser engine)', () => {
  it('loads its own scripts and the artifact, annotates, sends, re-resolves, verifies, and survives a restart', async () => {
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const review = createReviewService({ dataDir });
    void review;

    page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        problems.push(`console error: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('/ui/') || url.includes('/artifact/')) {
        problems.push(`request failed: ${url} (${request.failure()?.errorText ?? 'unknown'})`);
      }
    });
    page.on('response', (response) => {
      const url = response.url();
      if (response.status() >= 400 && (url.includes('/ui/') || url.includes('/artifact/'))) {
        problems.push(`response ${response.status()}: ${url}`);
      }
    });

    await page.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });

    const frame = page.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 1, 'the artifact renders its button');

    const colour = await frame.locator('button.checkout-submit').evaluate((element) => getComputedStyle(element).color);
    expect(colour).toBe('rgb(9, 8, 7)');

    const logoWidth = await frame.locator('img.logo').evaluate((element) => (element as HTMLImageElement).naturalWidth);
    expect(logoWidth).toBeGreaterThan(0);

    // The served asset graph must be reachable, or nothing above could have happened.
    expect(problems, problems.join('\n')).toEqual([]);

    // Select the element and compose an Annotation in the card next to it.
    await page.getByRole('button', { name: /Element tool/ }).click();
    await frame.locator('button.checkout-submit').click();
    const card = page.locator('.anchored-card');
    await card.waitFor({ state: 'visible' });
    await card.locator('textarea').fill('Make the Place order button impossible to miss.');
    await card.locator('textarea').press('Enter');

    const queue = page.locator('.queue-item');
    await queue.first().waitFor({ state: 'visible' });
    await expectLater(
      () => queue.first().innerText(),
      (text) => text.includes('impossible to miss'),
      'the queued Annotation shows its note'
    );
    await expectLater(
      () => page.locator('.pill', { hasText: 'Queued' }).count(),
      (count) => count >= 1,
      'the Annotation is in the queue'
    );

    // Send the queue as one batch.
    await page.getByRole('button', { name: 'Send the queue' }).click();
    await expectLater(
      async () => (await (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)).json()) as never,
      (snapshot) => {
        const annotations = (snapshot as { annotations: Array<{ state: string; note: string }> }).annotations;
        return annotations.length === 1 && annotations[0]!.state === 'delivered' && annotations[0]!.note.includes('impossible');
      },
      'the server received one delivered Annotation'
    );

    // Change the artifact and reload it under review.
    writeFileSync(artifactPath, ARTIFACT_V1.replace('</main>', '<p class="added">Added later</p></main>'), 'utf8');
    await page.locator('.banner').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Reload artifact' }).click();
    await expectLater(() => frame.locator('p.added').count(), (count) => count === 1, 'the reloaded revision is on screen');

    // Verify: the target is re-resolved and the decision is per Annotation.
    await page.getByRole('button', { name: 'Verify' }).click();
    await expectLater(
      async () => {
        const snapshot = (await (
          await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)
        ).json()) as { annotations: Array<{ state: string; resolutions: unknown[] }> };
        return snapshot.annotations[0];
      },
      (annotation) => !!annotation && (annotation.state === 'resolved' || annotation.state === 'verified'),
      'the server records a re-resolution for the Annotation'
    );
    const row = page.locator('.annotation-row').first();
    await row.waitFor({ state: 'visible' });
    await expectLater(
      () => page.locator('.resolution').first().getAttribute('data-label'),
      (label) => label === 'matched' || label === 'recovered',
      'the target re-resolves after the artifact moved on'
    );
    await expectLater(
      () => page.locator('.pill', { hasText: 'Written before this revision' }).count(),
      (count) => count >= 1,
      'the Annotation is labelled as written before the revision now on screen'
    );

    await row.getByRole('button', { name: 'Approve' }).click();
    await expectLater(
      async () => (await (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)).json()) as never,
      (snapshot) => (snapshot as { annotations: Array<{ state: string }> }).annotations[0]!.state === 'verified',
      'the Builder-Reviewer approved the Annotation'
    );

    // Verification survives a restart.
    await page.close();
    await service.stop();
    const restartedService = await startLocalService({
      dataDir,
      reviewService: createReviewService({ dataDir }),
      port: 0
    });
    service = restartedService;
    const reopened = createReviewService({ dataDir }).annotations.list();
    expect(reopened).toHaveLength(1);
    expect(reopened[0]!.state).toBe('verified');
    expect(reopened[0]!.verification?.verdict).toBe('approve');
  }, 120000);
});

async function expectLater<T>(
  read: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  description: string,
  timeoutMs = 15000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;
  for (;;) {
    try {
      last = await read();
      if (predicate(last)) {
        return;
      }
    } catch (error) {
      last = undefined;
      void error;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for: ${description}. Last value: ${JSON.stringify(last)}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
}