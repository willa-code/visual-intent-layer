import type { ResolutionCandidate } from '../resolution/resolve.js';

export type LayerTool = 'operate' | 'point' | 'box';

export type Box = { x: number; y: number; width: number; height: number };

export type Grounding = {
  selectors?: string[];
  boundingBox: Box & {
    viewportWidth?: number;
    viewportHeight?: number;
    devicePixelRatio?: number;
    scrollX?: number;
    scrollY?: number;
  };
  textEvidence?: { exactText: string; prefix: string; suffix: string; startOffset: number; endOffset: number };
  semanticRole?: string;
  accessibleName?: string;
  structuralContext?: { ancestorChain: string[]; siblingIndex: number; siblingCount: number };
  geometry?: { centerX: number; centerY: number };
};

export type SourceProvenance = {
  file: string;
  line: number;
  column?: number;
  component?: string;
  adapter: string;
  sourceSpan?: string;
};

export type LayerTarget = {
  targetId: string;
  kind: 'element' | 'text-range' | 'region';
  grounding: Grounding;
  label?: string;
  sourceProvenance?: SourceProvenance;
  provenanceConfidence: 'exact' | 'inferred' | 'unavailable';
  regionEvidence?: { revision: string; scrollX: number; scrollY: number };
  runtimeState?: { address?: string };
};

export type LayerReady = { source: 'vil-layer'; type: 'ready'; revision: string };
export type LayerHover = { source: 'vil-layer'; type: 'hover'; label: string | null };
export type LayerSelection = { source: 'vil-layer'; type: 'selection'; targets: LayerTarget[] };
export type LayerCandidates = { source: 'vil-layer'; type: 'candidates'; candidates: ResolutionCandidate[]; revision: string; address?: string };
export type LayerApplied = { source: 'vil-layer'; type: 'applied'; revision?: string };
export type LayerNotice = {
  source: 'vil-layer';
  type: 'notice';
  message: string;
  action?: 'back-to-artifact';
};

export type LayerMessage = LayerReady | LayerHover | LayerSelection | LayerCandidates | LayerApplied | LayerNotice;

export type ShellConfigure = {
  source: 'vil-shell';
  type: 'configure';
  tool: LayerTool;
  revision: string;
  sessionId: string;
};

export type ShellClearSelection = { source: 'vil-shell'; type: 'clear-selection' };
export type ShellMarkTargets = {
  source: 'vil-shell';
  type: 'mark-targets';
  nodeIds: string[];
  selectors?: string[];
  chosenNodeId?: string;
};
export type CandidateMark = { nodeId?: string; selector?: string; numeral: number; label: string };
export type ShellMarkCandidates = { source: 'vil-shell'; type: 'mark-candidates'; candidates: CandidateMark[] };
export type ShellRequestCandidates = { source: 'vil-shell'; type: 'request-candidates' };
export type ShellBeforeAfter = { source: 'vil-shell'; type: 'before-after'; mode: 'before' | 'after' | 'off' };

export type ShellMessage =
  | ShellConfigure
  | ShellClearSelection
  | ShellMarkTargets
  | ShellMarkCandidates
  | ShellRequestCandidates
  | ShellBeforeAfter;

export const LAYER_SOURCE = 'vil-layer';
export const SHELL_SOURCE = 'vil-shell';
