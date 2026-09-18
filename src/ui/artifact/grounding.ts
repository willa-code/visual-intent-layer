import { provenanceForElement } from '../../adapters/source-stamp.js';
import type { ResolutionCandidate } from '../../resolution/resolve.js';
import type { Box, Grounding } from '../protocol.js';

const IMPLICIT_ROLES: Record<string, string> = {
  a: 'link',
  button: 'button',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  img: 'img',
  input: 'textbox',
  main: 'main',
  nav: 'navigation',
  p: 'paragraph',
  ul: 'list',
  li: 'listitem',
  form: 'form',
  table: 'table',
  textarea: 'textbox',
  select: 'combobox'
};

export function describeElement(element: HTMLElement): Grounding {
  const rect = element.getBoundingClientRect();
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  const grounding: Grounding = {
    selectors: [composedSelector(element)],
    boundingBox: boxOf(rect, view),
    semanticRole: element.getAttribute('role') ?? IMPLICIT_ROLES[element.tagName.toLowerCase()],
    accessibleName: accessibleNameOf(element) || undefined,
    structuralContext: {
      ancestorChain: ancestorChainOf(element),
      siblingIndex: siblingIndexOf(element),
      siblingCount: siblingCountOf(element)
    },
    geometry: { centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 }
  };
  return grounding;
}

export function describeTextRange(range: Range): Grounding {
  const container =
    range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : (range.commonAncestorContainer.parentElement as HTMLElement | null);
  const doc = container?.ownerDocument;
  const view = doc?.defaultView;
  const fullText = container?.textContent ?? range.toString();
  const exactText = range.toString();
  const startOffset = textOffsetOf(range);
  const rect = range.getBoundingClientRect();
  const grounding: Grounding = {
    selectors: container ? [composedSelector(container)] : [],
    boundingBox: boxOf(rect, view),
    textEvidence: {
      exactText,
      prefix: fullText.slice(Math.max(0, startOffset - 32), startOffset),
      suffix: fullText.slice(startOffset + exactText.length, startOffset + exactText.length + 32),
      startOffset,
      endOffset: startOffset + exactText.length
    }
  };
  if (container) {
    grounding.semanticRole = container.getAttribute('role') ?? IMPLICIT_ROLES[container.tagName.toLowerCase()];
    grounding.structuralContext = {
      ancestorChain: ancestorChainOf(container),
      siblingIndex: siblingIndexOf(container),
      siblingCount: siblingCountOf(container)
    };
  }
  return grounding;
}

export function describeRegion(rect: Box, view: { width: number; height: number; scrollX: number; scrollY: number }): Grounding {
  return {
    selectors: [],
    boundingBox: {
      ...rect,
      viewportWidth: view.width,
      viewportHeight: view.height,
      scrollX: view.scrollX,
      scrollY: view.scrollY
    },
    geometry: { centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 }
  };
}

export function cssPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== 'html') {
    parts.unshift(stepOf(current));
    current = current.parentElement;
    if (parts.length > 8) {
      break;
    }
  }
  return parts.join(' > ');
}

function stepOf(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) {
    return `${tag}#${element.id}`;
  }
  const classes = [...element.classList].filter((name) => !looksGenerated(name)).slice(0, 2);
  const base = classes.length > 0 ? `${tag}.${classes.join('.')}` : tag;
  const parent = element.parentElement;
  if (!parent) {
    return base;
  }
  const siblings = [...parent.children].filter((child) => child.tagName === element.tagName);
  if (siblings.length === 1) {
    return base;
  }
  return `${base}:nth-of-type(${siblings.indexOf(element) + 1})`;
}

function looksGenerated(name: string): boolean {
  return /^(css-[a-z0-9_-]{4,}|sc-[a-z0-9-]{5,}|[a-z]-{1,2}[a-z0-9]{5,})$/i.test(name);
}

function ancestorChainOf(element: HTMLElement): string[] {
  const chain: string[] = [];
  let current = element.parentElement;
  while (current && current.tagName.toLowerCase() !== 'html') {
    chain.unshift(stepOf(current));
    current = current.parentElement;
  }
  return chain.slice(-6);
}

function siblingIndexOf(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) {
    return 0;
  }
  return [...parent.children].indexOf(element);
}

function siblingCountOf(element: HTMLElement): number {
  return element.parentElement?.children.length ?? 1;
}

function accessibleNameOf(element: HTMLElement): string {
  const labelled = element.getAttribute('aria-label');
  if (labelled) {
    return labelled.trim();
  }
  if (element instanceof HTMLImageElement && element.alt) {
    return element.alt.trim();
  }
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
  return text.slice(0, 140);
}

function boxOf(
  rect: { x: number; y: number; width: number; height: number },
  view: Window | null | undefined
): Grounding['boundingBox'] {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    viewportWidth: view?.innerWidth,
    viewportHeight: view?.innerHeight,
    devicePixelRatio: view?.devicePixelRatio,
    scrollX: view?.scrollX ?? 0,
    scrollY: view?.scrollY ?? 0
  };
}

function textOffsetOf(range: Range): number {
  const container =
    range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!container) {
    return range.startOffset;
  }
  const walker = range.cloneRange();
  walker.selectNodeContents(container);
  walker.setEnd(range.startContainer, range.startOffset);
  return walker.toString().length;
}

export const LAYER_ATTRIBUTE = 'data-vil-layer';

export const SHADOW_SEPARATOR = '|';

export function isLayerNode(element: Element): boolean {
  return element.hasAttribute(LAYER_ATTRIBUTE);
}

export function composedSelector(element: HTMLElement): string {
  const segments = [cssPath(element)];
  let root = element.getRootNode();
  while (root instanceof ShadowRoot) {
    const host = root.host as HTMLElement;
    segments.unshift(cssPath(host));
    root = host.getRootNode();
  }
  return segments.join(SHADOW_SEPARATOR);
}

export function elementByComposedSelector(selector: string, doc: Document): HTMLElement | undefined {
  const segments = selector.split(SHADOW_SEPARATOR).filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return undefined;
  }
  let scope: ParentNode = doc;
  let found: HTMLElement | undefined;
  for (let index = 0; index < segments.length; index += 1) {
    let match: Element | null;
    try {
      match = scope.querySelector(segments[index] as string);
    } catch {
      return undefined;
    }
    if (!(match instanceof HTMLElement)) {
      return undefined;
    }
    found = match;
    if (index < segments.length - 1) {
      const shadow = found.shadowRoot;
      if (!shadow) {
        return undefined;
      }
      scope = shadow;
    }
  }
  return found;
}

function composedElements(doc: Document, limit: number): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const visit = (parent: ParentNode): void => {
    for (const child of Array.from(parent.children)) {
      if (elements.length >= limit) {
        return;
      }
      const element = child as HTMLElement;
      if (isLayerNode(element)) {
        continue;
      }
      elements.push(element);
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
      visit(element);
    }
  };
  if (doc.body) {
    visit(doc.body);
  }
  return elements;
}

export function extractCandidates(doc: Document, options: { limit?: number } = {}): ResolutionCandidate[] {
  const limit = options.limit ?? 2000;
  const elements = composedElements(doc, limit);
  const candidates: ResolutionCandidate[] = [];
  const total = elements.length;
  for (let index = 0; index < total; index += 1) {
    const element = elements[index] as HTMLElement;
    const grounding = describeElement(element);
    const stamp = provenanceForElement(element);
    candidates.push({
      nodeId: `node-${index}`,
      selectors: grounding.selectors ?? [],
      tag: element.tagName.toLowerCase(),
      semanticRole: grounding.semanticRole,
      accessibleName: grounding.accessibleName,
      text: grounding.accessibleName ?? grounding.textEvidence?.exactText,
      ancestorChain: grounding.structuralContext?.ancestorChain,
      siblingIndex: grounding.structuralContext?.siblingIndex,
      siblingCount: grounding.structuralContext?.siblingCount,
      boundingBox: {
        x: grounding.boundingBox.x,
        y: grounding.boundingBox.y,
        width: grounding.boundingBox.width,
        height: grounding.boundingBox.height
      },
      ...(stamp ? { sourceFile: stamp.file, sourceLine: stamp.line, sourceColumn: stamp.column } : {})
    });
  }
  return candidates;
}

export function elementByNodeId(doc: Document, nodeId: string): HTMLElement | undefined {
  const match = /^node-(\d+)$/.exec(nodeId);
  if (!match) {
    return undefined;
  }
  const index = Number(match[1]);
  const elements = composedElements(doc, 2000);
  return elements[index];
}
