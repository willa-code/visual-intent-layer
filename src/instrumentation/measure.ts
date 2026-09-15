import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform, arch, cpus } from 'node:os';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { LifecycleStore } from '../lifecycle/store.js';
import { createReviewService } from '../mcp/service.js';
import { startLocalService } from '../service/http.js';
import { runBenchmark } from '../benchmark/run.js';
import { buildMatrix } from '../benchmark/matrix.js';

export type InstrumentationReport = {
  collectedAt: string;
  platform: { node: string; os: string; arch: string; cpuCount: number };
  serverStartupMs: number;
  idleMemoryBytes: { heapUsed: number; heapTotal: number; rss: number };
  recoveryMs: number;
  resolutionP50Ms: number;
  resolutionP95Ms: number;
  artifactReadyMs: number;
  envelopeBytes: number;
  tokenEfficiency: { envelopeBytes: number; baselineChatBytes: number; ratio: number };
};

const BASELINE_CHAT_BYTES = 24000;

export async function collectInstrumentation(options: { dataDir?: string } = {}): Promise<InstrumentationReport> {
  const dataDir = options.dataDir ?? mkdtempSync(join(tmpdir(), 'vil-inst-'));
  const review = createReviewService({ dataDir });

  const startupStarted = performance.now();
  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  const serverStartupMs = performance.now() - startupStarted;

  const memory = process.memoryUsage();

  const readyStarted = performance.now();
  await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
  const artifactReadyMs = performance.now() - readyStarted;

  review.store.deliver(structuredClone(representativeEnvelope), 'instrumentation');
  const recoveryStarted = performance.now();
  const reopened = new LifecycleStore(dataDir);
  reopened.get(representativeEnvelope.envelopeId);
  const recoveryMs = performance.now() - recoveryStarted;

  const benchmark = runBenchmark(buildMatrix());

  const envelopeBytes = Buffer.byteLength(JSON.stringify(representativeEnvelope), 'utf8');

  await service.stop();
  return {
    collectedAt: new Date().toISOString(),
    platform: { node: process.version, os: `${platform()}`, arch: arch(), cpuCount: cpus().length },
    serverStartupMs,
    idleMemoryBytes: { heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, rss: memory.rss },
    recoveryMs,
    resolutionP50Ms: benchmark.latencyMs.p50,
    resolutionP95Ms: benchmark.latencyMs.p95,
    artifactReadyMs,
    envelopeBytes,
    tokenEfficiency: {
      envelopeBytes,
      baselineChatBytes: BASELINE_CHAT_BYTES,
      ratio: envelopeBytes / BASELINE_CHAT_BYTES
    }
  };
}
