export type SentenceRelation = {
  operator: string;
  targetIds: string[];
  property?: string;
};

export function relationSentence(relation: SentenceRelation, nameOf: (targetId: string) => string): string {
  const names = relation.targetIds.map(nameOf);
  const name = names[0] ?? 'The dragged target';
  const other = names[1] ?? 'the other target';
  switch (relation.operator) {
    case 'align-left':
      return `${name} and ${other} should align on the left.`;
    case 'align-right':
      return `${name} and ${other} should align on the right.`;
    case 'align-center':
      return `${name} and ${other} should align on the centre line.`;
    case 'align-top':
      return `${name} and ${other} should align along the top.`;
    case 'align-middle':
      return `${name} and ${other} should align along the middle.`;
    case 'before':
      return `${name} should come before ${other}.`;
    case 'after':
      return `${name} should come after ${other}.`;
    case 'equal-gap':
      return `${joinNames(names)} should be equally spaced.`;
    case 'member-of':
      return `${name} should be contained inside ${other}.`;
    case 'shared-property':
      return `${name} and ${other} should share the same ${relation.property ?? 'visible property'}.`;
    case 'same-width':
      return `${name} should be the same width as ${other}.`;
    case 'same-height':
      return `${name} should be the same height as ${other}.`;
    default:
      return `${name} and ${other} should ${relation.operator.replace(/-/g, ' ')}.`;
  }
}

function joinNames(names: string[]): string {
  if (names.length === 0) {
    return 'The selected targets';
  }
  if (names.length === 1) {
    return names[0]!;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
