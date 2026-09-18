import { describe, expect, it } from 'vitest';
import { deriveResolutionLabel, type ViewedState } from './model.js';

const unresolved = { match: 'unresolved' as const, candidates: [] };

function context(recorded?: ViewedState, viewed?: ViewedState, revisionUnchanged = true) {
  return { revisionUnchanged, recorded, viewed };
}

describe('derived resolution label', () => {
  it('reports a target that differs only by scroll as a state no longer on screen', () => {
    expect(
      deriveResolutionLabel(unresolved, context({ scroll: { x: 0, y: 500 } }, { scroll: { x: 0, y: 0 } }))
    ).toBe('state-only');
  });

  it('reports a target that differs only by viewport as a state no longer on screen', () => {
    expect(
      deriveResolutionLabel(
        unresolved,
        context({ viewport: { width: 1280, height: 800 } }, { viewport: { width: 390, height: 844 } })
      )
    ).toBe('state-only');
  });

  it('still reports a target whose address moved as a state no longer on screen', () => {
    expect(deriveResolutionLabel(unresolved, context({ address: '/orders' }, { address: '/orders/42' }))).toBe(
      'state-only'
    );
  });

  it('reports a target that is not on screen and did not move as deleted', () => {
    const state: ViewedState = { scroll: { x: 0, y: 0 }, viewport: { width: 1280, height: 800 } };
    expect(deriveResolutionLabel(unresolved, context(state, { ...state }))).toBe('deleted');
  });

  it('never claims a state no longer on screen when the revision changed', () => {
    expect(
      deriveResolutionLabel(
        unresolved,
        context({ scroll: { x: 0, y: 500 } }, { scroll: { x: 0, y: 0 } }, false)
      )
    ).toBe('deleted');
  });

  it('prefers the recorded state over lookalike candidates when the state moved and the revision did not', () => {
    expect(
      deriveResolutionLabel(
        { match: 'unresolved', candidates: [{}] },
        context({ scroll: { x: 0, y: 500 } }, { scroll: { x: 0, y: 0 } })
      )
    ).toBe('state-only');
  });

  it('still reports candidates as ambiguous when nothing about the state moved', () => {
    expect(
      deriveResolutionLabel(
        { match: 'unresolved', candidates: [{}] },
        context({ scroll: { x: 0, y: 0 } }, { scroll: { x: 0, y: 0 } })
      )
    ).toBe('ambiguous');
  });

  it('does not invent a state when the target or the view recorded none', () => {
    expect(deriveResolutionLabel(unresolved, context())).toBe('deleted');
    expect(deriveResolutionLabel(unresolved, context({ scroll: { x: 0, y: 500 } }))).toBe('deleted');
    expect(deriveResolutionLabel(unresolved, context(undefined, { scroll: { x: 0, y: 0 } }))).toBe('deleted');
  });
});
