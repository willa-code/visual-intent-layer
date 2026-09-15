import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { createReviewService, type ReviewService } from './service.js';

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

  it('describes itself well enough for explicit invocation without a Skill', () => {
    const service = setup();
    const tools = service.listTools();
    const entry = tools.find((tool) => tool.name === 'open_visual_review');
    expect(entry).toBeDefined();
    expect(entry!.description).toMatch(/visual|review|select/i);
    expect(entry!.description.length).toBeGreaterThan(120);
    expect(entry!.inputSchema).toBeDefined();
  });
});

describe('envelope delivery tools', () => {
  it('submits written direction as one versioned envelope and reports host acceptance', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    const submitted = await service.submitIntent(envelope);
    expect(submitted.envelopeId).toBe(envelope.envelopeId);
    expect(submitted.status).toBe('host-accepted');
    expect(submitted.schemaVersion).toBe('0.1');
  });

  it('rejects malformed envelopes with actionable errors', async () => {
    const service = setup();
    const broken = { schemaVersion: '0.1', envelopeId: 'x' };
    await expect(service.submitIntent(broken)).rejects.toThrow(/target|artifact|invalid/i);
  });

  it('delivers repeatedly without silent duplicates', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    await service.submitIntent(envelope);
    const again = await service.submitIntent(structuredClone(envelope));
    expect(again.duplicate).toBe(true);
    expect(service.getIntent(envelope.envelopeId).deliveryHistory.filter((e) => e.type === 'delivered')).toHaveLength(1);
  });

  it('holds steering as next-pass on hosts without steering support', async () => {
    const service = setup();
    const envelope = {
      ...structuredClone(representativeEnvelope),
      envelopeId: 'env-steering-1',
      delivery: { ...representativeEnvelope.delivery, intent: 'steering', idempotencyKey: 'idem-steering-1' }
    };
    const submitted = await service.submitIntent(envelope, { host: 'pi' });
    expect(submitted.status).toBe('queued-local');
    expect(submitted.delivery.label).toMatch(/will not be interrupted/);
  });

  it('acknowledges without verifying', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    await service.submitIntent(envelope);
    const acknowledged = await service.acknowledgeIntent(envelope.envelopeId, 'agent-1');
    expect(acknowledged.status).toBe('agent-acknowledged');
    expect(acknowledged.status).not.toBe('verified');
  });

  it('exposes intent status with targets, evidence, revision, and uncertainty', async () => {
    const service = setup();
    const envelope = structuredClone(representativeEnvelope);
    await service.submitIntent(envelope);
    const status = service.getIntent(envelope.envelopeId);
    expect(status.artifact.revision).toBe(envelope.artifact.revision);
    expect(status.targets).toHaveLength(2);
    expect(status.confidence?.level).toBe('unavailable');
  });
});
