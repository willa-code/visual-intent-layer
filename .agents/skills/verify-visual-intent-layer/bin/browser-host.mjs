#!/usr/bin/env node
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const options = parseArgs(process.argv.slice(2));
mkdirSync(options.evidenceDir, { recursive: true });
mkdirSync(options.videoDir, { recursive: true });
const logFile = join(options.runDir, 'host.log');

let browser;
let context;
let page;
let tracing = false;
let pendingChooser;
let consoleEntries = [];
let networkEntries = [];

function log(message) {
  appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

async function launchBrowser() {
  browser = await chromium.launch({ headless: options.headless });
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: options.videoDir }
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  tracing = true;
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  pendingChooser = page.waitForEvent('filechooser', { timeout: 0 }).catch(() => undefined);
  page.on('console', (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    consoleEntries.push({ type: 'pageerror', text: error.message });
  });
  page.on('requestfailed', (request) => {
    networkEntries.push({ url: request.url(), failed: request.failure()?.errorText ?? 'unknown' });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkEntries.push({ url: response.url(), status: response.status() });
    }
  });
}

function scope(frame) {
  return frame === 'artifact' ? page.frameLocator('iframe.artifact-frame') : page;
}

function locatorFor(target, frame) {
  const root = scope(frame);
  if (target.selector !== undefined) {
    return root.locator(target.selector);
  }
  if (target.role !== undefined) {
    return root.getByRole(target.role, target.name !== undefined ? { name: target.name, exact: target.exact === true } : {});
  }
  if (target.text !== undefined) {
    return root.getByText(target.text, { exact: target.exact === true });
  }
  throw new Error('a target needs selector, role or text');
}

function pick(locator, target) {
  return target.nth === undefined ? locator.first() : locator.nth(target.nth);
}

function nextRecordingName() {
  const existing = readdirSync(options.evidenceDir).filter((name) => /^recording(-\d+)?\.webm$/.test(name));
  if (existing.length === 0) return join(options.evidenceDir, 'recording.webm');
  return join(options.evidenceDir, `recording-${existing.length + 1}.webm`);
}

async function closeBrowser() {
  const video = page?.video?.();
  if (tracing && context) {
    await context.tracing.stop({ path: join(options.evidenceDir, 'trace.zip') }).catch(() => undefined);
    tracing = false;
  }
  if (context) {
    await context.close().catch(() => undefined);
  }
  if (video) {
    await video.saveAs(nextRecordingName()).catch(() => undefined);
  }
  if (browser) {
    await browser.close().catch(() => undefined);
  }
  context = undefined;
  browser = undefined;
  page = undefined;
}

const handlers = {
  'GET /health': async () => ({ ok: true, pid: process.pid, url: page?.url() ?? null }),
  'POST /navigate': async (body) => {
    await page.goto(body.url, { waitUntil: 'domcontentloaded' });
    return { url: page.url() };
  },
  'POST /reload': async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    return { url: page.url() };
  },
  'POST /click': async (body) => {
    await pick(locatorFor(body.target, body.frame), body.target).click({
      modifiers: body.modifiers ?? []
    });
    return { ok: true };
  },
  'POST /fill': async (body) => {
    await pick(locatorFor(body.target, body.frame), body.target).fill(body.value);
    return { ok: true };
  },
  'POST /press': async (body) => {
    if (body.target) {
      await pick(locatorFor(body.target, body.frame), body.target).press(body.key);
    } else {
      await page.keyboard.press(body.key);
    }
    return { ok: true };
  },
  'POST /hover': async (body) => {
    await pick(locatorFor(body.target, body.frame), body.target).hover();
    return { ok: true };
  },
  'POST /drag': async (body) => {
    const from = pick(locatorFor(body.from, body.frame), body.from);
    const fromBox = await from.boundingBox();
    const to = body.to.selector !== undefined || body.to.role !== undefined || body.to.text !== undefined
      ? await pick(locatorFor(body.to, body.frame), body.to).boundingBox()
      : body.to;
    if (!fromBox || !to) {
      throw new Error('drag needs measurable from and to boxes');
    }
    const modifiers = body.modifiers ?? [];
    for (const key of modifiers) {
      await page.keyboard.down(key);
    }
    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const endX = to.x + (to.width ?? 0) / 2 + (body.nudgeX ?? 0);
    const endY = to.y + (to.height ?? 0) / 2 + (body.nudgeY ?? 0);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    for (const key of modifiers.slice().reverse()) {
      await page.keyboard.up(key);
    }
    return { ok: true };
  },
  'POST /wait': async (body) => {
    if (body.target) {
      await pick(locatorFor(body.target, body.frame), body.target).waitFor({
        state: body.state ?? 'visible',
        timeout: body.timeoutMs ?? 15000
      });
    } else {
      await page.waitForLoadState(body.state ?? 'networkidle', { timeout: body.timeoutMs ?? 15000 });
    }
    return { ok: true };
  },
  'POST /screenshot': async (body) => {
    const path = join(options.evidenceDir, `${body.name}.png`);
    await page.screenshot({ path, fullPage: body.fullPage === true });
    return { path, bytes: statSync(path).size };
  },
  'POST /snapshot': async (body) => {
    const path = join(options.evidenceDir, `${body.name}.aria.txt`);
    const root = body.frame === 'artifact' ? page.frameLocator('iframe.artifact-frame').locator('body') : page.locator('body');
    const yaml = await root.ariaSnapshot();
    writeFileSync(path, yaml, 'utf8');
    return { path, bytes: yaml.length };
  },
  'POST /collect': async (body) => {
    const result = { console: consoleEntries, network: networkEntries };
    if (body.clear !== false) {
      consoleEntries = [];
      networkEntries = [];
    }
    return result;
  },
  'POST /trace': async (body) => {
    const path = join(options.evidenceDir, `${body.name ?? 'trace'}.zip`);
    if (tracing) {
      await context.tracing.stop({ path });
      await context.tracing.start({ screenshots: true, snapshots: true });
    }
    return { path, bytes: statSync(path).size };
  },
  'POST /chooser/arm': async () => {
    pendingChooser = page.waitForEvent('filechooser', { timeout: 20000 }).catch(() => undefined);
    return { ok: true };
  },
  'POST /chooser/set': async (body) => {
    const chooser = await pendingChooser;
    if (!chooser) {
      throw new Error('no file chooser appeared');
    }
    await chooser.setFiles(body.path);
    return { ok: true };
  },
  'POST /restart': async (body) => {
    await closeBrowser();
    await launchBrowser();
    if (body.url) {
      await page.goto(body.url, { waitUntil: 'domcontentloaded' });
    }
    return { url: page.url() };
  },
  'POST /close': async () => {
    await closeBrowser();
    setTimeout(() => process.exit(0), 50);
    return { ok: true };
  }
};

async function handle(request, response) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const body = raw ? JSON.parse(raw) : {};
  const key = `${request.method} ${new URL(request.url, 'http://127.0.0.1').pathname}`;
  const handler = handlers[key];
  response.setHeader('content-type', 'application/json');
  if (!handler) {
    response.writeHead(404);
    response.end(JSON.stringify({ ok: false, error: `no handler for ${key}` }));
    return;
  }
  try {
    const result = await handler(body);
    response.writeHead(200);
    response.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    log(`error ${key}: ${error instanceof Error ? error.stack : String(error)}`);
    response.writeHead(200);
    response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}

function parseArgs(args) {
  const parsed = { runDir: '.', evidenceDir: 'evidence', videoDir: 'evidence/video', headless: true };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--run-dir') parsed.runDir = args[++index];
    else if (arg === '--evidence-dir') parsed.evidenceDir = args[++index];
    else if (arg === '--video-dir') parsed.videoDir = args[++index];
    else if (arg === '--headed') parsed.headless = false;
  }
  return parsed;
}

await launchBrowser();
const server = createServer((request, response) => {
  void handle(request, response).catch((error) => {
    log(`fatal: ${error instanceof Error ? error.stack : String(error)}`);
  });
});
await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
const { port } = server.address();
const endpoint = `http://127.0.0.1:${port}`;
writeFileSync(join(options.runDir, 'host.json'), JSON.stringify({ endpoint, pid: process.pid }), 'utf8');
log(`host ready on ${endpoint}`);

process.on('SIGTERM', () => {
  void closeBrowser().finally(() => process.exit(0));
});
void existsSync;
