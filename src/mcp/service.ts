import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { computeRevision, stableArtifactId } from '../artifact/revision.js';
import { validateEnvelope, type Envelope } from '../envelope/validate.js';
import { AnnotationStore, type DeliveryBatch } from '../annotation/store.js';
import { AttachmentStore } from '../annotation/attachments.js';
import { SnapshotStore } from '../artifact/snapshots.js';
import { summarise, type Annotation, type AnnotationSummary } from '../annotation/model.js';
import { SessionRecords, type SessionRecord } from '../service/sessions.js';
import { deliveryPlan, detectCapabilities, type DeliveryPlan } from '../host/capabilities.js';
import { openInDefaultBrowser } from '../service/browser.js';

export type OpenArtifactInput =
  | { kind: 'saved-html'; path: string }
  | { kind: 'react-vite-app'; url: string };

export type OpenOptions = {
  baseUrl?: string;
  openBrowser?: boolean;
};

export type OpenedArtifact = {
  sessionId: string;
  reviewUrl: string;
  capability: string;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  reused: boolean;
};

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type AgentPosition = 'awaiting-you' | 'working' | 'acknowledged' | 'stepped-away';

export type AgentPositionReport = {
  position: AgentPosition;
  sentence: string;
  hostCanHold: boolean;
  queuedDurably: number;
};

export type SendResult = {
  batch: DeliveryBatch;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  delivery: DeliveryPlan;
};

export type BatchStatus = {
  envelopeId: string;
  status: string;
  artifact: Envelope['artifact'];
  annotations: AnnotationSummary[];
  agent: AgentPositionReport;
  deliveryHistory: Array<{ type: string; at: string; detail?: string }>;
};

export type ReviewServiceOptions = {
  dataDir: string;
  reviewBaseUrl?: string;
  waitMs?: number;
};

export type ReviewService = {
  listTools(): ToolDescriptor[];
  openArtifact(input: OpenArtifactInput, options?: OpenOptions): Promise<OpenedArtifact>;
  submitEnvelope(envelopeJson: unknown, options?: { host?: string }): Promise<{ envelopeId: string; status: string; duplicate: boolean }>;
  acknowledge(envelopeId: string, agentId: string, annotationId?: string): Promise<{ envelopeId: string; annotationIds: string[] }>;
  getBatchStatus(envelopeId: string): BatchStatus;
  listBatches(): Array<{ envelopeId: string; status: string; annotationIds: string[] }>;
  sendQueue(sessionId: string, options?: { host?: string; intent?: 'next-pass' | 'steering' | 'draft' | 'review-interruption' }): SendResult;
  waitForSend(sessionId: string, timeoutMs: number): Promise<DeliveryBatch | null>;
  noteAgentContact(sessionId: string): void;
  agentPosition(sessionId: string): AgentPositionReport;
  readonly sessions: SessionRecords;
  readonly annotations: AnnotationStore;
  readonly attachments: AttachmentStore;
  readonly snapshots: SnapshotStore;
  readonly dataDir: string;
  readonly waitMs: number;
};

const DEFAULT_WAIT_MS = 15 * 60 * 1000;

export function createReviewService(options: ReviewServiceOptions): ReviewService {
  const dataDir = options.dataDir;
  const baseUrl = (options.reviewBaseUrl ?? 'http://127.0.0.1:3742').replace(/\/+$/, '');
  const waitMs = options.waitMs ?? Number(process.env['VISUAL_INTENT_WAIT_MS'] ?? DEFAULT_WAIT_MS);
  const annotations = new AnnotationStore(dataDir);
  const attachments = new AttachmentStore(dataDir);
  const snapshots = new SnapshotStore(dataDir);
  const sessions = new SessionRecords(dataDir);
  const waiters = new Map<string, Array<(batch: DeliveryBatch | null) => void>>();
  const agentContact = new Map<string, number>();

  async function openArtifact(input: OpenArtifactInput, openOptions: OpenOptions = {}): Promise<OpenedArtifact> {
    const effectiveBase = (openOptions.baseUrl ?? baseUrl).replace(/\/+$/, '');
    if (input.kind === 'saved-html') {
      const absolute = resolve(process.cwd(), input.path);
      if (!existsSync(absolute)) {
        throw new Error(`Artifact not found: ${input.path}`);
      }
      const bytes = readFileSync(absolute);
      const sourceUri = `file://${absolute}`;
      const artifactId = stableArtifactId(sourceUri);
      const revision = computeRevision(bytes, []);
      const existing = sessions.findByArtifactRevision(artifactId, revision);
      if (existing) {
        const reviewUrl = `${effectiveBase}/review/${existing.sessionId}?cap=${existing.capability}`;
        if (openOptions.openBrowser) {
          openInDefaultBrowser(reviewUrl);
        }
        return {
          sessionId: existing.sessionId,
          reviewUrl,
          capability: existing.capability,
          artifact: {
            id: existing.artifactId,
            kind: existing.kind,
            revision: existing.revision,
            displayName: existing.displayName
          },
          reused: true
        };
      }
      const displayName = absolute.split('/').pop() ?? absolute;
      const record = sessions.mint({
        sessionId: `session-${randomUUID()}`,
        source: sourceUri,
        kind: 'saved-html',
        artifactId,
        revision,
        displayName
      });
      const reviewUrl = `${effectiveBase}/review/${record.sessionId}?cap=${record.capability}`;
      if (openOptions.openBrowser) {
        openInDefaultBrowser(reviewUrl);
      }
      return {
        sessionId: record.sessionId,
        reviewUrl,
        capability: record.capability,
        artifact: { id: artifactId, kind: 'saved-html', revision, displayName },
        reused: false
      };
    }
    const artifactId = stableArtifactId(input.url);
    assertLocalAppUrl(input.url);
    const revision = await fetchAppRevision(input.url).catch(() =>
      computeRevision(Buffer.from(input.url, 'utf8'), [])
    );
    const existing = sessions.findByArtifactRevision(artifactId, revision);
    if (existing) {
      const reviewUrl = `${effectiveBase}/review/${existing.sessionId}?cap=${existing.capability}`;
      if (openOptions.openBrowser) {
        openInDefaultBrowser(reviewUrl);
      }
      return {
        sessionId: existing.sessionId,
        reviewUrl,
        capability: existing.capability,
        artifact: {
          id: existing.artifactId,
          kind: existing.kind,
          revision: existing.revision,
          displayName: existing.displayName
        },
        reused: true
      };
    }
    const record = sessions.mint({
      sessionId: `session-${randomUUID()}`,
      source: input.url,
      kind: 'react-vite-app',
      artifactId,
      revision,
      displayName: input.url
    });
    const reviewUrl = `${effectiveBase}/review/${record.sessionId}?cap=${record.capability}`;
    if (openOptions.openBrowser) {
      openInDefaultBrowser(reviewUrl);
    }
    return {
      sessionId: record.sessionId,
      reviewUrl,
      capability: record.capability,
      artifact: { id: artifactId, kind: 'react-vite-app', revision, displayName: input.url },
      reused: false
    };
  }

  async function submitEnvelope(
    envelopeJson: unknown,
    submitOptions: { host?: string } = {}
  ): Promise<{ envelopeId: string; status: string; duplicate: boolean }> {
    const result = validateEnvelope(envelopeJson);
    if (!result.ok) {
      throw new Error(`Invalid Visual Intent Envelope: ${result.errors.join('; ')}`);
    }
    const envelope = result.value;
    const before = annotations.findBatchByIdempotencyKey(envelope.delivery.idempotencyKey);
    const host = submitOptions.host ?? 'mcp';
    const batch = annotations.importEnvelope(envelope, host);
    return { envelopeId: batch.envelopeId, status: 'host-accepted', duplicate: before !== undefined };
  }

  async function acknowledge(
    envelopeId: string,
    agentId: string,
    annotationId?: string
  ): Promise<{ envelopeId: string; annotationIds: string[] }> {
    const targets = annotationId
      ? [annotationId]
      : annotations.annotationsOfBatch(envelopeId).map((annotation) => annotation.annotationId);
    if (targets.length === 0) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    for (const id of targets) {
      annotations.acknowledge(id, agentId);
    }
    return { envelopeId, annotationIds: targets };
  }

  function getBatchStatus(envelopeId: string): BatchStatus {
    const batch = annotations.getBatch(envelopeId);
    if (!batch) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    const owned = annotations.annotationsOfBatch(envelopeId);
    const session = sessions.findByArtifactRevision(batch.envelope.artifact.id, batch.envelope.artifact.revision);
    return {
      envelopeId,
      status: statusOf(owned),
      artifact: batch.envelope.artifact,
      annotations: owned.map(summarise),
      agent: agentPosition(session?.sessionId ?? ''),
      deliveryHistory: batch
        ? owned.flatMap((annotation) =>
            annotation.history
              .filter((event) => event.type === 'delivered' || event.type === 'acknowledged' || event.type === 'verified')
              .map((event) => ({ type: event.type, at: event.at, ...(event.detail ? { detail: event.detail } : {}) }))
          )
        : []
    };
  }

  function listBatches(): Array<{ envelopeId: string; status: string; annotationIds: string[] }> {
    return annotations.listBatches().map((batch) => ({
      envelopeId: batch.envelopeId,
      status: statusOf(annotations.annotationsOfBatch(batch.envelopeId)),
      annotationIds: batch.annotationIds
    }));
  }

  function sendQueue(
    sessionId: string,
    sendOptions: { host?: string; intent?: SendResult['batch']['intent'] } = {}
  ): SendResult {
    const session = requireSession(sessionId);
    const queue = annotations.queueOf(session.artifactId);
    if (queue.length === 0) {
      throw new Error('The Annotation Queue is empty; there is nothing to send.');
    }
    const intent = sendOptions.intent ?? 'next-pass';
    const caps = detectCapabilities(sendOptions.host ?? 'browser');
    const plan = deliveryPlan(caps, intent);
    const batch = annotations.markDelivered(queue.map((annotation) => annotation.annotationId), {
      host: sendOptions.host ?? 'browser',
      intent,
      artifact: {
        id: session.artifactId,
        kind: session.kind as 'saved-html' | 'react-vite-app',
        revision: session.revision,
        displayName: session.displayName
      }
    });
    resolveWaiters(sessionId, batch);
    return {
      batch,
      artifact: {
        id: session.artifactId,
        kind: session.kind,
        revision: session.revision,
        displayName: session.displayName
      },
      delivery: plan
    };
  }

  function waitForSend(sessionId: string, timeout: number): Promise<DeliveryBatch | null> {
    return new Promise((resolvePromise) => {
      const timer = setTimeout(() => {
        removeWaiter(sessionId, entry);
        resolvePromise(null);
      }, timeout);
      const entry = (batch: DeliveryBatch | null): void => {
        clearTimeout(timer);
        resolvePromise(batch);
      };
      const list = waiters.get(sessionId) ?? [];
      list.push(entry);
      waiters.set(sessionId, list);
    });
  }

  function resolveWaiters(sessionId: string, batch: DeliveryBatch): void {
    const list = waiters.get(sessionId) ?? [];
    waiters.delete(sessionId);
    for (const entry of list) {
      entry(batch);
    }
  }

  function removeWaiter(sessionId: string, entry: (batch: DeliveryBatch | null) => void): void {
    const list = (waiters.get(sessionId) ?? []).filter((candidate) => candidate !== entry);
    if (list.length > 0) {
      waiters.set(sessionId, list);
    } else {
      waiters.delete(sessionId);
    }
  }

  function noteAgentContact(sessionId: string): void {
    if (sessionId) {
      agentContact.set(sessionId, Date.now());
    }
  }

  function agentPosition(sessionId: string): AgentPositionReport {
    const session = sessionId ? sessions.get(sessionId) : undefined;
    const queue = session ? annotations.queueOf(session.artifactId).length : 0;
    const waiting = sessionId ? (waiters.get(sessionId)?.length ?? 0) > 0 : false;
    if (waiting) {
      return {
        position: 'awaiting-you',
        sentence: 'Your agent is holding the call and waiting for you right now. Sending is urgent.',
        hostCanHold: true,
        queuedDurably: queue
      };
    }
    const owned = session ? annotations.listArtifact(session.artifactId) : [];
    const delivered = owned.filter((annotation) => annotation.state === 'delivered' || annotation.state === 'resolved');
    const acknowledged = owned.filter((annotation) => annotation.state === 'acknowledged');
    if (delivered.length === 0 && acknowledged.length > 0) {
      return {
        position: 'acknowledged',
        sentence: 'Your agent has acknowledged the direction. Acknowledgement is not implementation and not verification.',
        hostCanHold: false,
        queuedDurably: queue
      };
    }
    const recentlyConnected = sessionId ? Date.now() - (agentContact.get(sessionId) ?? 0) < 60_000 : false;
    if (recentlyConnected && delivered.length > 0) {
      return {
        position: 'working',
        sentence: 'Your agent is working. It is not waiting on this call.',
        hostCanHold: false,
        queuedDurably: queue
      };
    }
    const queuedSentence =
      queue > 0
        ? ` ${queue} Annotation${queue === 1 ? '' : 's'} are queued durably on this machine until your agent collects them.`
        : ' Nothing is waiting on your agent.';
    return {
      position: 'stepped-away',
      sentence: `Your agent has stepped away and is not holding this call.${queuedSentence}`,
      hostCanHold: false,
      queuedDurably: queue
    };
  }

  function requireSession(sessionId: string): SessionRecord {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session ${sessionId}`);
    }
    return session;
  }

  function listTools(): ToolDescriptor[] {
    return [
      {
        name: 'open_visual_review',
        description:
          'Open the Visual Direction Loop for an agent-produced web interface and wait for the Builder-Reviewer. Use this when pointing beats prose: selecting elements, exact text, regions or several targets, expressing relationships by direct manipulation, and sending grounded Annotations. Works with a saved HTML artifact (kind "saved-html" with a filesystem path) or a running local React/Vite app (kind "react-vite-app" with a localhost URL). The default browser opens automatically on the machine running the service. When the human sends, this call returns one batch carrying each Annotation with its own identity, target evidence and note. If the host cannot hold the call, this returns after the wait window and the Annotations remain queued durably; read them with get_intent_status.',
        inputSchema: {
          type: 'object',
          required: ['kind'],
          properties: {
            kind: { type: 'string', enum: ['saved-html', 'react-vite-app'] },
            path: { type: 'string', description: 'Filesystem path to the saved HTML artifact.' },
            url: { type: 'string', description: 'Localhost URL of the running React/Vite application.' },
            waitMs: {
              type: 'number',
              description: 'How long to hold the call for the human, in milliseconds. Omit for the default window.'
            }
          }
        }
      },
      {
        name: 'get_intent_status',
        description:
          'Read one delivered batch: each Annotation with its own identity, target resolution (matched, recovered, ambiguous with candidates, or deleted), whether it was written before the revision now on screen, and the agent position. Resolution never auto-selects a guess and acknowledgement never counts as verification.',
        inputSchema: {
          type: 'object',
          required: ['envelopeId'],
          properties: { envelopeId: { type: 'string' } }
        }
      },
      {
        name: 'acknowledge_intent',
        description:
          'Acknowledge receipt of a batch or of one Annotation as the implementing agent. Acknowledgement is visible to the Builder-Reviewer but never completes the intent and never counts as verification.',
        inputSchema: {
          type: 'object',
          required: ['envelopeId', 'agentId'],
          properties: {
            envelopeId: { type: 'string' },
            agentId: { type: 'string' },
            annotationId: { type: 'string', description: 'Acknowledge only this Annotation when given.' }
          }
        }
      }
    ];
  }

  return {
    listTools,
    openArtifact,
    submitEnvelope,
    acknowledge,
    getBatchStatus,
    listBatches,
    sendQueue,
    waitForSend,
    noteAgentContact,
    agentPosition,
    sessions,
    annotations,
    attachments,
    snapshots,
    dataDir,
    waitMs
  };
}

function statusOf(annotations: Annotation[]): string {
  if (annotations.length === 0) {
    return 'unknown';
  }
  if (annotations.every((annotation) => annotation.state === 'verified')) {
    return 'verified';
  }
  if (annotations.some((annotation) => annotation.state === 'acknowledged')) {
    return 'agent-acknowledged';
  }
  if (annotations.some((annotation) => annotation.state === 'delivered' || annotation.state === 'resolved')) {
    return 'host-accepted';
  }
  return 'queued-local';
}

export function assertLocalAppUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Application Mode needs a local http(s) URL, got: ${url}`);
  }
  const localHost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !localHost) {
    throw new Error(`Application Mode only opens loopback development origins, refused: ${url}`);
  }
}

export async function fetchAppRevision(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`app returned ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return computeRevision(buffer.slice(0, 5 * 1024 * 1024), []);
  } finally {
    clearTimeout(timer);
  }
}
