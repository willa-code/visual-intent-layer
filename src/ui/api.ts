import type { Annotation, AnnotationSummary, AnnotationTarget } from '../annotation/model.js';
import type { MigrationReport } from '../annotation/migrate.js';
import type { PassState, PassOutcome } from '../annotation/store.js';
import type { AgentPositionReport } from '../mcp/service.js';
import type { ResolutionCandidate, TargetResolutionRecord } from '../resolution/resolve.js';
import type { LayerTarget } from './protocol.js';

export type SessionPass = {
  passId: string;
  envelopeId: string;
  state: PassState;
  fromRevision: string;
  toRevision?: string;
  annotationIds: string[];
  outcome: PassOutcome;
  intent: string;
  openedAt: string;
  collectedAt?: string;
  closedAt?: string;
};

export type SessionSnapshot = {
  sessionId: string;
  artifact: { id: string; kind: string; revision: string; displayName: string; source: string };
  annotations: Annotation[];
  summaries: AnnotationSummary[];
  agent: AgentPositionReport;
  migration: MigrationReport;
  passes: SessionPass[];
};

export type SessionStatus = {
  sessionId: string;
  artifactId: string;
  openedRevision: string;
  adoptedRevision: string;
  currentRevision: string;
  revisionBasis: 'document' | 'files';
  changed: boolean;
  unreadable?: boolean;
  ledgerRevision?: number;
};

export type Policy = {
  kind: 'saved-html' | 'proxied-application';
  remoteOrigins: string[];
  byKind: { stylesheet: string[]; font: string[]; image: string[]; other: string[] };
  contactsRemote: boolean;
  application?: { proxiedBase: string; permits: string[]; note: string };
};

export type SendResponse = {
  envelopeId?: string;
  annotationIds?: string[];
  intent?: string;
  channel?: 'held-call' | 'next-check-in';
  holding?: boolean;
  idempotencyKey?: string;
  delivered?: boolean;
  reason?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class Api {
  constructor(
    private readonly sessionId: string,
    private readonly capability: string
  ) {}

  private url(path: string): string {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}session=${encodeURIComponent(this.sessionId)}&cap=${encodeURIComponent(this.capability)}`;
  }

  async snapshot(): Promise<SessionSnapshot> {
    return this.json<SessionSnapshot>(this.url(`/api/sessions/${this.sessionId}/annotations`));
  }

  async policy(): Promise<Policy> {
    return this.json<Policy>(this.url(`/api/sessions/${this.sessionId}/policy`));
  }

  async status(): Promise<SessionStatus> {
    return this.json<SessionStatus>(this.url(`/api/sessions/${this.sessionId}`));
  }

  async agent(): Promise<AgentPositionReport> {
    return this.json<AgentPositionReport>(this.url(`/api/sessions/${this.sessionId}/agent`));
  }

  async createAnnotation(targets: LayerTarget[]): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(
      this.url(`/api/sessions/${this.sessionId}/annotations`),
      { method: 'POST', body: JSON.stringify({ targets }) }
    );
    return result.annotation;
  }

  async patchAnnotation(
    annotationId: string,
    patch: { note?: string; targets?: Array<LayerTarget | AnnotationTarget>; relationships?: Annotation['relationships']; revisionRelation?: Annotation['revisionRelation'] }
  ): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}`), {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    return result.annotation;
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await this.json(this.url(`/api/annotations/${annotationId}`), { method: 'DELETE' });
  }

  async queueAnnotation(annotationId: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/queue`), {
      method: 'POST'
    });
    return result.annotation;
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await this.json(this.url(`/api/sessions/${this.sessionId}/annotations/reorder`), {
      method: 'POST',
      body: JSON.stringify({ orderedIds })
    });
  }

  async send(): Promise<SendResponse> {
    return this.json<SendResponse>(this.url(`/api/sessions/${this.sessionId}/send`), {
      method: 'POST',
      body: JSON.stringify({ intent: 'next-pass' })
    });
  }

  async amend(
    annotationId: string,
    note: string
  ): Promise<{ original: Annotation; successor: Annotation; envelopeId: string; channel: 'held-call' | 'next-check-in'; holding: boolean }> {
    return this.json(this.url(`/api/sessions/${this.sessionId}/amend`), {
      method: 'POST',
      body: JSON.stringify({ annotationId, note })
    });
  }

  async interrupt(): Promise<{ interruptionId: string; requestedAt: string; message: string }> {
    return this.json(this.url(`/api/sessions/${this.sessionId}/interruptions`), { method: 'POST' });
  }

  async reload(): Promise<SessionStatus> {
    return this.json<SessionStatus>(this.url(`/api/sessions/${this.sessionId}/reload`), { method: 'POST' });
  }

  async reportAdopted(revision: string): Promise<SessionStatus> {
    return this.json<SessionStatus>(this.url(`/api/sessions/${this.sessionId}/adopted`), {
      method: 'POST',
      body: JSON.stringify({ revision })
    });
  }

  async endSession(): Promise<{ ended: boolean; message: string }> {
    return this.json<{ ended: boolean; message: string }>(this.url(`/api/sessions/${this.sessionId}/end`), {
      method: 'POST'
    });
  }

  async resolve(
    annotationId: string,
    revision: string,
    candidates: ResolutionCandidate[],
    address?: string
  ): Promise<TargetResolutionRecord[]> {
    const result = await this.json<{ resolutions: TargetResolutionRecord[] }>(
      this.url(`/api/annotations/${annotationId}/resolve`),
      { method: 'POST', body: JSON.stringify({ revision, candidates, ...(address ? { address } : {}) }) }
    );
    return result.resolutions;
  }

  async repoint(annotationId: string, targets: LayerTarget[], relationships?: Annotation['relationships']): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/repoint`), {
      method: 'POST',
      body: JSON.stringify({ targets, ...(relationships ? { relationships } : {}) })
    });
    return result.annotation;
  }

  async closePass(passId: string): Promise<void> {
    await this.json(this.url(`/api/passes/${passId}/close`), { method: 'POST' });
  }

  async anotherPass(passId: string): Promise<void> {
    await this.json(this.url(`/api/passes/${passId}/another`), { method: 'POST' });
  }

  async withdrawPass(passId: string): Promise<void> {
    await this.json(this.url(`/api/passes/${passId}/withdraw`), { method: 'POST' });
  }

  async reopen(): Promise<void> {
    await this.json(this.url(`/api/sessions/${this.sessionId}/reopen`), { method: 'POST' });
  }

  async verify(annotationId: string, verdict: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/verify`), {
      method: 'POST',
      body: JSON.stringify({ verdict })
    });
    return result.annotation;
  }

  async reopenVerdict(annotationId: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/reopen`), {
      method: 'POST'
    });
    return result.annotation;
  }

  async declareMissing(annotationId: string, targetId: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(
      this.url(`/api/annotations/${annotationId}/declare-missing`),
      { method: 'POST', body: JSON.stringify({ targetId }) }
    );
    return result.annotation;
  }

  async uploadAttachment(annotationId: string, file: File): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(
      this.url(`/api/annotations/${annotationId}/attachments?name=${encodeURIComponent(file.name)}`),
      { method: 'POST', body: file, headers: { 'content-type': file.type || 'application/octet-stream' } }
    );
    return result.annotation;
  }

  async removeAttachment(annotationId: string, attachmentId: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(
      this.url(`/api/annotations/${annotationId}/attachments/${attachmentId}`),
      { method: 'DELETE' }
    );
    return result.annotation;
  }

  attachmentUrl(attachmentId: string): string {
    return this.url(`/api/attachments/${attachmentId}`);
  }

  async submitEnvelope(envelope: unknown): Promise<void> {
    await this.json(this.url('/api/intents'), { method: 'POST', body: JSON.stringify({ envelope }) });
  }

  private async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new ApiError(
        (await response.text()).trim() || `${response.status} ${response.statusText}`,
        response.status
      );
    }
    return (await response.json()) as T;
  }
}