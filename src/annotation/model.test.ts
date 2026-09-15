import { describe, expect, it } from 'vitest';
import {
  approvalBlockers,
  relationSentence,
  stateLabel,
  verificationRefusedReason,
  type Annotation,
  type AnnotationTarget
} from './model.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import { deriveResolutionLabel } from '../resolution/model.js';

function target(targetId: string, label: string): AnnotationTarget {
  return {
    targetId,
    kind: 'element',
    renderedGrounding: {
      selectors: [`main > .${targetId}`],
      boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      accessibleName: label
    },
    provenanceConfidence: 'unavailable',
    label
  };
}

function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    annotationId: 'ann-1',
    artifactId: 'a',
    writtenRevision: 'rev-1',
    revisionRelation: 'current',
    state: 'delivered',
    order: 0,
    note: '',
    targets: [target('t-1', 'Buy button'), target('t-2', 'Cancel button')],
    relationships: [],
    references: [],
    attachments: [],
    resolutions: [],
    chosenCandidates: {},
    history: [],
    createdAt: '',
    updatedAt: '',
    ...overrides
  };
}

function resolution(partial: Partial<TargetResolutionRecord>): TargetResolutionRecord {
  return { targetId: 't-1', match: 'exact', candidates: [], resolvedAt: '', ...partial };
}

describe('Annotation model', () => {
  it('derives Matched, Recovered, Ambiguous and Deleted from the stored model', () => {
    expect(deriveResolutionLabel(resolution({ match: 'exact' }))).toBe('matched');
    expect(deriveResolutionLabel(resolution({ match: 'recovered' }))).toBe('recovered');
    expect(
      deriveResolutionLabel(
        resolution({
          match: 'unresolved',
          candidates: [{ candidate: { nodeId: 'n-1', selectors: [] }, score: 0.5, matchedAnchors: [] }]
        })
      )
    ).toBe('ambiguous');
    expect(deriveResolutionLabel(resolution({ match: 'unresolved' }))).toBe('deleted');
  });

  it('blocks approval for a deleted target and names the reason', () => {
    const blockers = approvalBlockers(annotation({ resolutions: [resolution({ match: 'unresolved' })] }));
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/could not be found/i);
    expect(verificationRefusedReason(annotation({ resolutions: [resolution({ match: 'unresolved' })] }), 'approve')).toBeDefined();
  });

  it('blocks approval for an ambiguous target until a candidate is chosen', () => {
    const ambiguous = annotation({
      resolutions: [
        resolution({
          match: 'unresolved',
          candidates: [
            { candidate: { nodeId: 'n-1', selectors: [] }, score: 0.5, matchedAnchors: [] },
            { candidate: { nodeId: 'n-2', selectors: [] }, score: 0.48, matchedAnchors: [] }
          ]
        })
      ]
    });
    expect(approvalBlockers(ambiguous)[0]).toMatch(/ambiguous/i);
    const chosen = { ...ambiguous, chosenCandidates: { 't-1': 'n-1' } };
    expect(approvalBlockers(chosen)).toHaveLength(0);
  });

  it('never blocks a non-approval verdict on a missing target', () => {
    const deleted = annotation({ resolutions: [resolution({ match: 'unresolved' })] });
    expect(verificationRefusedReason(deleted, 'obsolete')).toBeUndefined();
    expect(verificationRefusedReason(deleted, 'reject')).toBeUndefined();
  });

  it('shows a relation set back as one plain sentence', () => {
    const related = annotation({
      relationships: [
        { relationshipId: 'r-1', type: 'alignment', operator: 'align-left', targetIds: ['t-1', 't-2'] },
        { relationshipId: 'r-2', type: 'comparative-size', operator: 'same-width', targetIds: ['t-1', 't-2'] }
      ]
    });
    const sentence = relationSentence(related);
    expect(sentence).toBe(
      'Buy button and Cancel button should align on the left. Buy button should be the same width as Cancel button.'
    );
  });

  it('labels every annotation state without relying on colour alone', () => {
    expect(stateLabel('queued')).toBe('Queued');
    expect(stateLabel('acknowledged')).toBe('Acknowledged by agent');
    expect(stateLabel('verified')).toBe('Verified by you');
  });
});