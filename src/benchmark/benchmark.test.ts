import { describe, expect, it } from 'vitest';
import { runBenchmark, type BenchmarkCase } from './run.js';
import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import type { Envelope } from '../envelope/validate.js';

type Target = Envelope['targets'][number];

function target(overrides: Partial<Target> = {}): Target {
  return {
    targetId: 't-1',
    kind: 'element',
    renderedGrounding: {
      selectors: ['main > button.checkout-submit'],
      boundingBox: { x: 320, y: 480, width: 200, height: 44 },
      semanticRole: 'button',
      accessibleName: 'Place order',
      structuralContext: { ancestorChain: ['body', 'main.checkout'], siblingIndex: 2, siblingCount: 4 }
    },
    provenanceConfidence: 'unavailable',
    ...overrides
  };
}

function candidate(overrides: Partial<ResolutionCandidate> = {}): ResolutionCandidate {
  return {
    nodeId: 'n-target',
    selectors: ['main > button.checkout-submit'],
    tag: 'button',
    semanticRole: 'button',
    accessibleName: 'Place order',
    text: 'Place order',
    ancestorChain: ['body', 'main.checkout'],
    siblingIndex: 2,
    siblingCount: 4,
    boundingBox: { x: 320, y: 480, width: 200, height: 44 },
    ...overrides
  };
}

describe('mutation benchmark', () => {
  it('recovers across wrapper insertion', () => {
    const moved = candidate({
      selectors: ['main > div.wrapper > button.checkout-submit'],
      ancestorChain: ['body', 'main.checkout', 'div.wrapper'],
      siblingIndex: 0,
      siblingCount: 1
    });
    const result = resolveTarget(target(), [moved]);
    expect(['exact', 'recovered']).toContain(result.outcome);
  });

  it('abstains on ambiguous duplication', () => {
    const first = candidate({ nodeId: 'n-a', siblingIndex: 1, siblingCount: 2 });
    const second = candidate({ nodeId: 'n-b', siblingIndex: 2, siblingCount: 2 });
    const result = resolveTarget(target(), [first, second]);
    expect(result.outcome).toBe('ambiguous');
  });

  it('detects deletion', () => {
    const result = resolveTarget(target(), [
      candidate({
        nodeId: 'n-other',
        selectors: ['footer a.help'],
        tag: 'a',
        semanticRole: 'link',
        accessibleName: 'Help',
        text: 'Help',
        ancestorChain: ['body', 'footer'],
        boundingBox: { x: 8, y: 760, width: 60, height: 20 }
      })
    ]);
    expect(result.outcome).toBe('deleted');
  });

  it('runs the full matrix and reports abstention-rewarding metrics', () => {
    const cases: BenchmarkCase[] = [
      { name: 'unique-element/no-change', target: target(), candidates: [candidate()], expectedNodeId: 'n-target', acceptable: ['exact'] },
      {
        name: 'unique-element/wrapper-insertion',
        target: target(),
        candidates: [candidate({ selectors: ['main > div.wrapper > button.checkout-submit'], ancestorChain: ['body', 'main.checkout', 'div.wrapper'] })],
        expectedNodeId: 'n-target',
        acceptable: ['exact', 'recovered']
      },
      {
        name: 'repeated-siblings/ambiguous-duplication',
        target: target(),
        candidates: [candidate({ nodeId: 'n-a' }), candidate({ nodeId: 'n-b' })],
        expectedNodeId: undefined,
        acceptable: ['ambiguous']
      },
      {
        name: 'deleted-target/target-deletion',
        target: target(),
        candidates: [candidate({ nodeId: 'n-other', selectors: ['footer a.help'], tag: 'a', semanticRole: 'link', accessibleName: 'Help', text: 'Help' })],
        expectedNodeId: undefined,
        acceptable: ['deleted', 'stale']
      }
    ];
    const report = runBenchmark(cases);
    expect(report.total).toBe(4);
    expect(report.correct).toBe(4);
    expect(report.confidentlyWrong).toBe(0);
    expect(report.byOutcome['ambiguous']).toBe(1);
    expect(report.latencyMs.p50).toBeGreaterThanOrEqual(0);
    expect(report.signals.correctRateTarget).toBe(0.95);
    expect(report.signals.confidentlyWrongLimit).toBe(0.01);
  });

  it('flags confidently-wrong resolutions instead of rewarding forced matches', () => {
    const report = runBenchmark([
      {
        name: 'forced-match/decoy',
        target: target(),
        candidates: [candidate({ nodeId: 'n-decoy' })],
        expectedNodeId: 'n-target',
        acceptable: ['exact', 'recovered']
      }
    ]);
    expect(report.correct).toBe(0);
    expect(report.confidentlyWrong).toBe(1);
  });
});
