import { describe, expect, it } from 'vitest';
import { invocationPolicy, runInvocationEval, SCENARIOS } from './invocation.js';

describe('invocation policy', () => {
  it('invokes on explicit visual requests', () => {
    expect(invocationPolicy('Open visual review for checkout.html so I can point at the button')).toBe('invoke');
  });

  it('invokes on clear spatial tasks', () => {
    expect(invocationPolicy('Align these two cards and give them the same width')).toBe('invoke');
  });

  it('clarifies ambiguous visual tasks instead of guessing', () => {
    expect(invocationPolicy('Make it look better')).toBe('clarify');
  });

  it('stays in chat when plain work is faster', () => {
    expect(invocationPolicy('Rename the formatPrice function to formatCurrency in utils.ts')).toBe('chat');
    expect(invocationPolicy('What does the checkout endpoint return on failure?')).toBe('chat');
  });

  it('passes every documented scenario', () => {
    const report = runInvocationEval();
    expect(report.passed).toBe(report.total);
    expect(SCENARIOS.map((scenario) => scenario.category).sort()).toEqual(
      expect.arrayContaining(['explicit', 'spatial', 'ambiguous', 'negative'])
    );
  });
});
