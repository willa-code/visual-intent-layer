import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
    expect(stored.chosenCandidates).toEqual({});
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

  it('requires an explicit candidate choice before an ambiguous target can be approved', () => {
    const store = new AnnotationStore(dataDir());
    const annotation = store.createDraft({ artifactId: 'a', writtenRevision: 'rev-1', targets: [target()] });
    const resolution = resolveTarget(target(), [candidate('n-a'), candidate('n-b')]);
    store.recordResolutions(annotation.annotationId, [resolution]);
    expect(() => store.verify(annotation.annotationId, 'approve')).toThrow(/ambiguous/i);
    store.chooseCandidate(annotation.annotationId, 't-1', 'n-a');
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
});