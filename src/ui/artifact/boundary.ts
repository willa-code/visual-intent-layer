export const SHADOW_SEPARATOR = '|';
export const FRAME_SEPARATOR = '>>';

export type BoundaryRefusal = 'closed-shadow-root' | 'cross-origin-frame' | 'unloaded-frame' | 'policy-blocked-frame';

type FrameLookup = (element: Element) => Document | null | undefined;

export function elementOf(node: unknown): HTMLElement | null {
  return node !== null && typeof node === 'object' && (node as Node).nodeType === 1 ? (node as HTMLElement) : null;
}

export function composedFrameParts(selector: string): string[] {
  return selector
    .split(FRAME_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function composedShadowParts(part: string): string[] {
  return part.split(SHADOW_SEPARATOR).filter((segment) => segment.length > 0);
}

export function contentDocumentOf(element: Element): Document | null | undefined {
  const tag = element.tagName.toLowerCase();
  if (tag !== 'iframe' && tag !== 'frame') {
    return undefined;
  }
  try {
    return (element as HTMLIFrameElement).contentDocument ?? null;
  } catch {
    return null;
  }
}

export function boundaryRefusal(
  selectors: string[],
  doc: Document,
  frameLookup: FrameLookup = contentDocumentOf
): BoundaryRefusal | undefined {
  for (const selector of selectors) {
    const refusal = refusalForSelector(selector, doc, frameLookup);
    if (refusal) {
      return refusal;
    }
  }
  return undefined;
}

function refusalForSelector(selector: string, doc: Document, frameLookup: FrameLookup): BoundaryRefusal | undefined {
  const frames = composedFrameParts(selector);
  let scope: Document = doc;
  for (let index = 0; index < frames.length; index += 1) {
    const segments = composedShadowParts(frames[index]!);
    let parent: ParentNode = scope;
    for (let step = 0; step < segments.length - 1; step += 1) {
      const host = queryWithin(parent, segments[step] as string);
      if (!host) {
        return undefined;
      }
      const shadow = (host as HTMLElement).shadowRoot;
      if (!shadow) {
        return 'closed-shadow-root';
      }
      parent = shadow;
    }
    const last = segments[segments.length - 1];
    if (!last) {
      return undefined;
    }
    const element = queryWithin(parent, last);
    if (!element) {
      return undefined;
    }
    if (index < frames.length - 1) {
      const inner = frameLookup(element);
      if (inner === null) {
        return 'cross-origin-frame';
      }
      if (inner === undefined) {
        return undefined;
      }
      scope = inner;
    }
  }
  return undefined;
}

function queryWithin(scope: ParentNode, selector: string): Element | null {
  if (!selector) {
    return null;
  }
  try {
    return scope.querySelector(selector);
  } catch {
    return null;
  }
}
