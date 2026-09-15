export type TargetMatch = 'exact' | 'recovered' | 'unresolved';

export type ResolutionLabel = 'matched' | 'recovered' | 'ambiguous' | 'deleted';

export type ResolutionRecordShape = {
  match: TargetMatch;
  candidates: unknown[];
};

export function deriveResolutionLabel(resolution: ResolutionRecordShape): ResolutionLabel {
  if (resolution.match === 'exact') {
    return 'matched';
  }
  if (resolution.match === 'recovered') {
    return 'recovered';
  }
  return resolution.candidates.length > 0 ? 'ambiguous' : 'deleted';
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
  }
}

export function resolutionLabelCue(label: ResolutionLabel): string {
  switch (label) {
    case 'matched':
      return '✓';
    case 'recovered':
      return '≈';
    case 'ambiguous':
      return '?';
    case 'deleted':
      return '∅';
  }
}