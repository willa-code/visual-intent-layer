import type { Envelope } from '../envelope/validate.js';
import type { ResolutionCandidate, TargetResolutionRecord } from '../resolution/resolve.js';
import { deriveResolutionLabel, type TargetMatch } from '../resolution/model.js';

export type AnnotationTarget = Envelope['annotations'][number]['targets'][number];
export type AnnotationRelation = NonNullable<Envelope['annotations'][number]['relationships']>[number];
export type AnnotationReference = NonNullable<Envelope['annotations'][number]['references']>[number];
export type AnnotationAttachment = NonNullable<Envelope['annotations'][number]['attachments']>[number];

export type AnnotationState =
  | 'draft'
  | 'queued'
  | 'delivered'
  | 'resolved'
  | 'acknowledged'
  | 'verified'
  | 'rejected'
  | 'another-pass'
  | 'superseded'
  | 'obsolete';

export type VerificationVerdict = 'approve' | 'reject' | 'another-pass' | 'supersede' | 'obsolete';

export type AnnotationEvent = {
  type:
    | 'created'
    | 'drafted'
    | 'queued'
    | 'dequeued'
    | 'attachment-added'
    | 'attachment-removed'
    | 'relation-added'
    | 'relation-removed'
    | 'delivered'
    | 'resolved'
    | 'candidate-chosen'
    | 'acknowledged'
    | 'verified';
  at: string;
  detail?: string;
};

export type Annotation = {
  annotationId: string;
  artifactId: string;
  writtenRevision: string;
  revisionRelation: 'current' | 'advanced';
  state: AnnotationState;
  order: number;
  note: string;
  targets: AnnotationTarget[];
  relationships: AnnotationRelation[];
  references: AnnotationReference[];
  attachments: AnnotationAttachment[];
  resolutions: TargetResolutionRecord[];
  chosenCandidates: Record<string, string>;
  verification?: { verdict: VerificationVerdict; at: string; successorId?: string };
  history: AnnotationEvent[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
};

export type AnnotationSummary = {
  annotationId: string;
  state: AnnotationState;
  note: string;
  targetCount: number;
  order: number;
  revisionRelation: 'current' | 'advanced';
  resolutions: Array<{ targetId: string; match: TargetMatch; label: ReturnType<typeof deriveResolutionLabel>; candidates: number; chosenNodeId?: string }>;
  blockers: string[];
};

const STATE_LABELS: Record<AnnotationState, string> = {
  draft: 'Draft',
  queued: 'Queued',
  delivered: 'Delivered to host',
  resolved: 'Re-resolved',
  acknowledged: 'Acknowledged by agent',
  verified: 'Verified by you',
  rejected: 'Rejected',
  'another-pass': 'Another pass requested',
  superseded: 'Superseded',
  obsolete: 'Obsolete'
};

export function stateLabel(state: AnnotationState): string {
  return STATE_LABELS[state];
}

export function isInQueue(state: AnnotationState): boolean {
  return state === 'draft' || state === 'queued';
}

export function isSettled(state: AnnotationState): boolean {
  return state === 'verified' || state === 'superseded' || state === 'obsolete';
}

export function isVerification(state: AnnotationState): boolean {
  return state === 'verified' || state === 'rejected' || state === 'another-pass' || state === 'superseded' || state === 'obsolete';
}

export function approvalBlockers(annotation: Annotation): string[] {
  const blockers: string[] = [];
  for (const resolution of annotation.resolutions) {
    if (resolution.match !== 'unresolved') {
      continue;
    }
    const label = labelFor(annotation, resolution.targetId);
    if (resolution.candidates.length === 0) {
      blockers.push(`${label} could not be found in this revision, so approval is blocked.`);
      continue;
    }
    if (!annotation.chosenCandidates[resolution.targetId]) {
      blockers.push(`${label} is ambiguous. Choose one of its candidates before deciding.`);
    }
  }
  return blockers;
}

export function verificationRefusedReason(annotation: Annotation, verdict: VerificationVerdict): string | undefined {
  if (verdict !== 'approve') {
    return undefined;
  }
  const blockers = approvalBlockers(annotation);
  return blockers.length > 0 ? blockers.join(' ') : undefined;
}

export function labelFor(annotation: Annotation, targetId: string): string {
  return targetName(annotation.targets, targetId);
}

export function targetName(targets: AnnotationTarget[], targetId: string): string {
  const target = targets.find((entry) => entry.targetId === targetId);
  if (!target) {
    return targetId;
  }
  return target.label ?? target.renderedGrounding.accessibleName ?? target.renderedGrounding.semanticRole ?? target.kind;
}

export function summarise(annotation: Annotation): AnnotationSummary {
  return {
    annotationId: annotation.annotationId,
    state: annotation.state,
    note: annotation.note,
    targetCount: annotation.targets.length,
    order: annotation.order,
    revisionRelation: annotation.revisionRelation,
    resolutions: annotation.resolutions.map((resolution) => ({
      targetId: resolution.targetId,
      match: resolution.match,
      label: deriveResolutionLabel(resolution),
      candidates: resolution.candidates.length,
      ...(annotation.chosenCandidates[resolution.targetId]
        ? { chosenNodeId: annotation.chosenCandidates[resolution.targetId] }
        : {})
    })),
    blockers: approvalBlockers(annotation)
  };
}

export function candidateLabel(candidate: ResolutionCandidate): string {
  return candidate.accessibleName ?? candidate.text ?? candidate.semanticRole ?? candidate.tag ?? candidate.nodeId;
}

const RELATION_SENTENCES: Record<string, (names: string[]) => string> = {
  before: (names) => `${joinNames(names)} should come in this order.`,
  after: (names) => `${joinNames(names)} should come in this order.`,
  'align-left': (names) => `${joinNames(names)} should align on the left.`,
  'align-center': (names) => `${joinNames(names)} should align on the centre line.`,
  'align-right': (names) => `${joinNames(names)} should align on the right.`,
  'align-top': (names) => `${joinNames(names)} should align along the top.`,
  'align-middle': (names) => `${joinNames(names)} should align along the middle.`,
  'equal-gap': (names) => `${joinNames(names)} should be equally spaced.`,
  'member-of': (names) => `${names[0] ?? 'the first target'} should be contained inside ${names[1] ?? 'the group'}.`,
  'shared-property': (names) => `${joinNames(names)} should share the same visible property.`,
  'same-width': (names) => `${names[0] ?? 'the first target'} should be the same width as ${names[1] ?? 'the other'}.`,
  'same-height': (names) => `${names[0] ?? 'the first target'} should be the same height as ${names[1] ?? 'the other'}.`
};

export function relationSentence(annotation: Pick<Annotation, 'relationships' | 'targets'>): string {
  return formatRelations(annotation.relationships, annotation.targets);
}

function formatRelations(relationships: AnnotationRelation[], targets: AnnotationTarget[]): string {
  return relationships
    .map((relation) => {
      const names = relation.targetIds.map((targetId) => targetName(targets, targetId));
      const build = RELATION_SENTENCES[relation.operator];
      return build ? build(names) : `${joinNames(names)} should ${relation.operator}.`;
    })
    .join(' ');
}

function joinNames(names: string[]): string {
  if (names.length === 0) {
    return 'the targets';
  }
  if (names.length === 1) {
    return names[0]!;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function relationTypeOf(operator: AnnotationRelation['operator']): AnnotationRelation['type'] {
  switch (operator) {
    case 'before':
    case 'after':
      return 'ordering';
    case 'align-left':
    case 'align-center':
    case 'align-right':
    case 'align-top':
    case 'align-middle':
      return 'alignment';
    case 'equal-gap':
      return 'spacing';
    case 'member-of':
      return 'containment';
    case 'shared-property':
      return 'equivalence';
    case 'same-width':
    case 'same-height':
      return 'comparative-size';
  }
}

export const RELATION_OPERATORS: Array<{ operator: AnnotationRelation['operator']; label: string }> = [
  { operator: 'before', label: 'Comes before' },
  { operator: 'after', label: 'Comes after' },
  { operator: 'align-left', label: 'Align left' },
  { operator: 'align-center', label: 'Align centre' },
  { operator: 'align-right', label: 'Align right' },
  { operator: 'align-top', label: 'Align top' },
  { operator: 'align-middle', label: 'Align middle' },
  { operator: 'equal-gap', label: 'Equal spacing' },
  { operator: 'member-of', label: 'Contained in' },
  { operator: 'shared-property', label: 'Share a property' },
  { operator: 'same-width', label: 'Same width' },
  { operator: 'same-height', label: 'Same height' }
];

export function operatorLabel(operator: AnnotationRelation['operator']): string {
  return RELATION_OPERATORS.find((entry) => entry.operator === operator)?.label ?? operator;
}