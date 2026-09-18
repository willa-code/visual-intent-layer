export type TargetMatch = 'exact' | 'recovered' | 'unresolved';

export type ResolutionLabel = 'matched' | 'recovered' | 'ambiguous' | 'deleted' | 'state-only';

export type ResolutionRecordShape = {
  match: TargetMatch;
  candidates: unknown[];
  viewedAddress?: string;
};

export type ViewportSize = { width: number; height: number };

export type ScrollOffset = { x: number; y: number };

export type ViewedState = {
  address?: string;
  scroll?: ScrollOffset;
  viewport?: ViewportSize;
};

export type RuntimeStateContext = {
  revisionUnchanged: boolean;
  recorded?: ViewedState;
  viewed?: ViewedState;
};

export function sameViewedState(a?: ViewedState, b?: ViewedState): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function runtimeStateMoved(state: RuntimeStateContext): boolean {
  const recorded = state.recorded;
  const viewed = state.viewed;
  if (!recorded || !viewed) {
    return false;
  }
  if (recorded.address !== undefined && recorded.address !== viewed.address) {
    return true;
  }
  if (recorded.scroll && viewed.scroll && (recorded.scroll.x !== viewed.scroll.x || recorded.scroll.y !== viewed.scroll.y)) {
    return true;
  }
  return (
    recorded.viewport !== undefined &&
    viewed.viewport !== undefined &&
    (recorded.viewport.width !== viewed.viewport.width || recorded.viewport.height !== viewed.viewport.height)
  );
}

export function deriveResolutionLabel(
  resolution: ResolutionRecordShape,
  state?: RuntimeStateContext
): ResolutionLabel {
  if (resolution.match === 'exact') {
    return 'matched';
  }
  if (resolution.match === 'recovered') {
    return 'recovered';
  }
  if (state?.revisionUnchanged === true && runtimeStateMoved(state)) {
    return 'state-only';
  }
  if (resolution.candidates.length > 0) {
    return 'ambiguous';
  }
  return 'deleted';
}

export function resolutionLabelText(label: ResolutionLabel): string {
  switch (label) {
    case 'matched':
      return 'Matched';
    case 'recovered':
      return 'Recovered';
    case 'ambiguous':
      return 'Ambiguous';
    case 'deleted':
      return 'Deleted';
    case 'state-only':
      return 'May exist only in a state no longer on screen';
  }
}
