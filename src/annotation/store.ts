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
import type { DeliveryIntent } from '../host/capabilities.js';
import {
  anchorOutcome,
  isAmendable,
  isAttemptable,
  isInQueue,
  relationsAmong,
  verificationRefusedReason,
  type AnchorOutcome,
  type Annotation,
  type AnnotationAttachment,
  type AnnotationEvent,
  type AnnotationRelation,
  type AnnotationState,
  type AnnotationTarget,
  type VerificationVerdict
} from './model.js';

export type PassState = 'open' | 'in-flight' | 'ready' | 'closed';

export type PassEvent = { type: 'opened' | 'closed' | 'reopened'; at: string };

export type PassOutcome = { changed: number; same: number; notFound: number };

export type Pass = {
  passId: string;
  artifactId: string;
  fromRevision: string;
  toRevision?: string;
  annotationIds: string[];
  state: PassState;
  outcome: PassOutcome;
  history: PassEvent[];
  openedAt: string;
  closedAt?: string;
  envelopeId: string;
  idempotencyKey: string;
  host: string;
  intent: Exclude<DeliveryIntent, 'draft'>;
  envelope: Envelope;
  sequence: number;
  at: string;
};

export type { DeliveryIntent };

type PersistedState = {
  version: number;
  annotations: Record<string, Annotation>;
  passes: Record<string, Pass>;
  byIdempotencyKey: Record<string, string>;
  migration: MigrationReport;
  sequence: number;
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
      declaredMissing: [],
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
        const present = new Set(patch.targets.map((target) => target.targetId));
        annotation.declaredMissing = annotation.declaredMissing.filter((entry) => present.has(entry.targetId));
      }
      if (patch.relationships !== undefined) {
        annotation.relationships = patch.relationships;
      } else if (patch.targets !== undefined) {
        annotation.relationships = relationsAmong(annotation.relationships, annotation.targets).relationships;
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
    if (isAmendable(original.state)) {
      const successor = this.createDraft({
        artifactId: original.artifactId,
        writtenRevision: original.writtenRevision,
        targets: input.targets ?? original.targets,
        ...(input.note !== undefined ? { note: input.note } : { note: original.note }),
        relationships: input.relationships ?? original.relationships
      });
      this.mutate(annotationId, (annotation) => {
        annotation.state = 'replaced';
        annotation.replacedBy = successor.annotationId;
        annotation.history.push({ type: 'replaced', at: now(), detail: successor.annotationId });
        return annotation;
      });
      return this.mutate(successor.annotationId, (annotation) => {
        annotation.replaces = annotationId;
        annotation.history.push({
          type: 'amended',
          at: now(),
          sequence: this.nextSequence(),
          detail: annotationId
        });
        return annotation;
      });
    }
    throw new Error(
      `${annotationId} is ${original.state}, so it cannot be amended. Amend is offered only on a delivered or Not Fixed Annotation that has not been accepted.`
    );
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
    input: { host: string; intent: Exclude<DeliveryIntent, 'draft'>; artifact: Pass['envelope']['artifact'] }
  ): Pass {
    const annotations = annotationIds.map((id) => {
      const annotation = this.state.annotations[id];
      if (!annotation) {
        throw new Error(`Unknown Annotation ${id}`);
      }
      return annotation;
    });
    const key = batchIdempotencyKey(annotations);
    const existingId = this.state.byIdempotencyKey[key];
    if (existingId && this.state.passes[existingId]) {
      return this.state.passes[existingId]!;
    }
    const envelope = buildBatchEnvelope({
      artifact: input.artifact,
      annotations,
      intent: input.intent
    });
    const at = now();
    const pass: Pass = {
      passId: envelope.envelopeId,
      artifactId: input.artifact.id,
      fromRevision: input.artifact.revision,
      annotationIds: annotations.map((annotation) => annotation.annotationId),
      state: 'in-flight',
      outcome: { changed: 0, same: 0, notFound: 0 },
      history: [{ type: 'opened', at }],
      openedAt: at,
      envelopeId: envelope.envelopeId,
      idempotencyKey: key,
      host: input.host,
      intent: input.intent,
      envelope,
      sequence: this.nextSequence(),
      at
    };
    for (const annotation of annotations) {
      if (annotation.state === 'draft' || annotation.state === 'queued') {
        annotation.state = 'delivered';
      }
      annotation.passId = pass.passId;
      annotation.sentAt = at;
      annotation.history.push({ type: 'delivered', at, detail: input.host });
      annotation.updatedAt = at;
    }
    this.state.passes[pass.passId] = pass;
    this.state.byIdempotencyKey[key] = pass.passId;
    this.persist();
    return pass;
  }

  recordResolutions(annotationId: string, resolutions: TargetResolutionRecord[], revision?: string): Annotation {
    const updated = this.mutate(annotationId, (annotation) => {
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
    if (updated.passId) {
      this.refreshPassOutcome(updated.passId, revision);
      this.persist();
    }
    return updated;
  }

  repoint(annotationId: string, targets: AnnotationTarget[], relationships?: AnnotationRelation[]): Annotation {
    if (targets.length === 0) {
      throw new Error('An Annotation needs at least one target');
    }
    return this.mutate(annotationId, (annotation) => {
      annotation.targets = targets;
      annotation.relationships = relationships ?? relationsAmong(annotation.relationships, targets).relationships;
      annotation.resolutions = [];
      annotation.declaredMissing = [];
      annotation.history.push({ type: 'repointed', at: now() });
      return annotation;
    });
  }

  declareMissing(annotationId: string, targetId: string): Annotation {
    const current = this.get(annotationId);
    if (!current) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    const resolution = current.resolutions.find((entry) => entry.targetId === targetId);
    if (!resolution) {
      throw new Error(`Annotation ${annotationId} has no resolution for target ${targetId}.`);
    }
    if (resolution.match !== 'unresolved' || resolution.candidates.length > 0) {
      throw new Error(
        'A target can be declared missing only where it could not be found and has no candidates; re-point it instead.'
      );
    }
    const revision = current.resolvedRevision ?? current.writtenRevision;
    const at = now();
    return this.mutate(annotationId, (annotation) => {
      annotation.declaredMissing = [
        ...annotation.declaredMissing.filter((entry) => entry.targetId !== targetId),
        { targetId, at, revision }
      ];
      annotation.history.push({ type: 'declared-missing', at, detail: targetId });
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
    const existing = this.get(annotationId);
    if (!existing) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    if (existing.verification) {
      this.reopenVerdict(annotationId);
    }
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

  reopenVerdict(annotationId: string): Annotation {
    const current = this.get(annotationId);
    if (!current) {
      throw new Error(`Unknown Annotation ${annotationId}`);
    }
    if (current.state === 'replaced') {
      throw new Error(
        `${annotationId} was replaced rather than decided, so its Replacement is the act that changes it.`
      );
    }
    if (!current.verification) {
      throw new Error(`${annotationId} has no decision to reopen.`);
    }
    const reopened = this.mutate(annotationId, (annotation) => {
      delete annotation.verification;
      annotation.state = annotation.resolutions.length > 0 ? 'resolved' : 'delivered';
      annotation.history.push({ type: 'reopened', at: now() });
      return annotation;
    });
    if (reopened.passId) {
      const pass = this.state.passes[reopened.passId];
      if (pass && pass.state === 'closed') {
        this.reopenPass(reopened.passId);
      }
    }
    return reopened;
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

  importEnvelope(envelope: Envelope, host: string): Pass {
    const existingId = this.state.byIdempotencyKey[envelope.delivery.idempotencyKey];
    if (existingId && this.state.passes[existingId]) {
      return this.state.passes[existingId]!;
    }
    if (envelope.delivery.intent === 'draft') {
      throw new Error('A draft intent stays on this machine: it creates no Pass and moves no Annotation out of draft or queued.');
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
        declaredMissing: [],
        passId: envelope.envelopeId,
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
    const pass: Pass = {
      passId: envelope.envelopeId,
      artifactId: envelope.artifact.id,
      fromRevision: envelope.artifact.revision,
      annotationIds: ids,
      state: 'in-flight',
      outcome: { changed: 0, same: 0, notFound: 0 },
      history: [{ type: 'opened', at }],
      openedAt: at,
      envelopeId: envelope.envelopeId,
      idempotencyKey: envelope.delivery.idempotencyKey,
      host,
      intent: envelope.delivery.intent,
      envelope,
      sequence: this.nextSequence(),
      at
    };
    this.state.passes[pass.passId] = pass;
    this.state.byIdempotencyKey[envelope.delivery.idempotencyKey] = pass.passId;
    this.persist();
    return pass;
  }

  getPass(passId: string): Pass | undefined {
    return this.state.passes[passId];
  }

  findPassByIdempotencyKey(key: string): Pass | undefined {
    const id = this.state.byIdempotencyKey[key];
    return id ? this.state.passes[id] : undefined;
  }

  listPasses(): Pass[] {
    return Object.values(this.state.passes).sort((a, b) => (a.openedAt < b.openedAt ? -1 : a.openedAt > b.openedAt ? 1 : 0));
  }

  sequenceNow(): number {
    return this.state.sequence;
  }

  listPassesOfArtifact(artifactId: string): Pass[] {
    return this.listPasses().filter((pass) => pass.artifactId === artifactId);
  }

  annotationsOfPass(passId: string): Annotation[] {
    const pass = this.state.passes[passId];
    if (!pass) {
      return [];
    }
    return pass.annotationIds
      .map((id) => this.state.annotations[id])
      .filter((annotation): annotation is Annotation => annotation !== undefined);
  }

  closePass(passId: string): Pass {
    const pass = this.state.passes[passId];
    if (!pass) {
      throw new Error(`Unknown Pass ${passId}`);
    }
    if (pass.state === 'closed') {
      return pass;
    }
    const at = now();
    pass.state = 'closed';
    pass.closedAt = at;
    pass.history.push({ type: 'closed', at });
    this.persist();
    return pass;
  }

  reopenPass(passId: string): Pass {
    const pass = this.state.passes[passId];
    if (!pass) {
      throw new Error(`Unknown Pass ${passId}`);
    }
    if (pass.state !== 'closed') {
      return pass;
    }
    const at = now();
    pass.state = 'ready';
    delete pass.closedAt;
    pass.history.push({ type: 'reopened', at });
    this.persist();
    return pass;
  }

  anotherPass(passId: string, input: { host: string; artifact: Pass['envelope']['artifact'] }): Pass {
    const source = this.state.passes[passId];
    if (!source) {
      throw new Error(`Unknown Pass ${passId}`);
    }
    if (source.state === 'closed') {
      throw new Error(`Pass ${passId} is already closed, so there is nothing to attempt again.`);
    }
    const members = this.annotationsOfPass(passId).filter((annotation) => isAttemptable(annotation.state));
    if (members.length === 0) {
      throw new Error(
        'Every Annotation in this Pass has been accepted or abandoned, so there is nothing to attempt again.'
      );
    }
    const key = batchIdempotencyKey(members, passId);
    const existing = this.state.byIdempotencyKey[key];
    if (existing && this.state.passes[existing]) {
      return this.state.passes[existing]!;
    }
    this.closePass(passId);
    const envelope = buildBatchEnvelope({
      artifact: input.artifact,
      annotations: members,
      intent: 'next-pass',
      idempotencyKeySalt: passId
    });
    const at = now();
    const pass: Pass = {
      passId: envelope.envelopeId,
      artifactId: input.artifact.id,
      fromRevision: input.artifact.revision,
      annotationIds: members.map((annotation) => annotation.annotationId),
      state: 'in-flight',
      outcome: { changed: 0, same: 0, notFound: 0 },
      history: [{ type: 'opened', at }],
      openedAt: at,
      envelopeId: envelope.envelopeId,
      idempotencyKey: key,
      host: input.host,
      intent: 'next-pass',
      envelope,
      sequence: this.nextSequence(),
      at
    };
    for (const annotation of members) {
      annotation.state = 'delivered';
      delete annotation.verification;
      delete annotation.resolvedRevision;
      annotation.resolutions = [];
      annotation.passId = pass.passId;
      annotation.sentAt = at;
      annotation.history.push({ type: 'delivered', at, detail: input.host });
      annotation.updatedAt = at;
    }
    this.state.passes[pass.passId] = pass;
    this.state.byIdempotencyKey[key] = pass.passId;
    this.persist();
    return pass;
  }

  markPassesReady(artifactId: string, toRevision: string): Pass[] {
    const touched: Pass[] = [];
    for (const pass of this.listPassesOfArtifact(artifactId)) {
      if (pass.state === 'open' || pass.state === 'in-flight') {
        pass.state = 'ready';
        pass.toRevision = toRevision;
        touched.push(pass);
      }
    }
    if (touched.length > 0) {
      this.persist();
    }
    return touched;
  }

  private refreshPassOutcome(passId: string, revision?: string): void {
    const pass = this.state.passes[passId];
    if (!pass || pass.state === 'closed') {
      return;
    }
    const outcome: PassOutcome = { changed: 0, same: 0, notFound: 0 };
    for (const annotation of this.annotationsOfPass(passId)) {
      for (const resolution of annotation.resolutions) {
        outcome[outcomeKey(anchorOutcome(annotation, resolution))] += 1;
      }
    }
    pass.outcome = outcome;
    if (revision) {
      pass.toRevision = revision;
    }
  }

  private nextOrder(artifactId: string): number {
    const existing = this.listArtifact(artifactId);
    return existing.reduce((max, annotation) => Math.max(max, annotation.order + 1), 0);
  }

  private nextSequence(): number {
    this.state.sequence += 1;
    return this.state.sequence;
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
      const parsed = readJsonFile<Record<string, unknown> | undefined>(this.file, undefined);
      if (!parsed || parsed['version'] !== STORE_VERSION || typeof parsed['annotations'] !== 'object' || parsed['annotations'] === null) {
        throw new Error(
          `Annotation store at ${this.file} has an incompatible layout; refusing to start rather than lose intent. The original bytes are preserved.`
        );
      }
      return normalizePersistedState(parsed);
    }
    return this.migrateFromLegacy();
  }

  private migrateFromLegacy(): PersistedState {
    const fresh: PersistedState = {
      version: STORE_VERSION,
      annotations: {},
      passes: {},
      byIdempotencyKey: {},
      migration: emptyMigrationReport(),
      sequence: 0
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
    case 'not-fixed':
      return 'not-fixed';
    case 'obsolete':
      return 'obsolete';
  }
}

export function normalizeAnnotationState(value: unknown): AnnotationState {
  if (value === 'superseded') {
    return 'replaced';
  }
  if (value === 'another-pass' || value === 'rejected') {
    return 'not-fixed';
  }
  return typeof value === 'string' ? (value as AnnotationState) : 'draft';
}

function normalizeAnnotation(raw: Record<string, unknown>): Annotation {
  const annotation = raw as unknown as Annotation & {
    supersedes?: string;
    supersededBy?: string;
    chosenCandidates?: Record<string, string>;
  };
  const { supersedes, supersededBy, chosenCandidates, ...rest } = annotation;
  void chosenCandidates;
  return {
    ...(rest as Annotation),
    state: normalizeAnnotationState(annotation.state),
    declaredMissing: annotation.declaredMissing ?? [],
    ...(supersedes ? { replaces: supersedes } : {}),
    ...(supersededBy ? { replacedBy: supersededBy } : {}),
    ...(annotation.verification
      ? { verification: { ...annotation.verification, verdict: normalizeVerdictValue(annotation.verification.verdict) } }
      : {})
  };
}

function normalizeVerdictValue(value: unknown): VerificationVerdict {
  return value === 'another-pass' || value === 'reject' ? 'not-fixed' : (value as VerificationVerdict);
}

function normalizePersistedState(raw: Record<string, unknown>): PersistedState {
  const annotations: Record<string, Annotation> = {};
  for (const [id, annotation] of Object.entries((raw['annotations'] as Record<string, unknown>) ?? {})) {
    annotations[id] = normalizeAnnotation(annotation as Record<string, unknown>);
  }
  const storedPasses = (raw['passes'] ?? raw['batches'] ?? {}) as Record<string, Pass>;
  const passes: Record<string, Pass> = {};
  for (const [id, pass] of Object.entries(storedPasses)) {
    passes[id] = {
      ...pass,
      passId: pass.passId ?? pass.envelopeId ?? id,
      artifactId: pass.artifactId ?? pass.envelope?.artifact.id ?? '',
      fromRevision: pass.fromRevision ?? pass.envelope?.artifact.revision ?? '',
      annotationIds: pass.annotationIds ?? [],
      state: pass.state ?? 'in-flight',
      outcome: normalizeOutcome(pass.outcome),
      history: pass.history ?? [{ type: 'opened', at: pass.openedAt ?? pass.at }],
      openedAt: pass.openedAt ?? pass.at,
      at: pass.at ?? pass.openedAt
    };
  }
  return {
    version: STORE_VERSION,
    annotations,
    passes,
    byIdempotencyKey: (raw['byIdempotencyKey'] as Record<string, string>) ?? {},
    migration: (raw['migration'] as MigrationReport) ?? emptyMigrationReport(),
    sequence: assignMissingSequences(annotations, passes, raw['sequence'])
  };
}

function assignMissingSequences(
  annotations: Record<string, Annotation>,
  passes: Record<string, Pass>,
  stored: unknown
): number {
  let highest = typeof stored === 'number' && Number.isInteger(stored) && stored >= 0 ? stored : 0;
  const unstamped: Array<{ at: string; stamp: (sequence: number) => void }> = [];
  for (const pass of Object.values(passes)) {
    if (typeof pass.sequence !== 'number') {
      unstamped.push({
        at: pass.at,
        stamp: (sequence) => {
          pass.sequence = sequence;
        }
      });
    }
  }
  for (const annotation of Object.values(annotations)) {
    for (const event of annotation.history) {
      if (event.type === 'amended' && typeof event.sequence !== 'number') {
        unstamped.push({
          at: event.at,
          stamp: (sequence) => {
            event.sequence = sequence;
          }
        });
      }
    }
  }
  unstamped.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  for (const item of unstamped) {
    highest += 1;
    item.stamp(highest);
  }
  return highest;
}

function outcomeKey(outcome: AnchorOutcome): keyof PassOutcome {
  switch (outcome) {
    case 'changed':
      return 'changed';
    case 'same':
      return 'same';
    case 'not-found':
      return 'notFound';
  }
}

function normalizeOutcome(value: unknown): PassOutcome {
  const stored = (value ?? {}) as Record<string, number | undefined>;
  return {
    changed: stored['changed'] ?? stored['answered'] ?? 0,
    same: stored['same'] ?? stored['untouched'] ?? 0,
    notFound: stored['notFound'] ?? stored['gone'] ?? 0
  };
}

function now(): string {
  return new Date().toISOString();
}

export { batchEnvelopeId, batchIdempotencyKey };