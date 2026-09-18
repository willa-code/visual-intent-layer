import { describe, expect, it } from 'vitest';
import { targetKindLabel } from './target-label.js';

describe('the last resort for a target line', () => {
  it('names an Area the way the glossary defines it', () => {
    expect(targetKindLabel('region')).toBe('an area you bounded');
  });

  it('never shows the word the glossary lists under Avoid', () => {
    expect(targetKindLabel('region').toLowerCase()).not.toContain('region');
  });

  it('names the other two kinds in words rather than wire names', () => {
    expect(targetKindLabel('element')).toBe('an element the artifact owns');
    expect(targetKindLabel('text-range')).toBe('an exact word range');
  });

  it('falls back to the kind itself when it knows nothing better', () => {
    expect(targetKindLabel('something-new')).toBe('something-new');
  });
});
