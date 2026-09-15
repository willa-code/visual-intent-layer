import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Envelope } from '../envelope/validate.js';
import { readJsonFileStrict, writeJsonAtomic } from '../service/json-file.js';

export type LifecycleStatus =
  | 'draft'
  | 'queued-local'
  | 'host-accepted'
  | 'agent-acknowledged'
  | 'source-modified'
  | 'verified'
  | 'rejected'
  | 'superseded'
  | 'obsolete';

export type ResolutionOutcome = 'exact' | 'recovered' | 'ambiguous' | 'stale' | 'deleted';

export type TargetResolution = {
  targetId: string;
  outcome: ResolutionOutcome;
  candidateCount?: number;
  resolvedAt: string;
};

export type DeliveryEvent = {
  type: 'saved-draft' | 'delivered' | 'acknowledged' | 'source-revision' | 'resolution' | 'verified';
  at: string;
  host?: string;
  agentId?: string;
  revision?: string;
  verdict?: string;
};

export type EnvelopeRecord = {
  envelopeId: string;
  idempotencyKey: string;
  envelope: Envelope;
  status: LifecycleStatus;
  stale: boolean;
  resultingRevisions: string[];
  resolutions: TargetResolution[];
  deliveryHistory: DeliveryEvent[];
  successorId?: string;
  updatedAt: string;
};

export type VerificationVerdict = 'approve' | 'reject' | 'another-pass' | 'supersede' | 'obsolete';

const STORE_VERSION = 1;

type PersistedStore = {
  version: number;
  records: Record<string, EnvelopeRecord>;
  byIdempotencyKey: Record<string, string>;
};

export class LifecycleStore {
  private readonly file: string;
  private state: PersistedStore;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, 'lifecycle.json');
    this.state = this.load();
  }

  saveDraft(envelope: Envelope): EnvelopeRecord {
    return this.upsert(envelope.envelopeId, envelope.delivery.idempotencyKey, (current) => {
      const record = current ?? blankRecord(envelope);
      if (current) {
        record.envelope = envelope;
      }
      if (record.status !== 'draft' && record.deliveryHistory.length === 0) {
        record.status = 'draft';
      }
      record.deliveryHistory.push({ type: 'saved-draft', at: now() });
      return record;
    });
  }

  queueNextPass(envelope: Envelope): EnvelopeRecord {
    return this.upsert(envelope.envelopeId, envelope.delivery.idempotencyKey, (current) => {
      const record = current ?? blankRecord(envelope);
      record.envelope = envelope;
      if (record.deliveryHistory.some((event) => event.type === 'delivered')) {
        return record;
      }
      record.status = 'queued-local';
      record.deliveryHistory.push({ type: 'saved-draft', at: now() });
      return record;
    });
  }

  deliver(envelope: Envelope, host: string): EnvelopeRecord {
    const existingId = this.state.byIdempotencyKey[envelope.delivery.idempotencyKey];
    if (existingId) {
      const existing = this.state.records[existingId];
      if (existing) {
        return existing;
      }
    }
    return this.upsert(envelope.envelopeId, envelope.delivery.idempotencyKey, (current) => {
      const record = current ?? blankRecord(envelope);
      if (record.deliveryHistory.some((event) => event.type === 'delivered')) {
        return record;
      }
      record.envelope = envelope;
      record.status = 'host-accepted';
      record.deliveryHistory.push({ type: 'delivered', at: now(), host });
      return record;
    });
  }

  acknowledge(envelopeId: string, agentId: string): EnvelopeRecord {
    return this.mutate(envelopeId, (record) => {
      if (record.status === 'host-accepted' || record.status === 'queued-local') {
        record.status = 'agent-acknowledged';
      }
      record.deliveryHistory.push({ type: 'acknowledged', at: now(), agentId });
      return record;
    });
  }

  recordSourceRevision(envelopeId: string, revision: string): EnvelopeRecord {
    return this.mutate(envelopeId, (record) => {
      if (!record.resultingRevisions.includes(revision)) {
        record.resultingRevisions.push(revision);
      }
      if (!isTerminal(record.status)) {
        record.status = 'source-modified';
      }
      record.deliveryHistory.push({ type: 'source-revision', at: now(), revision });
      return record;
    });
  }

  recordResolution(envelopeId: string, resolutions: Array<Omit<TargetResolution, 'resolvedAt'>>): EnvelopeRecord {
    return this.mutate(envelopeId, (record) => {
      const at = now();
      record.resolutions = resolutions.map((resolution) => ({ ...resolution, resolvedAt: at }));
      record.stale = false;
      record.deliveryHistory.push({ type: 'resolution', at });
      return record;
    });
  }

  noteRevisionAdvance(envelopeId: string, currentRevision: string): EnvelopeRecord {
    return this.mutate(envelopeId, (record) => {
      if (currentRevision === record.envelope.artifact.revision) {
        return record;
      }
      if (record.status === 'draft' || record.status === 'queued-local') {
        record.stale = true;
      }
      return record;
    });
  }

  verify(envelopeId: string, verdict: VerificationVerdict, options: { successorId?: string } = {}): EnvelopeRecord {
    return this.mutate(envelopeId, (record) => {
      if (verdict === 'approve' && record.stale) {
        throw new Error('Envelope is stale: the artifact advanced before delivery. Re-resolve targets against the current revision first.');
      }
      if (verdict === 'approve' && record.resolutions.some((r) => r.outcome === 'deleted')) {
        throw new Error('Cannot approve while a target resolves as deleted; reject, supersede, or mark obsolete instead.');
      }
      if (verdict === 'approve' && record.resolutions.some((r) => r.outcome === 'ambiguous')) {
        throw new Error('Cannot approve while a target resolves as ambiguous; dispose each ambiguous target explicitly.');
      }
      if (verdict === 'approve' && record.resolutions.some((r) => r.outcome === 'stale')) {
        throw new Error('Cannot approve while a target resolves as stale; re-resolve against the current revision or dispose it explicitly.');
      }
      record.status =
        verdict === 'approve'
          ? 'verified'
          : verdict === 'reject' || verdict === 'another-pass'
            ? 'rejected'
            : verdict === 'supersede'
              ? 'superseded'
              : 'obsolete';
      if (options.successorId) {
        record.successorId = options.successorId;
      }
      record.deliveryHistory.push({ type: 'verified', at: now(), verdict });
      return record;
    });
  }

  get(envelopeId: string): EnvelopeRecord | undefined {
    return this.state.records[envelopeId];
  }

  list(): EnvelopeRecord[] {
    return Object.values(this.state.records);
  }

  pendingDelivery(): EnvelopeRecord[] {
    return this.list().filter((record) => record.status === 'queued-local' || record.status === 'draft');
  }

  private mutate(envelopeId: string, apply: (record: EnvelopeRecord) => EnvelopeRecord): EnvelopeRecord {
    const current = this.state.records[envelopeId];
    if (!current) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    const next = apply(structuredClone(current));
    next.updatedAt = now();
    this.state.records[envelopeId] = next;
    this.persist();
    return next;
  }

  private upsert(
    envelopeId: string,
    idempotencyKey: string,
    apply: (current: EnvelopeRecord | undefined) => EnvelopeRecord
  ): EnvelopeRecord {
    const next = apply(
      this.state.records[envelopeId] ? structuredClone(this.state.records[envelopeId]) : undefined
    );
    next.updatedAt = now();
    this.state.records[envelopeId] = next;
    this.state.byIdempotencyKey[idempotencyKey] = envelopeId;
    this.persist();
    return next;
  }

  private load(): PersistedStore {
    const parsed = readJsonFileStrict<PersistedStore | undefined>(
      this.file,
      undefined,
      'Lifecycle store'
    );
    if (parsed === undefined) {
      return { version: STORE_VERSION, records: {}, byIdempotencyKey: {} };
    }
    if (!isPersistedStore(parsed)) {
      throw new Error(`Lifecycle store at ${this.file} has an incompatible layout; refusing to start.`);
    }
    return parsed;
  }

  private persist(): void {
    writeJsonAtomic(this.file, this.state);
  }
}

function blankRecord(envelope: Envelope): EnvelopeRecord {
  return {
    envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.delivery.idempotencyKey,
    envelope,
    status: 'draft',
    stale: false,
    resultingRevisions: [],
    resolutions: [],
    deliveryHistory: [],
    updatedAt: now()
  };
}

function isTerminal(status: LifecycleStatus): boolean {
  return status === 'verified' || status === 'rejected' || status === 'superseded' || status === 'obsolete';
}

function isPersistedStore(value: unknown): value is PersistedStore {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['version'] === STORE_VERSION &&
    typeof candidate['records'] === 'object' &&
    typeof candidate['byIdempotencyKey'] === 'object'
  );
}

function now(): string {
  return new Date().toISOString();
}
