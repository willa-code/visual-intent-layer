import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { computeRevision, stableArtifactId } from '../artifact/revision.js';
import { validateEnvelope, type Envelope } from '../envelope/validate.js';
import { LifecycleStore, type EnvelopeRecord } from '../lifecycle/store.js';
import { SessionRecords } from '../service/sessions.js';
import { deliveryPlan, detectCapabilities, type DeliveryPlan } from '../host/capabilities.js';

export type OpenArtifactInput =
  | { kind: 'saved-html'; path: string }
  | { kind: 'react-vite-app'; url: string };

export type OpenedArtifact = {
  sessionId: string;
  reviewUrl: string;
  capability: string;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  mode: 'explore';
};

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type SubmitResult = {
  envelopeId: string;
  status: string;
  schemaVersion: string;
  duplicate: boolean;
  reviewUrl: string;
  delivery: DeliveryPlan;
};

export type IntentStatus = {
  envelopeId: string;
  status: string;
  artifact: { id: string; kind: string; revision: string };
  targets: Envelope['targets'];
  relationships: Envelope['relationships'];
  confidence: Envelope['confidence'];
  resultingRevisions: string[];
  resolutions: EnvelopeRecord['resolutions'];
  deliveryHistory: EnvelopeRecord['deliveryHistory'];
};

export type ReviewServiceOptions = {
  dataDir: string;
  reviewBaseUrl?: string;
};

export type ReviewService = {
  listTools(): ToolDescriptor[];
  openArtifact(input: OpenArtifactInput, baseUrlOverride?: string): Promise<OpenedArtifact>;
  submitIntent(envelopeJson: unknown, options?: { host?: string }): Promise<SubmitResult>;
  acknowledgeIntent(envelopeId: string, agentId: string): Promise<{ envelopeId: string; status: string }>;
  getIntent(envelopeId: string): IntentStatus;
  listIntents(): Array<{ envelopeId: string; status: string }>;
  store: LifecycleStore;
};

type Session = {
  sessionId: string;
  artifactId: string;
  artifactKind: string;
  revision: string;
  source: string;
  createdAt: string;
};

export function createReviewService(options: ReviewServiceOptions): ReviewService {
  const baseUrl = (options.reviewBaseUrl ?? 'http://127.0.0.1:3742').replace(/\/+$/, '');
  const store = new LifecycleStore(options.dataDir);
  const sessionRecords = new SessionRecords(options.dataDir);
  const sessionsFile = join(options.dataDir, 'sessions.json');
  mkdirSync(options.dataDir, { recursive: true });

  function readSessions(): Record<string, Session> {
    if (!existsSync(sessionsFile)) {
      return {};
    }
    return JSON.parse(readFileSync(sessionsFile, 'utf8')) as Record<string, Session>;
  }

  function writeSessions(sessions: Record<string, Session>): void {
    const tmp = `${sessionsFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(sessions, null, 2), 'utf8');
    renameSync(tmp, sessionsFile);
  }

  async function openArtifact(input: OpenArtifactInput, baseUrlOverride?: string): Promise<OpenedArtifact> {
    const effectiveBase = (baseUrlOverride ?? baseUrl).replace(/\/+$/, '');
    if (input.kind === 'saved-html') {
      const absolute = resolve(process.cwd(), input.path);
      if (!existsSync(absolute)) {
        throw new Error(`Artifact not found: ${input.path}`);
      }
      const bytes = readFileSync(absolute);
      const sourceUri = `file://${absolute}`;
      const artifactId = stableArtifactId(sourceUri);
      const revision = computeRevision(bytes, []);
      const sessionId = `session-${randomUUID()}`;
      const sessions = readSessions();
      sessions[sessionId] = {
        sessionId,
        artifactId,
        artifactKind: 'saved-html',
        revision,
        source: sourceUri,
        createdAt: new Date().toISOString()
      };
      writeSessions(sessions);
      const displayName = absolute.split('/').pop() ?? absolute;
      const record = sessionRecords.mint({
        sessionId,
        source: sourceUri,
        kind: 'saved-html',
        artifactId,
        revision,
        displayName
      });
      return {
        sessionId,
        reviewUrl: `${effectiveBase}/review/${sessionId}?cap=${record.capability}`,
        capability: record.capability,
        artifact: { id: artifactId, kind: 'saved-html', revision, displayName },
        mode: 'explore'
      };
    }
    const artifactId = stableArtifactId(input.url);
    const sessionId = `session-${randomUUID()}`;
    const sessions = readSessions();
    sessions[sessionId] = {
      sessionId,
      artifactId,
      artifactKind: 'react-vite-app',
      revision: computeRevision(Buffer.from(input.url, 'utf8'), []),
      source: input.url,
      createdAt: new Date().toISOString()
    };
    writeSessions(sessions);
    const appRecord = sessionRecords.mint({
      sessionId,
      source: input.url,
      kind: 'react-vite-app',
      artifactId,
      revision: sessions[sessionId]!.revision,
      displayName: input.url
    });
    return {
      sessionId,
      reviewUrl: `${effectiveBase}/review/${sessionId}?cap=${appRecord.capability}`,
      capability: appRecord.capability,
      artifact: {
        id: artifactId,
        kind: 'react-vite-app',
        revision: sessions[sessionId]!.revision,
        displayName: input.url
      },
      mode: 'explore'
    };
  }

  async function submitIntent(envelopeJson: unknown, options: { host?: string } = {}): Promise<SubmitResult> {
    const result = validateEnvelope(envelopeJson);
    if (!result.ok) {
      throw new Error(`Invalid Visual Intent Envelope: ${result.errors.join('; ')}`);
    }
    const envelope = result.value;
    const key = envelope.delivery.idempotencyKey;
    const before = store.list().find((record) => record.idempotencyKey === key);
    const caps = detectCapabilities(options.host ?? 'pi');
    const plan = deliveryPlan(caps, envelope.delivery.intent);
    const heldAsNextPass =
      envelope.delivery.intent === 'steering' && plan.strategy === 'queue-local';
    const heldAsDraft =
      envelope.delivery.intent === 'draft' ||
      (envelope.delivery.intent === 'review-interruption' && plan.strategy === 'draft-only');
    const record = heldAsNextPass
      ? store.queueNextPass(envelope)
      : heldAsDraft
        ? store.saveDraft(envelope)
        : store.deliver(envelope, options.host ?? 'mcp');
    return {
      envelopeId: record.envelopeId,
      status: record.status,
      schemaVersion: envelope.schemaVersion,
      duplicate: before !== undefined,
      reviewUrl: `${baseUrl}/intent/${record.envelopeId}`,
      delivery: plan
    };
  }

  async function acknowledgeIntent(
    envelopeId: string,
    agentId: string
  ): Promise<{ envelopeId: string; status: string }> {
    const record = store.acknowledge(envelopeId, agentId);
    return { envelopeId: record.envelopeId, status: record.status };
  }

  function getIntent(envelopeId: string): IntentStatus {
    const record = store.get(envelopeId);
    if (!record) {
      throw new Error(`Unknown envelope ${envelopeId}`);
    }
    return {
      envelopeId: record.envelopeId,
      status: record.status,
      artifact: {
        id: record.envelope.artifact.id,
        kind: record.envelope.artifact.kind,
        revision: record.envelope.artifact.revision
      },
      targets: record.envelope.targets,
      relationships: record.envelope.relationships ?? [],
      confidence: record.envelope.confidence,
      resultingRevisions: record.resultingRevisions,
      resolutions: record.resolutions,
      deliveryHistory: record.deliveryHistory
    };
  }

  function listIntents(): Array<{ envelopeId: string; status: string }> {
    return store.list().map((record) => ({ envelopeId: record.envelopeId, status: record.status }));
  }

  function listTools(): ToolDescriptor[] {
    return [
      {
        name: 'open_visual_review',
        description:
          'Open the Visual Direction Loop for an agent-produced web interface. Use this when the user wants to point at something visible instead of describing its location in prose: selecting elements, exact text, or regions, relating multiple targets, and sending grounded direction. Works with a saved HTML artifact (kind "saved-html" with a filesystem path) or a running local React/Vite app (kind "react-vite-app" with a localhost URL). Returns a review URL for the Builder-Reviewer plus artifact identity and content-addressed revision. The human selects targets and submits; the resulting Visual Intent Envelope arrives through submit_visual_intent.',
        inputSchema: {
          type: 'object',
          required: ['kind'],
          properties: {
            kind: { type: 'string', enum: ['saved-html', 'react-vite-app'] },
            path: { type: 'string', description: 'Filesystem path to the saved HTML artifact.' },
            url: { type: 'string', description: 'Localhost URL of the running React/Vite application.' }
          }
        }
      },
      {
        name: 'submit_visual_intent',
        description:
          'Submit a Visual Intent Envelope carrying visually grounded direction: artifact identity and revision, target evidence, desired transformation, relationships, and uncertainty. The envelope is validated against the versioned schema and delivery is idempotent on the idempotency key, so retries never create silent duplicates. Returns host acceptance, which confirms receipt only: implementation and human verification happen later.',
        inputSchema: {
          type: 'object',
          required: ['envelope'],
          properties: {
            envelope: { type: 'object', description: 'A Visual Intent Envelope conforming to schema version 0.1.' }
          }
        }
      },
      {
        name: 'get_intent_status',
        description:
          'Read the lifecycle state of one envelope: locally queued, host-accepted, agent-acknowledged, source-modified, or human-verified, plus target re-resolutions against newer revisions. Acknowledgement and source changes never count as verification.',
        inputSchema: {
          type: 'object',
          required: ['envelopeId'],
          properties: { envelopeId: { type: 'string' } }
        }
      },
      {
        name: 'acknowledge_intent',
        description:
          'Acknowledge receipt of an envelope as the implementing agent. Acknowledgement is visible to the Builder-Reviewer but never completes the intent; only the human can verify.',
        inputSchema: {
          type: 'object',
          required: ['envelopeId', 'agentId'],
          properties: { envelopeId: { type: 'string' }, agentId: { type: 'string' } }
        }
      }
    ];
  }

  return { listTools, openArtifact, submitIntent, acknowledgeIntent, getIntent, listIntents, store };
}
