import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { LifecycleStore } from './store.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'vil-lifecycle-'));
}

describe('delivery lifecycle', () => {
  it('saves Draft Intent with no agent-side effect', () => {
    const store = new LifecycleStore(tempDir());
    const record = store.saveDraft(structuredClone(representativeEnvelope));
    expect(record.status).toBe('draft');
    expect(record.deliveryHistory.some((event) => event.type === 'delivered')).toBe(false);
  });

  it('delivers the same envelope idempotently', () => {
    const store = new LifecycleStore(tempDir());
    const envelope = structuredClone(representativeEnvelope);
    const first = store.deliver(envelope, 'test-host');
    const second = store.deliver(structuredClone(envelope), 'test-host');
    expect(first.envelopeId).toBe(second.envelopeId);
    expect(second.deliveryHistory).toHaveLength(1);
    expect(store.list().filter((r) => r.envelopeId === first.envelopeId)).toHaveLength(1);
  });

  it('distinguishes host acceptance from agent acknowledgement', () => {
    const store = new LifecycleStore(tempDir());
    const envelope = structuredClone(representativeEnvelope);
    const delivered = store.deliver(envelope, 'test-host');
    expect(delivered.status).toBe('host-accepted');
    const acknowledged = store.acknowledge(delivered.envelopeId, 'agent-1');
    expect(acknowledged.status).toBe('agent-acknowledged');
  });

  it('never completes intent through acknowledgement or source modification alone', () => {
    const store = new LifecycleStore(tempDir());
    const envelope = structuredClone(representativeEnvelope);
    const delivered = store.deliver(envelope, 'test-host');
    store.acknowledge(delivered.envelopeId, 'agent-1');
    const modified = store.recordSourceRevision(delivered.envelopeId, 'blake3:0'.padEnd(71, '0'));
    expect(modified.status).toBe('source-modified');
    expect(['verified', 'rejected']).not.toContain(modified.status);
  });

  it('lets only the Builder-Reviewer verify, and blocks approval on deleted targets', () => {
    const store = new LifecycleStore(tempDir());
    const envelope = structuredClone(representativeEnvelope);
    const delivered = store.deliver(envelope, 'test-host');
    store.recordResolution(delivered.envelopeId, [
      { targetId: 't-1', outcome: 'exact' },
      { targetId: 't-2', outcome: 'deleted' }
    ]);
    expect(() => store.verify(delivered.envelopeId, 'approve')).toThrow(/deleted/);
    const rejected = store.verify(delivered.envelopeId, 'reject');
    expect(rejected.status).toBe('rejected');
  });

  it('reconstructs state after a process restart', () => {
    const dir = tempDir();
    const first = new LifecycleStore(dir);
    const envelope = structuredClone(representativeEnvelope);
    const delivered = first.deliver(envelope, 'test-host');
    first.acknowledge(delivered.envelopeId, 'agent-1');
    const second = new LifecycleStore(dir);
    const restored = second.get(delivered.envelopeId);
    expect(restored?.status).toBe('agent-acknowledged');
    expect(restored?.deliveryHistory.map((event) => event.type)).toEqual(['delivered', 'acknowledged']);
  });

  it('supports supersede and obsolete dispositions with history retained', () => {
    const store = new LifecycleStore(tempDir());
    const envelope = structuredClone(representativeEnvelope);
    const delivered = store.deliver(envelope, 'test-host');
    const superseded = store.verify(delivered.envelopeId, 'supersede', { successorId: 'env-2' });
    expect(superseded.status).toBe('superseded');
    const other = store.deliver(
      { ...structuredClone(representativeEnvelope), envelopeId: 'env-other', delivery: { ...representativeEnvelope.delivery, idempotencyKey: 'idem-other' } },
      'test-host'
    );
    const obsolete = store.verify(other.envelopeId, 'obsolete');
    expect(obsolete.status).toBe('obsolete');
    expect(store.get(delivered.envelopeId)?.status).toBe('superseded');
  });
});
