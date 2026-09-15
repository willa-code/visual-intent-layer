import { describe, expect, it } from 'vitest';
import { runBenchmark, type BenchmarkCase } from './run.js';
import { buildMatrix } from './matrix.js';
import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import { deriveResolutionLabel } from '../resolution/model.js';
import type { Envelope } from '../envelope/validate.js';

type Target = Envelope['annotations'][number]['targets'][number];

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

function decoy(overrides: Partial<ResolutionCandidate> = {}): ResolutionCandidate {
  return {
    nodeId: 'n-decoy',
    selectors: ['footer a.help'],
    tag: 'a',
    semanticRole: 'link',
    accessibleName: 'Help',
    text: 'Help center',
    ancestorChain: ['body', 'footer'],
    siblingIndex: 0,
    siblingCount: 2,
    boundingBox: { x: 8, y: 760, width: 60, height: 20 },
    ...overrides
  };
}

describe('mutation benchmark', () => {
  it('keeps the derived labels aligned with the stored model', () => {
    expect(deriveResolutionLabel(resolveTarget(target(), [candidate()]))).toBe('matched');
    expect(deriveResolutionLabel(resolveTarget(target(), [candidate({ nodeId: 'n-a' }), candidate({ nodeId: 'n-b' })]))).toBe('ambiguous');
    expect(
      deriveResolutionLabel(resolveTarget(target(), [decoy()]))
    ).toBe('deleted');
  });

  it('rewards exact resolution, recovered resolution, correct ambiguity and correct abstention', () => {
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
        acceptable: ['unresolved']
      },
      {
        name: 'deleted-target/target-deletion',
        target: target(),
        candidates: [decoy({ nodeId: 'n-other', selectors: ['footer a.help'], tag: 'a', semanticRole: 'link', accessibleName: 'Help', text: 'Help' })],
        expectedNodeId: undefined,
        acceptable: ['unresolved']
      }
    ];
    const report = runBenchmark(cases);
    expect(report.total).toBe(4);
    expect(report.correct).toBe(4);
    expect(report.confidentlyWrong).toBe(0);
    expect(report.correctAmbiguity).toBe(1);
    expect(report.correctAbstention).toBe(1);
    expect(report.byMatch.exact + report.byMatch.recovered).toBe(2);
    expect(report.byLabel).toMatchObject({ matched: 2, ambiguous: 1, deleted: 1 });
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

  it('runs the shipped matrix without a confidently-wrong resolution', () => {
    const report = runBenchmark(buildMatrix());
    expect(report.total).toBeGreaterThan(10);
    expect(report.confidentlyWrong).toBe(0);
  });
});