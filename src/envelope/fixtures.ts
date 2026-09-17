import type { VisualIntentEnvelope } from './generated/envelope-v0.3.js';

export const SCHEMA_VERSION = '0.3' as const;

export const representativeEnvelope: VisualIntentEnvelope = {
  schemaVersion: '0.3',
  envelopeId: 'env-02-representative',
  artifact: {
    id: 'artifact-demo-checkout',
    kind: 'saved-html',
    revision: 'blake3:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    displayName: 'checkout.html',
    sourceUri: 'file:///artifacts/checkout.html'
  },
  annotations: [
    {
      annotationId: 'ann-01',
      note: 'Move the delivery estimate above the Place order button so shoppers see it before committing.',
      targets: [
        {
          targetId: 't-1',
          kind: 'element',
          renderedGrounding: {
            selectors: ['main > p.shipping-note'],
            boundingBox: { x: 320, y: 540, width: 420, height: 22, viewportWidth: 1280, viewportHeight: 800 },
            textEvidence: {
              exactText: 'Arrives Thursday',
              prefix: 'Order now. ',
              suffix: ' if you order today.',
              startOffset: 11,
              endOffset: 27
            }
          },
          provenanceConfidence: 'unavailable',
          label: 'Delivery estimate text'
        }
      ],
      relationships: [],
      references: [],
      attachments: [],
      revisionRelation: 'current'
    },
    {
      annotationId: 'ann-02',
      note: 'Make the Place order button impossible to miss.',
      targets: [
        {
          targetId: 't-2',
          kind: 'element',
          renderedGrounding: {
            selectors: ['main > button.checkout-submit'],
            boundingBox: { x: 320, y: 480, width: 200, height: 44, viewportWidth: 1280, viewportHeight: 800 },
            semanticRole: 'button',
            accessibleName: 'Place order',
            structuralContext: {
              ancestorChain: ['body', 'main.checkout', 'form#order'],
              siblingIndex: 2,
              siblingCount: 4
            }
          },
          provenanceConfidence: 'unavailable',
          label: 'Place order button'
        }
      ],
      relationships: [{ relationshipId: 'r-1', type: 'ordering', operator: 'after', targetIds: ['t-1', 't-2'] }],
      references: [],
      attachments: [],
      revisionRelation: 'current'
    }
  ],
  delivery: {
    intent: 'next-pass',
    idempotencyKey: 'idem-02-representative',
    requestedAt: '2026-09-15T00:00:00.000Z'
  },
  confidence: {
    level: 'unavailable',
    notes: 'Rendered Grounding only; no instrumented adapter claimed Source Provenance.',
    abstentions: ['source-provenance: no adapter evidence']
  },
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z'
};