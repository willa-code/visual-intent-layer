import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Envelope } from '../envelope/validate.js';
import { readJsonFile, writeJsonAtomic } from '../service/json-file.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import {
  emptyMigrationReport,
  migrateLegacyRecords,
  type LegacyRecord,
  type MigrationReport
} from './migrate.js';
import { buildBatchEnvelope, batchEnvelopeId, batchIdempotencyKey } from './envelope.js';
import {
  isInQueue,
  isVerification,
  verificationRefusedReason,
  type Annotation,
  type AnnotationAttachment,
  type AnnotationEvent,
  type AnnotationRelation,
  type AnnotationState,
  type AnnotationTarget,
  type VerificationVerdict
} from './model.js';

export type DeliveryBatch = {
  envelopeId: string;
  idempotencyKey: string;
  host: string;
  intent: 'draft' | 'steering' | 'next-pass' | 'review-interruption';
  annotationIds: string[];
  envelope: Envelope;
  at: string;
};

type PersistedState = {
  version: number;
  annotations: Record<string, Annotation>;
  batches: Record<string, DeliveryBatch>;
  byIdempotencyKey: Record<string, string>;
  migration: MigrationReport;
};

export type CreateDraftInput = {
  artifactId: string;
  writtenRevision: string;
  targets: AnnotationTarget[];
  note?: string;
  relationships?: AnnotationRelation[];
};

const STORE_VERSION = 2;

export class AnnotationStore {
  private readonly file: string;
  private readonly legacyFile: string;
  private state: PersistedState;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, 'annotations.json');
    this.legacyFile = join(dataDir, 'lifecycle.json');
    this.state = this.load();
  }

  migrationReport(): MigrationReport {
    return this.state.migration;
  }

  list(): Annotation[] {
    return Object.values(this.state.annotations).sort((a, b) => a.order - b.order);
  }

  listArtifact(artifactId: string): Annotation[] {
    return this.list().filter((annotation) => annotation.artifactId === artifactId);
  }

  get(annotationId: string): Annotation | undefined {
    return this.state.annotations[annotationId];
  }

  createDraft(input: CreateDraftInput): Annotation {
    if (input.targets.length === 0) {
      throw new Error('An Annotation needs at least one target');
    }
    const at = now();
    const annotationId = `ann-${randomUUID()}`;
    const annotation: Annotation = {
      annotationId,
      artifactId: input.artifactId,
      writtenRevision: input.writtenRevision,
      revisionRelation: 'current',
      state: 'draft',
      order: this.nextOrder(input.artifactId),
      note: input.note ?? '',
      targets: input.targets,
      relationships: input.relationships ?? [],
      references: [],
      attachments: [],
      resolutions: [],
      chosenCandidates: {},
      history: [{ type: 'created', at }],
      createdAt: at,
      updatedAt: at
    };
    this.state.annotations[annotationId] = annotation;
    this.persist();
    return annotation;
  }

  update(
    annotationId: string,
    patch: Partial<Pick<Annotation, 'note' | 'targets' | 'relationships' | 'revisionRelation'>>
  ): Annotation {
    return this.mutate(annotationId, (annotation) => {
      if (!isInQueue(annotation.state)) {
        throw new Error(
          `${annotation.annotationId} is ${annotation.state}, so it cannot be edited in place. Amend it instead: what the agent was told stays a record.`
        );
      }
      if (patch.note !== undefined && patch.note !== annotation.note) {
        annotation.note = patch.note;
        annotation.history.push({ type: 'note-changed', at: now() });
      }
      if (patch.targets !== undefined) {
        annotation.targets = patch.targets;
      }
      if (patch.relationships !== undefined) {
        annotation.relationships = patch.relationships;
      }
      if (patch.revisionRelation !== undefined) {
        annotation.revisionRelation = patch.revisionRelation;
      }
      return annotation;
    });
  }

  amend(
    annotationId: string,
    input: { note?: string; targets?: AnnotationTarget[]; relationships?: AnnotationRelation[] }
  ): Annotation {
    const original = this.get(annotationId);
    if (!original) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    if (!isInQueue(original.state) && !isVerification(original.state)) {
      const successor = this.createDraft({
        artifactId: original.artifactId,
        writtenRevision: original.writtenRevision,
        targets: input.targets ?? original.targets,
        ...(input.note !== undefined ? { note: input.note } : { note: original.note }),
        relationships: input.relationships ?? original.relationships
      });
      this.mutate(annotationId, (annotation) => {
        annotation.state = 'superseded';
        annotation.supersededBy = successor.annotationId;
        annotation.history.push({ type: 'superseded', at: now(), detail: successor.annotationId });
        return annotation;
      });
      return this.mutate(successor.annotationId, (annotation) => {
        annotation.supersedes = annotationId;
        annotation.history.push({ type: 'amended', at: now(), detail: annotationId });
        return annotation;
      });
    }
    throw new Error(
      `${annotationId} is ${original.state}, so it cannot be amended. Amend is offered only on a delivered Annotation that is not yet verified.`
    );
  }

  addRelation(annotationId: string, relation: AnnotationRelation): Annotation {
    return this.mutate(annotationId, (annotation) => {
      annotation.relationships = [
        ...annotation.relationships.filter((entry) => entry.relationshipId !== relation.relationshipId),
        relation
      ];
      annotation.history.push({ type: 'relation-added', at: now(), detail: relation.operator });
      return annotation;
    });
  }

  removeRelation(annotationId: string, relationshipId: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      annotation.relationships = annotation.relationships.filter((entry) => entry.relationshipId !== relationshipId);
      annotation.history.push({ type: 'relation-removed', at: now(), detail: relationshipId });
      return annotation;
    });
  }

  addAttachment(annotationId: string, attachment: AnnotationAttachment): Annotation {
    return this.mutate(annotationId, (annotation) => {
      annotation.attachments = [
        ...annotation.attachments.filter((entry) => entry.attachmentId !== attachment.attachmentId),
        attachment
      ];
      annotation.history.push({ type: 'attachment-added', at: now(), detail: attachment.attachmentId });
      return annotation;
    });
  }

  removeAttachment(annotationId: string, attachmentId: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      annotation.attachments = annotation.attachments.filter((entry) => entry.attachmentId !== attachmentId);
      annotation.history.push({ type: 'attachment-removed', at: now(), detail: attachmentId });
      return annotation;
    });
  }

  delete(annotationId: string): void {
    if (!this.state.annotations[annotationId]) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    delete this.state.annotations[annotationId];
    this.persist();
  }

  reorder(artifactId: string, orderedIds: string[]): Annotation[] {
    const current = this.listArtifact(artifactId);
    const known = new Set(current.map((annotation) => annotation.annotationId));
    const next = orderedIds.filter((id) => known.has(id));
    for (const annotation of current) {
      if (!next.includes(annotation.annotationId)) {
        next.push(annotation.annotationId);
      }
    }
    next.forEach((annotationId, index) => {
      this.state.annotations[annotationId]!.order = index;
    });
    this.persist();
    return this.listArtifact(artifactId);
  }

  queue(annotationId: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      if (annotation.state === 'draft') {
        annotation.state = 'queued';
        annotation.history.push({ type: 'queued', at: now() });
      }
      return annotation;
    });
  }

  queueAllDrafts(artifactId: string): Annotation[] {
    return this.listArtifact(artifactId)
      .filter((annotation) => annotation.state === 'draft')
      .map((annotation) => this.queue(annotation.annotationId));
  }

  queueOf(artifactId: string): Annotation[] {
    return this.listArtifact(artifactId).filter((annotation) => isInQueue(annotation.state));
  }

  markDelivered(
    annotationIds: string[],
    input: { host: string; intent: DeliveryBatch['intent']; artifact: DeliveryBatch['envelope']['artifact'] }
  ): DeliveryBatch {
    if (input.intent === 'draft') {
      throw new Error('A draft intent stays on this machine: it creates no batch and moves no Annotation out of draft or queued.');
    }
    const annotations = annotationIds.map((id) => {
      const annotation = this.state.annotations[id];
      if (!annotation) {
        throw new Error(`Unknown Annotation ${id}`);
      }
      return annotation;
    });
    const key = batchIdempotencyKey(annotations);
    const existingId = this.state.byIdempotencyKey[key];
    if (existingId && this.state.batches[existingId]) {
      return this.state.batches[existingId]!;
    }
    const envelope = buildBatchEnvelope({
      artifact: input.artifact,
      annotations,
      intent: input.intent
    });
    const at = now();
    const batch: DeliveryBatch = {
      envelopeId: envelope.envelopeId,
      idempotencyKey: key,
      host: input.host,
      intent: input.intent,
      annotationIds: annotations.map((annotation) => annotation.annotationId),
      envelope,
      at
    };
    for (const annotation of annotations) {
      if (annotation.state === 'draft' || annotation.state === 'queued') {
        annotation.state = 'delivered';
      }
      annotation.sentAt = at;
      annotation.history.push({ type: 'delivered', at, detail: input.host });
      annotation.updatedAt = at;
    }
    this.state.batches[batch.envelopeId] = batch;
    this.state.byIdempotencyKey[key] = batch.envelopeId;
    this.persist();
    return batch;
  }

  recordResolutions(annotationId: string, resolutions: TargetResolutionRecord[], revision?: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      annotation.resolutions = resolutions;
      if (revision) {
        annotation.resolvedRevision = revision;
      }
      if (annotation.state === 'delivered' || annotation.state === 'acknowledged') {
        annotation.state = 'resolved';
      }
      annotation.history.push({ type: 'resolved', at: now() });
      return annotation;
    });
  }

  chooseCandidate(annotationId: string, targetId: string, nodeId: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      const resolution = annotation.resolutions.find((entry) => entry.targetId === targetId);
      if (!resolution || !resolution.candidates.some((entry) => entry.candidate.nodeId === nodeId)) {
        throw new Error(`Unknown candidate ${nodeId} for target ${targetId}`);
      }
      annotation.chosenCandidates[targetId] = nodeId;
      annotation.history.push({ type: 'candidate-chosen', at: now(), detail: `${targetId}=${nodeId}` });
      return annotation;
    });
  }

  acknowledge(annotationId: string, agentId: string): Annotation {
    return this.mutate(annotationId, (annotation) => {
      if (annotation.state === 'delivered' || annotation.state === 'resolved') {
        annotation.state = 'acknowledged';
      }
      annotation.acknowledgedAt = now();
      annotation.acknowledgedBy = agentId;
      annotation.history.push({ type: 'acknowledged', at: now(), detail: agentId });
      return annotation;
    });
  }

  verify(annotationId: string, verdict: VerificationVerdict, options: { successorId?: string } = {}): Annotation {
    return this.mutate(annotationId, (annotation) => {
      const refused = verificationRefusedReason(annotation, verdict);
      if (refused) {
        throw new Error(refused);
      }
      annotation.state = verdictState(verdict);
      annotation.verification = { verdict, at: now(), ...(options.successorId ? { successorId: options.successorId } : {}) };
      annotation.history.push({ type: 'verified', at: now(), detail: verdict });
      return annotation;
    });
  }

  noteRevisionAdvance(artifactId: string, currentRevision: string): Annotation[] {
    const touched: Annotation[] = [];
    for (const annotation of this.listArtifact(artifactId)) {
      if (annotation.writtenRevision !== currentRevision && annotation.revisionRelation !== 'advanced') {
        annotation.revisionRelation = 'advanced';
        annotation.updatedAt = now();
        touched.push(annotation);
      }
    }
    if (touched.length > 0) {
      this.persist();
    }
    return touched;
  }

  importEnvelope(envelope: Envelope, host: string): DeliveryBatch {
    const existingId = this.state.byIdempotencyKey[envelope.delivery.idempotencyKey];
    if (existingId && this.state.batches[existingId]) {
      return this.state.batches[existingId]!;
    }
    const at = now();
    const ids: string[] = [];
    for (const incoming of envelope.annotations) {
      const order = this.nextOrder(envelope.artifact.id);
      const annotation: Annotation = {
        annotationId: incoming.annotationId,
        artifactId: envelope.artifact.id,
        writtenRevision: envelope.artifact.revision,
        revisionRelation: incoming.revisionRelation ?? 'current',
        state: 'delivered',
        order,
        note: incoming.note,
        targets: incoming.targets,
        relationships: incoming.relationships ?? [],
        references: incoming.references ?? [],
        attachments: incoming.attachments ?? [],
        resolutions: [],
        chosenCandidates: {},
        history: [
          { type: 'created', at },
          { type: 'delivered', at, detail: host }
        ],
        createdAt: at,
        updatedAt: at,
        sentAt: at
      };
      this.state.annotations[annotation.annotationId] = annotation;
      ids.push(annotation.annotationId);
    }
    const batch: DeliveryBatch = {
      envelopeId: envelope.envelopeId,
      idempotencyKey: envelope.delivery.idempotencyKey,
      host,
      intent: envelope.delivery.intent,
      annotationIds: ids,
      envelope,
      at
    };
    this.state.batches[envelope.envelopeId] = batch;
    this.state.byIdempotencyKey[envelope.delivery.idempotencyKey] = envelope.envelopeId;
    this.persist();
    return batch;
  }

  getBatch(envelopeId: string): DeliveryBatch | undefined {
    return this.state.batches[envelopeId];
  }

  findBatchByIdempotencyKey(key: string): DeliveryBatch | undefined {
    const id = this.state.byIdempotencyKey[key];
    return id ? this.state.batches[id] : undefined;
  }

  listBatches(): DeliveryBatch[] {
    return Object.values(this.state.batches).sort((a, b) => (a.at < b.at ? -1 : 1));
  }

  annotationsOfBatch(envelopeId: string): Annotation[] {
    const batch = this.state.batches[envelopeId];
    if (!batch) {
      return [];
    }
    return batch.annotationIds
      .map((id) => this.state.annotations[id])
      .filter((annotation): annotation is Annotation => annotation !== undefined);
  }

  private nextOrder(artifactId: string): number {
    const existing = this.listArtifact(artifactId);
    return existing.reduce((max, annotation) => Math.max(max, annotation.order + 1), 0);
  }

  private mutate(annotationId: string, apply: (annotation: Annotation) => Annotation): Annotation {
    const current = this.state.annotations[annotationId];
    if (!current) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    const next = apply(structuredClone(current));
    next.updatedAt = now();
    this.state.annotations[annotationId] = next;
    this.persist();
    return next;
  }

  private load(): PersistedState {
    if (existsSync(this.file)) {
      const parsed = readJsonFile<PersistedState | undefined>(this.file, undefined);
      if (!parsed || parsed.version !== STORE_VERSION || typeof parsed.annotations !== 'object' || parsed.annotations === null) {
        throw new Error(
          `Annotation store at ${this.file} has an incompatible layout; refusing to start rather than lose intent. The original bytes are preserved.`
        );
      }
      return parsed;
    }
    return this.migrateFromLegacy();
  }

  private migrateFromLegacy(): PersistedState {
    const fresh: PersistedState = {
      version: STORE_VERSION,
      annotations: {},
      batches: {},
      byIdempotencyKey: {},
      migration: emptyMigrationReport()
    };
    if (!existsSync(this.legacyFile)) {
      return fresh;
    }
    let records: LegacyRecord[];
    try {
      records = JSON.parse(readFileSync(this.legacyFile, 'utf8')) as LegacyRecord[];
    } catch (error) {
      fresh.migration = emptyMigrationReport();
      fresh.migration.unreadable.push({
        file: this.legacyFile,
        reason: error instanceof Error ? error.message : 'unreadable legacy state'
      });
      this.state = fresh;
      this.persist();
      return fresh;
    }
    const list = Array.isArray(records) ? records : [];
    const { annotations, report } = migrateLegacyRecords(list);
    for (const annotation of annotations) {
      fresh.annotations[annotation.annotationId] = annotation;
    }
    fresh.migration = report;
    this.state = fresh;
    this.persist();
    return fresh;
  }

  private persist(): void {
    writeJsonAtomic(this.file, this.state);
  }
}

export function verdictState(verdict: VerificationVerdict): AnnotationState {
  switch (verdict) {
    case 'approve':
      return 'verified';
    case 'reject':
      return 'rejected';
    case 'another-pass':
      return 'another-pass';
    case 'obsolete':
      return 'obsolete';
  }
}

function now(): string {
  return new Date().toISOString();
}

export { batchEnvelopeId, batchIdempotencyKey };