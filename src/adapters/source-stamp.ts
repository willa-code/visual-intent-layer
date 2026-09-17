export type SourceProvenanceEvidence = {
  file: string;
  line: number;
  column: number;
  adapter: string;
};

type StampContract = {
  attribute: string;
  adapter: string;
};

export const OWN_STAMP_ATTRIBUTE = 'data-vis-source';
export const OWN_ADAPTER_ID = 'visual-intent-stamp@0.1';

export const STAMP_CONTRACTS: StampContract[] = [
  { attribute: OWN_STAMP_ATTRIBUTE, adapter: OWN_ADAPTER_ID },
  { attribute: 'data-insp-path', adapter: 'code-inspector-plugin' }
];

export function provenanceForElement(element: Element): SourceProvenanceEvidence | undefined {
  for (const contract of STAMP_CONTRACTS) {
    const raw = element.getAttribute(contract.attribute);
    if (!raw) {
      continue;
    }
    const parsed = parseStamp(raw);
    if (parsed) {
      return { ...parsed, adapter: contract.adapter };
    }
  }
  return undefined;
}

export function parseStamp(raw: string): { file: string; line: number; column: number } | undefined {
  const trimmed = raw.trim();
  const withColumn = /^(.*):(\d+):(\d+)(?::.*)?$/.exec(trimmed);
  if (withColumn && withColumn[1]) {
    return { file: withColumn[1], line: Number(withColumn[2]), column: Number(withColumn[3]) };
  }
  const withoutColumn = /^(.*):(\d+)(?::.*)?$/.exec(trimmed);
  if (withoutColumn && withoutColumn[1]) {
    return { file: withoutColumn[1], line: Number(withoutColumn[2]), column: 0 };
  }
  return undefined;
}