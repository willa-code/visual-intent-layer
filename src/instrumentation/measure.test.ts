import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectInstrumentation } from './measure.js';

describe('product instrumentation', () => {
  it('measures startup, memory, recovery, resolution, and token-efficiency signals', async () => {
    const report = await collectInstrumentation({ dataDir: mkdtempSync(join(tmpdir(), 'vil-inst-')) });
    expect(report.serverStartupMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.idleMemoryBytes.heapUsed).toBeGreaterThan(0);
    expect(report.recoveryMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.resolutionP50Ms).toBeGreaterThanOrEqual(0);
    expect(report.envelopeBytes).toBeGreaterThan(0);
    expect(report.tokenEfficiency.baselineChatBytes).toBeGreaterThan(report.tokenEfficiency.envelopeBytes);
    expect(report.platform.node).toMatch(/v\d+/);
    expect(report.invocationToReadyMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.submitToAcceptanceMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.saveToRefreshMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.revisionToResolutionMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.pointerToFeedback.harness).toContain('visual-intent:hover');
  }, 60000);

  it('exercises stress shapes without losing or duplicating intent', async () => {
    const report = await collectInstrumentation({ dataDir: mkdtempSync(join(tmpdir(), 'vil-inst-stress-')) });
    expect(report.stress.manyTargetsAccepted).toBe(50);
    expect(report.stress.rapidSavesTracked).toBe(true);
    expect(report.stress.envelopesIntact).toBe(true);
  }, 60000);
});
