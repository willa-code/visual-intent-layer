import { describe, expect, it } from 'vitest';
import { validateEnvelope } from '../envelope/validate.js';
import { buildEnvelope, type ComposerInput } from './composer.js';
import type { Grounding } from './review.js';

function grounding(): Grounding {
  return {
    selectors: ['main > button.checkout-submit'],
    boundingBox: { x: 320, y: 480, width: 200, height: 44, viewportWidth: 1280, viewportHeight: 800 },
    semanticRole: 'button',
    accessibleName: 'Place order'
  };
}

function input(overrides: Partial<ComposerInput> = {}): ComposerInput {
  return {
    envelopeId: 'env-composer-1',
    idempotencyKey: 'idem-composer-1',
    artifact: {
      id: 'artifact-demo',
      kind: 'saved-html',
      revision: 'blake3:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      displayName: 'checkout.html'
    },
    targets: [{ targetId: 't-1', kind: 'element', grounding: grounding() }],
    direction: 'Make the button unmissable.',
    deliveryIntent: 'next-pass',
    ...overrides
  };
}

describe('envelope composer', () => {
  it('builds a schema-valid envelope from selected targets and written direction', () => {
    const envelope = buildEnvelope(input());
    const result = validateEnvelope(envelope);
    expect(result.ok).toBe(true);
  });

  it('marks targets Rendered Grounding only when no adapter claimed provenance', () => {
    const envelope = buildEnvelope(input());
    expect(envelope.targets[0]!.provenanceConfidence).toBe('unavailable');
    expect(envelope.targets[0]!.sourceProvenance).toBeUndefined();
    expect(envelope.confidence?.abstentions).toContain('source-provenance: no adapter evidence');
  });

  it('carries region targets with spatial evidence and no selector identity', () => {
    const envelope = buildEnvelope(
      input({
        targets: [
          {
            targetId: 't-9',
            kind: 'region',
            grounding: {
              selectors: [],
              boundingBox: { x: 10, y: 20, width: 300, height: 150, viewportWidth: 1280, viewportHeight: 800 }
            }
          }
        ]
      })
    );
    expect(validateEnvelope(envelope).ok).toBe(true);
    expect(envelope.targets[0]!.kind).toBe('region');
  });

  it('stores relationships implementation-neutral without pixel coordinates', () => {
    const second = grounding();
    const envelope = buildEnvelope(
      input({
        targets: [
          { targetId: 't-1', kind: 'element', grounding: grounding() },
          { targetId: 't-2', kind: 'element', grounding: second }
        ],
        relationships: [{ relationshipId: 'r-1', type: 'alignment', operator: 'align-left', targetIds: ['t-1', 't-2'] }]
      })
    );
    expect(validateEnvelope(envelope).ok).toBe(true);
    expect(JSON.stringify(envelope.relationships)).not.toMatch(/pixel|x:|"x"/);
    expect(envelope.relationships?.[0]).toMatchObject({ type: 'alignment', operator: 'align-left' });
  });

  it('keeps the idempotency key stable so retries cannot duplicate intent', () => {
    const first = buildEnvelope(input());
    const second = buildEnvelope(input());
    expect(second.delivery.idempotencyKey).toBe(first.delivery.idempotencyKey);
    expect(second.envelopeId).toBe(first.envelopeId);
  });

  it('refuses to build without targets or direction', () => {
    expect(() => buildEnvelope(input({ targets: [] }))).toThrow(/target/);
    expect(() => buildEnvelope(input({ direction: '  ' }))).toThrow(/direction/);
  });
});
