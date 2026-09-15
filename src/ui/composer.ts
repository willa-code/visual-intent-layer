import type { Envelope } from '../envelope/validate.js';
import type { Grounding } from './review.js';

export type ComposerTarget = {
  targetId: string;
  kind: 'element' | 'text-range' | 'region';
  grounding: Grounding;
  label?: string;
  sourceProvenance?: Envelope['targets'][number]['sourceProvenance'];
};

export type ComposerRelationship = {
  relationshipId: string;
  type: 'ordering' | 'alignment' | 'spacing' | 'containment' | 'equivalence' | 'comparative-size';
  operator:
    | 'before' | 'after' | 'inside'
    | 'align-left' | 'align-center' | 'align-right' | 'align-top' | 'align-middle'
    | 'equal-gap' | 'preserved-rhythm'
    | 'member-of'
    | 'shared-property' | 'shared-behavior'
    | 'same-width' | 'same-height';
  targetIds: string[];
  property?: string;
};

export type ComposerInput = {
  envelopeId: string;
  idempotencyKey: string;
  artifact: { id: string; kind: 'saved-html' | 'react-vite-app'; revision: string; displayName?: string };
  targets: ComposerTarget[];
  direction: string;
  constraints?: string[];
  deliveryIntent: 'draft' | 'steering' | 'next-pass' | 'review-interruption';
  relationships?: ComposerRelationship[];
  references?: Array<{ referenceId: string; kind: 'image' | 'url' | 'text' | 'envelope'; uri?: string; note?: string }>;
  supersedes?: string;
};

export function buildEnvelope(input: ComposerInput): Envelope {
  if (input.targets.length === 0) {
    throw new Error('Cannot build an envelope without at least one target');
  }
  if (input.direction.trim().length === 0) {
    throw new Error('Cannot build an envelope without written direction');
  }
  const stamped = new Date().toISOString();
  const anyExact = input.targets.some((target) => target.sourceProvenance !== undefined);
  return {
    schemaVersion: '0.1',
    envelopeId: input.envelopeId,
    artifact: {
      id: input.artifact.id,
      kind: input.artifact.kind,
      revision: input.artifact.revision,
      ...(input.artifact.displayName ? { displayName: input.artifact.displayName } : {})
    },
    targets: input.targets.map((target) => ({
      targetId: target.targetId,
      kind: target.kind,
      renderedGrounding: {
        selectors: target.grounding.selectors ?? [],
        boundingBox: target.grounding.boundingBox,
        ...(target.grounding.textEvidence ? { textEvidence: target.grounding.textEvidence } : {}),
        ...(target.grounding.semanticRole ? { semanticRole: target.grounding.semanticRole } : {}),
        ...(target.grounding.accessibleName ? { accessibleName: target.grounding.accessibleName } : {}),
        ...(target.grounding.structuralContext ? { structuralContext: target.grounding.structuralContext } : {}),
        ...(target.grounding.geometry ? { geometry: target.grounding.geometry } : {}),
        ...(target.grounding.stableRuntimeId ? { stableRuntimeId: target.grounding.stableRuntimeId } : {})
      },
      ...(target.sourceProvenance ? { sourceProvenance: target.sourceProvenance } : {}),
      provenanceConfidence: target.sourceProvenance ? 'exact' : 'unavailable',
      ...(target.label ? { label: target.label } : {})
    })) as Envelope['targets'],
    relationships: (input.relationships ?? []) as Envelope['relationships'],
    direction: input.direction,
    constraints: input.constraints ?? [],
    references: input.references ?? [],
    delivery: { intent: input.deliveryIntent, idempotencyKey: input.idempotencyKey, requestedAt: stamped },
    confidence: {
      level: anyExact ? 'exact' : 'unavailable',
      notes: anyExact
        ? 'Exact Source Provenance supplied by the instrumented adapter for at least one target.'
        : 'Rendered Grounding only; no instrumented adapter claimed Source Provenance.',
      abstentions: anyExact ? [] : ['source-provenance: no adapter evidence']
    },
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    createdAt: stamped,
    updatedAt: stamped
  };
}
