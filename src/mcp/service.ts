import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { computeRevision, stableArtifactId } from '../artifact/revision.js';
import { computeSourceRootRevision } from '../artifact/source-root.js';
import { validateEnvelope, type Envelope } from '../envelope/validate.js';
import { AnnotationStore, type Pass } from '../annotation/store.js';
import { AttachmentStore } from '../annotation/attachments.js';
import { SnapshotStore } from '../artifact/snapshots.js';
import { isInQueue, summarise, type Annotation, type AnnotationSummary } from '../annotation/model.js';
import { SessionRecords, type SessionRecord } from '../service/sessions.js';
import { detectCapabilities, type DeliveryIntent, type HostCapabilities } from '../host/capabilities.js';
import { CheckInStore, type InterruptionRecord } from '../service/check-in.js';
import { openInDefaultBrowser } from '../service/browser.js';

export type OpenArtifactInput =
  | { kind: 'saved-html'; path: string }
  | { kind: 'react-vite-app'; url: string; sourceRoot?: string };

export type OpenOptions = {
  baseUrl?: string;
  openBrowser?: boolean;
  capabilities?: Partial<HostCapabilities>;
};

export type OpenedArtifact = {
  sessionId: string;
  reviewUrl: string;
  capability: string;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  reused: boolean;
  browserOpened?: boolean;
};

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type AgentPosition = 'awaiting-you' | 'working' | 'acknowledged' | 'stepped-away';

export type DeliveryChannel = 'held-call' | 'next-check-in';

export type AgentPositionReport = {
  position: AgentPosition;
  sentence: string;
  hostCanHold: boolean;
  queuedDurably: number;
  channel: DeliveryChannel;
  lastCheckedInAt?: string;
  pendingInterruption: boolean;
  pendingInterruptionSince?: string;
};

export type DeliveryResult = {
  pass: Pass;
  channel: DeliveryChannel;
  holding: boolean;
};

export type DeliveryOutcome =
  | { delivered: true; result: DeliveryResult }
  | { delivered: false; intent: 'draft'; reason: string };

export type DeliverySignal = { pass?: Pass; interruption?: InterruptionRecord };

export type CheckInResult = {
  checkedInAt: string;
  since: string | null;
  cursor: string;
  deliveries: Array<{ envelopeId: string; intent: DeliveryIntent; annotationIds: string[]; at: string }>;
  amendments: Array<{ replacedId: string; replacementId: string }>;
  interruption: { interruptionId: string; requestedAt: string; sentence: string } | null;
  annotations: AnnotationSummary[];
};

export type SendResult = {
  pass: Pass;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  channel: DeliveryChannel;
  holding: boolean;
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
  openUrl?: (url: string) => Promise<boolean>;
};

export type ReviewService = {
  listTools(): ToolDescriptor[];
  capabilitiesFor(hostId: string, declared?: Partial<HostCapabilities>): HostCapabilities;
  openArtifact(input: OpenArtifactInput, options?: OpenOptions): Promise<OpenedArtifact>;
  submitEnvelope(envelopeJson: unknown, options?: { host?: string }): Promise<{ envelopeId: string; status: string; duplicate: boolean }>;
  acknowledge(envelopeId: string, agentId: string, annotationId?: string): Promise<{ envelopeId: string; annotationIds: string[] }>;
  getBatchStatus(envelopeId: string): BatchStatus;
  listPasses(): Array<{ passId: string; envelopeId: string; state: string; status: string; annotationIds: string[] }>;
  deliverAnnotations(
    sessionId: string,
    request: { annotationIds: string[]; intent: Exclude<DeliveryIntent, 'draft'>; host?: string }
  ): DeliveryResult;
  sendQueue(sessionId: string, options?: { host?: string; intent?: 'next-pass' | 'draft' }): DeliveryOutcome;
  anotherPass(sessionId: string, passId: string): DeliveryResult;
  amendAnnotation(
    sessionId: string,
    annotationId: string,
    input: { note?: string; host?: string }
  ): { original: Annotation; successor: Annotation; delivery: DeliveryResult };
  requestInterruption(sessionId: string, options?: { host?: string; requestedBy?: string }): InterruptionRecord;
  pendingInterruption(sessionId: string): InterruptionRecord | undefined;
  checkIn(sessionId: string, options?: { cursor?: string; agentId?: string }): CheckInResult;
  mostRecentSessionId(): string | undefined;
  waitForSend(sessionId: string, timeoutMs: number): Promise<Pass | null>;
  waitForDelivery(sessionId: string, timeoutMs: number): Promise<DeliverySignal>;
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
  const openUrl = options.openUrl ?? openInDefaultBrowser;
  const annotations = new AnnotationStore(dataDir);
  const attachments = new AttachmentStore(dataDir);
  const snapshots = new SnapshotStore(dataDir);
  const sessions = new SessionRecords(dataDir);
  const checkIns = new CheckInStore(dataDir);
  const waiters = new Map<string, Array<(signal: DeliverySignal) => void>>();
  let lastSessionId: string | undefined;

  function mostRecentSessionId(): string | undefined {
    return lastSessionId;
  }

  function capabilitiesFor(hostId: string, declared: Partial<HostCapabilities> = {}): HostCapabilities {
    return detectCapabilities(hostId, declared);
  }

  async function openBrowserIfAsked(
    reviewUrl: string,
    openOptions: OpenOptions
  ): Promise<boolean | undefined> {
    if (openOptions.openBrowser !== true) {
      return undefined;
    }
    return await openUrl(reviewUrl);
  }

  async function openArtifact(input: OpenArtifactInput, openOptions: OpenOptions = {}): Promise<OpenedArtifact> {
    const effectiveBase = (openOptions.baseUrl ?? baseUrl).replace(/\/+$/, '');
    const capabilities = detectCapabilities('browser', openOptions.capabilities ?? {});
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
        lastSessionId = existing.sessionId;
        const reviewUrl = `${effectiveBase}/review/${existing.sessionId}?cap=${existing.capability}`;
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
          reused: true,
          browserOpened: await openBrowserIfAsked(reviewUrl, openOptions)
        };
      }
      const displayName = absolute.split('/').pop() ?? absolute;
      const record = sessions.mint({
        sessionId: `session-${randomUUID()}`,
        source: sourceUri,
        kind: 'saved-html',
        artifactId,
        revision,
        displayName,
        capabilities
      });
      lastSessionId = record.sessionId;
      const reviewUrl = `${effectiveBase}/review/${record.sessionId}?cap=${record.capability}`;
      return {
        sessionId: record.sessionId,
        reviewUrl,
        capability: record.capability,
        artifact: { id: artifactId, kind: 'saved-html', revision, displayName },
        reused: false,
        browserOpened: await openBrowserIfAsked(reviewUrl, openOptions)
      };
    }
    const artifactId = stableArtifactId(input.url);
    assertLocalAppUrl(input.url);
    const sourceRoot = input.sourceRoot ? resolve(process.cwd(), input.sourceRoot) : undefined;
    const revision = sourceRoot
      ? computeSourceRootRevision(sourceRoot)
      : await fetchAppRevision(input.url).catch(() =>
          computeRevision(Buffer.from(input.url, 'utf8'), [])
        );
    const existing = sessions.findByArtifactRevision(artifactId, revision);
    if (existing) {
      lastSessionId = existing.sessionId;
      const reviewUrl = `${effectiveBase}/review/${existing.sessionId}?cap=${existing.capability}`;
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
        reused: true,
        browserOpened: await openBrowserIfAsked(reviewUrl, openOptions)
      };
    }
    const record = sessions.mint({
      sessionId: `session-${randomUUID()}`,
      source: input.url,
      kind: 'react-vite-app',
      artifactId,
      revision,
      ...(sourceRoot ? { sourceRoot } : {}),
      displayName: input.url,
      capabilities
    });
    lastSessionId = record.sessionId;
    const reviewUrl = `${effectiveBase}/review/${record.sessionId}?cap=${record.capability}`;
    return {
      sessionId: record.sessionId,
      reviewUrl,
      capability: record.capability,
      artifact: { id: artifactId, kind: 'react-vite-app', revision, displayName: input.url },
      reused: false,
      browserOpened: await openBrowserIfAsked(reviewUrl, openOptions)
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
    const before = annotations.findPassByIdempotencyKey(envelope.delivery.idempotencyKey);
    const host = submitOptions.host ?? 'mcp';
    const pass = annotations.importEnvelope(envelope, host);
    return { envelopeId: pass.envelopeId, status: 'host-accepted', duplicate: before !== undefined };
  }

  async function acknowledge(
    envelopeId: string,
    agentId: string,
    annotationId?: string
  ): Promise<{ envelopeId: string; annotationIds: string[] }> {
    const targets = annotationId
      ? [annotationId]
      : annotations.annotationsOfPass(envelopeId).map((annotation) => annotation.annotationId);
    if (targets.length === 0) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    for (const id of targets) {
      annotations.acknowledge(id, agentId);
    }
    annotations.collectPass(envelopeId);
    const pass = annotations.getPass(envelopeId);
    const session = pass ? sessions.findByArtifact(pass.envelope.artifact.id) : undefined;
    if (session) {
      checkIns.recordContact(session.sessionId);
    }
    return { envelopeId, annotationIds: targets };
  }

  function getBatchStatus(envelopeId: string): BatchStatus {
    const pass = annotations.getPass(envelopeId);
    if (!pass) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    annotations.collectPass(envelopeId);
    const owned = annotations.annotationsOfPass(envelopeId);
    const session = sessions.findByArtifact(pass.envelope.artifact.id);
    if (session) {
      checkIns.recordContact(session.sessionId);
    }
    return {
      envelopeId,
      status: statusOf(owned),
      artifact: pass.envelope.artifact,
      annotations: owned.map(summarise),
      agent: agentPosition(session?.sessionId ?? ''),
      deliveryHistory: owned.flatMap((annotation) =>
        annotation.history
          .filter((event) => event.type === 'delivered' || event.type === 'acknowledged' || event.type === 'verified')
          .map((event) => ({ type: event.type, at: event.at, ...(event.detail ? { detail: event.detail } : {}) }))
      )
    };
  }

  function listPasses(): Array<{ passId: string; envelopeId: string; state: string; status: string; annotationIds: string[] }> {
    return annotations.listPasses().map((pass) => ({
      passId: pass.passId,
      envelopeId: pass.envelopeId,
      state: pass.state,
      status: statusOf(annotations.annotationsOfPass(pass.passId)),
      annotationIds: pass.annotationIds
    }));
  }

  function deliverAnnotations(
    sessionId: string,
    request: { annotationIds: string[]; intent: Exclude<DeliveryIntent, 'draft'>; host?: string }
  ): DeliveryResult {
    const session = requireSession(sessionId);
    if (request.annotationIds.length === 0) {
      throw new Error('A delivery needs at least one Annotation; an empty set has nothing to deliver.');
    }
    const host = request.host ?? 'browser';
    const pass = annotations.markDelivered(request.annotationIds, {
      host,
      intent: request.intent,
      artifact: {
        id: session.artifactId,
        kind: session.kind as 'saved-html' | 'react-vite-app',
        revision: session.adoptedRevision ?? session.revision,
        displayName: session.displayName
      }
    });
    const signal: DeliverySignal = { pass };
    const holding = (waiters.get(sessionId)?.length ?? 0) > 0;
    if (holding) {
      annotations.collectPass(pass.passId);
    }
    resolveWaiters(sessionId, signal);
    return { pass, channel: holding ? 'held-call' : 'next-check-in', holding };
  }

  function anotherPass(sessionId: string, passId: string): DeliveryResult {
    const session = requireSession(sessionId);
    const pass = annotations.anotherPass(passId, {
      host: 'browser',
      artifact: {
        id: session.artifactId,
        kind: session.kind as 'saved-html' | 'react-vite-app',
        revision: session.adoptedRevision ?? session.revision,
        displayName: session.displayName
      }
    });
    const signal: DeliverySignal = { pass };
    const holding = (waiters.get(sessionId)?.length ?? 0) > 0;
    if (holding) {
      annotations.collectPass(pass.passId);
    }
    resolveWaiters(sessionId, signal);
    return { pass, channel: holding ? 'held-call' : 'next-check-in', holding };
  }

  function sendQueue(
    sessionId: string,
    sendOptions: { host?: string; intent?: string } = {}
  ): DeliveryOutcome {
    const intent = sendOptions.intent ?? 'next-pass';
    if (intent !== 'next-pass') {
      return {
        delivered: false,
        intent: 'draft',
        reason: 'Draft stays on this machine: it creates no batch and moves no Annotation out of draft or queued.'
      };
    }
    const session = requireSession(sessionId);
    const queue = annotations.queueOf(session.artifactId);
    if (queue.length === 0) {
      throw new Error('The Annotation Queue is empty; there is nothing to send.');
    }
    const result = deliverAnnotations(sessionId, {
      annotationIds: queue.map((annotation) => annotation.annotationId),
      intent,
      ...(sendOptions.host ? { host: sendOptions.host } : {})
    });
    return { delivered: true, result };
  }

  function amendAnnotation(
    sessionId: string,
    annotationId: string,
    input: { note?: string; host?: string }
  ): { original: Annotation; successor: Annotation; delivery: DeliveryResult } {
    requireSession(sessionId);
    const successor = annotations.amend(annotationId, input.note !== undefined ? { note: input.note } : {});
    const original = annotations.get(annotationId)!;
    const delivery = deliverAnnotations(sessionId, {
      annotationIds: [successor.annotationId],
      intent: 'steering',
      ...(input.host ? { host: input.host } : {})
    });
    return { original, successor: annotations.get(successor.annotationId)!, delivery };
  }

  function requestInterruption(
    sessionId: string,
    options: { host?: string; requestedBy?: string } = {}
  ): InterruptionRecord {
    requireSession(sessionId);
    const record = checkIns.requestInterruption(sessionId, options.requestedBy ? { requestedBy: options.requestedBy } : {});
    resolveWaiters(sessionId, { interruption: record });
    return record;
  }

  function pendingInterruption(sessionId: string): InterruptionRecord | undefined {
    return checkIns.pendingInterruption(sessionId);
  }

  function checkIn(sessionId: string, options: { cursor?: string; agentId?: string } = {}): CheckInResult {
    const session = requireSession(sessionId);
    const checkedInAt = new Date().toISOString();
    const previous = options.cursor ?? null;
    const since = positionOf(previous);
    const passes = annotations
      .listPasses()
      .filter((pass) => pass.artifactId === session.artifactId)
      .filter((pass) => since === null || pass.sequence > since);
    for (const pass of passes) {
      annotations.collectPass(pass.passId);
    }
    const interruption = checkIns.pendingInterruption(sessionId);
    if (interruption) {
      checkIns.collectInterruption(sessionId, interruption.interruptionId);
    }
    checkIns.recordContact(sessionId, checkedInAt);
    const owned = annotations
      .listArtifact(session.artifactId)
      .filter((annotation) => !isInQueue(annotation.state));
    const amendments = annotations
      .listArtifact(session.artifactId)
      .filter((annotation) => annotation.replaces !== undefined)
      .filter(
        (annotation) =>
          since === null ||
          annotation.history.some(
            (event) => event.type === 'amended' && (event.sequence ?? 0) > since
          )
      )
      .map((annotation) => ({ replacedId: annotation.replaces!, replacementId: annotation.annotationId }));
    return {
      checkedInAt,
      since: previous,
      cursor: String(annotations.sequenceNow()),
      deliveries: passes.map((pass) => ({
        envelopeId: pass.envelopeId,
        intent: pass.intent,
        annotationIds: pass.annotationIds,
        at: pass.at
      })),
      amendments,
      interruption: interruption
        ? {
            interruptionId: interruption.interruptionId,
            requestedAt: interruption.requestedAt,
            sentence: 'The Builder-Reviewer asked you to stop. This is a request, not a fact: no work was stopped for them.'
          }
        : null,
      annotations: owned.map(summarise)
    };
  }

  function waitForDelivery(sessionId: string, timeout: number): Promise<DeliverySignal> {
    return new Promise((resolvePromise) => {
      const timer = setTimeout(() => {
        removeWaiter(sessionId, entry);
        resolvePromise({});
      }, timeout);
      const entry = (signal: DeliverySignal): void => {
        clearTimeout(timer);
        resolvePromise(signal);
      };
      const list = waiters.get(sessionId) ?? [];
      list.push(entry);
      waiters.set(sessionId, list);
    });
  }

  async function waitForSend(sessionId: string, timeout: number): Promise<Pass | null> {
    const signal = await waitForDelivery(sessionId, timeout);
    return signal.pass ?? null;
  }

  function resolveWaiters(sessionId: string, signal: DeliverySignal): boolean {
    const list = waiters.get(sessionId) ?? [];
    if (list.length === 0) {
      return false;
    }
    waiters.delete(sessionId);
    for (const entry of list) {
      entry(signal);
    }
    return true;
  }

  function removeWaiter(sessionId: string, entry: (signal: DeliverySignal) => void): void {
    const list = (waiters.get(sessionId) ?? []).filter((candidate) => candidate !== entry);
    if (list.length > 0) {
      waiters.set(sessionId, list);
    } else {
      waiters.delete(sessionId);
    }
  }

  function noteAgentContact(sessionId: string): void {
    if (sessionId) {
      checkIns.recordContact(sessionId);
    }
  }

  function agentPosition(sessionId: string): AgentPositionReport {
    const session = sessionId ? sessions.get(sessionId) : undefined;
    const queue = session ? annotations.queueOf(session.artifactId).length : 0;
    const waiting = sessionId ? (waiters.get(sessionId)?.length ?? 0) > 0 : false;
    const channel: DeliveryChannel = waiting ? 'held-call' : 'next-check-in';
    const lastCheckedInAt = sessionId ? checkIns.lastContact(sessionId) : undefined;
    const interruption = sessionId ? checkIns.pendingInterruption(sessionId) : undefined;
    const base = {
      channel,
      ...(lastCheckedInAt ? { lastCheckedInAt } : {}),
      pendingInterruption: interruption !== undefined,
      ...(interruption ? { pendingInterruptionSince: interruption.requestedAt } : {})
    };
    if (waiting) {
      return {
        position: 'awaiting-you',
        sentence: 'Your agent is holding the call and waiting for you right now. Sending is urgent.',
        hostCanHold: true,
        queuedDurably: queue,
        ...base
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
        queuedDurably: queue,
        ...base
      };
    }
    const recentlyConnected = lastCheckedInAt ? Date.now() - Date.parse(lastCheckedInAt) < 60_000 : false;
    if (recentlyConnected && delivered.length > 0) {
      return {
        position: 'working',
        sentence: 'Your agent is working. It is not waiting on this call; it reads new direction at its next Check-In.',
        hostCanHold: false,
        queuedDurably: queue,
        ...base
      };
    }
    const queuedSentence =
      queue > 0
        ? ` ${queue} Annotation${queue === 1 ? '' : 's'} are queued durably on this machine until your agent checks in.`
        : ' Nothing is waiting on your agent.';
    return {
      position: 'stepped-away',
      sentence: `Your agent has stepped away and is not holding this call.${queuedSentence}`,
      hostCanHold: false,
      queuedDurably: queue,
      ...base
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
          'Open the Visual Direction Loop for an agent-produced web interface and wait for the Builder-Reviewer. Use this when pointing beats prose: pointing at elements, dragging across exact words, boxing an area, and sending grounded Annotations. Works with a saved HTML artifact (kind "saved-html" with a filesystem path) or a running local React/Vite app (kind "react-vite-app" with a localhost URL). The default browser opens automatically on the machine running the service. When the human sends, this call returns one batch carrying each Annotation with its own identity, target evidence and note. Steering and interruption are seen at a Check-In, not mid-step: call check_in between your own steps to read new direction, an amendment, or a stop request. If this call returns without a batch, the Annotations stay queued durably and check_in reads them.',
        inputSchema: {
          type: 'object',
          required: ['kind'],
          properties: {
            kind: { type: 'string', enum: ['saved-html', 'react-vite-app'] },
            path: { type: 'string', description: 'Filesystem path to the saved HTML artifact.' },
            url: { type: 'string', description: 'Localhost URL of the running React/Vite application.' },
            sourceRoot: {
              type: 'string',
              description: 'Filesystem path to the application source root, so its revision can be derived from files without a build step. Omit to derive the revision from the served document instead.'
            },
            waitMs: {
              type: 'number',
              description: 'How long to hold the call for the human, in milliseconds. Omit for the default window.'
            },
            capabilities: {
              type: 'object',
              description: 'What this host can do. Omit to be treated as a browsing host with polling updates.',
              properties: {
                embeddedUI: { type: 'boolean', description: 'The host renders the review surface itself.' },
                subscriptions: { type: 'boolean', description: 'The host can subscribe to live updates.' }
              }
            }
          }
        }
      },
      {
        name: 'check_in',
        description:
          'Check in between your own steps to read new direction. Returns everything that arrived since your last check-in: newly delivered Annotations with their delivery intent, a Replacement that replaced something, a pending stop request, and the current state of everything you were given before. This is the Check-In convention: the Builder-Reviewer can amend or interrupt work while you are busy, and it is seen here rather than mid-step. Call it without an envelopeId; there is no push channel and no wake mechanism. It also records that you checked in, which is what lets the surface say when the agent last checked in.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'The session to check in with. Omit to check the most recently opened session.' },
            cursor: { type: 'string', description: 'The cursor returned by your previous check-in. Omit to read everything not yet collected. A cursor this build does not recognise reads everything rather than less, so direction is never dropped.' },
            agentId: { type: 'string', description: 'Identifies the implementing agent.' }
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
    capabilitiesFor,
    openArtifact,
    submitEnvelope,
    acknowledge,
    getBatchStatus,
    listPasses,
    deliverAnnotations,
    sendQueue,
    amendAnnotation,
    requestInterruption,
    pendingInterruption,
    checkIn,
    anotherPass,
    mostRecentSessionId,
    waitForSend,
    waitForDelivery,
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

function positionOf(cursor: string | null): number | null {
  if (cursor === null) {
    return null;
  }
  const position = Number(cursor);
  return Number.isInteger(position) && position >= 0 ? position : null;
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
    throw new Error(`A proxied application needs a local http(s) URL, got: ${url}`);
  }
  const localHost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !localHost) {
    throw new Error(`A proxied application only opens loopback development origins, refused: ${url}`);
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
