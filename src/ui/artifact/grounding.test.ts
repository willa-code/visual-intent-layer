// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { cssPath, describeElement, describeRegion, extractCandidates, isLayerNode } from './grounding.js';

function doc(html: string): Document {
  const parsed = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
  return parsed;
}

describe('artifact grounding', () => {
  it('describes an element with selector, role, name and structural context', () => {
    const document = doc('<main class="checkout"><button class="checkout-submit">Place order</button></main>');
    const button = document.querySelector('button') as HTMLElement;
    const grounding = describeElement(button);
    expect(grounding.selectors?.[0]).toContain('button.checkout-submit');
    expect(grounding.semanticRole).toBe('button');
    expect(grounding.accessibleName).toBe('Place order');
    expect(grounding.structuralContext?.ancestorChain).toContain('main.checkout');
    expect(grounding.boundingBox.width).toBeGreaterThanOrEqual(0);
  });

  it('builds a readable CSS path from the document root', () => {
    const document = doc('<main><section><p>text</p></section></main>');
    const paragraph = document.querySelector('p') as HTMLElement;
    expect(cssPath(paragraph)).toBe('body > main > section > p');
  });

  it('records a drawn region with its scroll position', () => {
    const grounding = describeRegion({ x: 10, y: 20, width: 100, height: 50 }, { width: 800, height: 600, scrollX: 0, scrollY: 240 });
    expect(grounding.boundingBox.scrollY).toBe(240);
    expect(grounding.geometry?.centerX).toBe(60);
  });

  it('extracts candidate evidence for every non-layer element', () => {
    const document = doc('<main><button aria-label="Place order">x</button><p>note</p></main>');
    const candidates = extractCandidates(document);
    const button = candidates.find((candidate) => candidate.tag === 'button');
    expect(button).toBeDefined();
    expect(button!.accessibleName).toBe('Place order');
    expect(candidates.every((candidate) => !candidate.selectors.some((selector) => selector.includes('data-vil-layer')))).toBe(true);
  });

  it('excludes the interaction layer from candidate extraction and targeting', () => {
    const document = doc('<main data-vil-layer="overlay"><div data-vil-layer="mark"></div></main>');
    const layerNode = document.querySelector('[data-vil-layer="mark"]') as HTMLElement;
    expect(isLayerNode(layerNode)).toBe(true);
    expect(extractCandidates(document)).toHaveLength(0);
  });
});