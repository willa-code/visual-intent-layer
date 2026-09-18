const KIND_LABEL: Record<string, string> = {
  element: 'an element the artifact owns',
  'text-range': 'an exact word range',
  region: 'an area you bounded'
};

export function targetKindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}
