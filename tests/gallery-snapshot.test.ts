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
const RENDER_PLATFORM = process.platform;
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
    if (process.env['UPDATE_GALLERY'] === '1') {
      mkdirSync(baselineDir, { recursive: true });
      writeFileSync(TOKEN_BASELINE, JSON.stringify(tokens, null, 2), 'utf8');
      console.log(`wrote token baseline ${TOKEN_BASELINE}`);
      return;
    }
    if (!existsSync(TOKEN_BASELINE)) {
      throw new Error(
        `No token baseline at ${TOKEN_BASELINE}. A missing baseline is not the same as an unchanged one; run with UPDATE_GALLERY=1 once the design is intended.`
      );
    }
    const expected = JSON.parse(readFileSync(TOKEN_BASELINE, 'utf8')) as typeof tokens;
    expect(tokens).toEqual(expected);
  });

  it('passes the documented contrast floor for every semantic pair in both themes', async () => {
    const failures = await page.evaluate(() => {
      const pairs = [
        ['attention', '--attention-surface', '--attention-ink'],
        ['private', '--private-surface', '--private-ink'],
        ['progress', '--progress-surface', '--progress-ink'],
        ['success', '--success-surface', '--success-ink'],
        ['closed', '--closed-surface', '--closed-ink'],
        ['destructive', '--destructive-surface', '--destructive-ink']
      ] as const;
      const parse = (value: string): [number, number, number] => {
        const hex = value.trim().replace('#', '');
        return [
          parseInt(hex.slice(0, 2), 16) / 255,
          parseInt(hex.slice(2, 4), 16) / 255,
          parseInt(hex.slice(4, 6), 16) / 255
        ];
      };
      const luminance = (rgb: [number, number, number]): number => {
        const [r, g, b] = rgb.map((channel) =>
          channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
        ) as [number, number, number];
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a: string, b: string): number => {
        const [high, low] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x) as [number, number];
        return (high + 0.05) / (low + 0.05);
      };
      const problems: string[] = [];
      const read = (theme: 'light' | 'dark'): Record<string, string> => {
        const root = theme === 'dark' ? document.querySelector('.gallery[data-theme="dark"]') : document.documentElement;
        const computed = getComputedStyle(root as Element);
        const out: Record<string, string> = {};
        for (const [, surface, ink] of pairs) {
          out[surface] = computed.getPropertyValue(surface).trim();
          out[ink] = computed.getPropertyValue(ink).trim();
        }
        return out;
      };
      for (const theme of ['light', 'dark'] as const) {
        const values = read(theme);
        for (const [name, surface, ink] of pairs) {
          const value = ratio(values[surface]!, values[ink]!);
          if (value < 4.5) {
            problems.push(`${theme} ${name} is ${value.toFixed(2)}:1 (floor 4.5:1)`);
          }
        }
      }
      return problems;
    });
    expect(failures, failures.join('; ')).toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`captures the ${theme} gallery and fails on difference`, async () => {
      const section = page.locator(`.gallery[data-theme="${theme}"]`);
      const buffer = await section.screenshot();
      const baselinePath = join(baselineDir, `gallery-${theme}-${RENDER_PLATFORM}.png`);
      if (process.env['UPDATE_GALLERY'] === '1') {
        mkdirSync(baselineDir, { recursive: true });
        writeFileSync(baselinePath, buffer);
        console.log(`wrote gallery baseline ${baselinePath}`);
        return;
      }
      if (!existsSync(baselinePath)) {
        const actualPath = writeActualRender(theme, buffer);
        throw new Error(
          `No ${theme} gallery baseline for ${RENDER_PLATFORM} at ${baselinePath}. A missing baseline is not the same as an unchanged one, and another platform's baseline does not substitute for this one: font metrics move the layout, so a screenshot is pinned per rendering platform. This run's render is at ${actualPath}; record it as this platform's baseline once the design is intended, or record here with UPDATE_GALLERY=1.`
        );
      }
      const difference = pixelDifference(readFileSync(baselinePath), buffer);
      if (difference.ratio > TOLERANCE) {
        writeActualRender(theme, buffer);
      }
      expect(
        difference.ratio,
        `the ${theme} gallery drifted by ${(difference.ratio * 100).toFixed(2)}% (limit ${(TOLERANCE * 100).toFixed(1)}%). The baseline renders ${difference.baselineSize} and this run renders ${difference.actualSize}. Inspect the actual screenshot and update the baseline only when the change is intended.`
      ).toBeLessThanOrEqual(TOLERANCE);
    });
  }
});

function writeActualRender(theme: string, buffer: Buffer): string {
  const actualPath = join(root, '.scratch', `gallery-${theme}.actual.png`);
  mkdirSync(dirname(actualPath), { recursive: true });
  writeFileSync(actualPath, buffer);
  return actualPath;
}

function pixelDifference(
  expected: Buffer,
  actual: Buffer
): { ratio: number; baselineSize: string; actualSize: string } {
  const a = PNG.sync.read(expected);
  const b = PNG.sync.read(actual);
  const baselineSize = `${a.width}x${a.height}`;
  const actualSize = `${b.width}x${b.height}`;
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, baselineSize, actualSize };
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
  return { ratio: differing / pixels, baselineSize, actualSize };
}