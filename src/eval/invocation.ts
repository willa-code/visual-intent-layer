export type InvocationVerdict = 'invoke' | 'clarify' | 'chat';

export type EvalScenario = {
  id: string;
  category: 'explicit' | 'spatial' | 'ambiguous' | 'negative';
  message: string;
  expected: InvocationVerdict;
};

export const SCENARIOS: EvalScenario[] = [
  { id: 'explicit-1', category: 'explicit', message: 'Open visual review for checkout.html so I can point at the button', expected: 'invoke' },
  { id: 'explicit-2', category: 'explicit', message: 'Let me select the element visually instead of describing it', expected: 'invoke' },
  { id: 'spatial-1', category: 'spatial', message: 'Align these two cards and give them the same width', expected: 'invoke' },
  { id: 'spatial-2', category: 'spatial', message: 'Move that heading above the form, below the hero image', expected: 'invoke' },
  { id: 'spatial-3', category: 'spatial', message: 'This spacing between the rows feels cramped compared to the footer', expected: 'invoke' },
  { id: 'ambiguous-1', category: 'ambiguous', message: 'Make it look better', expected: 'clarify' },
  { id: 'ambiguous-2', category: 'ambiguous', message: 'Something is off with the page, can you check?', expected: 'clarify' },
  { id: 'negative-1', category: 'negative', message: 'Rename the formatPrice function to formatCurrency in utils.ts', expected: 'chat' },
  { id: 'negative-2', category: 'negative', message: 'What does the checkout endpoint return on failure?', expected: 'chat' },
  { id: 'negative-3', category: 'negative', message: 'Add a unit test for the revision hash framing', expected: 'chat' }
];

const EXPLICIT = [/visual review/, /visually/, /point at/, /select .* (element|target)/, /show me .*review/i];
const SPATIAL = [
  /\b(that|these|those)\b.*\b(button|card|heading|form|header|footer|image|row|column|section|element)s?\b/,
  /\b(align|above|below|beside|next to|same width|same height|same size|spacing|move .* (up|down|left|right|above|below))\b/,
  /\b(below|above) the (form|hero|header|footer|button)\b/
];
const PRECISE_CODE = [/rename .* function/, /in [\w-]+\.ts/, /endpoint .* return/, /unit test for/];
const VAGUE = [/^(make it|something is off|looks? (wrong|off|weird|better))/i, /make it look better/, /can you check\?$/];

export function invocationPolicy(message: string): InvocationVerdict {
  const text = message.trim();
  if (EXPLICIT.some((pattern) => pattern.test(text))) {
    return 'invoke';
  }
  if (PRECISE_CODE.some((pattern) => pattern.test(text))) {
    return 'chat';
  }
  if (SPATIAL.some((pattern) => pattern.test(text))) {
    return 'invoke';
  }
  if (VAGUE.some((pattern) => pattern.test(text))) {
    return 'clarify';
  }
  return 'chat';
}

export type EvalReport = {
  total: number;
  passed: number;
  failures: Array<{ id: string; expected: InvocationVerdict; actual: InvocationVerdict }>;
};

export function runInvocationEval(scenarios: EvalScenario[] = SCENARIOS): EvalReport {
  const failures: EvalReport['failures'] = [];
  for (const scenario of scenarios) {
    const actual = invocationPolicy(scenario.message);
    if (actual !== scenario.expected) {
      failures.push({ id: scenario.id, expected: scenario.expected, actual });
    }
  }
  return { total: scenarios.length, passed: scenarios.length - failures.length, failures };
}
