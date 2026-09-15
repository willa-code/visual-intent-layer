import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectInstrumentation } from './measure.js';

describe('product instrumentation', () => {
  it('measures startup, memory, recovery, resolution, and token-efficiency signals', async () => {
    const report = await collectInstrumentation({ dataDir: mkdtempSync(join(tmpdir(), 'vil-inst-')) });
    expect(report.serverStartupMs).toBeGreaterThanOrEqual(0);
    expect(report.idleMemoryBytes.heapUsed).toBeGreaterThan(0);
    expect(report.recoveryMs).toBeGreaterThanOrEqual(0);
    expect(report.resolutionP50Ms).toBeGreaterThanOrEqual(0);
    expect(report.envelopeBytes).toBeGreaterThan(0);
    expect(report.tokenEfficiency.baselineChatBytes).toBeGreaterThan(report.tokenEfficiency.envelopeBytes);
    expect(report.platform.node).toMatch(/v\d+/);
    expect(report.artifactReadyMs).toBeGreaterThanOrEqual(0);
  }, 30000);
});
