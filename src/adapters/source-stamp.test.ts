// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { OWN_ADAPTER_ID, OWN_STAMP_ATTRIBUTE, parseStamp, provenanceForElement } from './source-stamp.js';

function element(attributes: Record<string, string>, tag = 'button'): Element {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  return node;
}

describe('source-location stamps', () => {
  it('reads the product stamp and reports the instrument that supplied it', () => {
    const button = element({ [OWN_STAMP_ATTRIBUTE]: 'src/Checkout.tsx:42:8' });
    expect(provenanceForElement(button)).toEqual({
      file: 'src/Checkout.tsx',
      line: 42,
      column: 8,
      adapter: OWN_ADAPTER_ID
    });
  });

  it('reads a known third-party stamp rather than requiring our instrument', () => {
    const button = element({ 'data-insp-path': 'src/Checkout.tsx:42:8:button' });
    expect(provenanceForElement(button)).toEqual({
      file: 'src/Checkout.tsx',
      line: 42,
      column: 8,
      adapter: 'code-inspector-plugin'
    });
  });

  it('prefers the product stamp when both are present', () => {
    const button = element({
      [OWN_STAMP_ATTRIBUTE]: 'src/Checkout.tsx:42:8',
      'data-insp-path': 'src/Other.tsx:1:1:button'
    });
    expect(provenanceForElement(button)?.adapter).toBe(OWN_ADAPTER_ID);
    expect(provenanceForElement(button)?.file).toBe('src/Checkout.tsx');
  });

  it('reports nothing for an unstamped element, per target rather than per application', () => {
    const button = element({});
    expect(provenanceForElement(button)).toBeUndefined();
    const sibling = element({ [OWN_STAMP_ATTRIBUTE]: 'src/App.tsx:1:1' }, 'span');
    expect(provenanceForElement(sibling)?.adapter).toBe(OWN_ADAPTER_ID);
  });

  it('refuses a malformed stamp rather than inventing a location', () => {
    expect(provenanceForElement(element({ [OWN_STAMP_ATTRIBUTE]: 'not-a-location' }))).toBeUndefined();
    expect(provenanceForElement(element({ [OWN_STAMP_ATTRIBUTE]: '' }))).toBeUndefined();
  });

  it('accepts a location without a column as evidence, defaulting the column to zero', () => {
    expect(parseStamp('src/App.tsx:12')).toEqual({ file: 'src/App.tsx', line: 12, column: 0 });
    expect(parseStamp('C:\\app\\src\\App.tsx:12:4:div')).toEqual({
      file: 'C:\\app\\src\\App.tsx',
      line: 12,
      column: 4
    });
  });
});
