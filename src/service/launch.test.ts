import { describe, expect, it } from 'vitest';
import { launchRecordJson, openLaunchRecord, serveLaunchRecord } from './launch.js';

describe('launch records', () => {
  it('names the base URL, review URL, session identity and artifact revision for an open session', () => {
    const record = openLaunchRecord(
      {
        sessionId: 'session-1',
        reviewUrl: 'http://127.0.0.1:41234/review/session-1?cap=secret',
        capability: 'secret',
        artifact: { id: 'artifact-1', kind: 'saved-html', revision: 'blake3:abc', displayName: 'page.html' },
        reused: false
      },
      'http://127.0.0.1:41234',
      41234
    );
    expect(record.baseUrl).toBe('http://127.0.0.1:41234');
    expect(record.reviewUrl).toBe('http://127.0.0.1:41234/review/session-1?cap=secret');
    expect(record.sessionId).toBe('session-1');
    expect(record.artifact?.revision).toBe('blake3:abc');
    expect(record.reused).toBe(false);
  });

  it('exposes the per-session capability only inside the review URL', () => {
    const record = openLaunchRecord(
      {
        sessionId: 'session-1',
        reviewUrl: 'http://127.0.0.1:41234/review/session-1?cap=secret',
        capability: 'secret',
        artifact: { id: 'artifact-1', kind: 'saved-html', revision: 'blake3:abc', displayName: 'page.html' },
        reused: false
      },
      'http://127.0.0.1:41234',
      41234
    );
    const serialized = launchRecordJson(record);
    expect(serialized).toContain('cap=secret');
    expect(serialized).not.toContain('"capability"');
    expect(serialized).not.toMatch(/"secret"/);
  });

  it('is one machine-readable line for a serve instance with no artifact yet', () => {
    const serialized = launchRecordJson(serveLaunchRecord('http://127.0.0.1:3742', 3742));
    expect(serialized.includes('\n')).toBe(false);
    expect(JSON.parse(serialized)).toEqual({
      command: 'serve',
      baseUrl: 'http://127.0.0.1:3742',
      port: 3742,
      reviewUrl: null,
      sessionId: null,
      artifact: null,
      reused: null
    });
  });
});