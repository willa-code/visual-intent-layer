import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import type { Envelope } from '../envelope/validate.js';
import { resolveTarget, type ResolutionCandidate } from './resolve.js';

type Target = Envelope['targets'][number];

function elementTarget(): Target {
  return structuredClone(representativeEnvelope.targets[0]!);
}

function candidate(overrides: Partial<ResolutionCandidate> = {}): ResolutionCandidate {
  return {
    nodeId: 'n-1',
    selectors: ['main > button.checkout-submit'],
    semanticRole: 'button',
    accessibleName: 'Place order',
    text: 'Place order',
    ancestorChain: ['body', 'main.checkout', 'form#order'],
    siblingIndex: 2,
    siblingCount: 4,
    boundingBox: { x: 320, y: 480, width: 200, height: 44 },
    ...overrides
  };
}

describe('target resolution', () => {
  it('resolves exactly when every anchor agrees', () => {
    const result = resolveTarget(elementTarget(), [candidate()]);
    expect(result.outcome).toBe('exact');
    expect(result.selected?.nodeId).toBe('n-1');
  });

  it('recovers the target across sibling reorder and wrapper insertion', () => {
    const moved = candidate({
      nodeId: 'n-7',
      selectors: ['main > div.wrapper > button.checkout-submit'],
      ancestorChain: ['body', 'main.checkout', 'div.wrapper', 'form#order'],
      siblingIndex: 0,
      siblingCount: 4,
      boundingBox: { x: 320, y: 120, width: 200, height: 44 }
    });
    const unrelated = candidate({
      nodeId: 'n-9',
      selectors: ['footer a.help'],
      semanticRole: 'link',
      accessibleName: 'Help',
      text: 'Help center',
      ancestorChain: ['body', 'footer'],
      siblingIndex: 0,
      siblingCount: 2
    });
    const result = resolveTarget(elementTarget(), [moved, unrelated]);
    expect(result.outcome).toBe('recovered');
    expect(result.selected?.nodeId).toBe('n-7');
  });

  it('reports ambiguous and selects nothing when siblings are indistinguishable', () => {
    const first = candidate({ nodeId: 'n-1', siblingIndex: 1, siblingCount: 3 });
    const second = candidate({ nodeId: 'n-2', siblingIndex: 2, siblingCount: 3 });
    const result = resolveTarget(elementTarget(), [first, second]);
    expect(result.outcome).toBe('ambiguous');
    expect(result.selected).toBeUndefined();
    expect(result.candidates).toHaveLength(2);
  });

  it('reports deleted when no candidate carries target evidence', () => {
    const unrelated = candidate({
      nodeId: 'n-9',
      selectors: ['footer a.help'],
      semanticRole: 'link',
      accessibleName: 'Help',
      text: 'Help center',
      ancestorChain: ['body', 'footer'],
      siblingIndex: 0,
      siblingCount: 2,
      boundingBox: { x: 8, y: 760, width: 60, height: 20 }
    });
    const result = resolveTarget(elementTarget(), [unrelated]);
    expect(result.outcome).toBe('deleted');
    expect(result.selected).toBeUndefined();
  });

  it('ignores generated class names rather than trusting them as identity', () => {
    const target = elementTarget();
    target.renderedGrounding.selectors = ['button.css-a1b2c3-x9y8z7'];
    const renamed = candidate({
      selectors: ['button.css-q9w8e7-r4t5y6'],
      boundingBox: { x: 320, y: 480, width: 200, height: 44 }
    });
    const result = resolveTarget(target, [renamed]);
    expect(['exact', 'recovered']).toContain(result.outcome);
  });

  it('tolerates responsive reflow when semantic anchors hold', () => {
    const reflowed = candidate({
      boundingBox: { x: 16, y: 900, width: 343, height: 48 }
    });
    const result = resolveTarget(elementTarget(), [reflowed]);
    expect(['exact', 'recovered']).toContain(result.outcome);
    expect(result.selected?.nodeId).toBe('n-1');
  });

  it('prefers stable runtime identity when the DOM is otherwise similar', () => {
    const target = elementTarget();
    target.renderedGrounding.stableRuntimeId = 'react-fiber-42';
    const same = candidate({ nodeId: 'n-1', stableRuntimeId: 'react-fiber-42' });
    const twin = candidate({ nodeId: 'n-2', stableRuntimeId: 'react-fiber-43' });
    const result = resolveTarget(target, [twin, same]);
    expect(result.selected?.nodeId).toBe('n-1');
    expect(['exact', 'recovered']).toContain(result.outcome);
  });
});
