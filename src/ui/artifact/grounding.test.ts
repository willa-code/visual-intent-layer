// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  cssPath,
  describeElement,
  describeRegion,
  elementByComposedSelector,
  elementByNodeId,
  extractCandidates,
  isLayerNode,
  SHADOW_SEPARATOR
} from './grounding.js';

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

  it('records the page scroll the element was seen at, not the element position', () => {
    window.scrollTo(0, 500);
    const element = document.createElement('button');
    document.body.appendChild(element);
    element.getBoundingClientRect = () =>
      ({ x: 40, y: 120, width: 10, height: 10, top: 120, left: 40, right: 50, bottom: 130 }) as DOMRect;
    const grounding = describeElement(element as HTMLElement);
    expect(grounding.boundingBox.scrollX).toBe(0);
    expect(grounding.boundingBox.scrollY).toBe(500);
    document.body.innerHTML = '';
    window.scrollTo(0, 0);
  });

  it('records a drawn region with its scroll position', () => {
    const grounding = describeRegion({ x: 10, y: 20, width: 100, height: 50 }, { width: 800, height: 600, scrollX: 0, scrollY: 240 });
    expect(grounding.boundingBox.scrollY).toBe(240);
    expect(grounding.geometry?.centerX).toBe(60);
  });

  it('extracts candidate evidence for every non-layer element', () => {
    const document = doc('<main><button aria-label="Place order">x</button><p>note</p></main>');
    const candidates = extractCandidates(document).candidates;
    const button = candidates.find((candidate) => candidate.tag === 'button');
    expect(button).toBeDefined();
    expect(button!.accessibleName).toBe('Place order');
    expect(candidates.every((candidate) => !candidate.selectors.some((selector) => selector.includes('data-vil-layer')))).toBe(true);
  });

  it('carries a stamped source location into candidate evidence, per element', () => {
    const document = doc(
      '<main><button class="stamped" data-vis-source="src/Orders.tsx:21:5">Ship it</button><button class="plain">Plain</button></main>'
    );
    const candidates = extractCandidates(document).candidates;
    const stamped = candidates.find((candidate) => candidate.tag === 'button' && candidate.sourceFile !== undefined);
    expect(stamped?.sourceFile).toBe('src/Orders.tsx');
    expect(stamped?.sourceLine).toBe(21);
    expect(stamped?.sourceColumn).toBe(5);
    expect(candidates.filter((candidate) => candidate.sourceFile !== undefined)).toHaveLength(1);
  });

  it('excludes the interaction layer from candidate extraction and targeting', () => {
    const document = doc('<main data-vil-layer="overlay"><div data-vil-layer="mark"></div></main>');
    const layerNode = document.querySelector('[data-vil-layer="mark"]') as HTMLElement;
    expect(isLayerNode(layerNode)).toBe(true);
    expect(extractCandidates(document).candidates).toHaveLength(0);
  });
});

describe('artifact grounding across an open shadow root', () => {
  function shadowedDoc(): { document: Document; host: HTMLElement } {
    const document = doc('<main class="page"><div id="host"></div><button class="shared">Light</button></main>');
    const host = document.getElementById('host') as HTMLElement;
    host.attachShadow({ mode: 'open' }).innerHTML = '<button class="shared">Shadow</button>';
    return { document, host };
  }

  function innerButton(host: HTMLElement): HTMLElement {
    return host.shadowRoot!.querySelector('button') as HTMLElement;
  }

  it('addresses an element inside an open shadow root through its host', () => {
    const { document, host } = shadowedDoc();
    const selector = describeElement(innerButton(host)).selectors?.[0] ?? '';
    expect(selector).toContain(SHADOW_SEPARATOR);
    expect(selector).toContain('div#host');
    expect(elementByComposedSelector(selector, document)).toBe(innerButton(host));
  });

  it('keeps a shadow element distinct from a same-named element outside the root', () => {
    const { document, host } = shadowedDoc();
    const light = document.querySelector('button.shared') as HTMLElement;
    const shadowSelector = describeElement(innerButton(host)).selectors?.[0] ?? '';
    expect(shadowSelector).not.toBe(describeElement(light).selectors?.[0]);
    expect(elementByComposedSelector(shadowSelector, document)).not.toBe(light);
  });

  it('enumerates shadow content in composed order, right after its host', () => {
    const { document } = shadowedDoc();
    const candidates = extractCandidates(document).candidates;
    const hostIndex = candidates.findIndex((candidate) => candidate.tag === 'div');
    const shadowIndex = candidates.findIndex((candidate) => candidate.accessibleName === 'Shadow');
    expect(shadowIndex).toBe(hostIndex + 1);
    expect(candidates.filter((candidate) => candidate.accessibleName === 'Shadow')).toHaveLength(1);
  });

  it('re-finds the same node by its candidate id', () => {
    const { document, host } = shadowedDoc();
    const candidates = extractCandidates(document).candidates;
    const shadowCandidate = candidates.find((candidate) => candidate.accessibleName === 'Shadow');
    expect(shadowCandidate).toBeDefined();
    expect(elementByNodeId(document, shadowCandidate!.nodeId)).toBe(innerButton(host));
  });

  it('resolves a host inside a host', () => {
    const document = doc('<main><div id="outer"></div></main>');
    const outer = document.getElementById('outer') as HTMLElement;
    const outerRoot = outer.attachShadow({ mode: 'open' });
    outerRoot.innerHTML = '<div id="inner"></div>';
    const inner = outerRoot.getElementById('inner') as HTMLElement;
    inner.attachShadow({ mode: 'open' }).innerHTML = '<button class="deep">Deep</button>';
    const deep = inner.shadowRoot!.querySelector('button') as HTMLElement;
    const selector = describeElement(deep).selectors?.[0] ?? '';
    expect(selector.split(SHADOW_SEPARATOR)).toHaveLength(3);
    expect(elementByComposedSelector(selector, document)).toBe(deep);
    const candidate = extractCandidates(document).candidates.find((entry) => entry.accessibleName === 'Deep');
    expect(candidate).toBeDefined();
    expect(elementByNodeId(document, candidate!.nodeId)).toBe(deep);
  });

  it('does not descend a closed shadow root', () => {
    const document = doc('<main><div id="closed"></div></main>');
    const host = document.getElementById('closed') as HTMLElement;
    host.attachShadow({ mode: 'closed' }).innerHTML = '<button id="hidden">Hidden</button>';
    expect(extractCandidates(document).candidates.some((candidate) => candidate.accessibleName === 'Hidden')).toBe(false);
  });

  it('still addresses a light-DOM element with an unqualified selector', () => {
    const document = doc('<main class="page"><button id="light">Light</button></main>');
    const light = document.getElementById('light') as HTMLElement;
    const selector = describeElement(light).selectors?.[0] ?? '';
    expect(selector).not.toContain(SHADOW_SEPARATOR);
    expect(selector).toBe(cssPath(light));
  });
});

describe('artifact grounding when the walk is bounded', () => {
  function twoElements(): Document {
    return doc('<main><button>One</button></main>');
  }

  it('says the walk stopped early rather than that nothing else exists', () => {
    const bounded = extractCandidates(twoElements(), { limit: 1 });
    expect(bounded.candidates).toHaveLength(1);
    expect(bounded.truncated).toBe(true);
  });

  it('does not claim truncation when the walk finished inside the budget', () => {
    expect(extractCandidates(twoElements(), { limit: 2 }).truncated).toBe(false);
    expect(extractCandidates(twoElements(), { limit: 50 }).truncated).toBe(false);
  });

  it('does not let the interaction layer spend the budget', () => {
    const document = doc('<main><button>One</button><div data-vil-layer="overlay"></div></main>');
    const bounded = extractCandidates(document, { limit: 2 });
    expect(bounded.candidates).toHaveLength(2);
    expect(bounded.truncated).toBe(false);
  });

  it('binds a candidate id and its element to the same enumeration', () => {
    const document = doc('<main><button>One</button><button>Two</button></main>');
    const { candidates } = extractCandidates(document);
    expect(elementByNodeId(document, candidates[candidates.length - 1]!.nodeId)?.textContent).toBe('Two');
  });
});
