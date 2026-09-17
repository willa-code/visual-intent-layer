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

const ARTIFACT_AMBIGUOUS = ARTIFACT_V1.replace(
  '<button class="checkout-submit" type="button">Place order</button>',
  '<button class="checkout-submit" type="button">Place order</button>\n      <button class="checkout-submit" type="button">Place order</button>'
);

let browser: Browser;
let service: LocalService;
let page: Page;
let artifactDir: string;
let artifactPath: string;
let dataDir: string;
let review: ReturnType<typeof createReviewService>;
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
  review = createReviewService({ dataDir, waitMs: 2000 });
  service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  browser = await launch();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await service?.stop();
});

describe('Review Surface (primary seam: a real browser engine)', () => {
  it('opens a Pass, answers whose turn it is, marks uncertainty on the artifact, and repairs it by pointing', async () => {
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const artifactRevisionV1 = opened.artifact.revision;
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;

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

    await page.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = page.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 1, 'the artifact renders its button');

    const snapshot = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) => response.json()) as Promise<{
        annotations: Array<{ annotationId: string; state: string; note: string; writtenRevision: string; revisionRelation: string; replaces?: string; replacedBy?: string }>;
        passes: Array<{ passId: string; envelopeId: string; state: string; fromRevision: string; toRevision?: string; outcome: { answered: number; untouched: number; gone: number } }>;
      }>;

    expect(await page.locator('.coachmark').count()).toBe(0);
    expect(await frame.locator('button.checkout-submit').count()).toBe(1);

    await expectLater(
      async () => (await page.locator('.status-line').innerText()).trim(),
      (text) => text.startsWith('Your turn'),
      'the rail head states whose turn it is'
    );
    const words = (await page.locator('.status-line').innerText()).split(/\s+/).filter((entry) => entry !== '·');
    expect(words.length).toBeLessThanOrEqual(8);

    await page.getByRole('button', { name: /Point at things/ }).click();
    await expectLater(() => page.locator('.coachmark').count(), (count) => count === 1, 'the coachmark appears on first use of the tile');
    expect(await page.locator('.coachmark p').count()).toBeLessThanOrEqual(2);
    await page.getByRole('button', { name: 'Got it' }).click();
    expect(await page.locator('.coachmark').count()).toBe(0);

    await frame.locator('button.checkout-submit').first().click();
    const card = page.locator('.anchored-card');
    await card.waitFor({ state: 'visible' });
    expect(await card.innerText()).not.toMatch(/picking a file|pasting, or dropping/i);
    await card.locator('textarea').fill('Make the Place order button impossible to miss.');
    await card.locator('textarea').press('Enter');
    await expectLater(
      () => page.locator('.annotation-row[data-state="queued"]').count(),
      (count) => count === 1,
      'the Annotation is queued'
    );
    expect(await page.locator('.pill', { hasText: 'Written against this revision' }).count()).toBe(0);
    expect(await page.locator('.attention-trigger__badge').count()).toBe(0);
    expect(await page.locator('.notice').isVisible().catch(() => false)).toBe(false);
    await expectLater(
      () => page.locator('.status-line').innerText(),
      (text) => /Your turn · 1 note to send/.test(text),
      'the status line counts the notes waiting to be sent'
    );

    await page.getByRole('button', { name: 'Send the queue' }).click();
    await expectLater(async () => (await snapshot()).passes.length, (count) => count === 1, 'sending opened one Pass');
    await expectLater(
      async () => (await snapshot()).passes[0]?.state,
      (state) => state === 'in-flight',
      'the Pass is in flight'
    );
    expect(await page.locator('.notice').isVisible().catch(() => false)).toBe(false);
    await expectLater(
      () => page.locator('.status-line').innerText(),
      (text) => /in flight/.test(text) && !/working/.test(text),
      'the status line names the in-flight Pass and never reads as working'
    );

    const passOne = (await snapshot()).passes[0]!;
    await fetch(`${service.baseUrl}/api/intents/${passOne.envelopeId}/acknowledge?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agentId: 'browser-loop' })
    });
    await expectLater(
      () => page.locator('.status-line').innerText(),
      (text) => /Agent's turn · Pass 1 in flight/.test(text),
      'an acknowledged Pass reads as the agent\u2019s turn'
    );

    writeFileSync(artifactPath, ARTIFACT_AMBIGUOUS, 'utf8');
    await page.locator('.banner').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Reload artifact' }).click();
    await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 2, 'the reloaded revision is on screen');
    await expectLater(
      async () => (await snapshot()).passes[0]?.state,
      (state) => state === 'ready',
      'a new revision moves the Pass to ready'
    );
    await expectLater(
      () => page.locator('.status-line').innerText(),
      (text) => /Your turn · Pass 1 ready/.test(text),
      'the status line names the ready Pass'
    );
    await expectLater(
      () => page.locator('.pass-header[data-state="ready"]').count(),
      (count) => count === 1,
      'the rail renders one Pass header in the ready state'
    );
    expect(await page.locator('.annotation-row[data-state="replaced"]').count()).toBe(0);

    await expectLater(
      () => frame.locator('[data-vil-mark="candidate"]').count(),
      (count) => count >= 2,
      'the unresolved candidates are marked on the artifact'
    );
    const markLabel = await frame.locator('[data-vil-mark="candidate"]').first().getAttribute('aria-label');
    expect(markLabel).toMatch(/^Candidate \d: /);
    expect(await frame.locator('[data-vil-overlay]').getAttribute('aria-hidden')).toBeNull();
    expect(await page.locator('input[type="radio"][name^="cand-"]').count()).toBe(0);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/\d+% evidence/);
    await expectLater(
      () => page.locator('.annotation-row', { hasText: 'could not be matched' }).count(),
      (count) => count === 1,
      'the row says in words that the target could not be matched'
    );
    expect(await page.getByRole('button', { name: 'Approve' }).first().isDisabled()).toBe(true);
    await expectLater(
      () => page.locator('.attention-trigger__badge').innerText(),
      (text) => text.trim() === '1',
      'the attention badge counts only the note needing a decision'
    );

    await page.getByRole('button', { name: /Point at things, armed/ }).click();
    await page.getByRole('button', { name: /Box an area/ }).click();
    const frameBox = await frame.locator('body').boundingBox();
    await page.mouse.move((frameBox?.x ?? 0) + 60, (frameBox?.y ?? 0) + 60);
    await page.mouse.down();
    await page.mouse.move((frameBox?.x ?? 0) + 62, (frameBox?.y ?? 0) + 62);
    await page.mouse.up();
    await expectLater(() => page.locator('.notice').isVisible(), (visible) => visible === true, 'a failing action shows a notice');
    const noticeBox = await page.locator('.notice').boundingBox();
    const railBox = await page.locator('.rail').boundingBox();
    const islandBox = await page.locator('.island-host').boundingBox();
    expect(noticeBox!.x).toBeGreaterThanOrEqual(railBox!.x);
    expect(noticeBox!.y + noticeBox!.height).toBeLessThanOrEqual(islandBox!.y);

    expect(await page.locator('.coachmark').count()).toBe(1);
    await page.getByRole('button', { name: /Point at things/ }).focus();
    await page.keyboard.press('Escape');
    await expectLater(() => page.locator('.coachmark').count(), (count) => count === 0, 'Escape dismisses the coachmark first');

    await page.getByRole('button', { name: 'Re-point this target' }).first().click();
    await expectLater(
      () => page.getByRole('button', { name: 'Point at the right target, then click it' }).count(),
      (count) => count === 1,
      'the surface states that the next selection re-points this Annotation'
    );
    await frame.locator('h1').click();
    await expectLater(
      async () => (await snapshot()).annotations[0]?.state,
      (state) => state === 'resolved',
      'the Annotation carries the repaired target'
    );
    await expectLater(
      () => page.locator('.annotation-row .resolution[data-label="matched"]').count(),
      (count) => count >= 1,
      'the target now resolves'
    );
    expect(await page.getByRole('button', { name: 'Approve' }).first().isDisabled()).toBe(false);
    await expectLater(() => frame.locator('[data-vil-mark="candidate"]').count(), (count) => count === 0, 'the marks clear once repaired');

    await page.getByRole('button', { name: /Point at things, armed/ }).click();
    await page.getByRole('button', { name: /Point at things/ }).click();
    await frame.locator('p.shipping-note').click();
    await page.locator('.anchored-card textarea').fill('Make the delivery estimate louder.');
    await page.locator('.anchored-card textarea').press('Enter');
    await expectLater(
      async () => (await snapshot()).annotations.find((annotation) => annotation.note.includes('delivery estimate'))?.writtenRevision,
      (revision) => typeof revision === 'string' && revision !== artifactRevisionV1,
      'a note composed after the reload carries the adopted revision'
    );
    const secondRow = page.locator('.annotation-row', { hasText: 'delivery estimate' }).first();
    expect(await secondRow.locator('.pill', { hasText: 'Written before this revision' }).count()).toBe(0);

    const firstRow = page.locator('.annotation-row', { hasText: 'impossible to miss' }).first();
    await firstRow.locator('.annotation-row__note').click();
    await page.locator('.before-after').waitFor({ state: 'visible' });
    const beforeAfterBox = await page.locator('.before-after-host').boundingBox();
    const stageBox = await page.locator('.stage').boundingBox();
    expect(beforeAfterBox!.y).toBeLessThan(stageBox!.y + 80);
    const beforeLabel = await page.getByRole('button', { name: /^Before \(/ }).innerText();
    expect(beforeLabel).toContain(artifactRevisionV1.replace(/^blake3:/, '').slice(0, 8));
    await page.getByRole('button', { name: /^Before \(/ }).click();
    await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 1, 'Before serves the revision the note was written against');
    await expectLater(
      () => page.locator('.annotation-row', { hasText: 'impossible to miss' }).locator('.annotation-row__result-revision').count(),
      (count) => count === 1,
      'the row states which revision its result came from'
    );
    await page.getByRole('button', { name: /^After \(/ }).click();
    await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 2, 'After serves the revision the result came from');

    await expectLater(
      async () => (await snapshot()).passes[0]?.state,
      (state) => state !== 'closed',
      'an acknowledgement and a revision have not closed the Pass'
    );
    await page.locator('[data-action="close-pass"]').first().click();
    await expectLater(
      async () => (await snapshot()).passes[0]?.state,
      (state) => state === 'closed',
      'the Builder-Reviewer closes the Pass'
    );

    const replacementRow = page.locator('.annotation-row', { hasText: 'impossible to miss' }).first();
    await replacementRow.getByRole('button', { name: 'Amend' }).click();
    await page.locator('.amend-editor textarea').fill('Make the Place order button impossible to miss, with a stronger label.');
    await page.locator('.amend-editor textarea').press('Escape');
    await expectLater(() => page.locator('.amend-editor').count(), (count) => count === 0, 'Escape closes the replacement editor');
    await replacementRow.getByRole('button', { name: 'Amend' }).click();
    await page.locator('.amend-editor textarea').fill('Make the Place order button impossible to miss, with a stronger label.');
    await page.locator('.amend-editor textarea').press('Enter');
    await expectLater(
      async () => (await snapshot()).annotations.some((annotation) => annotation.state === 'replaced' && !!annotation.replacedBy),
      (value) => value === true,
      'the original reads Replaced and names its Replacement'
    );
    await page.getByRole('button', { name: /Show \d+ closed/ }).first().click();
    await expectLater(
      () => page.locator('.annotation-row[data-state="replaced"]').count(),
      (count) => count >= 1,
      'the Replaced note is still in the ledger'
    );
    await expectLater(
      () => page.locator('.annotation-row', { hasText: 'Replaced by' }).count(),
      (count) => count >= 1,
      'the Replaced note names what replaced it'
    );

    writeFileSync(join(artifactDir, 'second.html'), ARTIFACT_V1, 'utf8');
    const second = await service.openSession({ kind: 'saved-html', path: join(artifactDir, 'second.html') });
    await page.goto(second.reviewUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Point at things/ }).click();
    await page.waitForTimeout(400);
    expect(await page.locator('.coachmark').count()).toBe(0);

    expect(problems, problems.join('\n')).toEqual([]);
  }, 200000);
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
