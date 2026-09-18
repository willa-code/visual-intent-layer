import type { Envelope } from '../envelope/validate.js';
import type { DocumentState, ScrollOffset, TargetMatch, ViewportSize } from './model.js';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResolutionCandidate = {
  nodeId: string;
  selectors: string[];
  tag?: string;
  semanticRole?: string;
  accessibleName?: string;
  text?: string;
  ancestorChain?: string[];
  siblingIndex?: number;
  siblingCount?: number;
  boundingBox?: BoundingBox;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
};

export type ScoredCandidate = {
  candidate: ResolutionCandidate;
  score: number;
  matchedAnchors: string[];
};

export type TargetResolutionRecord = {
  targetId: string;
  match: TargetMatch;
  candidates: ScoredCandidate[];
  selectedNodeId?: string;
  resolvedAt: string;
  viewedAddress?: string;
  viewedScroll?: ScrollOffset;
  viewedViewport?: ViewportSize;
  viewedDocuments?: DocumentState[];
  truncated?: boolean;
};

type Target = Envelope['annotations'][number]['targets'][number];

const EXACT_THRESHOLD = 0.92;
const RECOVERED_THRESHOLD = 0.55;
const AMBIGUITY_MARGIN = 0.12;
const MATCH_FLOOR = 0.25;
const MAX_CANDIDATES = 5;

const GENERATED_CLASS = /\.(css-[a-z0-9_-]{4,}|[a-z]-{1,2}[a-z0-9]{5,}|sc-[a-z0-9-]{5,})/i;

export function resolveTarget(
  target: Target,
  candidates: ResolutionCandidate[],
  options: {
    at?: string;
    viewedAddress?: string;
    viewedScroll?: ScrollOffset;
    viewedViewport?: ViewportSize;
    viewedDocuments?: DocumentState[];
    truncated?: boolean;
  } = {}
): TargetResolutionRecord {
  const resolvedAt = options.at ?? new Date().toISOString();
  const viewed = {
    ...(options.viewedAddress !== undefined ? { viewedAddress: options.viewedAddress } : {}),
    ...(options.viewedScroll !== undefined ? { viewedScroll: options.viewedScroll } : {}),
    ...(options.viewedViewport !== undefined ? { viewedViewport: options.viewedViewport } : {}),
    ...(options.viewedDocuments !== undefined && options.viewedDocuments.length > 0
      ? { viewedDocuments: options.viewedDocuments }
      : {}),
    ...(options.truncated === true ? { truncated: true } : {})
  };
  const scored = candidates
    .map((candidate) => scoreCandidate(target, candidate))
    .sort((a, b) => b.score - a.score || strongAnchorCount(b) - strongAnchorCount(a));
  const matched = scored.filter((entry) => entry.score >= MATCH_FLOOR);
  const best = matched[0];
  if (!best) {
    return { targetId: target.targetId, match: 'unresolved', candidates: [], resolvedAt, ...viewed };
  }
  const runnerUp = matched[1];
  const contested = runnerUp !== undefined && best.score - runnerUp.score < AMBIGUITY_MARGIN;
  if (contested && !hasUniqueStrongAnchor(best, runnerUp)) {
    const contenders = matched.filter((entry) => best.score - entry.score < AMBIGUITY_MARGIN);
    return {
      targetId: target.targetId,
      match: 'unresolved',
      candidates: contenders.slice(0, MAX_CANDIDATES),
      resolvedAt,
      ...viewed
    };
  }
  if (best.score >= EXACT_THRESHOLD && isExactMatch(target, best)) {
    return { targetId: target.targetId, match: 'exact', candidates: scored, selectedNodeId: best.candidate.nodeId, resolvedAt, ...viewed };
  }
  if (best.score >= RECOVERED_THRESHOLD) {
    return {
      targetId: target.targetId,
      match: 'recovered',
      candidates: scored,
      selectedNodeId: best.candidate.nodeId,
      resolvedAt,
      ...viewed
    };
  }
  return {
    targetId: target.targetId,
    match: 'unresolved',
    candidates: matched.slice(0, MAX_CANDIDATES),
    resolvedAt,
    ...viewed
  };
}

export function scoreCandidate(target: Target, candidate: ResolutionCandidate): ScoredCandidate {
  const grounding = target.renderedGrounding;
  let score = 0;
  const matchedAnchors: string[] = [];

  const provenance = target.sourceProvenance;
  if (
    provenance &&
    candidate.sourceFile === provenance.file &&
    candidate.sourceLine === provenance.line &&
    candidate.sourceColumn === provenance.column
  ) {
    score += 0.4;
    matchedAnchors.push('source-provenance');
  }
  if (grounding.semanticRole && candidate.semanticRole === grounding.semanticRole) {
    score += 0.15;
    matchedAnchors.push('semantic-role');
  }
  if (grounding.accessibleName && candidate.accessibleName === grounding.accessibleName) {
    score += 0.2;
    matchedAnchors.push('accessible-name');
  }
  const expectedText = grounding.textEvidence?.exactText ?? grounding.accessibleName;
  if (expectedText && candidate.text && textsMatch(expectedText, candidate.text)) {
    score += 0.2;
    matchedAnchors.push('text-evidence');
  }
  if (selectorEvidenceMatches(grounding.selectors ?? [], candidate.selectors)) {
    score += 0.2;
    matchedAnchors.push('selector-evidence');
  }
  if (tagEvidenceMatches(grounding.selectors ?? [], candidate.tag)) {
    score += 0.15;
    matchedAnchors.push('tag-evidence');
  }
  if (structureMatches(grounding.structuralContext, candidate)) {
    score += 0.15;
    matchedAnchors.push('structural-context');
  }
  if (geometryClose(grounding.boundingBox, candidate.boundingBox)) {
    score += 0.1;
    matchedAnchors.push('geometry');
  }
  return { candidate, score: Math.min(1, score), matchedAnchors };
}

export function chosenCandidate(record: TargetResolutionRecord, nodeId: string): ResolutionCandidate | undefined {
  return record.candidates.find((entry) => entry.candidate.nodeId === nodeId)?.candidate;
}

function strongAnchorCount(entry: ScoredCandidate): number {
  return entry.matchedAnchors.filter((anchor) => anchor === 'source-provenance').length;
}

function hasUniqueStrongAnchor(best: ScoredCandidate, runnerUp: ScoredCandidate | undefined): boolean {
  if (!runnerUp) {
    return true;
  }
  return best.matchedAnchors.includes('source-provenance') && !runnerUp.matchedAnchors.includes('source-provenance');
}

function isExactMatch(target: Target, best: ScoredCandidate): boolean {
  if (best.matchedAnchors.includes('source-provenance')) {
    return true;
  }
  const hasIdentity =
    best.matchedAnchors.includes('accessible-name') || best.matchedAnchors.includes('text-evidence');
  const hasContext =
    best.matchedAnchors.includes('selector-evidence') || best.matchedAnchors.includes('structural-context');
  return hasIdentity && hasContext && best.score >= EXACT_THRESHOLD;
}

function textsMatch(expected: string, actual: string): boolean {
  const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const a = normalize(expected);
  const b = normalize(actual);
  return a.length > 0 && (a === b || a.includes(b) || b.includes(a));
}

function selectorEvidenceMatches(expected: string[], actual: string[]): boolean {
  const meaningful = (selectors: string[]): string[] =>
    selectors.map(stripGeneratedClasses).filter((selector) => selector.length > 0);
  const a = meaningful(expected);
  const b = new Set(meaningful(actual));
  if (a.length === 0) {
    return false;
  }
  return a.some((selector) => b.has(selector));
}

function tagEvidenceMatches(expected: string[], actualTag: string | undefined): boolean {
  if (!actualTag) {
    return false;
  }
  return expected.some((selector) => {
    const last = selector.split(/\s*>\s*|\s+/).pop() ?? '';
    const tag = /^[a-z][a-z0-9]*/i.exec(last)?.[0]?.toLowerCase();
    return tag !== undefined && tag === actualTag.toLowerCase();
  });
}

function stripGeneratedClasses(selector: string): string {
  return selector
    .split(/\s*>\s*|\s+/)
    .map((part) => part.replace(GENERATED_CLASS, ''))
    .filter((part) => part.length > 0 && part !== '*' && !/^\.+$/.test(part))
    .join(' ');
}

function structureMatches(
  expected: Target['renderedGrounding']['structuralContext'],
  candidate: ResolutionCandidate
): boolean {
  if (!expected) {
    return false;
  }
  const expectedChain = expected.ancestorChain ?? [];
  const actualChain = candidate.ancestorChain ?? [];
  if (expectedChain.length > 0 && actualChain.length > 0) {
    const overlap = expectedChain.filter((entry) => actualChain.includes(entry)).length;
    const ratio = overlap / Math.max(expectedChain.length, actualChain.length);
    if (ratio >= 0.5) {
      return true;
    }
  }
  if (
    expected.siblingIndex !== undefined &&
    expected.siblingCount !== undefined &&
    candidate.siblingIndex === expected.siblingIndex &&
    candidate.siblingCount === expected.siblingCount
  ) {
    return true;
  }
  return false;
}

function geometryClose(expected: BoundingBox | undefined, actual: BoundingBox | undefined): boolean {
  if (!expected || !actual) {
    return false;
  }
  const centerDrift = Math.hypot(
    expected.x + expected.width / 2 - (actual.x + actual.width / 2),
    expected.y + expected.height / 2 - (actual.y + actual.height / 2)
  );
  const sizeDrift =
    Math.abs(expected.width - actual.width) / Math.max(expected.width, 1) +
    Math.abs(expected.height - actual.height) / Math.max(expected.height, 1);
  return centerDrift < 120 && sizeDrift < 0.6;
}