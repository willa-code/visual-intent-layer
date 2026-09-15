import {
  describeElement,
  describeRegion,
  describeTextRange,
  type Grounding,
  type ReviewMode
} from './review.js';
import type { ResolutionCandidate } from '../resolution/resolve.js';
import { provenanceForElement } from '../adapters/react-provenance.js';
import type { Envelope } from '../envelope/validate.js';

export type SelectedTarget = {
  targetId: string;
  kind: 'element' | 'text-range' | 'region';
  grounding: Grounding;
  element?: HTMLElement;
  sourceProvenance?: Envelope['targets'][number]['sourceProvenance'];
};

export type SelectionSink = {
  onHover(element: Element | null): void;
  onSelection(targets: SelectedTarget[]): void;
};

export type SelectionHandle = {
  setMode(mode: ReviewMode): void;
  targets(): SelectedTarget[];
  clear(): void;
  detach(): void;
};

let targetCounter = 0;

export function attachSelection(doc: Document, sink: SelectionSink): SelectionHandle {
  let mode: ReviewMode = 'explore';
  let targets: SelectedTarget[] = [];
  let hovered: HTMLElement | null = null;
  let marquee: { startX: number; startY: number; active: boolean } = { startX: 0, startY: 0, active: false };

  function setMode(next: ReviewMode): void {
    mode = next;
    clearHover();
    if (mode === 'explore') {
      clearOutlines();
    }
  }

  function active(): boolean {
    return mode === 'select';
  }

  function onPointerOver(event: Event): void {
    if (!active()) {
      return;
    }
    mark('visual-intent:hover');
    const element = event.target as HTMLElement | null;
    if (!element || element === doc.documentElement || element === doc.body) {
      clearHover();
      sink.onHover(null);
      return;
    }
    if (hovered && hovered !== element) {
      hovered.classList.remove('hover-outline');
    }
    hovered = element;
    hovered.classList.add('hover-outline');
    mark('visual-intent:hover-handled');
    measureHover();
    sink.onHover(element);
  }

  function clearHover(): void {
    if (hovered) {
      hovered.classList.remove('hover-outline');
      hovered = null;
    }
  }

  function onClick(event: MouseEvent): void {
    if (!active()) {
      return;
    }
    if (marquee.active) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const element = event.target as HTMLElement | null;
    if (!element || element === doc.documentElement || element === doc.body) {
      if (!event.shiftKey) {
        clear();
      }
      return;
    }
    const target: SelectedTarget = {
      targetId: `t-${++targetCounter}`,
      kind: 'element',
      grounding: describeElement(element),
      element
    };
    const provenance = provenanceForElement(element);
    if (provenance) {
      target.sourceProvenance = { ...provenance };
    }
    element.classList.add('target-outline');
    targets = event.shiftKey ? [...targets, target] : replace(target);
    sink.onSelection([...targets]);
  }

  function onSelectionChange(): void {
    if (!active()) {
      return;
    }
    const domSelection = doc.getSelection();
    if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
      return;
    }
    const range = domSelection.getRangeAt(0);
    if (range.toString().trim().length === 0) {
      return;
    }
    targets = replace({ targetId: `t-${++targetCounter}`, kind: 'text-range', grounding: describeTextRange(range) });
    sink.onSelection([...targets]);
  }

  function onMouseDown(event: MouseEvent): void {
    if (!active() || !event.altKey) {
      return;
    }
    marquee = { startX: event.clientX, startY: event.clientY, active: true };
  }

  function onMouseMove(event: MouseEvent): void {
    if (!active() || !marquee.active) {
      return;
    }
    drawMarquee(doc, marquee.startX, marquee.startY, event.clientX, event.clientY);
  }

  function onMouseUp(event: MouseEvent): void {
    if (!active() || !marquee.active) {
      return;
    }
    marquee.active = false;
    removeMarquee(doc);
    const width = Math.abs(event.clientX - marquee.startX);
    const height = Math.abs(event.clientY - marquee.startY);
    if (width < 8 || height < 8) {
      return;
    }
    const view = doc.defaultView;
    const grounding = describeRegion(
      {
        x: Math.min(marquee.startX, event.clientX),
        y: Math.min(marquee.startY, event.clientY),
        width,
        height
      },
      { width: view?.innerWidth ?? 0, height: view?.innerHeight ?? 0 }
    );
    targets = replace({ targetId: `t-${++targetCounter}`, kind: 'region', grounding });
    sink.onSelection([...targets]);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && targets.length > 0) {
      clear();
    }
  }

  function replace(target: SelectedTarget): SelectedTarget[] {
    clearOutlines();
    return [target];
  }

  function clearOutlines(): void {
    for (const target of targets) {
      target.element?.classList.remove('target-outline');
    }
  }

  function clear(): void {
    clearOutlines();
    targets = [];
    sink.onSelection([]);
  }

  doc.addEventListener('pointerover', onPointerOver);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('selectionchange', onSelectionChange);
  doc.addEventListener('mousedown', onMouseDown);
  doc.addEventListener('mousemove', onMouseMove);
  doc.addEventListener('mouseup', onMouseUp);
  doc.addEventListener('keydown', onKeyDown);

  return {
    setMode,
    targets: () => [...targets],
    clear,
    detach(): void {
      doc.removeEventListener('pointerover', onPointerOver);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('selectionchange', onSelectionChange);
      doc.removeEventListener('mousedown', onMouseDown);
      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
      doc.removeEventListener('keydown', onKeyDown);
      clearHover();
      clearOutlines();
    }
  };
}

function drawMarquee(doc: Document, x1: number, y1: number, x2: number, y2: number): void {
  let box = doc.getElementById('visual-intent-marquee');
  if (!box) {
    box = doc.createElement('div');
    box.id = 'visual-intent-marquee';
    const style = box.style;
    style.position = 'fixed';
    style.border = '2px dashed #2563eb';
    style.background = 'rgba(37, 99, 235, 0.12)';
    style.pointerEvents = 'none';
    style.zIndex = '2147483647';
    doc.body.appendChild(box);
  }
  box.style.left = `${Math.min(x1, x2)}px`;
  box.style.top = `${Math.min(y1, y2)}px`;
  box.style.width = `${Math.abs(x2 - x1)}px`;
  box.style.height = `${Math.abs(y2 - y1)}px`;
}

function removeMarquee(doc: Document): void {
  doc.getElementById('visual-intent-marquee')?.remove();
}

function mark(name: string): void {
  try {
    performance.mark(name);
  } catch {
    return;
  }
}

function measureHover(): void {
  try {
    performance.measure('visual-intent:pointer-feedback', 'visual-intent:hover', 'visual-intent:hover-handled');
  } catch {
    return;
  }
}

export function extractCandidates(doc: Document, options: { limit?: number } = {}): ResolutionCandidate[] {
  const limit = options.limit ?? 2000;
  const elements = doc.querySelectorAll('body *');
  const candidates: ResolutionCandidate[] = [];
  const total = Math.min(elements.length, limit);
  for (let index = 0; index < total; index += 1) {
    const element = elements[index] as HTMLElement;
    if (element.id === 'visual-intent-marquee') {
      continue;
    }
    const grounding = describeElement(element);
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
      stableRuntimeId: grounding.stableRuntimeId
    });
  }
  return candidates;
}
