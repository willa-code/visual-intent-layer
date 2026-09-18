import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
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
      'check_in',
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
    expect(service.annotations.getPass(envelope.envelopeId)?.collectedAt).toEqual(expect.any(String));
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
    expect(sent.delivered).toBe(true);
    if (!sent.delivered) {
      return;
    }
    expect(sent.result.pass.annotationIds).toEqual([annotation.annotationId]);
    expect(sent.result.pass.intent).toBe('next-pass');
    expect(sent.result.channel).toBe('held-call');
    const woken = await waiting;
    expect(woken?.envelopeId).toBe(sent.result.pass.envelopeId);
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
function draftTarget(): Record<string, unknown> {
  return {
    targetId: 't-1',
    kind: 'element',
    renderedGrounding: { selectors: ['main'], boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
    provenanceConfidence: 'unavailable'
  };
}

function seed(service: ReviewService, opened: { artifact: { id: string; revision: string } }, note: string) {
  const annotation = service.annotations.createDraft({
    artifactId: opened.artifact.id,
    writtenRevision: opened.artifact.revision,
    targets: [draftTarget() as never]
  });
  service.annotations.update(annotation.annotationId, { note });
  return annotation;
}

describe('delivery by a named set', () => {
  it('refuses an empty set with a stated reason', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    expect(() => service.deliverAnnotations(opened.sessionId, { annotationIds: [], intent: 'next-pass' })).toThrow(/empty set/);
  });

  it('sends the queue as one caller of the named path', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'one');
    const sent = service.sendQueue(opened.sessionId, { host: 'browser' });
    expect(sent.delivered).toBe(true);
    if (!sent.delivered) return;
    expect(sent.result.pass.annotationIds).toEqual([annotation.annotationId]);
  });

  it('a draft intent creates no Pass and moves nothing out of draft or queued', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'stays local');
    const outcome = service.sendQueue(opened.sessionId, { host: 'browser', intent: 'draft' });
    expect(outcome.delivered).toBe(false);
    expect(service.listPasses()).toHaveLength(0);
    expect(service.annotations.get(annotation.annotationId)?.state).toBe('draft');
  });

  it('is idempotent: the same set and intent produce one Pass', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'once');
    const first = service.deliverAnnotations(opened.sessionId, { annotationIds: [annotation.annotationId], intent: 'next-pass' });
    const second = service.deliverAnnotations(opened.sessionId, { annotationIds: [annotation.annotationId], intent: 'next-pass' });
    expect(second.pass.envelopeId).toBe(first.pass.envelopeId);
    expect(service.listPasses()).toHaveLength(1);
  });

  it('resolves a held call for an amendment or an interruption', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'amend me');
    service.annotations.queue(annotation.annotationId);
    service.deliverAnnotations(opened.sessionId, { annotationIds: [annotation.annotationId], intent: 'next-pass' });

    const held = service.waitForSend(opened.sessionId, 2000);
    service.requestInterruption(opened.sessionId);
    expect(await held).toBeNull();
  });
});

describe('amending something sent', () => {
  it('replaces the original, records the Replacement, and keeps the original intact', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const original = seed(service, opened, 'first wording');
    service.deliverAnnotations(opened.sessionId, { annotationIds: [original.annotationId], intent: 'next-pass' });

    const amended = service.amendAnnotation(opened.sessionId, original.annotationId, { note: 'clearer wording' });
    expect(amended.original.state).toBe('replaced');
    expect(amended.original.replacedBy).toBe(amended.successor.annotationId);
    expect(amended.original.note).toBe('first wording');
    expect(amended.successor.replaces).toBe(original.annotationId);
    expect(amended.successor.note).toBe('clearer wording');
    expect(amended.successor.state).toBe('delivered');
    expect(amended.delivery.pass.intent).toBe('steering');
    expect(amended.delivery.pass.annotationIds).toEqual([amended.successor.annotationId]);
  });

  it('refuses to edit a delivered Annotation in place', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'delivered');
    service.deliverAnnotations(opened.sessionId, { annotationIds: [annotation.annotationId], intent: 'next-pass' });
    expect(() => service.annotations.update(annotation.annotationId, { note: 'rewritten' })).toThrow(/cannot be edited in place/);
  });

  it('offers amend only on a delivered Annotation that is not yet verified', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'draft');
    expect(() => service.amendAnnotation(opened.sessionId, annotation.annotationId, { note: 'too early' })).toThrow(/cannot be amended/);
  });
});

describe('check-in and interruption', () => {
  it('returns new direction since a cursor without an envelopeId and records contact', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'read at check-in');
    service.deliverAnnotations(opened.sessionId, { annotationIds: [annotation.annotationId], intent: 'next-pass' });

    const first = service.checkIn(opened.sessionId);
    expect(first.deliveries).toHaveLength(1);
    expect(first.deliveries[0]!.intent).toBe('next-pass');
    expect(first.annotations.map((entry) => entry.annotationId)).toContain(annotation.annotationId);
    expect(service.agentPosition(opened.sessionId).lastCheckedInAt).toBe(first.checkedInAt);

    const second = service.checkIn(opened.sessionId, { cursor: first.cursor });
    expect(second.deliveries).toHaveLength(0);
  });

  it('returns an amendment as new direction', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const original = seed(service, opened, 'before');
    service.deliverAnnotations(opened.sessionId, { annotationIds: [original.annotationId], intent: 'next-pass' });
    const cursor = service.checkIn(opened.sessionId).cursor;
    const amended = service.amendAnnotation(opened.sessionId, original.annotationId, { note: 'after' });
    const next = service.checkIn(opened.sessionId, { cursor });
    expect(next.deliveries.map((entry) => entry.intent)).toContain('steering');
    expect(next.amendments).toEqual(
      expect.arrayContaining([{ replacedId: original.annotationId, replacementId: amended.successor.annotationId }])
    );
  });

  it('keeps a replacement delivered in the same millisecond as the previous check-in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const service = setup();
      const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
      const original = seed(service, opened, 'before');
      service.deliverAnnotations(opened.sessionId, {
        annotationIds: [original.annotationId],
        intent: 'next-pass'
      });
      const cursor = service.checkIn(opened.sessionId).cursor;
      const amended = service.amendAnnotation(opened.sessionId, original.annotationId, { note: 'after' });

      const next = service.checkIn(opened.sessionId, { cursor });

      expect(next.since).toBe(cursor);
      expect(next.deliveries.map((entry) => entry.intent)).toContain('steering');
      expect(next.amendments).toEqual(
        expect.arrayContaining([
          { replacedId: original.annotationId, replacementId: amended.successor.annotationId }
        ])
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads everything rather than dropping direction when the cursor is from an older build', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const annotation = seed(service, opened, 'written before the cursor was a position');
    service.deliverAnnotations(opened.sessionId, {
      annotationIds: [annotation.annotationId],
      intent: 'next-pass'
    });
    const first = service.checkIn(opened.sessionId);

    const reread = service.checkIn(opened.sessionId, { cursor: first.checkedInAt });

    expect(reread.deliveries).toHaveLength(1);
  });

  it('carries a stop request session-scoped, never in an envelope', async () => {
    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    service.requestInterruption(opened.sessionId, { requestedBy: 'builder-reviewer' });
    expect(service.listPasses()).toHaveLength(0);
    const result = service.checkIn(opened.sessionId);
    expect(result.interruption?.interruptionId).toMatch(/^int-/);
    expect(result.interruption?.sentence).toMatch(/request, not a fact/);
    const again = service.checkIn(opened.sessionId);
    expect(again.interruption).toBeNull();
  });

  it('keeps contact across a service restart', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'vil-mcp-checkin-'));
    const service = createReviewService({ dataDir });
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    const checked = service.checkIn(opened.sessionId);
    const restarted = createReviewService({ dataDir });
    expect(restarted.agentPosition(opened.sessionId).lastCheckedInAt).toBe(checked.checkedInAt);
  });
});

describe('an interruption is never carried in an envelope', () => {
  it('has no envelope to build, and the envelope still refuses zero Annotations', async () => {
    const { buildBatchEnvelope } = await import('../annotation/envelope.js');
    expect(() =>
      buildBatchEnvelope({
        artifact: { id: 'artifact-1', kind: 'saved-html', revision: 'blake3:' + 'a'.repeat(64) },
        annotations: [],
        intent: 'review-interruption'
      })
    ).toThrow(/at least one Annotation/);

    const service = setup();
    const opened = await service.openArtifact({ kind: 'saved-html', path: 'fixtures/gallery.html' });
    service.requestInterruption(opened.sessionId);
    expect(service.listPasses()).toHaveLength(0);
  });
});
