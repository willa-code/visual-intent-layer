import type { Envelope } from '../envelope/validate.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import { deriveResolutionLabel, type RuntimeStateContext, type TargetMatch } from '../resolution/model.js';

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

export type AnchorOutcome = 'changed' | 'same' | 'not-found';

export function anchorOutcome(annotation: Annotation, resolution: TargetResolutionRecord): AnchorOutcome {
  if (resolution.match === 'unresolved') {
    return 'not-found';
  }
  return evidenceUnchanged(annotation, resolution) ? 'same' : 'changed';
}

export function anchorOutcomeText(outcome: AnchorOutcome): string {
  switch (outcome) {
    case 'changed':
      return 'changed';
    case 'same':
      return 'same';
    case 'not-found':
      return 'not found';
  }
}

export function evidenceUnchanged(annotation: Annotation, resolution: TargetResolutionRecord): boolean {
  const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
  const selected = resolution.candidates.find((entry) => entry.candidate.nodeId === resolution.selectedNodeId)?.candidate;
  if (!target || !selected) {
    return false;
  }
  const grounding = target.renderedGrounding;
  const nameMatches = !grounding.accessibleName || grounding.accessibleName === selected.accessibleName;
  const roleMatches = !grounding.semanticRole || grounding.semanticRole === selected.semanticRole;
  const textMatches = !grounding.textEvidence?.exactText || grounding.textEvidence.exactText === selected.text;
  return nameMatches && roleMatches && textMatches;
}

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
  sequence?: number;
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
  relationships: AnnotationRelation[];
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

export function approvalBlockers(
  annotation: Annotation,
  stateFor?: (resolution: TargetResolutionRecord) => RuntimeStateContext
): string[] {
  const blockers: string[] = [];
  for (const resolution of annotation.resolutions) {
    if (resolution.match !== 'unresolved') {
      continue;
    }
    const label = labelFor(annotation, resolution.targetId);
    if (resolution.candidates.length === 0) {
      const state = stateFor?.(resolution);
      if (deriveResolutionLabel(resolution, state) === 'state-only') {
        blockers.push(`${label} may exist only in a state no longer on screen, so approval is blocked.`);
        continue;
      }
      blockers.push(`${label} is deleted from this revision, so approval is blocked.`);
      continue;
    }
    blockers.push(`${label} could not be matched in this revision, so approval is blocked.`);
  }
  return blockers;
}

export function verificationRefusedReason(
  annotation: Annotation,
  verdict: VerificationVerdict,
  stateFor?: (resolution: TargetResolutionRecord) => RuntimeStateContext
): string | undefined {
  if (verdict !== 'approve') {
    return undefined;
  }
  const blockers = approvalBlockers(annotation, stateFor);
  return blockers.length > 0 ? blockers.join(' ') : undefined;
}

export function labelFor(annotation: Annotation, targetId: string): string {
  return targetName(annotation.targets, targetId);
}

export function missingRelationTargets(annotation: Annotation): string[] {
  const present = new Set(annotation.targets.map((target) => target.targetId));
  const missing = new Set<string>();
  for (const relation of annotation.relationships) {
    for (const targetId of relation.targetIds) {
      if (!present.has(targetId)) {
        missing.add(targetId);
      }
    }
  }
  return [...missing];
}

export function relationsAmong(
  relationships: AnnotationRelation[],
  targets: Array<{ targetId: string }>
): { relationships: AnnotationRelation[]; removed: number } {
  const present = new Set(targets.map((target) => target.targetId));
  const kept = relationships.filter((relation) => relation.targetIds.every((targetId) => present.has(targetId)));
  return { relationships: kept, removed: relationships.length - kept.length };
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
    relationships: annotation.relationships,
    blockers: approvalBlockers(annotation),
    ...(annotation.passId ? { passId: annotation.passId } : {}),
    ...(annotation.replaces ? { replaces: annotation.replaces } : {}),
    ...(annotation.replacedBy ? { replacedBy: annotation.replacedBy } : {}),
    ...(annotation.resolutions[0]?.resolvedAt ? { resolutionsRunAt: annotation.resolutions[0].resolvedAt } : {}),
    ...(annotation.resolvedRevision ? { resolvedRevision: annotation.resolvedRevision } : {})
  };
}
