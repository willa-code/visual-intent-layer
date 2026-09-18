import { provenanceForElement } from '../../adapters/source-stamp.js';
import type { ResolutionCandidate } from '../../resolution/resolve.js';
import type { Box, Grounding } from '../protocol.js';
import { FRAME_SEPARATOR, SHADOW_SEPARATOR, composedFrameParts, composedShadowParts, contentDocumentOf, elementOf } from './boundary.js';

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

export type RectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function describeElement(element: HTMLElement, root: Document = element.ownerDocument): Grounding {
  const rect = rectInReviewedViewport(element, root);
  const view = reviewedWindowOf(element, root);
  const grounding: Grounding = {
    selectors: [composedSelector(element, root)],
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

export function describeTextRange(range: Range, root?: Document): Grounding {
  const container =
    elementOf(range.commonAncestorContainer) ??
    ((range.commonAncestorContainer.parentElement as HTMLElement | null) || null);
  const boundary = root ?? container?.ownerDocument;
  const view = container ? reviewedWindowOf(container, boundary) : undefined;
  const fullText = container?.textContent ?? range.toString();
  const exactText = range.toString();
  const startOffset = textOffsetOf(range);
  const rect = range.getBoundingClientRect();
  const grounding: Grounding = {
    selectors: container ? [composedSelector(container, boundary)] : [],
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
  if (element.tagName.toLowerCase() === 'img' && (element as HTMLImageElement).alt) {
    return (element as HTMLImageElement).alt.trim();
  }
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
  return text.slice(0, 140);
}

export function reviewedWindowOf(element: Element, root?: Document): Window | undefined {
  let win = element.ownerDocument.defaultView ?? undefined;
  while (win?.frameElement && win !== root?.defaultView) {
    win = (win.frameElement as HTMLElement).ownerDocument.defaultView ?? undefined;
  }
  return win;
}

export function rectInReviewedViewport(element: Element, root?: Document): RectLike {
  let rect: RectLike = element.getBoundingClientRect();
  let win = element.ownerDocument.defaultView;
  while (win?.frameElement && win !== root?.defaultView) {
    const frame = win.frameElement as HTMLElement;
    const frameRect = frame.getBoundingClientRect();
    const dx = frameRect.x + frame.clientLeft;
    const dy = frameRect.y + frame.clientTop;
    rect = {
      x: rect.x + dx,
      y: rect.y + dy,
      width: rect.width,
      height: rect.height,
      left: rect.left + dx,
      top: rect.top + dy,
      right: rect.right + dx,
      bottom: rect.bottom + dy
    };
    win = frame.ownerDocument.defaultView;
  }
  return rect;
}

function boxOf(rect: RectLike, view: Window | null | undefined): Grounding['boundingBox'] {
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
    elementOf(range.commonAncestorContainer) ??
    (range.commonAncestorContainer.parentElement as HTMLElement | null);
  if (!container) {
    return range.startOffset;
  }
  const walker = range.cloneRange();
  walker.selectNodeContents(container);
  walker.setEnd(range.startContainer, range.startOffset);
  return walker.toString().length;
}

export const LAYER_ATTRIBUTE = 'data-vil-layer';

export function isLayerNode(element: Element): boolean {
  return element.hasAttribute(LAYER_ATTRIBUTE);
}

export function composedSelector(element: HTMLElement, root?: Document): string {
  const segments = [cssPath(element)];
  let node: Node = element.getRootNode();
  while (node.nodeType === 11) {
    const host = (node as ShadowRoot).host as HTMLElement | undefined;
    if (!host) {
      break;
    }
    segments.unshift(cssPath(host));
    node = host.getRootNode();
  }
  const doc = node.nodeType === 9 ? (node as Document) : element.ownerDocument;
  const frame = doc === root ? null : elementOf(doc.defaultView?.frameElement);
  const withinDocument = segments.join(SHADOW_SEPARATOR);
  if (frame) {
    return `${composedSelector(frame, root)}${FRAME_SEPARATOR}${withinDocument}`;
  }
  return withinDocument;
}

export function elementByComposedSelector(selector: string, doc: Document): HTMLElement | undefined {
  const frames = composedFrameParts(selector);
  if (frames.length === 0) {
    return undefined;
  }
  let scope: ParentNode = doc;
  let found: HTMLElement | undefined;
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const segments = composedShadowParts(frames[frameIndex]!);
    for (let index = 0; index < segments.length; index += 1) {
      let match: Element | null;
      try {
        match = scope.querySelector(segments[index] as string);
      } catch {
        return undefined;
      }
      const matched = elementOf(match);
      if (!matched) {
        return undefined;
      }
      found = matched;
      if (index < segments.length - 1) {
        const shadow = found.shadowRoot;
        if (!shadow) {
          return undefined;
        }
        scope = shadow;
      }
    }
    if (frameIndex < frames.length - 1) {
      const inner = frameDocumentOf(found);
      if (!inner) {
        return undefined;
      }
      scope = inner;
    }
  }
  return found;
}

function frameDocumentOf(element: HTMLElement | undefined): Document | undefined {
  return element ? (contentDocumentOf(element) ?? undefined) : undefined;
}

export const WALK_LIMIT = 2000;
const FRAME_DEPTH_LIMIT = 1;

export type Walk = { elements: HTMLElement[]; truncated: boolean };

export function walkComposedElements(doc: Document, limit: number = WALK_LIMIT): Walk {
  const elements: HTMLElement[] = [];
  let truncated = false;
  const visited = new Set<Document>([doc]);
  const visit = (parent: ParentNode, depth: number): void => {
    for (const child of Array.from(parent.children)) {
      const element = child as HTMLElement;
      if (isLayerNode(element)) {
        continue;
      }
      if (elements.length >= limit) {
        truncated = true;
        return;
      }
      elements.push(element);
      if (element.shadowRoot) {
        visit(element.shadowRoot, depth);
      }
      if (depth < FRAME_DEPTH_LIMIT) {
        const inner = frameDocumentOf(element);
        if (inner && !visited.has(inner) && inner.body) {
          visited.add(inner);
          visit(inner.body, depth + 1);
        }
      }
      visit(element, depth);
    }
  };
  if (doc.body) {
    visit(doc.body, 0);
  }
  return { elements, truncated };
}

export type Extraction = {
  candidates: ResolutionCandidate[];
  truncated: boolean;
};

export function extractCandidates(doc: Document, options: { limit?: number } = {}): Extraction {
  const { elements, truncated } = walkComposedElements(doc, options.limit ?? WALK_LIMIT);
  const candidates: ResolutionCandidate[] = [];
  const total = elements.length;
  for (let index = 0; index < total; index += 1) {
    const element = elements[index] as HTMLElement;
    const grounding = describeElement(element, doc);
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
  return { candidates, truncated };
}

export function elementByNodeId(doc: Document, nodeId: string): HTMLElement | undefined {
  const match = /^node-(\d+)$/.exec(nodeId);
  if (!match) {
    return undefined;
  }
  const index = Number(match[1]);
  return walkComposedElements(doc, WALK_LIMIT).elements[index];
}
