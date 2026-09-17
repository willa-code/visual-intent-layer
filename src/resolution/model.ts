export type TargetMatch = 'exact' | 'recovered' | 'unresolved';

export type ResolutionLabel = 'matched' | 'recovered' | 'ambiguous' | 'deleted' | 'state-only';

export type ResolutionRecordShape = {
  match: TargetMatch;
  candidates: unknown[];
  viewedAddress?: string;
};

export type RuntimeStateContext = {
  revisionUnchanged: boolean;
  targetAddress?: string;
  viewedAddress?: string;
};

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
  if (resolution.candidates.length > 0) {
    return 'ambiguous';
  }
  if (
    state?.revisionUnchanged === true &&
    state.targetAddress !== undefined &&
    state.targetAddress !== state.viewedAddress
  ) {
    return 'state-only';
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
