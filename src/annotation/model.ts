import type { Envelope } from '../envelope/validate.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
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
  | 'not-fixed'
  | 'replaced'
  | 'obsolete';

export type VerificationVerdict = 'approve' | 'reject' | 'not-fixed' | 'obsolete';

export type AnnotationEvent = {
  type:
    | 'created'
    | 'note-changed'
    | 'queued'
    | 'dequeued'
    | 'attachment-added'
    | 'attachment-removed'
    | 'delivered'
    | 'resolved'
    | 'repointed'
    | 'acknowledged'
    | 'verified'
    | 'amended'
    | 'replaced';
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
  resolvedRevision?: string;
  passId?: string;
  verification?: { verdict: VerificationVerdict; at: string; successorId?: string };
  replaces?: string;
  replacedBy?: string;
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
  resolutions: Array<{ targetId: string; match: TargetMatch; label: ReturnType<typeof deriveResolutionLabel>; candidates: number }>;
  blockers: string[];
  passId?: string;
  replaces?: string;
  replacedBy?: string;
  resolutionsRunAt?: string;
  resolvedRevision?: string;
};

const STATE_LABELS: Record<AnnotationState, string> = {
  draft: 'Draft',
  queued: 'Queued',
  delivered: 'Delivered to host',
  resolved: 'Re-resolved',
  acknowledged: 'Acknowledged by agent',
  verified: 'Verified by you',
  rejected: 'Rejected',
  'not-fixed': 'Not Fixed',
  replaced: 'Replaced',
  obsolete: 'Obsolete'
};

export function stateLabel(state: AnnotationState): string {
  return STATE_LABELS[state];
}

export function isInQueue(state: AnnotationState): boolean {
  return state === 'draft' || state === 'queued';
}

export function isVerification(state: AnnotationState): boolean {
  return state === 'verified' || state === 'rejected' || state === 'not-fixed' || state === 'replaced' || state === 'obsolete';
}

export function approvalBlockers(annotation: Annotation): string[] {
  const blockers: string[] = [];
  for (const resolution of annotation.resolutions) {
    if (resolution.match !== 'unresolved') {
      continue;
    }
    const label = labelFor(annotation, resolution.targetId);
    if (resolution.candidates.length === 0) {
      blockers.push(`${label} is deleted from this revision, so approval is blocked.`);
      continue;
    }
    blockers.push(`${label} could not be matched in this revision, so approval is blocked.`);
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
      candidates: resolution.candidates.length
    })),
    blockers: approvalBlockers(annotation),
    ...(annotation.passId ? { passId: annotation.passId } : {}),
    ...(annotation.replaces ? { replaces: annotation.replaces } : {}),
    ...(annotation.replacedBy ? { replacedBy: annotation.replacedBy } : {}),
    ...(annotation.resolutions[0]?.resolvedAt ? { resolutionsRunAt: annotation.resolutions[0].resolvedAt } : {}),
    ...(annotation.resolvedRevision ? { resolvedRevision: annotation.resolvedRevision } : {})
  };
}
