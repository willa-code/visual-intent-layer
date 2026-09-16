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
  it('loads its own scripts and the artifact, points, sends, re-resolves, amends, stops, verifies, and survives a restart', async () => {
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const artifactRevisionV1 = opened.artifact.revision;

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
    expect(problems, problems.join('\n')).toEqual([]);

    expect(await page.locator('header.banner').count()).toBe(0);
    expect(await page.locator('.topbar').count()).toBe(0);
    expect(await page.locator('.panel').count()).toBe(0);

    await page.getByRole('button', { name: /Point at things/ }).click();
    expect(await page.getByRole('button', { name: /Point at things, armed/ }).count()).toBe(1);
    await frame.locator('button.checkout-submit').click();
    const card = page.locator('.anchored-card');
    await card.waitFor({ state: 'visible' });
    await card.locator('textarea').fill('Make the Place order button impossible to miss.');
    await card.locator('textarea').press('Enter');

    await expectLater(
      () => page.locator('.annotation-row', { hasText: 'impossible to miss' }).count(),
      (count) => count === 1,
      'the queued Annotation shows its note in the one list'
    );
    await expectLater(
      () => page.locator('.pill[data-state="queued"]').count(),
      (count) => count === 1,
      'the Annotation is queued'
    );

    await page.getByRole('button', { name: 'Send the queue' }).click();
    await expectLater(
      async () => (await (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)).json()) as never,
      (snapshot) => {
        const annotations = (snapshot as { annotations: Array<{ state: string; note: string }> }).annotations;
        return annotations.length === 1 && annotations[0]!.state === 'delivered' && annotations[0]!.note.includes('impossible');
      },
      'the server received one delivered Annotation'
    );
    await expectLater(
      () => page.locator('.annotation-row', { hasText: 'impossible to miss' }).count(),
      (count) => count === 1,
      'sending did not remove the row from the list'
    );

    writeFileSync(artifactPath, ARTIFACT_V1.replace('</main>', '<p class="added">Added later</p></main>'), 'utf8');
    await page.locator('.banner').waitFor({ state: 'visible' });
    const bannerText = await page.locator('.banner').innerText();
    expect(bannerText).not.toMatch(/blake3/);
    await page.getByRole('button', { name: 'Reload artifact' }).click();
    await expectLater(() => frame.locator('p.added').count(), (count) => count === 1, 'the reloaded revision is on screen');

    await expectLater(
      async () => {
        const snapshot = (await (
          await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)
        ).json()) as { annotations: Array<{ state: string; resolutions: unknown[] }> };
        return snapshot.annotations[0];
      },
      (annotation) => !!annotation && (annotation.state === 'resolved' || annotation.state === 'delivered'),
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

    await row.locator('.annotation-row__note').first().click();
    await page.locator('.before-after').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /^Before \(/ }).click();
    await page.waitForTimeout(600);
    await expectLater(
      () => page.locator('.before-after').count(),
      (count) => count === 1,
      'the comparison survives switching to the written revision'
    );
    await page.getByRole('button', { name: /^After \(/ }).click();
    await expectLater(
      async () =>
        (
          (await (
            await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)
          ).json()) as { annotations: Array<{ resolvedRevision?: string }> }
        ).annotations[0]?.resolvedRevision,
      (revision) => typeof revision === 'string' && revision !== artifactRevisionV1,
      'the result revision is still the changed revision after comparing'
    );

    await row.getByRole('button', { name: 'Amend' }).click();
    await page.locator('.amend-editor textarea').fill('Make the Place order button impossible to miss, with a stronger label.');
    await page.getByRole('button', { name: 'Deliver the amendment' }).click();
    await expectLater(
      async () => (await (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)).json()) as never,
      (snapshot) => {
        const annotations = (snapshot as { annotations: Array<{ state: string; supersedes?: string; supersededBy?: string }> }).annotations;
        return annotations.some((annotation) => annotation.state === 'superseded' && !!annotation.supersededBy)
          && annotations.some((annotation) => !!annotation.supersedes);
      },
      'the original is superseded and the successor records what it replaced'
    );
    await expectLater(
      async () => {
        const batches = (await (
          await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)
        ).json()) as { batches: Array<{ envelopeId: string; status: string; annotationIds: string[] }> };
        return batches.batches.length;
      },
      (count) => count >= 2,
      'the amendment produced its own batch'
    );

    await expectLater(() => page.locator('.annotation-row button', { hasText: 'Approve' }).count(), (count) => count >= 1, 'verdict controls are on the row');
    const verdictRow = page.locator('.annotation-row').filter({ hasText: 'stronger label' }).first();
    await verdictRow.getByRole('button', { name: 'Approve' }).click();
    await expectLater(
      async () => (await (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?cap=${opened.capability}`)).json()) as never,
      (snapshot) =>
        (snapshot as { annotations: Array<{ state: string }> }).annotations.some((annotation) => annotation.state === 'verified'),
      'the Builder-Reviewer approved the successor in place'
    );

    expect(await page.getByRole('button', { name: 'Ask the agent to stop' }).count()).toBe(0);

    await page.close();
    await service.stop();
    const restartedService = await startLocalService({
      dataDir,
      reviewService: createReviewService({ dataDir }),
      port: 0
    });
    service = restartedService;
    const reopened = createReviewService({ dataDir }).annotations.list();
    expect(reopened.some((annotation) => annotation.state === 'verified')).toBe(true);
    expect(reopened.some((annotation) => annotation.state === 'superseded')).toBe(true);
  }, 150000);
});

async function expectLater<T>(
  read: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  description: string,
  timeoutMs = 20000
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
