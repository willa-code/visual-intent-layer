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
