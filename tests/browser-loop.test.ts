import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
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
        passes: Array<{ passId: string; envelopeId: string; state: string; fromRevision: string; toRevision?: string; outcome: { changed: number; same: number; notFound: number } }>;
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
    await expectLater(
      () => page.getByRole('button', { name: /Take back this send/ }).count(),
      (count) => count === 1,
      'an unread send offers Take back'
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
    await expectLater(
      () => page.getByRole('button', { name: /Take back this send/ }).count(),
      (count) => count === 0,
      'a send the agent has read can no longer be taken back'
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
    await expectLater(
      () => page.locator('.pass-header[data-state="ready"] [data-action="another-pass"]').count(),
      (count) => count === 1,
      'a ready Pass offers Another Pass'
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
    await expectLater(
      () => frame.locator('body').getAttribute('style'),
      (style) => (style ?? '').includes('crosshair'),
      'the layer is armed for boxing before the drag begins'
    );
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
    expect(await page.locator('.annotation-row .resolution[data-label="matched"]').first().innerText()).toMatch(
      /· (same|changed)/
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

  it('gathers several targets into one Annotation, removes one, caps the set, and replaces it', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Set artifact</title>
    <style>body { margin: 0; } button.member { display: block; width: 120px; margin: 8px; }</style>
  </head>
  <body>
    ${Array.from({ length: 10 }, (_, index) => `<button class="member" type="button">Member ${index + 1}</button>`).join('\n    ')}
  </body>
</html>`;
    const setPath = join(artifactDir, 'set.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const setPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await setPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = setPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 10, 'the artifact renders ten members');

    const storedTargets = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
        .then((response) => response.json()) as Promise<{ annotations: Array<{ targets: Array<{ targetId: string; kind: string }> }> }>;

    await setPage.getByRole('button', { name: /Point at things/ }).click();
    if (await setPage.locator('.coachmark').count()) {
      await setPage.getByRole('button', { name: 'Got it' }).click();
    }

    await frame.locator('button.member').nth(0).click();
    await expectLater(async () => (await storedTargets()).annotations[0]?.targets.length, (count) => count === 1, 'a first click composes a one-target Annotation');

    for (const index of [1, 2, 3, 4, 5, 6, 7]) {
      await frame.locator('button.member').nth(index).click({ modifiers: ['Shift'] });
    }
    await expectLater(async () => (await storedTargets()).annotations[0]?.targets.length, (count) => count === 8, 'shift-clicking builds a set of eight');
    await expectLater(
      () => setPage.locator('.anchored-card__target').innerText(),
      (text) => /Member 1, Member 2, Member 3 and 5 more/.test(text),
      'the card names what is in the set rather than only its first member'
    );
    await expectLater(() => frame.locator('[data-vil-mark="owned"]').count(), (count) => count === 8, 'every member of the set is marked');

    await frame.locator('button.member').nth(8).click({ modifiers: ['Shift'] });
    await expectLater(async () => (await storedTargets()).annotations[0]?.targets.length, (count) => count === 8, 'a ninth target is refused rather than silently truncated');
    await expectLater(() => setPage.locator('.notice').isVisible(), (visible) => visible === true, 'the refusal is stated in words');

    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });
    await expectLater(async () => (await storedTargets()).annotations[0]?.targets.length, (count) => count === 7, 'shift-clicking a member removes it from the set');

    await frame.locator('button.member').nth(9).click();
    await expectLater(async () => (await storedTargets()).annotations[0]?.targets.length, (count) => count === 1, 'a plain click replaces the set');

    await setPage.close();
  }, 120000);

  it('expresses an alignment relation by dragging a selected target, and refuses a drag that infers nothing', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Relation artifact</title>
    <style>body { margin: 0; } button.member { display: block; width: 120px; margin: 8px; }</style>
  </head>
  <body>
    <button class="member" type="button">Member 1</button>
    <button class="member" type="button">Member 2</button>
    <button class="member" type="button">Member 3</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'relations.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const relationPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await relationPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = relationPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 3, 'the artifact renders three members');

    const stored = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
        .then((response) => response.json()) as Promise<{
        annotations: Array<{
          annotationId: string;
          targets: Array<{ targetId: string } & Record<string, unknown>>;
          relationships: Array<{ relationshipId: string; type: string; operator: string; targetIds: string[] }>;
        }>;
      }>;

    await relationPage.getByRole('button', { name: /Point at things/ }).click();
    if (await relationPage.locator('.coachmark').count()) {
      await relationPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });

    const member = await frame.locator('button.member').nth(1).boundingBox();
    const startX = member!.x + member!.width / 2;
    const startY = member!.y + member!.height / 2;
    const before = await frame.locator('button.member').nth(1).boundingBox();

    await relationPage.mouse.move(startX, startY);
    await relationPage.mouse.down();
    await relationPage.mouse.move(startX + 7, startY + 1, { steps: 5 });
    await expectLater(
      () => frame.locator('[data-vil-mark="relation"]').count(),
      (count) => count === 1,
      'dragging a selected target moves a ghost'
    );
    await expectLater(
      () => relationPage.locator('[data-relation-preview]').innerText(),
      (text) => /Preview — not recorded yet:.*align on the left/.test(text),
      'the card shows one sentence before release'
    );
    await relationPage.mouse.up();

    await expectLater(
      async () => JSON.stringify((await stored()).annotations[0]?.relationships ?? []),
      (text) => text.includes('"type":"alignment"') && text.includes('"operator":"align-left"'),
      'the relation is recorded implementation-neutrally'
    );
    await expectLater(
      () => relationPage.locator('.annotation-row .relation-sentence').innerText(),
      (text) => /align on the left/.test(text),
      'the rail row shows the same sentence as the card'
    );
    await expectLater(
      async () => JSON.stringify((await stored()).annotations[0]?.relationships ?? []),
      (text) => !/"(x|y|left|top|dx|dy|px)"/.test(text),
      'the stored relation carries no pixel field'
    );
    await expectLater(
      async () => (await stored()).annotations[0]?.relationships?.length ?? 0,
      (count) => count === 1,
      'the recorded relation appears once on the Annotation'
    );
    const after = await frame.locator('button.member').nth(1).boundingBox();
    expect(after).toEqual(before);

    const dragMember2 = async (): Promise<void> => {
      const box = await frame.locator('button.member').nth(1).boundingBox();
      await relationPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await relationPage.mouse.down();
      await relationPage.mouse.move(box!.x + box!.width / 2 + 7, box!.y + box!.height / 2 + 1, { steps: 5 });
    };

    const firstId = (await stored()).annotations[0]?.relationships?.[0]?.relationshipId;
    await dragMember2();
    await relationPage.mouse.up();
    await expectLater(
      async () => (await stored()).annotations[0]?.relationships?.[0]?.relationshipId,
      (id) => typeof id === 'string' && id !== firstId,
      'a second drag on the same pairing replaces the relation'
    );
    await relationPage.waitForTimeout(300);
    expect((await stored()).annotations[0]?.relationships?.length).toBe(1);

    await frame.locator('button.member').nth(2).click({ modifiers: ['Shift'] });
    await expectLater(
      async () => (await stored()).annotations[0]?.targets?.length ?? 0,
      (count) => count === 3,
      'the third target joined the set'
    );
    const member3 = await frame.locator('button.member').nth(2).boundingBox();
    await relationPage.mouse.move(member3!.x + member3!.width / 2, member3!.y + member3!.height / 2);
    await relationPage.mouse.down();
    await relationPage.mouse.move(member3!.x + member3!.width / 2 + 240, member3!.y + member3!.height / 2 + 240, { steps: 8 });
    await relationPage.mouse.up();
    await expectLater(
      () => relationPage.locator('.notice').innerText(),
      (text) => /does not express a relation/.test(text),
      'a drag that infers nothing says so in words'
    );
    await relationPage.waitForTimeout(400);
    expect((await stored()).annotations[0]?.relationships?.length, 'a drag that infers nothing records nothing').toBe(1);

    await frame.locator('button.member').nth(1).focus();
    await dragMember2();
    await expectLater(
      () => frame.locator('[data-vil-mark="relation"]').count(),
      (count) => count === 1,
      'the ghost is showing before Escape'
    );
    await relationPage.keyboard.press('Escape');
    await expectLater(
      () => frame.locator('[data-vil-mark="relation"]').count(),
      (count) => count === 0,
      'Escape cancels the drag and leaves no ghost'
    );
    await expectLater(
      () => relationPage.locator('[data-relation-preview]').isVisible().catch(() => false),
      (visible) => visible === false,
      'the preview is gone after Escape'
    );
    await relationPage.mouse.up();
    await relationPage.waitForTimeout(400);
    expect((await stored()).annotations[0]?.relationships?.length, 'an abandoned drag records nothing').toBe(1);

    await dragMember2();
    await relationPage.mouse.move(1000, 400, { steps: 10 });
    await relationPage.mouse.up();
    await expectLater(
      () => frame.locator('[data-vil-mark="relation"]').count(),
      (count) => count === 0,
      'releasing away from the artifact leaves no ghost'
    );
    await relationPage.waitForTimeout(400);
    expect((await stored()).annotations[0]?.relationships?.length, 'a drag released outside the artifact records nothing').toBe(1);

    await relationPage.reload({ waitUntil: 'domcontentloaded' });
    await expectLater(
      () => relationPage.locator('.annotation-row .relation-sentence').innerText(),
      (text) => /align on the left/.test(text),
      'the row sentence survives a reload'
    );

    await relationPage.close();
  }, 120000);

  it('expresses equal spacing with Alt and containment by dropping a target inside another', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Spacing artifact</title>
    <style>body { margin: 0; } button.member { position: absolute; left: 8px; width: 120px; height: 40px; } .a { top: 0px; } .b { top: 60px; } .c { top: 180px; }</style>
  </head>
  <body>
    <button class="member a" type="button">Member 1</button>
    <button class="member b" type="button">Member 2</button>
    <button class="member c" type="button">Member 3</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'spacing.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const spacingPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await spacingPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = spacingPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 3, 'the artifact renders three members');

    const relationships = async (): Promise<Array<{ type: string; operator: string; targetIds: string[] }>> => {
      const body = (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      )) as { annotations: Array<{ relationships: Array<{ type: string; operator: string; targetIds: string[] }> }> };
      return body.annotations[0]?.relationships ?? [];
    };

    await spacingPage.getByRole('button', { name: /Point at things/ }).click();
    if (await spacingPage.locator('.coachmark').count()) {
      await spacingPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });
    await frame.locator('button.member').nth(2).click({ modifiers: ['Shift'] });

    const dragMember2 = async (deltaY: number): Promise<void> => {
      const box = await frame.locator('button.member').nth(1).boundingBox();
      await spacingPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await spacingPage.mouse.down();
      await spacingPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + deltaY, { steps: 6 });
    };

    await spacingPage.keyboard.down('Alt');
    await dragMember2(30);
    await expectLater(
      () => spacingPage.locator('[data-relation-preview]').innerText(),
      (text) => /equally spaced/.test(text),
      'Alt shows the equal-spacing sentence before release'
    );
    await spacingPage.mouse.up();
    await spacingPage.keyboard.up('Alt');
    await expectLater(
      async () => JSON.stringify(await relationships()),
      (text) => text.includes('"type":"spacing"') && text.includes('"operator":"equal-gap"'),
      'equal spacing is recorded across the set'
    );

    await dragMember2(-60);
    await expectLater(
      () => spacingPage.locator('[data-relation-preview]').innerText(),
      (text) => /contained inside/.test(text),
      'dropping a target inside another shows the containment sentence'
    );
    await spacingPage.mouse.up();
    await expectLater(
      async () => JSON.stringify(await relationships()),
      (text) => text.includes('"type":"containment"') && text.includes('"operator":"member-of"'),
      'containment is recorded'
    );
    await expectLater(
      async () => JSON.stringify(await relationships()),
      (text) => !/"(x|y|left|top|dx|dy|px)"/.test(text),
      'neither relation carries a pixel field'
    );

    await spacingPage.close();
  }, 120000);

  it('expresses comparative size with Shift and a shared property with Ctrl', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Property artifact</title>
    <style>body { margin: 0; } button.member { position: absolute; left: 8px; width: 120px; height: 40px; } .a { top: 0px; } .b { top: 60px; }</style>
  </head>
  <body>
    <button class="member a" type="button">Member 1</button>
    <button class="member b" type="button">Member 2</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'property.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const propertyPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await propertyPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = propertyPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 2, 'the artifact renders two members');

    const relationships = async (): Promise<Array<{ type: string; operator: string }>> => {
      const body = (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      )) as { annotations: Array<{ relationships: Array<{ type: string; operator: string }> }> };
      return body.annotations[0]?.relationships ?? [];
    };

    await propertyPage.getByRole('button', { name: /Point at things/ }).click();
    if (await propertyPage.locator('.coachmark').count()) {
      await propertyPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });

    const dragMember1 = async (): Promise<void> => {
      const box = await frame.locator('button.member').nth(0).boundingBox();
      await propertyPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await propertyPage.mouse.down();
      await propertyPage.mouse.move(box!.x + box!.width / 2 + 30, box!.y + box!.height / 2, { steps: 6 });
    };

    await propertyPage.keyboard.down('Shift');
    await dragMember1();
    await expectLater(
      () => propertyPage.locator('[data-relation-preview]').innerText(),
      (text) => /same width/.test(text),
      'Shift shows the comparative-size sentence before release'
    );
    await propertyPage.mouse.up();
    await propertyPage.keyboard.up('Shift');
    await expectLater(
      async () => JSON.stringify(await relationships()),
      (text) => text.includes('"type":"comparative-size"') && text.includes('"operator":"same-width"'),
      'comparative size is recorded'
    );

    await propertyPage.keyboard.down('Control');
    await dragMember1();
    await expectLater(
      () => propertyPage.locator('[data-relation-preview]').innerText(),
      (text) => /share the same/.test(text),
      'Ctrl shows the shared-property sentence before release'
    );
    await propertyPage.mouse.up();
    await propertyPage.keyboard.up('Control');
    await expectLater(
      async () => JSON.stringify(await relationships()),
      (text) => text.includes('"type":"equivalence"') && text.includes('"operator":"shared-property"'),
      'a shared property is recorded'
    );

    await propertyPage.close();
  }, 120000);

  it('expresses an ordering relation by dragging a selected target past another', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Ordering artifact</title>
    <style>body { margin: 0; } button.member { position: absolute; left: 8px; width: 120px; height: 40px; } .a { top: 0px; } .b { top: 600px; }</style>
  </head>
  <body>
    <button class="member a" type="button">Member 1</button>
    <button class="member b" type="button">Member 2</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'ordering.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const orderingPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await orderingPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = orderingPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 2, 'the artifact renders two members');

    await orderingPage.getByRole('button', { name: /Point at things/ }).click();
    if (await orderingPage.locator('.coachmark').count()) {
      await orderingPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });
    await expectLater(
      () => frame.locator('[data-vil-mark="owned"]').count(),
      (count) => count === 2,
      'both members carry an owned mark before the relation drag'
    );

    const member = await frame.locator('button.member').nth(0).boundingBox();
    await orderingPage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2);
    await orderingPage.mouse.down();
    await orderingPage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2 + 250, { steps: 10 });
    await expectLater(
      () => orderingPage.locator('[data-relation-preview]').innerText(),
      (text) => /should come after/.test(text),
      'dragging past another shows the ordering sentence before release'
    );
    await orderingPage.mouse.up();

    const stored = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) => response.json()) as Promise<{
        annotations: Array<{ relationships: Array<{ type: string; operator: string }> }>;
      }>;
    await expectLater(
      async () => (await stored()).annotations[0]?.relationships?.[0]?.type,
      (type) => type === 'ordering',
      'the ordering relation is recorded'
    );
    expect((await stored()).annotations[0]?.relationships?.[0]?.operator).toBe('after');

    await orderingPage.close();
  }, 120000);

  it('keeps a relation drag alive when the rail pulls focus into the card', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Focus artifact</title>
    <style>body { margin: 0; } button.member { position: absolute; left: 8px; width: 120px; height: 40px; } .a { top: 0px; } .b { top: 600px; }</style>
  </head>
  <body>
    <button class="member a" type="button">Member 1</button>
    <button class="member b" type="button">Member 2</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'focus.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const focusPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await focusPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = focusPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 2, 'the artifact renders two members');

    await focusPage.getByRole('button', { name: /Point at things/ }).click();
    if (await focusPage.locator('.coachmark').count()) {
      await focusPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });
    await expectLater(
      () => frame.locator('[data-vil-mark="owned"]').count(),
      (count) => count === 2,
      'both members carry an owned mark before the relation drag'
    );

    const member = await frame.locator('button.member').nth(0).boundingBox();
    await focusPage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2);
    await focusPage.mouse.down();
    await focusPage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2 + 250, { steps: 10 });
    await expectLater(
      () => focusPage.locator('[data-relation-preview]').innerText(),
      (text) => /should come after/.test(text),
      'dragging past another shows the ordering sentence before release'
    );

    await focusPage.locator('.anchored-card textarea').focus();
    await expectLater(
      () => focusPage.locator('[data-relation-preview]').innerText(),
      (text) => /should come after/.test(text),
      'the sentence survives the rail taking focus into the card'
    );
    await focusPage.mouse.up();

    const stored = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) => response.json()) as Promise<{
        annotations: Array<{ relationships: Array<{ type: string; operator: string }> }>;
      }>;
    await expectLater(
      async () => (await stored()).annotations[0]?.relationships?.[0]?.type,
      (type) => type === 'ordering',
      'the ordering relation is recorded even though the card took focus'
    );
    expect((await stored()).annotations[0]?.relationships?.[0]?.operator).toBe('after');

    await focusPage.close();
  }, 120000);

  it('cancels a relation drag when the page itself loses focus', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Departure artifact</title>
    <style>body { margin: 0; } button.member { position: absolute; left: 8px; width: 120px; height: 40px; } .a { top: 0px; } .b { top: 600px; }</style>
  </head>
  <body>
    <button class="member a" type="button">Member 1</button>
    <button class="member b" type="button">Member 2</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'departure.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const departurePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await departurePage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = departurePage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 2, 'the artifact renders two members');

    await departurePage.getByRole('button', { name: /Point at things/ }).click();
    if (await departurePage.locator('.coachmark').count()) {
      await departurePage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });
    await expectLater(
      () => frame.locator('[data-vil-mark="owned"]').count(),
      (count) => count === 2,
      'both members carry an owned mark before the relation drag'
    );

    const member = await frame.locator('button.member').nth(0).boundingBox();
    await departurePage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2);
    await departurePage.mouse.down();
    await departurePage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2 + 250, { steps: 10 });
    await expectLater(
      () => departurePage.locator('[data-relation-preview]').innerText(),
      (text) => /should come after/.test(text),
      'dragging past another shows the ordering sentence before release'
    );

    await departurePage.evaluate(() => {
      const iframe = document.querySelector('iframe.artifact-frame') as HTMLIFrameElement;
      document.hasFocus = () => false;
      iframe.contentWindow?.dispatchEvent(new Event('blur'));
    });
    await expectLater(
      () => departurePage.locator('[data-relation-preview]').innerText(),
      (text) => !/should come after/.test(text),
      'the sentence clears when the page itself loses focus'
    );
    await departurePage.mouse.up();

    await departurePage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2);
    await departurePage.mouse.down();
    await departurePage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2 + 250, { steps: 10 });
    await expectLater(
      () => departurePage.locator('[data-relation-preview]').innerText(),
      (text) => /should come after/.test(text),
      'a second drag shows the ordering sentence before release'
    );

    await departurePage.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expectLater(
      () => departurePage.locator('[data-relation-preview]').innerText(),
      (text) => !/should come after/.test(text),
      'the sentence clears when the page goes hidden'
    );

    await departurePage.mouse.up();
    await departurePage.close();
  }, 120000);

  it('removes a relation whose target leaves the set, and states it in words', async () => {
    const setArtifact = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Pruning artifact</title>
    <style>body { margin: 0; } button.member { display: block; width: 120px; margin: 8px; }</style>
  </head>
  <body>
    <button class="member" type="button">Member 1</button>
    <button class="member" type="button">Member 2</button>
  </body>
</html>`;
    const setPath = join(artifactDir, 'pruning.html');
    writeFileSync(setPath, setArtifact, 'utf8');

    const opened = await service.openSession({ kind: 'saved-html', path: setPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const pruningPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await pruningPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    const frame = pruningPage.frameLocator('iframe.artifact-frame');
    await expectLater(() => frame.locator('button.member').count(), (count) => count === 2, 'the artifact renders two members');

    const relationships = async (): Promise<unknown[]> => {
      const body = (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      )) as { annotations: Array<{ relationships: unknown[] }> };
      return body.annotations[0]?.relationships ?? [];
    };

    await pruningPage.getByRole('button', { name: /Point at things/ }).click();
    if (await pruningPage.locator('.coachmark').count()) {
      await pruningPage.getByRole('button', { name: 'Got it' }).click();
    }
    await frame.locator('button.member').nth(0).click();
    await frame.locator('button.member').nth(1).click({ modifiers: ['Shift'] });

    const member = await frame.locator('button.member').nth(1).boundingBox();
    await pruningPage.mouse.move(member!.x + member!.width / 2, member!.y + member!.height / 2);
    await pruningPage.mouse.down();
    await pruningPage.mouse.move(member!.x + member!.width / 2 + 7, member!.y + member!.height / 2 + 1, { steps: 5 });
    await pruningPage.mouse.up();
    await expectLater(async () => (await relationships()).length, (count) => count === 1, 'the relation is recorded');

    await frame.locator('button.member').nth(0).click({ modifiers: ['Shift'] });
    await expectLater(
      async () => (await relationships()).length,
      (count) => count === 0,
      'a relation whose target leaves the set is removed rather than left dangling'
    );
    await expectLater(
      () => pruningPage.locator('.notice').innerText(),
      (text) => /relation was removed because a target it named is no longer/.test(text),
      'the removal is stated in words rather than silent'
    );

    await pruningPage.close();
  }, 120000);

  it('ends the session from the overflow menu and refuses the stored review URL afterwards', async () => {
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const ending = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await ending.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });

    await ending.getByRole('button', { name: 'More actions' }).click();
    await ending.getByRole('menuitem', { name: /End session/ }).click();
    await expectLater(
      () => ending.locator('.notice').innerText(),
      (text) => /Session ended/.test(text),
      'the surface states that the session ended'
    );

    const refused = await fetch(opened.reviewUrl);
    expect(refused.status).toBe(401);
    expect(
      (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?session=${opened.sessionId}&cap=${opened.capability}`)).status
    ).toBe(401);

    await ending.close();
  }, 60000);

  it('names the artifact frame unreachable when the file is gone, and retries', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-missing-artifact-'));
    const file = join(dir, 'gone.html');
    writeFileSync(file, '<!doctype html><html><body><h1>Gone</h1></body></html>', 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: file });
    rmSync(file);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    await expectLater(
      () => page.locator('.stage__placeholder').innerText(),
      (text) => /unreachable/i.test(text),
      'the frame names the artifact unreachable'
    );
    expect(await page.getByRole('button', { name: 'Try again' }).count()).toBe(1);

    writeFileSync(file, '<!doctype html><html><body><h1>Back</h1></body></html>', 'utf8');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expectLater(
      () => page.frameLocator('iframe.artifact-frame').locator('h1').innerText(),
      (text) => /Back/.test(text),
      'the retry loads the artifact'
    );
    await page.close();
  }, 60000);

  it('shows one terminal state when the review dies while it is open', async () => {
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const dying = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await dying.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
    await expectLater(
      () => dying.locator('.workspace').count(),
      (count) => count === 1,
      'the review surface is open'
    );

    const ended = await fetch(
      `${service.baseUrl}/api/sessions/${opened.sessionId}/end?session=${opened.sessionId}&cap=${opened.capability}`,
      { method: 'POST' }
    );
    expect(ended.status).toBe(200);

    await expectLater(
      () => dying.locator('.terminal').count(),
      (count) => count === 1,
      'the open surface shows one terminal state instead of failing silently'
    );
    expect(await dying.locator('.terminal').innerText()).toMatch(/ended/i);
    await expectLater(
      () => dying.locator('iframe.artifact-frame').count(),
      () => true,
      'the terminal state is not an artifact frame failure'
    );
    await dying.close();
  }, 60000);

  it('keeps a tab reporting the revision it is showing when a second tab adopts a newer one', async () => {
    writeFileSync(artifactPath, ARTIFACT_V1, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const held = opened.artifact.revision;
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const stored = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{ annotations: Array<{ annotationId: string; writtenRevision: string }> }>;
    const sessionStatus = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?${auth}`).then((response) => response.json()) as Promise<{
        adoptedRevision: string;
      }>;

    const tabA = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const tabB = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await tabA.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frameA = tabA.frameLocator('iframe.artifact-frame');
      await expectLater(() => frameA.locator('button.checkout-submit').count(), (count) => count === 1, 'tab A renders the first revision');
      await expectLater(
        () => tabA.locator('.rail__revision .revision-chip').getAttribute('title'),
        (title) => title === `Revision ${held}`,
        'tab A reports the revision it is holding'
      );

      writeFileSync(artifactPath, ARTIFACT_AMBIGUOUS, 'utf8');
      await tabA.locator('.banner').waitFor({ state: 'visible' });

      await tabB.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frameB = tabB.frameLocator('iframe.artifact-frame');
      await expectLater(() => frameB.locator('button.checkout-submit').count(), (count) => count === 2, 'tab B renders the second revision');
      await expectLater(
        async () => (await sessionStatus()).adoptedRevision,
        (revision) => revision !== held,
        'tab B records the second revision on the shared session'
      );

      await tabA.waitForTimeout(3500);
      await expectLater(
        () => tabA.locator('.rail__revision .revision-chip').getAttribute('title'),
        (title) => title === `Revision ${held}`,
        'tab A still reports the revision it is showing, a poll interval after the other tab moved'
      );

      await tabA.getByRole('button', { name: /Point at things/ }).click();
      const gotIt = tabA.getByRole('button', { name: 'Got it' });
      if ((await gotIt.count()) > 0) {
        await gotIt.click();
      }
      const known = new Set((await stored()).annotations.map((entry) => entry.annotationId));
      await frameA.locator('button.checkout-submit').first().click();
      await expectLater(
        async () => (await stored()).annotations.find((entry) => !known.has(entry.annotationId))?.writtenRevision,
        (revision) => revision === held,
        'the Annotation tab A composes is stamped with the revision it is showing'
      );
    } finally {
      await tabA.close();
      await tabB.close();
    }
  }, 120000);

  it('marks a Pass ready only when a reload actually brings a new revision', async () => {
    writeFileSync(artifactPath, ARTIFACT_V1, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const passes = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{ passes: Array<{ passId: string; state: string }> }>;

    const tab = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await tab.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = tab.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 1, 'the artifact renders');

      await tab.getByRole('button', { name: /Point at things/ }).click();
      const gotIt = tab.getByRole('button', { name: 'Got it' });
      if ((await gotIt.count()) > 0) {
        await gotIt.click();
      }
      await frame.locator('button.checkout-submit').first().click();
      const card = tab.locator('.anchored-card');
      await card.locator('textarea').fill('Make the Place order button impossible to miss.');
      await card.locator('textarea').press('Enter');
      const known = new Set((await passes()).passes.map((entry) => entry.passId));
      await tab.getByRole('button', { name: 'Send the queue' }).click();
      const passState = async () => (await passes()).passes.find((entry) => !known.has(entry.passId))?.state;
      await expectLater(
        passState,
        (state) => state === 'open' || state === 'in-flight',
        'sending opens a Pass and the agent collects it'
      );

      await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/reload?${auth}`, { method: 'POST' });
      await expectLater(
        passState,
        (state) => state !== 'ready',
        'a reload that brings no new revision leaves the Pass unready'
      );

      writeFileSync(artifactPath, ARTIFACT_AMBIGUOUS, 'utf8');
      await tab.locator('.banner').waitFor({ state: 'visible' });
      await tab.getByRole('button', { name: 'Reload artifact' }).click();
      await expectLater(
        passState,
        (state) => state === 'ready',
        'a reload onto a new revision marks the Pass ready'
      );
    } finally {
      await tab.close();
    }
  }, 120000);

  it('names the state evidence among what the drawer says will leave the machine', async () => {
    writeFileSync(artifactPath, ARTIFACT_V1, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: artifactPath });
    const tab = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await tab.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = tab.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('button.checkout-submit').count(), (count) => count === 1, 'the artifact renders');

      await tab.getByRole('button', { name: /Point at things/ }).click();
      const gotIt = tab.getByRole('button', { name: 'Got it' });
      if ((await gotIt.count()) > 0) {
        await gotIt.click();
      }
      await frame.locator('button.checkout-submit').first().click();
      const card = tab.locator('.anchored-card');
      await card.locator('textarea').fill('Make the Place order button impossible to miss.');
      await card.locator('textarea').press('Enter');

      await tab.getByRole('button', { name: 'More actions' }).click();
      await tab.getByRole('menuitem', { name: 'Open the disclosure' }).click();

      const disclosure = tab.locator('.drawer .disclosure-list');
      await expectLater(
        () => disclosure.innerText(),
        (text) => /Scroll: \d+,\d+/.test(text),
        'the disclosure names the scroll the envelope will carry'
      );
      expect(await disclosure.innerText()).not.toMatch(/undefined/);
    } finally {
      await tab.close();
    }
  }, 120000);

  it('names the address a Target recorded among the evidence the drawer says will leave', async () => {
    const dev = await startDevServer({ routed: true });
    const tab = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      const opened = await service.openSession({ kind: 'react-vite-app', url: dev.url });
      await tab.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = tab.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('.app-root').count(), (count) => count === 1, 'the application renders');

      await frame.locator('.app-detail').click();
      await expectLater(
        () => frame.locator('.app-root').count(),
        (count) => count === 1,
        'the application navigates within itself to its own route'
      );

      await tab.getByRole('button', { name: /Point at things/ }).click();
      const gotIt = tab.getByRole('button', { name: 'Got it' });
      if ((await gotIt.count()) > 0) {
        await gotIt.click();
      }
      await frame.locator('.app-action').click();
      const card = tab.locator('.anchored-card');
      await card.locator('textarea').fill('Ship the order after the filter applies.');
      await card.locator('textarea').press('Enter');

      await tab.getByRole('button', { name: 'More actions' }).click();
      await tab.getByRole('menuitem', { name: 'Open the disclosure' }).click();

      const disclosure = tab.locator('.drawer .disclosure-list');
      await expectLater(
        () => disclosure.innerText(),
        (text) => /Address: detail/.test(text),
        'the disclosure names the address the Target recorded'
      );
    } finally {
      await tab.close();
      await dev.stop();
    }
  }, 120000);
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

const ARTIFACT_STATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Stateful artifact</title>
    <style>body { margin: 0; font-family: system-ui, sans-serif; }</style>
  </head>
  <body>
    <main>
      <h1>Orders</h1>
      <button id="open-panel" type="button">Open panel</button>
      <button class="stamped" data-vis-source="src/Orders.tsx:14:3" type="button">Ship it</button>
      <button class="unstamped" type="button">Plain</button>
      <a id="off-doc" href="second.html">Second page</a>
    </main>
    <script>
      document.getElementById('open-panel').addEventListener('click', function () {
        var panel = document.createElement('div');
        panel.id = 'panel';
        panel.style.cssText = 'position:fixed;right:24px;bottom:24px;border:1px solid #999;padding:12px;';
        var action = document.createElement('p');
        action.className = 'panel-action';
        action.textContent = 'Filter applied';
        var close = document.createElement('button');
        close.id = 'close-panel';
        close.type = 'button';
        close.textContent = 'Close panel';
        close.addEventListener('click', function () {
          panel.remove();
          window.history.replaceState(null, '', window.location.pathname);
        });
        panel.append(action, close);
        document.body.appendChild(panel);
        window.location.hash = '#panel';
      });
    </script>
  </body>
</html>`;

const APP_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Running app</title></head>
  <body>
    <div class="app-root">
      <h1>Orders</h1>
      <form method="post" action="/submit">
        <input name="filter" value="delivered" />
        <button type="submit">Apply filter</button>
      </form>
      <button class="app-action" data-vis-source="src/Orders.tsx:21:5" type="button">Ship it</button>
      <button class="app-plain" type="button">Plain</button>
    </div>
    <script>
      var socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.pathname.replace(/\\/$/, '') + '/hmr');
      socket.addEventListener('message', function (event) {
        window.dispatchEvent(new CustomEvent('visual-intent:applied-revision', { detail: { revision: event.data } }));
      });
    </script>
  </body>
</html>`;

const APP_FRAMED_HTML = APP_HTML.replace(
  '<button class="app-plain" type="button">Plain</button>',
  '<button class="app-plain" type="button">Plain</button>\n      <iframe id="widget" title="Widget" src="/widget"></iframe>'
);

const APP_ROUTED_HTML = APP_HTML.replace(
  '<button class="app-plain" type="button">Plain</button>',
  '<button class="app-plain" type="button">Plain</button>\n      <a class="app-detail" href="/detail">Order details</a>'
);

const APP_WIDGET_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Embedded widget</title></head>
  <body>
    <div class="widget-root"><button class="widget-action" type="button">Confirm</button></div>
  </body>
</html>`;

async function startDevServer(options: { framed?: boolean; routed?: boolean } = {}): Promise<{
  url: string;
  requests: Array<{ method: string; url: string; body: string }>;
  advancedRevision: string;
  advance: () => void;
  stop: () => Promise<void>;
}> {
  const requests: Array<{ method: string; url: string; body: string }> = [];
  const advancedRevision = `blake3:${'b'.repeat(64)}`;
  const upgradeSockets = new Set<import('node:stream').Duplex>();
  let announced = false;
  const announce = (socket: import('node:stream').Duplex): void => {
    if (!socket.writable) {
      return;
    }
    const payload = Buffer.from(advancedRevision, 'utf8');
    socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload]));
  };
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      requests.push({ method: request.method ?? 'GET', url: request.url ?? '/', body });
      if ((request.url ?? '').startsWith('/submit')) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: true, method: request.method, body }));
        return;
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      if (options.framed === true && (request.url ?? '').startsWith('/widget')) {
        response.end(APP_WIDGET_HTML);
        return;
      }
      response.end(
        options.framed === true ? APP_FRAMED_HTML : options.routed === true ? APP_ROUTED_HTML : APP_HTML
      );
    });
  });
  server.on('upgrade', (request, socket) => {
    upgradeSockets.add(socket);
    socket.on('close', () => upgradeSockets.delete(socket));
    const key = String(request.headers['sec-websocket-key'] ?? '');
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    if (announced) {
      announce(socket);
    }
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolvePromise({
        url: `http://127.0.0.1:${port}/`,
        requests,
        advancedRevision,
        advance: () => {
          announced = true;
          for (const socket of upgradeSockets) {
            announce(socket);
          }
        },
        stop: () =>
          new Promise<void>((done) => {
            for (const socket of upgradeSockets) {
              socket.destroy();
            }
            server.close(() => done());
            server.closeAllConnections?.();
          })
      });
    });
  });
}

describe('Review Surface: Runtime State Evidence, one document, and a proxied application', () => {
  it('records the address a Target was pointed at, names a state it no longer exists in, and names a navigation off the document', async () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'vil-state-artifact-'));
    const statePath = join(stateDir, 'orders.html');
    writeFileSync(statePath, ARTIFACT_STATE, 'utf8');
    writeFileSync(join(stateDir, 'second.html'), '<!doctype html><html><body><h1>Second</h1></body></html>', 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: statePath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const statePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await statePage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = statePage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('#open-panel').count(), (count) => count === 1, 'the artifact renders');

      await frame.locator('#open-panel').click();
      await expectLater(() => frame.locator('#panel').isVisible(), (visible) => visible, 'the panel state is on screen');

      await statePage.getByRole('button', { name: /Point at things/ }).click();
      await frame.locator('.panel-action').click();
      await statePage.locator('.anchored-card textarea').fill('Make the filter clear.');
      await statePage.locator('.anchored-card textarea').press('Enter');
      await expectLater(
        () => statePage.locator('.annotation-row[data-state="queued"]').count(),
        (count) => count === 1,
        'the Annotation is queued'
      );

      const snapshot = () =>
        fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
          response.json()
        ) as Promise<{
          annotations: Array<{
            annotationId: string;
            state: string;
            targets: Array<{ runtimeState?: { address?: string }; provenanceConfidence: string; sourceProvenance?: { adapter: string }; label?: string }>;
            resolutions: Array<{ match: string; candidates: unknown[]; viewedAddress?: string }>;
          }>;
        }>;
      await expectLater(
        async () => (await snapshot()).annotations[0]?.targets[0]?.runtimeState?.address,
        (address) => address === '#panel',
        'the Target records the address it was pointed at'
      );

      await statePage.getByRole('button', { name: 'Send the queue' }).click();
      await expectLater(
        async () => (await snapshot()).annotations[0]?.state,
        (state) => state === 'delivered',
        'the queue is sent'
      );

      await statePage.getByRole('button', { name: /Point at things, armed/ }).click();
      await frame.locator('#panel').evaluate((panel) => {
        panel.remove();
        window.history.replaceState(null, '', window.location.pathname);
      });
      await expectLater(() => frame.locator('#panel').count(), (count) => count === 0, 'the panel state is gone');
      await statePage.reload({ waitUntil: 'domcontentloaded' });
      await expectLater(
        () => statePage.locator('.annotation-row .resolution[data-label="state-only"]').count(),
        (count) => count === 1,
        'the row says the Target may exist only in a state no longer on screen'
      );
      const rowText = await statePage.locator('.annotation-row').first().innerText();
      expect(rowText).toMatch(/may exist only in a state no longer on screen/i);
      expect(rowText).not.toMatch(/\d+%/);
      await expectLater(
        async () => (await snapshot()).annotations[0]?.resolutions[0]?.match,
        (match) => match === 'unresolved',
        'the Target is unresolved rather than silently matched'
      );

      const unresolvedRow = statePage.locator('.annotation-row').first();
      await expectLater(
        () => unresolvedRow.getByRole('button', { name: 'Declare missing' }).count(),
        (count) => count === 1,
        'a target with no candidate offers Declare missing'
      );
      await unresolvedRow.getByRole('button', { name: 'Declare missing' }).click();
      await expectLater(
        () => statePage.locator('.annotation-row .resolution').first().innerText(),
        (text) => /Declared missing by you/.test(text),
        'the row states the declaration in its own words, not the derived Deleted'
      );
      await expectLater(
        () => statePage.getByRole('button', { name: 'Approve' }).first().isDisabled(),
        (disabled) => disabled === false,
        'the declaration clears the approval wall'
      );

      await frame.locator('#off-doc').click();
      await expectLater(
        () => statePage.locator('.notice').innerText(),
        (text) => /another document/i.test(text),
        'a navigation off the reviewed document is named'
      );
      expect(await frame.locator('#open-panel').count()).toBe(1);
      expect(await frame.locator('h1', { hasText: 'Second' }).count()).toBe(0);
    } finally {
      await statePage.close();
    }
  }, 120000);

  it('drives a running application through the proxy: faithful requests, its own policy, its reported revision, and per-Target provenance', async () => {
    const dev = await startDevServer();
    const appPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      const opened = await service.openSession({ kind: 'react-vite-app', url: dev.url });
      const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
      await appPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = appPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('.app-root').count(), (count) => count === 1, 'the application renders in the frame');

      const proxied = await fetch(`${service.baseUrl}/app/${opened.sessionId}/`, {
        headers: { 'x-session-cap': opened.capability }
      });
      const policy = proxied.headers.get('content-security-policy') ?? '';
      expect(policy).toContain("connect-src 'self'");
      expect(policy).toContain("form-action 'self'");

      const disclosure = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/policy?cap=${opened.capability}`)
      ).json()) as { kind: string; application?: { permits: string[] } };
      expect(disclosure.kind).toBe('proxied-application');
      expect(disclosure.application?.permits.join(' ')).toMatch(/review origin/i);

      const status = () =>
        fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?cap=${opened.capability}`).then((response) =>
          response.json()
        ) as Promise<{ adoptedRevision: string; currentRevision: string; revisionBasis: string }>;
      await expectLater(
        async () => (await status()).adoptedRevision,
        (revision) => revision === opened.artifact.revision,
        'the surface records the revision the artifact reports'
      );

      const advanced = dev.advancedRevision;
      dev.advance();
      await expectLater(
        async () => (await status()).adoptedRevision,
        (revision) => revision === advanced,
        'the proxied update channel advances the Adopted Revision through the page'
      );

      await appPage.getByRole('button', { name: /Point at things/ }).click();
      await frame.locator('.app-action').click();
      await expectLater(
        async () =>
          (
            (await (
              await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
            ).json()) as { annotations: Array<{ targets: Array<{ provenanceConfidence: string; sourceProvenance?: { adapter: string } }> }> }
          ).annotations[0]?.targets[0]?.provenanceConfidence,
        (confidence) => confidence === 'exact',
        'a stamped element reports exact provenance'
      );
      const stamped = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
      ).json()) as { annotations: Array<{ targets: Array<{ sourceProvenance?: { adapter: string } }> }> };
      expect(stamped.annotations[0]?.targets[0]?.sourceProvenance?.adapter).toBe('visual-intent-stamp@0.1');

      await appPage.locator('.anchored-card textarea').fill('Ship it.');
      await appPage.locator('.anchored-card textarea').press('Enter');
      await frame.locator('.app-plain').click();
      await expectLater(
        async () =>
          (
            (await (
              await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
            ).json()) as { annotations: Array<{ targets: Array<{ provenanceConfidence: string }> }> }
          ).annotations.length,
        (count) => count === 2,
        'a second Annotation is created'
      );
      const both = (await (
        await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`)
      ).json()) as { annotations: Array<{ targets: Array<{ provenanceConfidence: string }> }> };
      expect(both.annotations.some((annotation) => annotation.targets[0]?.provenanceConfidence === 'unavailable')).toBe(true);

      const capture = appPage.locator('.anchored-card [data-action="capture-view"]');
      expect(await capture.count()).toBe(1);
      expect(await capture.getAttribute('title')).toMatch(/Chromium desktop/);

      await appPage.getByRole('button', { name: /Point at things, armed/ }).click();
      await frame.locator('input[name="filter"]').fill('delivered');
      await frame.getByRole('button', { name: 'Apply filter' }).click();
      await expectLater(
        () => dev.requests.filter((request) => request.url.startsWith('/submit') && request.method === 'POST').length,
        (count) => count >= 1,
        'a form submission reaches the application'
      );
      const submitted = dev.requests.find((request) => request.url.startsWith('/submit') && request.method === 'POST');
      expect(submitted?.body).toBe('filter=delivered');
    } finally {
      await appPage.close();
      await dev.stop();
    }
  }, 120000);


  it('stops calling an unrendered row deleted, and the operator\u2019s own scroll restores it', async () => {
    const virtualized = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Virtualized roster</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      #list { position: relative; }
      .row { position: absolute; left: 0; right: 0; height: 60px; line-height: 60px; padding-left: 8px; border-bottom: 1px solid rgb(238, 238, 238); }
    </style>
  </head>
  <body>
    <main class="roster">
      <h1>Roster</h1>
      <div id="list"></div>
    </main>
    <script>
      const TOTAL = 200;
      const ROW = 60;
      const WINDOW = 10;
      const list = document.getElementById('list');
      list.style.height = TOTAL * ROW + 'px';
      function render() {
        const first = Math.max(0, Math.floor(window.scrollY / ROW) - 2);
        const last = Math.min(TOTAL, first + WINDOW);
        list.textContent = '';
        for (let index = first; index < last; index += 1) {
          const row = document.createElement('div');
          row.className = 'row';
          row.id = 'row-' + index;
          row.style.top = index * ROW + 'px';
          row.textContent = 'Row ' + String(index).padStart(4, '0');
          list.appendChild(row);
        }
      }
      window.addEventListener('scroll', render);
      render();
    </script>
  </body>
</html>`;
    const virtualDir = mkdtempSync(join(tmpdir(), 'vil-virtual-artifact-'));
    const virtualPath = join(virtualDir, 'roster.html');
    writeFileSync(virtualPath, virtualized, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: virtualPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const virtualPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const snapshot = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{ annotations: Array<{ state: string; resolutions: Array<{ match: string }> }> }>;
    try {
      await virtualPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = virtualPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('#row-100').count(), (count) => count === 0, 'row 100 is not rendered at rest');

      await virtualPage.getByRole('button', { name: /Point at things/ }).click();
      await frame.locator('body').evaluate(() => {
        window.scrollTo(0, 6000);
      });
      await expectLater(() => frame.locator('#row-100').count(), (count) => count === 1, 'row 100 renders once scrolled to');
      await frame.locator('#row-100').click();
      await virtualPage.locator('.anchored-card textarea').fill('Align this row with the header.');
      await virtualPage.locator('.anchored-card textarea').press('Enter');
      await virtualPage.getByRole('button', { name: 'Send the queue' }).click();
      await expectLater(
        async () => (await snapshot()).annotations[0]?.state,
        (state) => state === 'delivered',
        'the queue is sent'
      );

      await frame.locator('body').evaluate(() => {
        window.scrollTo(0, 0);
      });
      await expectLater(() => frame.locator('#row-100').count(), (count) => count === 0, 'row 100 leaves the rendered window');
      await expectLater(
        () => virtualPage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'state-only',
        'the row stops claiming the Target is not in this revision'
      );
      const rowText = await virtualPage.locator('.annotation-row').first().innerText();
      expect(rowText).toMatch(/may exist only in a state no longer on screen/i);

      await frame.locator('body').evaluate(() => {
        window.scrollTo(0, 6000);
      });
      await expectLater(
        () => virtualPage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'matched' || label === 'recovered',
        'the Target is found again once the operator scrolls the row back'
      );
      await expectLater(
        async () => (await snapshot()).annotations[0]?.resolutions[0]?.match !== 'unresolved',
        (resolved) => resolved,
        'resolution re-ran with no re-pointing'
      );
    } finally {
      await virtualPage.close();
    }
  }, 120000);

  it('points inside an open shadow root, and re-finds the same node after a reload', async () => {
    const shadowed = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shadow widget</title>
    <style>body { margin: 2rem; font-family: system-ui, sans-serif; }</style>
  </head>
  <body>
    <main class="page">
      <h1>Account</h1>
      <div id="widget"></div>
    </main>
    <script>
      const root = document.getElementById('widget').attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>.card { border: 1px solid #ddd; padding: 1rem; } .primary { font: inherit; padding: 10px 18px; }</style>' +
        '<section class="card"><h2>Delivery</h2><p>Where should it go?</p><button class="primary" type="button">Save address</button></section>';
    </script>
  </body>
</html>`;
    const shadowDir = mkdtempSync(join(tmpdir(), 'vil-shadow-artifact-'));
    const shadowPath = join(shadowDir, 'widget.html');
    writeFileSync(shadowPath, shadowed, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: shadowPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const shadowPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const snapshot = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{
        annotations: Array<{
          state: string;
          targets: Array<{ renderedGrounding: { selectors?: string[] } }>;
          resolutions: Array<{ match: string }>;
        }>;
      }>;
    try {
      await shadowPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = shadowPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('button.primary').count(), (count) => count === 1, 'the shadow button renders');

      await shadowPage.getByRole('button', { name: /Point at things/ }).click();
      await frame.locator('button.primary').click();
      const card = shadowPage.locator('.anchored-card');
      await card.waitFor({ state: 'visible' });
      expect(await card.innerText()).toMatch(/Save address/);

      await card.locator('textarea').fill('Make the save button the primary action.');
      await card.locator('textarea').press('Enter');
      await expectLater(
        async () => (await snapshot()).annotations[0]?.targets[0]?.renderedGrounding.selectors?.[0]?.includes('|'),
        (boundaryQualified) => boundaryQualified === true,
        'the Target stores a boundary-qualified selector'
      );

      await shadowPage.getByRole('button', { name: 'Send the queue' }).click();
      await expectLater(
        async () => (await snapshot()).annotations[0]?.state,
        (state) => state === 'delivered',
        'the queue is sent'
      );

      await shadowPage.reload({ waitUntil: 'domcontentloaded' });
      await expectLater(
        async () => (await snapshot()).annotations[0]?.resolutions[0]?.match !== 'unresolved',
        (resolved) => resolved,
        'the shadow Target re-resolves after a reload'
      );
      await expectLater(
        () => shadowPage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'matched' || label === 'recovered',
        'the row reports the shadow Target as found'
      );
    } finally {
      await shadowPage.close();
    }
  }, 120000);

  it('says the surface read only part of a revision too large to walk whole', async () => {
    const rows = Array.from({ length: 2500 }, (_, index) => `<div class="row">Row ${index}</div>`).join('');
    const bigArtifact = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Large roster</title>
    <style>body { margin: 0; font-family: system-ui, sans-serif; } .row { height: 20px; }</style>
  </head>
  <body>
    <main class="roster">${rows}</main>
  </body>
</html>`;
    const bigDir = mkdtempSync(join(tmpdir(), 'vil-big-artifact-'));
    const bigPath = join(bigDir, 'roster.html');
    writeFileSync(bigPath, bigArtifact, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: bigPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const bigPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await bigPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = bigPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('.row').count(), (count) => count === 2500, 'the roster is in the document');

      await bigPage.getByRole('button', { name: /Point at things/ }).click();
      await frame.locator('.row').nth(2400).click();
      const card = bigPage.locator('.anchored-card');
      await card.waitFor({ state: 'visible' });
      await card.locator('textarea').fill('Make this the summary row.');
      await card.locator('textarea').press('Enter');
      await bigPage.getByRole('button', { name: 'Send the queue' }).click();
      await bigPage.reload({ waitUntil: 'domcontentloaded' });

      await expectLater(
        () => bigPage.locator('.annotation-row .hint').first().innerText(),
        (text) => /part of this revision the surface read/i.test(text),
        'the row states that the surface read only part of the revision'
      );
      await expectLater(
        () => bigPage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'unread',
        'the resolution word says the surface did not read it, not that it is deleted'
      );
      await expectLater(
        () => bigPage.getByRole('button', { name: 'Approve' }).first().isDisabled(),
        (disabled) => disabled === true,
        'the truncation still blocks approval rather than being waved through'
      );
      const stored = (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then(
        (response) => response.json()
      )) as { annotations: Array<{ resolutions: Array<{ match: string; candidates: unknown[]; truncated?: boolean }> }> };
      expect(stored.annotations[0]?.resolutions[0]?.match).toBe('unresolved');
      expect(stored.annotations[0]?.resolutions[0]?.truncated).toBe(true);
    } finally {
      await bigPage.close();
    }
  }, 120000);

  it('gives a proxied application one artifact layer, even when it embeds a same-origin frame', async () => {
    const dev = await startDevServer({ framed: true });
    const framedPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      const opened = await service.openSession({ kind: 'react-vite-app', url: dev.url });
      await framedPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const artifact = framedPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => artifact.locator('.app-root').count(), (count) => count === 1, 'the application renders in the frame');
      const widget = artifact.frameLocator('iframe#widget');
      await expectLater(() => widget.locator('.widget-action').count(), (count) => count === 1, 'the embedded document renders');

      const widgetHtml = await (
        await fetch(`${service.baseUrl}/app/${opened.sessionId}/widget`, {
          headers: { 'x-session-cap': opened.capability }
        })
      ).text();
      expect(widgetHtml).toContain('/ui/artifact-layer.js');

      await expectLater(
        () => artifact.locator('[data-vil-overlay]').count(),
        (count) => count === 1,
        'the artifact document carries exactly one overlay'
      );
      await expectLater(
        () => widget.locator('[data-vil-overlay]').count(),
        (count) => count === 0,
        'the embedded document carries no second overlay'
      );
      await expectLater(
        () => widget.locator('[data-vil-mark]').count(),
        (count) => count === 0,
        'the embedded document draws no marks'
      );

      await framedPage.getByRole('button', { name: /Point at things/ }).click();
      await widget.locator('.widget-action').click({ position: { x: 2, y: 2 } });
      await framedPage.waitForTimeout(500);
      await expectLater(
        () => widget.locator('[data-vil-overlay]').count(),
        (count) => count === 0,
        'pointing over the embedded document still grows no second layer'
      );
    } finally {
      await framedPage.close();
      await dev.stop();
    }
  }, 120000);

  it('points inside a same-origin frame, marks at its true position, and re-finds it after a revision', async () => {
    const dev = await startDevServer({ framed: true });
    const framePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      const opened = await service.openSession({ kind: 'react-vite-app', url: dev.url });
      const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
      const snapshot = () =>
        fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
          response.json()
        ) as Promise<{
          annotations: Array<{
            state: string;
            targets: Array<{
              renderedGrounding: { selectors?: string[] };
              runtimeState?: { documents?: Array<{ path: string; address?: string }> };
            }>;
            resolutions: Array<{ match: string }>;
          }>;
        }>;
      await framePage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const artifact = framePage.frameLocator('iframe.artifact-frame');
      const widget = artifact.frameLocator('iframe#widget');
      await expectLater(() => widget.locator('.widget-action').count(), (count) => count === 1, 'the embedded document renders');

      await framePage.getByRole('button', { name: /Point at things/ }).click();
      await widget.locator('.widget-action').click();
      const card = framePage.locator('.anchored-card');
      await card.waitFor({ state: 'visible' });
      expect(await card.innerText()).toMatch(/Confirm/);

      const widgetBox = await widget.locator('.widget-action').boundingBox();
      const markBox = await artifact.locator('[data-vil-mark="owned"]').boundingBox();
      expect(markBox).not.toBeNull();
      expect(Math.abs((markBox?.x ?? 0) - (widgetBox?.x ?? 0))).toBeLessThan(3);
      expect(Math.abs((markBox?.y ?? 0) - (widgetBox?.y ?? 0))).toBeLessThan(3);

      await card.locator('textarea').fill('Make Confirm the primary action.');
      await card.locator('textarea').press('Enter');
      await expectLater(
        async () => (await snapshot()).annotations[0]?.targets[0]?.renderedGrounding.selectors?.[0]?.includes('>>'),
        (frameQualified) => frameQualified === true,
        'the Target stores a frame-qualified selector'
      );
      const stored = await snapshot();
      expect(stored.annotations[0]?.targets[0]?.runtimeState?.documents?.[0]?.path).toContain('iframe#widget');
      expect(stored.annotations[0]?.targets[0]?.runtimeState?.documents?.[0]?.address).toBe('widget');

      await framePage.getByRole('button', { name: 'Send the queue' }).click();
      await expectLater(
        async () => (await snapshot()).annotations[0]?.state,
        (state) => state === 'delivered',
        'the queue is sent'
      );
      await expectLater(
        async () => (await snapshot()).annotations[0]?.resolutions[0]?.match,
        (match) => match !== 'unresolved',
        'the frame Target resolves against the same revision'
      );

      await framePage.reload({ waitUntil: 'domcontentloaded' });
      await expectLater(
        () => framePage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'matched' || label === 'recovered',
        'the frame Target re-resolves after a reload'
      );
    } finally {
      await framePage.close();
      await dev.stop();
    }
  }, 120000);

  it('carries a text range inside a shadow root, and names a boundary that later closes', async () => {
    const openVersion = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Shadow text</title><style>body { margin: 2rem; font-family: system-ui, sans-serif; }</style></head>
  <body>
    <main class="page"><div id="open"></div></main>
    <script>
      const root = document.getElementById('open').attachShadow({ mode: 'open' });
      root.innerHTML = '<section><p>Where should the parcel go?</p></section>';
    </script>
  </body>
</html>`;
    const closedVersion = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Shadow text</title><style>body { margin: 2rem; font-family: system-ui, sans-serif; }</style></head>
  <body>
    <main class="page"><div id="open"></div></main>
    <script>
      const root = document.getElementById('open').attachShadow({ mode: 'closed' });
      root.innerHTML = '<section><p>Where should the parcel go?</p></section>';
    </script>
  </body>
</html>`;
    const textDir = mkdtempSync(join(tmpdir(), 'vil-shadow-text-'));
    const textPath = join(textDir, 'shadow-text.html');
    writeFileSync(textPath, openVersion, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: textPath });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const textPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const snapshot = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{
        annotations: Array<{
          state: string;
          targets: Array<{ kind: string; renderedGrounding: { selectors?: string[] } }>;
          resolutions: Array<{ match: string }>;
        }>;
      }>;
    try {
      await textPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = textPage.frameLocator('iframe.artifact-frame');
      const paragraph = frame.locator('#open p');
      await expectLater(() => paragraph.count(), (count) => count === 1, 'the shadow paragraph renders');

      await textPage.getByRole('button', { name: /Point at things/ }).click();
      const box = await paragraph.boundingBox();
      await textPage.mouse.move((box?.x ?? 0) + 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
      await textPage.mouse.down();
      await textPage.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * 0.7, (box?.y ?? 0) + (box?.height ?? 0) / 2, { steps: 6 });
      await textPage.mouse.up();

      const card = textPage.locator('.anchored-card');
      await card.waitFor({ state: 'visible' });
      await expectLater(
        async () => (await snapshot()).annotations[0]?.targets[0]?.kind,
        (kind) => kind === 'text-range',
        'a selection inside the shadow root becomes a text-range Target'
      );
      expect((await snapshot()).annotations[0]?.targets[0]?.renderedGrounding.selectors?.[0]).toContain('|');

      await card.locator('textarea').fill('Tighten this sentence.');
      await card.locator('textarea').press('Enter');
      await textPage.getByRole('button', { name: 'Send the queue' }).click();
      await expectLater(
        async () => (await snapshot()).annotations[0]?.state,
        (state) => state === 'delivered',
        'the queue is sent'
      );
      await expectLater(
        async () => (await snapshot()).annotations[0]?.resolutions[0]?.match,
        (match) => match !== 'unresolved',
        'the shadow text range resolves after a reload'
      );

      writeFileSync(textPath, closedVersion, 'utf8');
      await textPage.locator('.banner').waitFor({ state: 'visible' });
      await textPage.getByRole('button', { name: 'Reload artifact' }).click();
      await expectLater(
        () => textPage.locator('.annotation-row .resolution').first().getAttribute('data-label'),
        (label) => label === 'blocked',
        'the row names the boundary instead of claiming the target is gone'
      );
      await expectLater(
        () => textPage.locator('.annotation-row .hint').first().innerText(),
        (text) => /closed shadow root/i.test(text),
        'the reason names the closed shadow root'
      );
    } finally {
      await textPage.close();
    }
  }, 120000);

  it('draws an Area that encloses content inside a same-origin frame', async () => {
    const dev = await startDevServer({ framed: true });
    const areaPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      const opened = await service.openSession({ kind: 'react-vite-app', url: dev.url });
      const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
      await areaPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const artifact = areaPage.frameLocator('iframe.artifact-frame');
      const widget = artifact.frameLocator('iframe#widget');
      await expectLater(() => widget.locator('.widget-action').count(), (count) => count === 1, 'the embedded document renders');

      dev.advance();
      await expectLater(
        async () =>
          (
            (await (
              await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}?${auth}`)
            ).json()) as { adoptedRevision: string }
          ).adoptedRevision,
        (revision) => revision === dev.advancedRevision,
        'the application update channel has settled before the box drag begins'
      );

      await areaPage.getByRole('button', { name: /Box an area/ }).click();
      await expectLater(
        () => artifact.locator('body').getAttribute('style'),
        (style) => (style ?? '').includes('crosshair'),
        'the layer is armed for boxing before the drag begins'
      );
      const button = await widget.locator('.widget-action').boundingBox();
      const x1 = (button?.x ?? 0) - 8;
      const y1 = (button?.y ?? 0) - 8;
      const x2 = (button?.x ?? 0) + (button?.width ?? 0) + 8;
      const y2 = (button?.y ?? 0) + (button?.height ?? 0) + 8;
      await areaPage.mouse.move(x1, y1);
      await areaPage.mouse.down();
      await areaPage.mouse.move(x2, y2, { steps: 6 });
      await areaPage.mouse.up();

      const card = areaPage.locator('.anchored-card');
      await card.waitFor({ state: 'visible' });
      await expectLater(
        async () => card.innerText(),
        (text) => /Confirm/.test(text),
        'the Area names the content it encloses inside the frame'
      );
      const stored = (await fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then(
        (response) => response.json()
      )) as { annotations: Array<{ targets: Array<{ kind: string; label?: string; renderedGrounding: { selectors?: string[] } }> }> };
      const target = stored.annotations[0]?.targets[0];
      expect(target?.kind).toBe('region');
      expect(target?.renderedGrounding.selectors?.some((selector) => selector.includes('>>'))).toBe(true);
    } finally {
      await areaPage.close();
      await dev.stop();
    }
  }, 120000);

  it('states the one hole an Area could not read, with the policy cause', async () => {
    const blocked = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Blocked frame</title><style>body { margin: 0; font-family: system-ui, sans-serif; } main { padding: 24px; } iframe { display: block; width: 240px; height: 120px; margin-top: 16px; border: 1px solid #ddd; }</style></head>
  <body><main><h1>Settings</h1><iframe id="blocked" title="Blocked" src="widget.html"></iframe></main></body>
</html>`;
    const blockedDir = mkdtempSync(join(tmpdir(), 'vil-blocked-frame-'));
    const blockedPath = join(blockedDir, 'blocked.html');
    writeFileSync(blockedPath, blocked, 'utf8');
    const opened = await service.openSession({ kind: 'saved-html', path: blockedPath });
    const blockedPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const auth = `session=${opened.sessionId}&cap=${opened.capability}`;
    const snapshot = () =>
      fetch(`${service.baseUrl}/api/sessions/${opened.sessionId}/annotations?${auth}`).then((response) =>
        response.json()
      ) as Promise<{ annotations: Array<{ targets: Array<{ kind: string; label?: string }> }> }>;
    try {
      await blockedPage.goto(opened.reviewUrl, { waitUntil: 'domcontentloaded' });
      const frame = blockedPage.frameLocator('iframe.artifact-frame');
      await expectLater(() => frame.locator('#blocked').count(), (count) => count === 1, 'the blocked frame element is in the document');

      await blockedPage.getByRole('button', { name: /Box an area/ }).click();
      await expectLater(
        () => frame.locator('body').getAttribute('style'),
        (style) => (style ?? '').includes('crosshair'),
        'the layer is armed for boxing before the drag begins'
      );
      const frameBox = await frame.locator('#blocked').boundingBox();
      await blockedPage.mouse.move((frameBox?.x ?? 0) - 20, (frameBox?.y ?? 0) - 10);
      await blockedPage.mouse.down();
      await blockedPage.mouse.move((frameBox?.x ?? 0) + (frameBox?.width ?? 0) + 20, (frameBox?.y ?? 0) + (frameBox?.height ?? 0) + 10, { steps: 6 });
      await blockedPage.mouse.up();

      await expectLater(
        async () => (await snapshot()).annotations[0]?.targets[0]?.label ?? '',
        (label) => /content policy blocks/.test(label),
        'the Area states the hole with the policy cause'
      );
    } finally {
      await blockedPage.close();
    }
  }, 120000);
});