// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTarget } from '../resolution/resolve.js';
import { extractCandidates } from './selection.js';

describe('candidate extraction for re-resolution', () => {
  it('extracts resolvable candidates from a revised document', () => {
    document.body.innerHTML = readFileSync('fixtures/gallery.html', 'utf8');
    const candidates = extractCandidates(document);
    expect(candidates.length).toBeGreaterThan(5);
    const button = candidates.find((entry) => entry.accessibleName === 'Place order');
    expect(button).toBeDefined();
    expect(button!.semanticRole).toBe('button');
  });

  it('re-resolves an original target against candidates from a changed revision', () => {
    document.body.innerHTML = `
      <main class="gallery-page">
        <div class="wrapper">
          <button class="checkout-submit" type="button">Place order</button>
        </div>
        <p class="shipping-note">Order now. Arrives Thursday if you order today.</p>
      </main>
    `;
    const candidates = extractCandidates(document);
    const result = resolveTarget(
      {
        targetId: 't-1',
        kind: 'element',
        renderedGrounding: {
          selectors: ['main > button.checkout-submit'],
          boundingBox: { x: 320, y: 480, width: 200, height: 44 },
          semanticRole: 'button',
          accessibleName: 'Place order',
          structuralContext: { ancestorChain: ['main.gallery-page'], siblingIndex: 2, siblingCount: 4 }
        },
        provenanceConfidence: 'unavailable'
      },
      candidates
    );
    expect(['exact', 'recovered']).toContain(result.outcome);
    expect(result.selected?.accessibleName).toBe('Place order');
  });

  it('bounds extraction on large documents', () => {
    document.body.innerHTML = `<div>${'<span>filler</span>'.repeat(5000)}</div>`;
    const candidates = extractCandidates(document, { limit: 2000 });
    expect(candidates.length).toBeLessThanOrEqual(2000);
  });
});
