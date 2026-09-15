import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform, arch, cpus } from 'node:os';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { LifecycleStore } from '../lifecycle/store.js';
import { createReviewService } from '../mcp/service.js';
import { startLocalService } from '../service/http.js';
import { runBenchmark } from '../benchmark/run.js';
import { buildMatrix } from '../benchmark/matrix.js';

export type Distribution = { p50: number; p95: number; max: number; samples: number };

export type InstrumentationReport = {
  collectedAt: string;
  platform: { node: string; os: string; arch: string; cpuCount: number };
  serverStartupMs: Distribution;
  invocationToReadyMs: Distribution;
  submitToAcceptanceMs: Distribution;
  saveToRefreshMs: Distribution;
  revisionToResolutionMs: Distribution;
  recoveryMs: Distribution;
  resolutionP50Ms: number;
  resolutionP95Ms: number;
  pointerToFeedback: { harness: string; status: string };
  idleMemoryBytes: { heapUsed: number; heapTotal: number; rss: number };
  envelopeBytes: number;
  tokenEfficiency: { envelopeBytes: number; baselineChatBytes: number; ratio: number };
  stress: { manyTargetsAccepted: number; rapidSavesTracked: boolean; envelopesIntact: boolean };
};

const BASELINE_CHAT_BYTES = 24000;

export async function collectInstrumentation(options: { dataDir?: string } = {}): Promise<InstrumentationReport> {
  const dataDir = options.dataDir ?? mkdtempSync(join(tmpdir(), 'vil-inst-'));
  const review = createReviewService({ dataDir });

  const serverStartupMs = await distribution(5, async () => {
    const started = performance.now();
    const probe = await startLocalService({ dataDir, reviewService: review, port: 0 });
    const elapsed = performance.now() - started;
    await probe.stop();
    return elapsed;
  });

  const service = await startLocalService({ dataDir, reviewService: review, port: 0 });
  try {
    const memory = process.memoryUsage();

    const invocationToReadyMs = await distribution(11, async () => {
      const started = performance.now();
      const opened = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
      await fetch(opened.reviewUrl);
      await fetch(opened.reviewUrl.replace('/review/', '/artifact/'));
      return performance.now() - started;
    });

    const session = await service.openSession({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const auth = `session=${session.sessionId}&cap=${session.capability}`;
    let envelopeCounter = 0;
    const freshEnvelope = (): Record<string, unknown> => {
      envelopeCounter += 1;
      const envelope = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
      envelope['envelopeId'] = `env-inst-${envelopeCounter}`;
      (envelope['delivery'] as Record<string, unknown>)['idempotencyKey'] = `idem-inst-${envelopeCounter}`;
      return envelope;
    };

    const submitToAcceptanceMs = await distribution(21, async () => {
      const started = performance.now();
      const response = await fetch(`${service.baseUrl}/api/intents?${auth}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ envelope: freshEnvelope() })
      });
      if (!response.ok) {
        throw new Error(`submit failed: ${response.status}`);
      }
      return performance.now() - started;
    });

    const workdir = mkdtempSync(join(tmpdir(), 'vil-inst-save-'));
    const watched = join(workdir, 'watched.html');
    copyFileSync('fixtures/gallery.html', watched);
    const watchSession = await service.openSession({ kind: 'saved-html', path: watched });
    const { writeFileSync, readFileSync } = await import('node:fs');
    const saveToRefreshMs = await distribution(11, async () => {
      const started = performance.now();
      writeFileSync(watched, readFileSync(watched, 'utf8') + '<!-- save -->', 'utf8');
      const deadline = Date.now() + 5000;
      for (;;) {
        const status = (await (
          await fetch(`${service.baseUrl}/api/sessions/${watchSession.sessionId}?cap=${watchSession.capability}`)
        ).json()) as { changed: boolean };
        if (status.changed) {
          return performance.now() - started;
        }
        if (Date.now() > deadline) {
          throw new Error('save-to-refresh poll timed out');
        }
        await sleep(25);
      }
    });

    const resolvable = freshEnvelope();
    await fetch(`${service.baseUrl}/api/intents?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope: resolvable })
    });
    const candidates = [
      {
        nodeId: 'node-1',
        selectors: ['main > button.checkout-submit'],
        tag: 'button',
        semanticRole: 'button',
        accessibleName: 'Place order',
        text: 'Place order',
        ancestorChain: ['body', 'main.gallery-page'],
        siblingIndex: 2,
        siblingCount: 4,
        boundingBox: { x: 320, y: 480, width: 200, height: 44 }
      }
    ];
    const revisionToResolutionMs = await distribution(11, async () => {
      const started = performance.now();
      const response = await fetch(
        `${service.baseUrl}/api/intents/${resolvable['envelopeId'] as string}/resolutions?${auth}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ revision: `blake3:${'2'.repeat(64)}`, candidates })
        }
      );
      if (!response.ok) {
        throw new Error(`resolutions failed: ${response.status}`);
      }
      return performance.now() - started;
    });

    const recoveryMs = await distribution(5, async () => {
      const envelope = structuredClone(representativeEnvelope);
      envelope.envelopeId = `env-recovery-${Math.random()}`;
      envelope.delivery.idempotencyKey = `idem-recovery-${Math.random()}`;
      review.store.deliver(envelope, 'instrumentation');
      const started = performance.now();
      const reopened = new LifecycleStore(dataDir);
      reopened.get(envelope.envelopeId);
      return performance.now() - started;
    });

    const benchmark = runBenchmark(buildMatrix());
    const envelopeBytes = Buffer.byteLength(JSON.stringify(representativeEnvelope), 'utf8');

    const manyTargets = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    manyTargets['envelopeId'] = 'env-inst-many';
    (manyTargets['delivery'] as Record<string, unknown>)['idempotencyKey'] = 'idem-inst-many';
    const firstTarget = (manyTargets['targets'] as unknown[])[0];
    manyTargets['targets'] = Array.from({ length: 50 }, (_, index) => ({
      ...(firstTarget as Record<string, unknown>),
      targetId: `t-many-${index}`
    }));
    const manyResponse = await fetch(`${service.baseUrl}/api/intents?${auth}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope: manyTargets })
    });
    const manyAccepted = manyResponse.ok
      ? (((await review.getIntent('env-inst-many').targets.length) as number) ?? 0)
      : 0;

    for (let save = 0; save < 10; save += 1) {
      writeFileSync(watched, readFileSync(watched, 'utf8') + `<!-- rapid-${save} -->`, 'utf8');
    }
    const afterRapid = (await (
      await fetch(`${service.baseUrl}/api/sessions/${watchSession.sessionId}?cap=${watchSession.capability}`)
    ).json()) as { changed: boolean };
    const deliveredOnce = review.store
      .list()
      .every(
        (record) => record.deliveryHistory.filter((event) => event.type === 'delivered').length <= 1
      );
    const envelopesIntact =
      review.getIntent('env-inst-many').targets.length === 50 &&
      (resolvable['envelopeId'] as string).length > 0 &&
      deliveredOnce;

    return {
      collectedAt: new Date().toISOString(),
      platform: { node: process.version, os: `${platform()}`, arch: arch(), cpuCount: cpus().length },
      serverStartupMs,
      invocationToReadyMs,
      submitToAcceptanceMs,
      saveToRefreshMs,
      revisionToResolutionMs,
      recoveryMs,
      resolutionP50Ms: benchmark.latencyMs.p50,
      resolutionP95Ms: benchmark.latencyMs.p95,
      pointerToFeedback: {
        harness: 'performance marks visual-intent:hover to visual-intent:hover-handled in the overlay hover path',
        status: 'browser-measured; collect during dogfood against baseline interactions'
      },
      idleMemoryBytes: { heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, rss: memory.rss },
      envelopeBytes,
      tokenEfficiency: {
        envelopeBytes,
        baselineChatBytes: BASELINE_CHAT_BYTES,
        ratio: envelopeBytes / BASELINE_CHAT_BYTES
      },
      stress: { manyTargetsAccepted: manyAccepted, rapidSavesTracked: afterRapid.changed, envelopesIntact }
    };
  } finally {
    await service.stop();
  }
}

async function distribution(samples: number, measure: () => Promise<number>): Promise<Distribution> {
  const values: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    values.push(await measure());
  }
  values.sort((a, b) => a - b);
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values[values.length - 1] ?? 0,
    samples: values.length
  };
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.min(sorted.length - 1, Math.floor(quantile * sorted.length))]!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
