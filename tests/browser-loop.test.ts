import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
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

async function startDevServer(): Promise<{
  url: string;
  requests: Array<{ method: string; url: string; body: string }>;
  advancedRevision: string;
  stop: () => Promise<void>;
}> {
  const requests: Array<{ method: string; url: string; body: string }> = [];
  const advancedRevision = `blake3:${'b'.repeat(64)}`;
  const upgradeSockets = new Set<import('node:stream').Duplex>();
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
      response.end(APP_HTML);
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
    const payload = Buffer.from(advancedRevision, 'utf8');
    setTimeout(() => socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload])), 250);
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolvePromise({
        url: `http://127.0.0.1:${port}/`,
        requests,
        advancedRevision,
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
});
