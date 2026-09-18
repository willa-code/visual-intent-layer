import { describe, expect, it } from 'vitest';
import type { Annotation } from '../annotation/model.js';
import { describeEvidence } from './components.js';

function annotationWith(target: Record<string, unknown>): Annotation {
  return { targets: [target] } as unknown as Annotation;
}

describe('describeEvidence', () => {
  it('names the address and the scroll among the evidence that leaves', () => {
    const evidence = describeEvidence(
      annotationWith({
        label: 'Place order',
        provenanceConfidence: 'unavailable',
        renderedGrounding: {
          boundingBox: { x: 10, y: 20, width: 30, height: 40, scrollX: 0, scrollY: 480 },
          selectors: ['button.checkout-submit']
        },
        runtimeState: { address: '/checkout?token=abc123#step-2' }
      })
    );

    expect(evidence[0]?.body).toContain('Address: /checkout?token=abc123#step-2');
    expect(evidence[0]?.body).toContain('Scroll: 0,480');
  });

  it('prints no placeholder when the Target recorded no address or scroll', () => {
    const evidence = describeEvidence(
      annotationWith({
        provenanceConfidence: 'unavailable',
        renderedGrounding: { boundingBox: { x: 0, y: 0, width: 1, height: 1 } }
      })
    );

    expect(evidence[0]?.body).not.toContain('Address:');
    expect(evidence[0]?.body).not.toContain('Scroll:');
    expect(evidence[0]?.body).not.toMatch(/undefined/);
  });
});
