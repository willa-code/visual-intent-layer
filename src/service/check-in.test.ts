import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CheckInStore } from './check-in.js';

function dataDir(): string {
  return mkdtempSync(join(tmpdir(), 'vil-checkin-'));
}

const SESSION = 'session-shared';

describe('CheckInStore, two instances over one data directory', () => {
  it('reports a check-in another instance recorded', () => {
    const shared = dataDir();
    const serving = new CheckInStore(shared);
    const agent = new CheckInStore(shared);
    expect(serving.lastContact(SESSION)).toBeUndefined();

    const at = agent.recordContact(SESSION);

    expect(serving.lastContact(SESSION)).toBe(at);
  });

  it('reports an interruption another instance requested', () => {
    const shared = dataDir();
    const serving = new CheckInStore(shared);
    const agent = new CheckInStore(shared);

    const requested = serving.requestInterruption(SESSION);

    expect(agent.pendingInterruption(SESSION)?.interruptionId).toBe(requested.interruptionId);
  });

  it('stops reporting an interruption as pending once another instance collects it', () => {
    const shared = dataDir();
    const serving = new CheckInStore(shared);
    const agent = new CheckInStore(shared);
    const requested = serving.requestInterruption(SESSION);
    expect(agent.pendingInterruption(SESSION)?.interruptionId).toBe(requested.interruptionId);

    agent.collectInterruption(SESSION, requested.interruptionId);

    expect(serving.pendingInterruption(SESSION)).toBeUndefined();
    expect(serving.listInterruptions(SESSION)[0]?.collectedAt).toBeDefined();
  });

  it('keeps both check-ins rather than one overwriting the other', () => {
    const shared = dataDir();
    const first = new CheckInStore(shared);
    const second = new CheckInStore(shared);

    first.recordContact(SESSION, '2026-01-01T00:00:00.000Z');
    second.recordContact(SESSION, '2026-01-02T00:00:00.000Z');

    expect(new CheckInStore(shared).lastContact(SESSION)).toBe('2026-01-02T00:00:00.000Z');
  });
});
