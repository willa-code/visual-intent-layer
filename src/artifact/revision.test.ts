import { describe, expect, it } from 'vitest';
import { computeRevision, stableArtifactId } from './revision.js';

describe('artifact identity', () => {
  it('produces the same id for equivalent filesystem spellings', () => {
    const a = stableArtifactId('file:///tmp/review/checkout.html');
    const b = stableArtifactId('file:///tmp/review/subdir/../checkout.html');
    expect(a).toBe(b);
  });

  it('produces different ids for different artifacts', () => {
    expect(stableArtifactId('file:///tmp/review/a.html')).not.toBe(
      stableArtifactId('file:///tmp/review/b.html')
    );
  });
});

describe('content-addressed revision', () => {
  it('returns a blake3 revision string', () => {
    const revision = computeRevision(Buffer.from('<h1>hi</h1>', 'utf8'), []);
    expect(revision).toMatch(/^blake3:[0-9a-f]{64}$/);
  });

  it('is deterministic for the same bytes and manifest', () => {
    const bytes = Buffer.from('<h1>hi</h1>', 'utf8');
    const manifest = [{ path: 'style.css', digest: 'blake3:abc' }];
    expect(computeRevision(bytes, manifest)).toBe(computeRevision(bytes, manifest));
  });

  it('changes when artifact bytes change', () => {
    const before = computeRevision(Buffer.from('<h1>hi</h1>', 'utf8'), []);
    const after = computeRevision(Buffer.from('<h1>bye</h1>', 'utf8'), []);
    expect(after).not.toBe(before);
  });

  it('changes when the asset manifest changes', () => {
    const bytes = Buffer.from('<h1>hi</h1>', 'utf8');
    const before = computeRevision(bytes, [{ path: 'a.css', digest: 'blake3:111' }]);
    const after = computeRevision(bytes, [{ path: 'a.css', digest: 'blake3:222' }]);
    expect(after).not.toBe(before);
  });

  it('is independent of manifest entry order', () => {
    const bytes = Buffer.from('<h1>hi</h1>', 'utf8');
    const forward = computeRevision(bytes, [
      { path: 'a.css', digest: 'blake3:111' },
      { path: 'b.css', digest: 'blake3:222' }
    ]);
    const backward = computeRevision(bytes, [
      { path: 'b.css', digest: 'blake3:222' },
      { path: 'a.css', digest: 'blake3:111' }
    ]);
    expect(backward).toBe(forward);
  });

  it('pins the framing against silent drift', () => {
    const revision = computeRevision(Buffer.from('hello', 'utf8'), []);
    expect(revision).toBe('blake3:c0205408c160e6955e2e7f86e00b2130f08fbbb750ffb3342520fa4a5622d5d3');
  });
});
