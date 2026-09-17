import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationStore } from './store.js';
import type { AnnotationTarget } from './model.js';
import type { ResolutionCandidate } from '../resolution/resolve.js';
import { resolveTarget } from '../resolution/resolve.js';

function target(): AnnotationTarget {
  return {
    targetId: 't-1',
    kind: 'element',
    renderedGrounding: {
      selectors: ['main > button.checkout-submit'],
      boundingBox: { x: 320, y: 480, width: 200, height: 44 },
      semanticRole: 'button',
      accessibleName: 'Place order'
    },
    provenanceConfidence: 'unavailable',
    label: 'Place order button'
  };
}

function candidate(nodeId: string): ResolutionCandidate {
  return {
    nodeId,
    selectors: ['main > button.checkout-submit'],
    tag: 'button',
    semanticRole: 'button',
    accessibleName: 'Place order',
    text: 'Place order',
    ancestorChain: ['body', 'main'],
    siblingIndex: 0,
    siblingCount: 1,
    boundingBox: { x: 320, y: 480, width: 200, height: 44 }
  };
}

function dataDir(): string {
  return mkdtempSync(join(tmpdir(), 'vil-annotations-'));
}

function dropPositions(dir: string): void {
  const file = join(dir, 'annotations.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as {
    sequence?: number;
    passes: Record<string, { sequence?: number }>;
    annotations: Record<string, { history: Array<{ sequence?: number }> }>;
  };
  delete raw.sequence;
  for (const pass of Object.values(raw.passes)) {
    delete pass.sequence;
  }
  for (const annotation of Object.values(raw.annotations)) {
    for (const event of annotation.history) {
      delete event.sequence;
    }
  }
  writeFileSync(file, JSON.stringify(raw));
}

describe('Annotation store', () => {
  it('keeps unsent note text across a process restart', () => {
    const dir = dataDir();
    const store = new AnnotationStore(dir);
    const annotation = store.createDraft({ artifactId: 'artifact-1', writtenRevision: 'rev-1', targets: [target()] });
    store.update(annotation.annotationId, { note: 'Make the button impossible to miss.' });

    const reopened = new AnnotationStore(dir);
    expect(reopened.get(annotation.annotationId)?.note).toBe('Make the button impossible to miss.');
    expect(reopened.get(annotation.annotationId)?.state).toBe('draft');
  });

  it('keeps a recorded relation across a restart and carries it on the delivered envelope', () => {
    const dir = dataDir();
    const store = new AnnotationStore(dir);
    const second = { ...target(), targetId: 't-2', label: 'Logo' } as AnnotationTarget;
    const annotation = store.createDraft({
      artifactId: 'a',
      writtenRevision: 'rev-1',
      targets: [target(), second],
      relationships: [
        {
          relationshipId: 'rel-1',
          type: 'alignment',
          operator: 'align-left',
          targetIds: ['t-1', 't-2'] as [string, string]
        }
      ]
    });

    const reopened = new AnnotationStore(dir);
    expect(reopened.get(annotation.annotationId)?.relationships).toHaveLength(1);
    expect(reopened.get(annotation.annotationId)?.relationships[0]?.operator).toBe('align-left');

    const pass = store.markDelivered([annotation.annotationId], {
      host: 'test',
      intent: 'next-pass',
      artifact: { id: 'a', kind: 'saved-html', revision: 'rev-1' }
    });
    const delivered = pass.envelope.annotations[0]?.relationships;
    expect(delivered?.[0]).toMatchObject({ type: 'alignment', operator: 'align-left', targetIds: ['t-1', 't-2'] });
    expect(JSON.stringify(delivered)).not.toMatch(/"(x|y|width|height|left|top|dx|dy|px)"/);
  });

  it('lists only unsent Annotations in the queue and reorders them', () => {
    const store = new AnnotationStore(dataDir());
    const first = store.createDraft({ artifactId: 'a', writtenRevision: 'r', targets: [target()] });
    const second = store.createDraft({ artifactId: 'a', writtenRevision: 'r', targets: [target()] });
    store.update(first.annotationId, { note: 'first' });
    store.update(second.annotationId, { note: 'second' });
    expect(store.queueOf('a').map((entry) => entry.note)).toEqual(['first', 'second']);
    store.reorder('a', [second.annotationId, first.annotationId]);
    expect(store.queueOf('a').map((entry) => entry.note)).toEqual(['second', 'first']);
  });

  it('delivers one batch carrying each Annotation identity and never duplicates on retry', () => {
    const store = new AnnotationStore(dataDir());
    const first = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const second = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    store.update(first.annotationId, { note: 'one' });
    store.update(second.annotationId, { note: 'two' });
    const options = {
      host: 'test',
      intent: 'next-pass' as const,
      artifact: { id: 'a', kind: 'saved-html' as const, revision: 'rev-1' }
    };
    const batch = store.markDelivered(store.queueOf('a').map((entry) => entry.annotationId), options);
    expect(batch.envelope.annotations.map((entry) => entry.annotationId).sort()).toEqual([first.annotationId, second.annotationId].sort());
    expect(batch.envelope.annotations.map((entry) => entry.note)).toEqual(['one', 'two']);

    const again = store.markDelivered([first.annotationId, second.annotationId], options);
    expect(again.envelopeId).toBe(batch.envelopeId);
    expect(store.get(first.annotationId)?.state).toBe('delivered');
    expect(store.get(first.annotationId)?.history.filter((event) => event.type === 'delivered')).toHaveLength(1);
  });

  it('stores unresolved candidates without auto-selecting them', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const resolution = resolveTarget(target(), [candidate('n-a'), candidate('n-b')]);
    expect(resolution.match).toBe('unresolved');
    store.recordResolutions(annotation.annotationId, [resolution]);
    const stored = store.get(annotation.annotationId)!;
    expect(stored.resolutions[0]!.match).toBe('unresolved');
    expect(stored.resolutions[0]!.selectedNodeId).toBeUndefined();
  });

  it('refuses approval while a target is unresolved without candidates and records no verdict', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const resolution = resolveTarget(target(), [
      {
        nodeId: 'n-decoy',
        selectors: ['footer a.help'],
        tag: 'a',
        semanticRole: 'link',
        accessibleName: 'Help',
        text: 'Help'
      }
    ]);
    expect(resolution.match).toBe('unresolved');
    expect(resolution.candidates).toHaveLength(0);
    store.recordResolutions(annotation.annotationId, [resolution]);
    expect(() => store.verify(annotation.annotationId, 'approve')).toThrow(/approval is blocked/i);
    expect(store.get(annotation.annotationId)?.verification).toBeUndefined();
  });

  it('lets a lost target be repaired by re-pointing, with no candidate chosen', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const resolution = resolveTarget(target(), [candidate('n-a'), candidate('n-b')]);
    store.recordResolutions(annotation.annotationId, [resolution]);
    expect(() => store.verify(annotation.annotationId, 'approve')).toThrow(/could not be matched/i);
    store.repoint(annotation.annotationId, [target()]);
    const repaired = store.get(annotation.annotationId)!;
    expect(repaired.resolutions).toEqual([]);
    expect(repaired.history.some((event) => event.type === 'repointed')).toBe(true);
    expect(store.verify(annotation.annotationId, 'approve').state).toBe('verified');
  });

  it('persists verification history across a restart', () => {
    const dir = dataDir();
    const store = new AnnotationStore(dir);
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    store.update(annotation.annotationId, { note: 'fix it' });
    store.markDelivered([annotation.annotationId], {
      host: 'test',
      intent: 'next-pass',
      artifact: { id: 'a', kind: 'saved-html', revision: 'rev-1' }
    });
    store.verify(annotation.annotationId, 'approve');
    const reopened = new AnnotationStore(dir);
    expect(reopened.get(annotation.annotationId)?.state).toBe('verified');
    expect(reopened.get(annotation.annotationId)?.verification?.verdict).toBe('approve');
  });

  it('treats "written before this revision" as an Annotation-level fact', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const touched = store.noteRevisionAdvance('a', 'rev-2');
    expect(touched).toHaveLength(1);
    expect(store.get(annotation.annotationId)?.revisionRelation).toBe('advanced');
    expect(store.get(annotation.annotationId)?.resolutions).toEqual([]);
  });

  it('keeps acknowledged separate from verified', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    store.markDelivered([annotation.annotationId], {
      host: 'test',
      intent: 'next-pass',
      artifact: { id: 'a', kind: 'saved-html', revision: 'rev-1' }
    });
    store.acknowledge(annotation.annotationId, 'agent-1');
    const acknowledged = store.get(annotation.annotationId)!;
    expect(acknowledged.state).toBe('acknowledged');
    expect(acknowledged.verification).toBeUndefined();
  });

  it('orders a store written before Passes carried a position', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const dir = dataDir();
      const store = new AnnotationStore(dir);
      vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
      const annotation = store.createDraft({
        artifactId: 'a',
        writtenRevision: 'rev-1',
        targets: [target()]
      });
      vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));
      const first = store.markDelivered([annotation.annotationId], {
        host: 'test',
        intent: 'next-pass',
        artifact: { id: 'a', kind: 'saved-html', revision: 'rev-1' }
      });
      vi.setSystemTime(new Date('2026-01-01T00:00:03.000Z'));
      const replacement = store.amend(annotation.annotationId, { note: 'after' });
      vi.setSystemTime(new Date('2026-01-01T00:00:04.000Z'));
      const second = store.markDelivered([replacement.annotationId], {
        host: 'test',
        intent: 'steering',
        artifact: { id: 'a', kind: 'saved-html', revision: 'rev-1' }
      });

      dropPositions(dir);
      const reopened = new AnnotationStore(dir);
      const amended = reopened
        .get(replacement.annotationId)!
        .history.find((event) => event.type === 'amended')!;

      expect(reopened.getPass(first.passId)!.sequence).toBeLessThan(amended.sequence!);
      expect(amended.sequence!).toBeLessThan(reopened.getPass(second.passId)!.sequence);
      expect(reopened.sequenceNow()).toBe(reopened.getPass(second.passId)!.sequence);
    } finally {
      vi.useRealTimers();
    }
  });
});