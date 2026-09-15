import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { PNG } from 'pngjs';
import { createReviewService } from '../src/mcp/service.js';
import { startLocalService, type LocalService } from '../src/service/http.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = join(root, 'tests', '__screenshots__');
const TOKEN_BASELINE = join(baselineDir, 'tokens.json');
const TOLERANCE = 0.03;

let browser: Browser;
let service: LocalService;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  const dataDir = mkdtempSync(join(tmpdir(), 'vil-gallery-'));
  service = await startLocalService({
    dataDir,
    reviewService: createReviewService({ dataDir }),
    port: 0
  });
  page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto(`${service.baseUrl}/gallery`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset['galleryReady'] === 'true');
  await page.evaluate(() => document.fonts.ready);
}, 60000);

afterAll(async () => {
  await browser?.close();
  await service?.stop();
});

describe('design gallery scripted pass', () => {
  it('pins every design token exactly, independent of the platform renderer', async () => {
    const tokens = await page.evaluate(() => {
      const read = (element: Element): Record<string, string> => {
        const computed = getComputedStyle(element);
        const out: Record<string, string> = {};
        for (const name of Array.from(computed)) {
          if (name.startsWith('--')) {
            out[name] = computed.getPropertyValue(name).trim();
          }
        }
        return out;
      };
      const dark = document.querySelector('.gallery[data-theme="dark"]');
      return {
        light: read(document.documentElement),
        dark: dark ? read(dark) : {}
      };
    });
    if (!existsSync(TOKEN_BASELINE) || process.env['UPDATE_GALLERY'] === '1') {
      mkdirSync(baselineDir, { recursive: true });
      writeFileSync(TOKEN_BASELINE, JSON.stringify(tokens, null, 2), 'utf8');
      console.log(`wrote token baseline ${TOKEN_BASELINE}`);
      return;
    }
    const expected = JSON.parse(readFileSync(TOKEN_BASELINE, 'utf8')) as typeof tokens;
    expect(tokens).toEqual(expected);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`captures the ${theme} gallery and fails on difference`, async () => {
      const section = page.locator(`.gallery[data-theme="${theme}"]`);
      const buffer = await section.screenshot();
      const baselinePath = join(baselineDir, `gallery-${theme}.png`);
      if (!existsSync(baselinePath) || process.env['UPDATE_GALLERY'] === '1') {
        mkdirSync(baselineDir, { recursive: true });
        writeFileSync(baselinePath, buffer);
        console.log(`wrote gallery baseline ${baselinePath}`);
        return;
      }
      const difference = pixelDifference(readFileSync(baselinePath), buffer);
      if (difference > TOLERANCE) {
        const actualPath = join(root, '.scratch', `gallery-${theme}.actual.png`);
        mkdirSync(dirname(actualPath), { recursive: true });
        writeFileSync(actualPath, buffer);
      }
      expect(
        difference,
        `the ${theme} gallery drifted by ${(difference * 100).toFixed(2)}% (limit ${(TOLERANCE * 100).toFixed(1)}%). Inspect the actual screenshot and update the baseline only when the change is intended.`
      ).toBeLessThanOrEqual(TOLERANCE);
    });
  }
});

function pixelDifference(expected: Buffer, actual: Buffer): number {
  const a = PNG.sync.read(expected);
  const b = PNG.sync.read(actual);
  if (a.width !== b.width || a.height !== b.height) {
    return 1;
  }
  let differing = 0;
  const pixels = a.width * a.height;
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    const delta =
      Math.abs(a.data[offset]! - b.data[offset]!) +
      Math.abs(a.data[offset + 1]! - b.data[offset + 1]!) +
      Math.abs(a.data[offset + 2]! - b.data[offset + 2]!);
    if (delta > 24) {
      differing += 1;
    }
  }
  return differing / pixels;
}