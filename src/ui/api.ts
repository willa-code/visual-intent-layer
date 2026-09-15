import type { Annotation, AnnotationSummary, AnnotationTarget } from '../annotation/model.js';
import type { MigrationReport } from '../annotation/migrate.js';
import type { AgentPositionReport } from '../mcp/service.js';
import type { ResolutionCandidate, TargetResolutionRecord } from '../resolution/resolve.js';
import type { LayerTarget } from './protocol.js';

export type SessionSnapshot = {
  sessionId: string;
  artifact: { id: string; kind: string; revision: string; displayName: string; source: string };
  annotations: Annotation[];
  summaries: AnnotationSummary[];
  agent: AgentPositionReport;
  migration: MigrationReport;
  batches: Array<{ envelopeId: string; status: string; annotationIds: string[] }>;
};

export type SessionStatus = {
  sessionId: string;
  artifactId: string;
  openedRevision: string;
  currentRevision: string;
  changed: boolean;
  unreadable?: boolean;
};

export type Policy = {
  remoteOrigins: string[];
  byKind: { stylesheet: string[]; font: string[]; image: string[]; other: string[] };
  contactsRemote: boolean;
};

export type SendResponse = { envelopeId: string; annotationIds: string[]; delivery: string; idempotencyKey: string };

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

  async send(intent: 'next-pass' | 'steering' | 'draft' | 'review-interruption'): Promise<SendResponse> {
    return this.json<SendResponse>(this.url(`/api/sessions/${this.sessionId}/send`), {
      method: 'POST',
      body: JSON.stringify({ intent })
    });
  }

  async resolve(annotationId: string, revision: string, candidates: ResolutionCandidate[]): Promise<TargetResolutionRecord[]> {
    const result = await this.json<{ resolutions: TargetResolutionRecord[] }>(
      this.url(`/api/annotations/${annotationId}/resolve`),
      { method: 'POST', body: JSON.stringify({ revision, candidates }) }
    );
    return result.resolutions;
  }

  async chooseCandidate(annotationId: string, targetId: string, nodeId: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/candidate`), {
      method: 'POST',
      body: JSON.stringify({ targetId, nodeId })
    });
    return result.annotation;
  }

  async verify(annotationId: string, verdict: string): Promise<Annotation> {
    const result = await this.json<{ annotation: Annotation }>(this.url(`/api/annotations/${annotationId}/verify`), {
      method: 'POST',
      body: JSON.stringify({ verdict })
    });
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
      throw new Error((await response.text()).trim() || `${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }
}