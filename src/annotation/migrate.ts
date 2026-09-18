import type { Annotation, AnnotationEvent, AnnotationState, AnnotationTarget, VerificationVerdict } from './model.js';
import type { ScoredCandidate, TargetResolutionRecord } from '../resolution/resolve.js';

export type LegacyTarget = {
  targetId: string;
  kind: 'element' | 'text-range' | 'region';
  renderedGrounding: Record<string, unknown>;
  sourceProvenance?: Record<string, unknown>;
  provenanceConfidence?: string;
  label?: string;
};

export type LegacyEnvelope = {
  envelopeId: string;
  artifact: { id: string; kind: string; revision: string; displayName?: string };
  targets: LegacyTarget[];
  relationships?: unknown[];
  direction?: string;
  createdAt?: string;
  delivery: { idempotencyKey: string; intent: string; requestedAt?: string };
};

export type LegacyRecord = {
  envelopeId: string;
  idempotencyKey: string;
  envelope: LegacyEnvelope;
  status: string;
  stale?: boolean;
  resultingRevisions?: string[];
  resolutions?: Array<{ targetId: string; outcome: string; candidateCount?: number; resolvedAt?: string }>;
  deliveryHistory?: Array<{ type: string; at: string; host?: string; agentId?: string; verdict?: string; revision?: string }>;
  successorId?: string;
  updatedAt?: string;
};

export type MigrationReport = {
  at: string;
  migrated: Array<{ envelopeId: string; annotationIds: string[] }>;
  skipped: Array<{ envelopeId: string; reason: string }>;
  unreadable: Array<{ file: string; reason: string }>;
};

export function emptyMigrationReport(at = new Date().toISOString()): MigrationReport {
  return { at, migrated: [], skipped: [], unreadable: [] };
}

export type MigrationResult = {
  annotations: Annotation[];
  report: MigrationReport;
};

export function migrateLegacyRecords(records: LegacyRecord[], at = new Date().toISOString()): MigrationResult {
  const report = emptyMigrationReport(at);
  const annotations: Annotation[] = [];
  let order = 0;

  for (const record of records) {
    const mapped = mapRecord(record, order, at);
    if ('reason' in mapped) {
      report.skipped.push({ envelopeId: record.envelopeId, reason: mapped.reason });
      continue;
    }
    order += mapped.length;
    annotations.push(...mapped);
    report.migrated.push({ envelopeId: record.envelopeId, annotationIds: mapped.map((entry) => entry.annotationId) });
  }

  return { annotations, report };
}

function mapRecord(record: LegacyRecord, startOrder: number, at: string): Annotation[] | { reason: string } {
  const envelope = record.envelope;
  if (!envelope || typeof envelope !== 'object') {
    return { reason: 'legacy record has no readable envelope' };
  }
  if (!Array.isArray(envelope.targets) || envelope.targets.length === 0) {
    return { reason: 'envelope has no targets to become an Annotation' };
  }
  if (typeof envelope.direction !== 'string' || envelope.direction.trim().length === 0) {
    return { reason: 'envelope has no shared written direction to carry onto each Annotation' };
  }
  if (Array.isArray(envelope.relationships) && envelope.relationships.length > 0) {
    return { reason: 'envelope carries relationships spanning several targets, so per-target mapping is ambiguous' };
  }
  const createdAt = envelope.createdAt ?? at;
  return envelope.targets.map((target, index) => {
    const annotationId = `${envelope.envelopeId}--${target.targetId}`;
    const state = mapStatus(record.status);
    return {
      annotationId,
      artifactId: envelope.artifact.id,
      writtenRevision: envelope.artifact.revision,
      revisionRelation: record.stale ? 'advanced' : 'current',
      state,
      order: startOrder + index,
      note: envelope.direction!,
      targets: [mapTarget(target)],
      relationships: [],
      references: [],
      attachments: [],
      resolutions: mapResolutions(record),
      declaredMissing: [],
      ...(record.successorId ? { replacedBy: record.successorId } : {}),
      ...(verificationOf(record) ? { verification: verificationOf(record)! } : {}),
      history: mapHistory(record, createdAt),
      createdAt,
      updatedAt: record.updatedAt ?? createdAt,
      ...(record.deliveryHistory?.find((event) => event.type === 'delivered')?.at
        ? { sentAt: record.deliveryHistory.find((event) => event.type === 'delivered')!.at }
        : {}),
      ...(record.deliveryHistory?.find((event) => event.type === 'acknowledged')
        ? {
            acknowledgedAt: record.deliveryHistory.find((event) => event.type === 'acknowledged')!.at,
            acknowledgedBy: record.deliveryHistory.find((event) => event.type === 'acknowledged')!.agentId
          }
        : {})
    } satisfies Annotation;
  });
}

function mapTarget(target: LegacyTarget): AnnotationTarget {
  const provenance = target.sourceProvenance as AnnotationTarget['sourceProvenance'] | undefined;
  const confidence = provenance ? 'exact' : target.provenanceConfidence === 'exact' ? 'exact' : 'unavailable';
  return {
    targetId: target.targetId,
    kind: target.kind,
    renderedGrounding: target.renderedGrounding as unknown as AnnotationTarget['renderedGrounding'],
    provenanceConfidence: confidence,
    ...(provenance ? { sourceProvenance: provenance } : {}),
    ...(target.label ? { label: target.label } : {})
  };
}

function mapStatus(status: string): AnnotationState {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'queued-local':
      return 'queued';
    case 'host-accepted':
      return 'delivered';
    case 'source-modified':
      return 'resolved';
    case 'agent-acknowledged':
      return 'acknowledged';
    case 'verified':
      return 'verified';
    case 'rejected':
      return 'not-fixed';
    case 'superseded':
    case 'replaced':
      return 'replaced';
    case 'another-pass':
    case 'not-fixed':
      return 'not-fixed';
    case 'obsolete':
      return 'obsolete';
    default:
      return 'draft';
  }
}

function mapResolutions(record: LegacyRecord): TargetResolutionRecord[] {
  return (record.resolutions ?? []).map((resolution) => {
    const match =
      resolution.outcome === 'exact'
        ? 'exact'
        : resolution.outcome === 'recovered'
          ? 'recovered'
          : 'unresolved';
    const candidates: ScoredCandidate[] = [];
    return {
      targetId: resolution.targetId,
      match,
      candidates,
      resolvedAt: resolution.resolvedAt ?? new Date().toISOString()
    } satisfies TargetResolutionRecord;
  });
}

function verificationOf(record: LegacyRecord): Annotation['verification'] | undefined {
  const event = [...(record.deliveryHistory ?? [])].reverse().find((entry) => entry.type === 'verified');
  if (!event?.verdict) {
    return undefined;
  }
  const verdict = normalizeVerdict(event.verdict);
  if (!verdict) {
    return undefined;
  }
  return { verdict, at: event.at, ...(record.successorId ? { successorId: record.successorId } : {}) };
}

function normalizeVerdict(value: string): VerificationVerdict | undefined {
  switch (value) {
    case 'approve':
    case 'obsolete':
      return value;
    case 'another-pass':
    case 'reject':
    case 'not-fixed':
      return 'not-fixed';
    default:
      return undefined;
  }
}

function mapHistory(record: LegacyRecord, createdAt: string): AnnotationEvent[] {
  const history: AnnotationEvent[] = [{ type: 'created', at: createdAt }];
  for (const event of record.deliveryHistory ?? []) {
    if (event.type === 'saved-draft') {
      continue;
    }
    if (event.type === 'delivered') {
      history.push({ type: 'delivered', at: event.at, detail: event.host });
    } else if (event.type === 'acknowledged') {
      history.push({ type: 'acknowledged', at: event.at, detail: event.agentId });
    } else if (event.type === 'verified') {
      history.push({ type: 'verified', at: event.at, detail: event.verdict });
    } else if (event.type === 'resolution') {
      history.push({ type: 'resolved', at: event.at });
    }
  }
  return history;
}