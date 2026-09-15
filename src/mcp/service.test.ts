import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { createReviewService, type ReviewService } from './service.js';
import { computeRevision } from '../artifact/revision.js';

function setup(): ReviewService {
  return createReviewService({ dataDir: mkdtempSync(join(tmpdir(), 'vil-mcp-')) });
}

describe('entry tool', () => {
  it('opens a saved HTML artifact and returns session, review URL, and revision identity', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    expect(opened.sessionId).toMatch(/^session-/);
    expect(opened.reviewUrl).toContain('/review/');
    expect(opened.artifact.id).toMatch(/^artifact-/);
    expect(opened.artifact.revision).toMatch(/^blake3:[0-9a-f]{64}$/);
  });

  it('reuses the open session for the same artifact revision', async () => {
    const service = setup();
    const first = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const second = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.reviewUrl).toBe(first.reviewUrl);
    expect(second.reused).toBe(true);
  });

  it('describes itself well enough for explicit invocation without a Skill', () => {
    const service = setup();
    const entry = service.listTools().find((tool) => tool.name === 'open_visual_review');
    expect(entry).toBeDefined();
    expect(entry!.description).toMatch(/Annotation/);
    expect(entry!.description).toMatch(/browser/i);
    expect(entry!.description.length).toBeGreaterThan(120);
  });

  it('keeps the model-visible tool surface small', () => {
    expect(setup().listTools().map((tool) => tool.name)).toEqual([
      'open_visual_review',
      'get_intent_status',
      'acknowledge_intent'
    ]);
  });
});

describe('batch delivery', () => {
  it('accepts a batch of Annotations and returns each identity', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    const submitted = await service.submitEnvelope(envelope);
    expect(submitted.envelopeId).toBe(envelope.envelopeId);
    expect(submitted.status).toBe('host-accepted');
    const status = service.getBatchStatus(envelope.envelopeId);
    expect(status.annotations.map((annotation) => annotation.annotationId)).toEqual(['ann-01', 'ann-02']);
  });

  it('rejects malformed envelopes with actionable errors', async () => {
    const service = setup();
    await expect(service.submitEnvelope({ schemaVersion: '0.2', envelopeId: 'x' })).rejects.toThrow(/invalid/i);
  });

  it('delivers repeatedly without silent duplicates', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    await service.submitEnvelope(envelope);
    const again = await service.submitEnvelope(structuredClone(envelope));
    expect(again.duplicate).toBe(true);
    expect(service.getBatchStatus(envelope.envelopeId).deliveryHistory.filter((event) => event.type === 'delivered')).toHaveLength(2);
  });

  it('acknowledges per Annotation without verifying', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    await service.submitEnvelope(envelope);
    await service.acknowledge(envelope.envelopeId, 'agent-1', 'ann-01');
    const status = service.getBatchStatus(envelope.envelopeId);
    expect(status.status).toBe('agent-acknowledged');
    expect(status.annotations.find((annotation) => annotation.annotationId === 'ann-01')?.state).toBe('acknowledged');
    expect(status.annotations.find((annotation) => annotation.annotationId === 'ann-02')?.state).toBe('delivered');
  });
});

describe('browser send and agent position', () => {
  it('sends the queue as one batch and wakes a waiting agent', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = service.annotations.createDraft({
      artifactId: opened.artifact.id,
      writtenRevision: opened.artifact.revision,
      targets: [
        {
          targetId: 't-1',
          kind: 'element',
          renderedGrounding: { selectors: ['main'], boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
          provenanceConfidence: 'unavailable'
        }
      ]
    });
    service.annotations.update(annotation.annotationId, { note: 'Fix the header.' });

    const waiting = service.waitForSend(opened.sessionId, 2000);
    expect(service.agentPosition(opened.sessionId).position).toBe('awaiting-you');
    const sent = service.sendQueue(opened.sessionId, { host: 'browser' });
    expect(sent.batch.annotationIds).toEqual([annotation.annotationId]);
    const woken = await waiting;
    expect(woken?.envelopeId).toBe(sent.batch.envelopeId);
    expect(woken?.envelope.annotations[0]?.note).toBe('Fix the header.');
  });

  it('states the agent has stepped away with durable queue when nothing is waiting', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    service.annotations.createDraft({
      artifactId: opened.artifact.id,
      writtenRevision: opened.artifact.revision,
      targets: [
        {
          targetId: 't-1',
          kind: 'element',
          renderedGrounding: { selectors: ['main'], boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
          provenanceConfidence: 'unavailable'
        }
      ]
    });
    const position = service.agentPosition(opened.sessionId);
    expect(position.position).toBe('stepped-away');
    expect(position.sentence).toMatch(/queued durably/);
    expect(position.queuedDurably).toBe(1);
  });

  it('refuses to send an empty queue', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    expect(() => service.sendQueue(opened.sessionId)).toThrow(/nothing to send/i);
  });

  it('refuses a non-loopback application origin', async () => {
    const service = setup();
    await expect(service.openArtifact({ kind: 'react-vite-app', url: 'https://prod.example.com/' })).rejects.toThrow(/loopback/i);
  });
});

describe('attachments', () => {
  it('refuses a disallowed type before reading bytes', () => {
    const service = setup();
    expect(service.attachments.refuseReason('application/pdf', 10)).toMatch(/not an allowed/i);
  });

  it('refuses an oversized file before reading bytes', () => {
    const service = setup();
    expect(service.attachments.refuseReason('image/png', 10 * 1024 * 1024)).toMatch(/refused unread/i);
  });

  it('stores bytes content-addressed rather than by a supplied name', () => {
    const service = setup();
    const record = service.attachments.put(Buffer.from('png-bytes'), 'image/png', 'evil/../../name.png');
    expect(record.attachmentId).toMatch(/^att-[0-9a-f]{32}$/);
    expect(service.attachments.read(record.attachmentId)?.bytes.toString('utf8')).toBe('png-bytes');
  });
});

describe('saved HTML fidelity', () => {
  it('reveals the opened revision is snapshotted for before/after comparison', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const bytes = readFileSync('fixtures/gallery.html');
    expect(opened.artifact.revision).toBe(computeRevision(bytes, []));
    expect(service.snapshots.read(opened.artifact.id, opened.artifact.revision)).toBeUndefined();
  });
});