import { createHash } from 'node:crypto';
import type { Envelope } from '../envelope/validate.js';
import type { DeliveryIntent } from '../host/capabilities.js';
import type { Annotation } from './model.js';

export type BatchEnvelopeInput = {
  artifact: { id: string; kind: 'saved-html' | 'react-vite-app'; revision: string; displayName?: string };
  annotations: Annotation[];
  intent: Exclude<DeliveryIntent, 'draft'>;
  requestedAt?: string;
  idempotencyKeySalt?: string;
};

export function batchIdempotencyKey(annotations: Annotation[], salt?: string): string {
  const ids = annotations
    .map((annotation) => annotation.annotationId)
    .sort()
    .join(',');
  const preimage = salt ? `${ids}|${salt}` : ids;
  return `idem-${sha256(preimage).slice(0, 32)}`;
}

export function batchEnvelopeId(idempotencyKey: string): string {
  return `env-${sha256(idempotencyKey).slice(0, 32)}`;
}

export function buildBatchEnvelope(input: BatchEnvelopeInput): Envelope {
  if (input.annotations.length === 0) {
    throw new Error('Cannot build an envelope without at least one Annotation');
  }
  for (const annotation of input.annotations) {
    if (annotation.targets.length === 0) {
      throw new Error(`Annotation ${annotation.annotationId} has no target`);
    }
  }
  const stamped = input.requestedAt ?? new Date().toISOString();
  const idempotencyKey = batchIdempotencyKey(input.annotations, input.idempotencyKeySalt);
  return {
    schemaVersion: '0.3',
    envelopeId: batchEnvelopeId(idempotencyKey),
    artifact: {
      id: input.artifact.id,
      kind: input.artifact.kind,
      revision: input.artifact.revision,
      ...(input.artifact.displayName ? { displayName: input.artifact.displayName } : {})
    },
    annotations: input.annotations.map((annotation) => ({
      annotationId: annotation.annotationId,
      note: annotation.note,
      targets: annotation.targets,
      relationships: annotation.relationships,
      references: annotation.references,
      attachments: annotation.attachments,
      revisionRelation: annotation.revisionRelation
    })) as Envelope['annotations'],
    delivery: { intent: input.intent, idempotencyKey, requestedAt: stamped },
    confidence: confidenceOf(input.annotations),
    createdAt: stamped,
    updatedAt: stamped
  };
}

function confidenceOf(annotations: Annotation[]): Envelope['confidence'] {
  const targets = annotations.flatMap((annotation) => annotation.targets);
  const exact = targets.filter((target) => target.provenanceConfidence === 'exact').length;
  if (targets.length > 0 && exact === targets.length) {
    return {
      level: 'exact',
      notes: 'Every target carries an exact Source Provenance span from an instrumented adapter.',
      abstentions: []
    };
  }
  if (exact > 0) {
    return {
      level: 'inferred',
      notes: 'Some targets carry an exact Source Provenance span; the rest are Rendered Grounding only.',
      abstentions: ['source-provenance: unavailable for at least one target']
    };
  }
  return {
    level: 'unavailable',
    notes: 'Rendered Grounding only; no adapter claimed Source Provenance for any target.',
    abstentions: ['source-provenance: no adapter evidence']
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}