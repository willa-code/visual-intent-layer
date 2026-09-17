import type { Envelope } from '../envelope/validate.js';
import type { TargetMatch } from '../resolution/model.js';
import type { ResolutionCandidate } from '../resolution/resolve.js';
import type { BenchmarkCase } from './run.js';

type Target = Envelope['annotations'][number]['targets'][number];

function elementTarget(id: string, name: string): Target {
  return {
    targetId: id,
    kind: 'element',
    renderedGrounding: {
      selectors: [`main > button.${name}`],
      boundingBox: { x: 320, y: 480, width: 200, height: 44 },
      semanticRole: 'button',
      accessibleName: 'Place order',
      structuralContext: { ancestorChain: ['body', 'main.checkout'], siblingIndex: 2, siblingCount: 4 }
    },
    provenanceConfidence: 'unavailable'
  };
}

function baseCandidate(nodeId: string, name: string): ResolutionCandidate {
  return {
    nodeId,
    selectors: [`main > button.${name}`],
    tag: 'button',
    semanticRole: 'button',
    accessibleName: 'Place order',
    text: 'Place order',
    ancestorChain: ['body', 'main.checkout'],
    siblingIndex: 2,
    siblingCount: 4,
    boundingBox: { x: 320, y: 480, width: 200, height: 44 }
  };
}

function decoy(nodeId: string): ResolutionCandidate {
  return {
    nodeId,
    selectors: ['footer a.help'],
    tag: 'a',
    semanticRole: 'link',
    accessibleName: 'Help',
    text: 'Help center',
    ancestorChain: ['body', 'footer'],
    siblingIndex: 0,
    siblingCount: 2,
    boundingBox: { x: 8, y: 760, width: 60, height: 20 }
  };
}

function textTarget(): Target {
  return {
    targetId: 't-text',
    kind: 'text-range',
    renderedGrounding: {
      selectors: ['main p.shipping-note'],
      boundingBox: { x: 320, y: 540, width: 420, height: 22 },
      textEvidence: {
        exactText: 'Arrives Thursday',
        prefix: 'Order now. ',
        suffix: ' if you order today.',
        startOffset: 11,
        endOffset: 27
      },
      semanticRole: 'paragraph',
      structuralContext: { ancestorChain: ['body', 'main.checkout'], siblingIndex: 3, siblingCount: 5 }
    },
    provenanceConfidence: 'unavailable'
  };
}

function textCandidate(nodeId: string, text = 'Order now. Arrives Thursday if you order today.'): ResolutionCandidate {
  return {
    nodeId,
    selectors: ['main p.shipping-note'],
    tag: 'p',
    semanticRole: 'paragraph',
    accessibleName: text,
    text,
    ancestorChain: ['body', 'main.checkout'],
    siblingIndex: 3,
    siblingCount: 5,
    boundingBox: { x: 320, y: 540, width: 420, height: 22 }
  };
}

export function buildMatrix(): BenchmarkCase[] {
  const cases: BenchmarkCase[] = [];
  const accept = (
    name: string,
    target: Target,
    candidates: ResolutionCandidate[],
    expectedNodeId: string | undefined,
    acceptable: TargetMatch[]
  ): void => {
    cases.push({ name, target, candidates, expectedNodeId, acceptable });
  };

  accept('unique-element/no-change', elementTarget('t-1', 'checkout-submit'), [baseCandidate('n-1', 'checkout-submit'), decoy('n-d')], 'n-1', ['exact']);
  accept('unique-element/sibling-reorder', elementTarget('t-1', 'checkout-submit'), [baseCandidate('n-1', 'checkout-submit'), decoy('n-d')].map((c) => (c.nodeId === 'n-1' ? { ...c, siblingIndex: 0 } : c)), 'n-1', ['exact', 'recovered']);
  accept('unique-element/wrapper-insertion', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), selectors: ['main > div.wrapper > button.checkout-submit'], ancestorChain: ['body', 'main.checkout', 'div.wrapper'], siblingIndex: 0, siblingCount: 1 }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('unique-element/unrelated-text-edit', elementTarget('t-1', 'checkout-submit'), [baseCandidate('n-1', 'checkout-submit'), decoy('n-d')], 'n-1', ['exact']);
  accept('unique-element/class-change', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), selectors: ['main > button.primary-cta'] }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('unique-element/target-movement', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), boundingBox: { x: 640, y: 120, width: 200, height: 44 } }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('unique-element/responsive-reflow', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), boundingBox: { x: 16, y: 900, width: 343, height: 48 } }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('unique-element/generated-class-rename', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), selectors: ['main > button.css-q9w8e7-r4t5y6'] }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('unique-element/target-deletion', elementTarget('t-1', 'checkout-submit'), [decoy('n-d')], undefined, ['unresolved']);
  accept('repeated-siblings/ambiguous-duplication', elementTarget('t-1', 'checkout-submit'), [baseCandidate('n-a', 'checkout-submit'), baseCandidate('n-b', 'checkout-submit')], undefined, ['unresolved']);
  accept(
    'repeated-siblings/stamp-disambiguates',
    {
      ...elementTarget('t-1', 'checkout-submit'),
      provenanceConfidence: 'exact',
      sourceProvenance: { file: 'src/Checkout.tsx', line: 42, column: 8, adapter: 'visual-intent-stamp@0.1' }
    },
    [
      { ...baseCandidate('n-a', 'checkout-submit'), sourceFile: 'src/Checkout.tsx', sourceLine: 42, sourceColumn: 8 },
      { ...baseCandidate('n-b', 'checkout-submit'), sourceFile: 'src/Checkout.tsx', sourceLine: 99, sourceColumn: 8 }
    ],
    'n-a',
    ['exact', 'recovered']
  );
  accept('nested-components/wrapper-insertion', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), ancestorChain: ['body', 'main.checkout', 'section.promo', 'div.card'] }, decoy('n-d')], 'n-1', ['exact', 'recovered']);
  accept('nested-components/component-replacement', elementTarget('t-1', 'checkout-submit'), [{ ...baseCandidate('n-1', 'checkout-submit'), tag: 'a', semanticRole: 'link', selectors: ['main > a.checkout-submit'] }, decoy('n-d')], 'n-1', ['recovered', 'unresolved']);
  accept('text-range/no-change', textTarget(), [textCandidate('n-t'), decoy('n-d')], 'n-t', ['exact']);
  accept('text-range/unrelated-text-edit', textTarget(), [textCandidate('n-t', 'Order today. Arrives Thursday if you order today.'), decoy('n-d')], 'n-t', ['exact', 'recovered']);
  accept('text-range/target-deletion', textTarget(), [decoy('n-d')], undefined, ['unresolved']);

  return cases;
}