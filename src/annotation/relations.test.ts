import { describe, expect, it } from 'vitest';
import { relationSentence } from './relations.js';

const nameOf = (targetId: string): string => ({ t1: 'Header', t2: 'Footer', t3: 'Sidebar' })[targetId] ?? targetId;

describe('relationSentence', () => {
  it('states an ordering relation as a sentence', () => {
    expect(relationSentence({ operator: 'before', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header should come before Footer.');
    expect(relationSentence({ operator: 'after', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header should come after Footer.');
  });

  it('states each alignment relation as a sentence', () => {
    expect(relationSentence({ operator: 'align-left', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align on the left.');
    expect(relationSentence({ operator: 'align-right', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align on the right.');
    expect(relationSentence({ operator: 'align-center', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align on the centre line.');
    expect(relationSentence({ operator: 'align-top', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align along the top.');
    expect(relationSentence({ operator: 'align-middle', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align along the middle.');
  });

  it('names every member of a spacing relation', () => {
    expect(relationSentence({ operator: 'equal-gap', targetIds: ['t1', 't2', 't3'] }, nameOf)).toBe('Header, Footer and Sidebar should be equally spaced.');
  });

  it('states containment, shared property and comparative size', () => {
    expect(relationSentence({ operator: 'member-of', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header should be contained inside Footer.');
    expect(relationSentence({ operator: 'shared-property', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should share the same visible property.');
    expect(relationSentence({ operator: 'shared-property', property: 'colour', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should share the same colour.');
    expect(relationSentence({ operator: 'same-width', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header should be the same width as Footer.');
    expect(relationSentence({ operator: 'same-height', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header should be the same height as Footer.');
  });

  it('falls back to the operator words for an operator it does not name yet', () => {
    expect(relationSentence({ operator: 'align-baseline', targetIds: ['t1', 't2'] }, nameOf)).toBe('Header and Footer should align baseline.');
  });
});
