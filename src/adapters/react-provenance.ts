export type SourceProvenanceEvidence = {
  file: string;
  line: number;
  column: number;
  component?: string;
  adapter: string;
};

type DebugSource = {
  fileName?: unknown;
  lineNumber?: unknown;
  columnNumber?: unknown;
};

type Fiber = {
  _debugSource?: DebugSource | null;
  _debugOwner?: Fiber | null;
  elementType?: { displayName?: unknown; name?: unknown } | string | null;
  return?: Fiber | null;
};

const FIBER_KEY_PATTERN = /^__reactFiber\$|^__reactInternalInstance\$/;

export const ADAPTER_ID = 'react-fiber@0.1';

export function provenanceForElement(element: Element): SourceProvenanceEvidence | undefined {
  const fiber = fiberOf(element);
  if (!fiber) {
    return undefined;
  }
  let current: Fiber | null | undefined = fiber;
  let component: string | undefined;
  let source: { file: string; line: number; column: number } | undefined;
  while (current) {
    component ??= componentName(current.elementType);
    if (!component && current._debugOwner) {
      component ??= componentName(current._debugOwner.elementType);
    }
    source ??= readSource(current._debugSource);
    if (source && component) {
      break;
    }
    current = current.return;
  }
  if (!source) {
    return undefined;
  }
  return { ...source, ...(component ? { component } : {}), adapter: ADAPTER_ID };
}

function fiberOf(element: Element): Fiber | undefined {
  const holder = element as unknown as Record<string, unknown>;
  for (const key of Object.keys(holder)) {
    if (FIBER_KEY_PATTERN.test(key) && typeof holder[key] === 'object' && holder[key] !== null) {
      return holder[key] as Fiber;
    }
  }
  return undefined;
}

function componentName(elementType: Fiber['elementType']): string | undefined {
  if (!elementType || typeof elementType === 'string') {
    return undefined;
  }
  const name = elementType.displayName ?? elementType.name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

function readSource(source: DebugSource | null | undefined): { file: string; line: number; column: number } | undefined {
  if (!source || typeof source.fileName !== 'string' || typeof source.lineNumber !== 'number') {
    return undefined;
  }
  return {
    file: source.fileName,
    line: source.lineNumber,
    column: typeof source.columnNumber === 'number' ? source.columnNumber : 0
  };
}

export type VitePlugin = {
  name: string;
  transformIndexHtml(): Array<{ tag: string; attrs: Record<string, string> }>;
};

export function viteVisualIntentPlugin(): VitePlugin {
  return {
    name: 'visual-intent-provenance',
    transformIndexHtml() {
      return [{ tag: 'script', attrs: { type: 'module', src: '/@visual-intent/provenance.js' } }];
    }
  };
}
