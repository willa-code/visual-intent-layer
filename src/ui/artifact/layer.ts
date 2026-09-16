import { provenanceForElement } from '../../adapters/react-provenance.js';
import type { CandidateMark, Grounding, LayerMessage, LayerTarget, LayerTool, ShellMessage } from '../protocol.js';
import {
  LAYER_ATTRIBUTE,
  describeElement,
  describeRegion,
  describeTextRange,
  elementByNodeId,
  extractCandidates,
  isLayerNode
} from './grounding.js';

const SELECTION_INK = '#2b5fd7';
const SELECTION_HOVER_FILL = 'rgba(43, 95, 215, 0.08)';
const ATTENTION_INK = '#6b4a00';
const ATTENTION_FILL = 'rgba(107, 74, 0, 0.12)';
const MIN_BOX = 12;
const DRAG_THRESHOLD = 5;
const MAX_AREA_TARGETS = 5;

const script = document.currentScript as HTMLScriptElement | null;
const sessionId = script?.dataset['session'] ?? '';
const revision = script?.dataset['revision'] ?? '';
const parentWindow = window.parent !== window ? window.parent : undefined;

let tool: LayerTool = 'operate';
let targets: SelectedTarget[] = [];
let hovered: HTMLElement | null = null;
let marks: Mark[] = [];
let regionMarks: HTMLElement[] = [];
let candidateMarkBoxes: Array<{ box: HTMLElement; element: HTMLElement }> = [];
let boxDrag: { startX: number; startY: number } | null = null;
let pointDrag: { startX: number; startY: number; startedOnSelected: boolean; moved: boolean } | null = null;
let hoverBox: HTMLElement | null = null;
let targetCounter = 0;
let overlay: HTMLElement;

type SelectedTarget = LayerTarget & { element?: HTMLElement };
type Mark = { element: HTMLElement; box: HTMLElement };

function post(message: LayerMessage): void {
  parentWindow?.postMessage(message, '*');
}

function ensureOverlay(): HTMLElement {
  const existing = document.querySelector(`[${LAYER_ATTRIBUTE}][data-vil-overlay]`);
  if (existing) {
    return existing as HTMLElement;
  }
  const element = document.createElement('div');
  element.setAttribute(LAYER_ATTRIBUTE, 'overlay');
  element.setAttribute('data-vil-overlay', '');
  element.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
  document.body.appendChild(element);
  return element;
}

function boxFor(element: Element | null, kind: 'owned' | 'drawn' | 'candidate' | 'hover', label: string): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute(LAYER_ATTRIBUTE, 'mark');
  box.setAttribute('data-vil-mark', kind);
  box.setAttribute('role', 'presentation');
  box.title = label;
  const border =
    kind === 'drawn'
      ? `border:2px dashed ${ATTENTION_INK};background:${ATTENTION_FILL};`
      : kind === 'candidate'
        ? `border:2px dashed ${ATTENTION_INK};`
        : `border:1px solid ${SELECTION_INK};`;
  box.style.cssText = `position:fixed;pointer-events:none;border-radius:4px;box-sizing:border-box;${border}`;
  if (kind !== 'candidate') {
    box.setAttribute('aria-hidden', 'true');
  }
  overlay.appendChild(box);
  return box;
}

function positionBox(box: HTMLElement, element: Element): void {
  const rect = element.getBoundingClientRect();
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
  box.style.display = rect.width === 0 || rect.height === 0 ? 'none' : 'block';
}

function redraw(): void {
  for (const mark of marks) {
    if (mark.element.isConnected) {
      positionBox(mark.box, mark.element);
    }
  }
  for (const mark of candidateMarkBoxes) {
    if (mark.element.isConnected) {
      positionBox(mark.box, mark.element);
    }
  }
  if (hovered && hovered.isConnected && hoverBox) {
    positionBox(hoverBox, hovered);
  }
}

function labelOf(element: HTMLElement): string {
  const grounding = describeElement(element);
  return grounding.accessibleName ?? grounding.semanticRole ?? element.tagName.toLowerCase();
}

function clearHover(): void {
  hovered = null;
  if (hoverBox) {
    hoverBox.style.display = 'none';
  }
  post({ source: 'vil-layer', type: 'hover', label: null });
}

function setHover(element: HTMLElement | null): void {
  if (!element || element === document.body || element === document.documentElement) {
    clearHover();
    return;
  }
  hovered = element;
  if (!hoverBox) {
    hoverBox = boxFor(element, 'hover', '');
    hoverBox.style.border = `1px solid ${SELECTION_INK}`;
    hoverBox.style.background = SELECTION_HOVER_FILL;
  }
  hoverBox.style.display = 'block';
  positionBox(hoverBox, element);
  post({ source: 'vil-layer', type: 'hover', label: labelOf(element) });
}

function renderTargets(): void {
  for (const mark of marks) {
    mark.box.remove();
  }
  for (const box of regionMarks) {
    box.remove();
  }
  regionMarks = [];
  const next: Mark[] = [];
  for (const target of targets) {
    if (target.element && target.element.isConnected) {
      next.push({ element: target.element, box: boxFor(target.element, 'owned', target.label ?? '') });
      continue;
    }
    const bounds = target.grounding.boundingBox;
    const box = boxFor(null, 'drawn', target.label ?? 'A drawn area');
    box.style.left = `${bounds.x}px`;
    box.style.top = `${bounds.y}px`;
    box.style.width = `${bounds.width}px`;
    box.style.height = `${bounds.height}px`;
    regionMarks.push(box);
  }
  marks = next;
  for (const mark of marks) {
    positionBox(mark.box, mark.element);
  }
  post({ source: 'vil-layer', type: 'selection', targets: targets.map(stripElement) });
}

function stripElement(target: SelectedTarget): LayerTarget {
  const { element, ...rest } = target;
  void element;
  return rest;
}

function makeTarget(kind: LayerTarget['kind'], grounding: Grounding, element?: HTMLElement): SelectedTarget {
  const target: SelectedTarget = {
    targetId: `t-${++targetCounter}`,
    kind,
    grounding,
    provenanceConfidence: 'unavailable',
    ...(element ? { element } : {})
  };
  if (kind === 'region') {
    target.regionEvidence = {
      revision,
      scrollX: grounding.boundingBox.scrollX ?? 0,
      scrollY: grounding.boundingBox.scrollY ?? 0
    };
  }
  if (element) {
    const provenance = provenanceForElement(element);
    if (provenance) {
      target.sourceProvenance = { ...provenance };
      target.provenanceConfidence = 'exact';
    }
    target.label = labelOf(element);
  }
  return target;
}

function selectElement(element: HTMLElement): void {
  targets = [makeTarget('element', describeElement(element), element)];
  renderTargets();
}

function clearSelection(): void {
  targets = [];
  renderTargets();
}

function selectEnclosed(rect: { x: number; y: number; width: number; height: number }): void {
  const view = { width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY };
  const grounding = describeRegion(rect, view);
  const enclosed = enclosedElements(rect);
  const labels: string[] = [];
  for (const element of enclosed) {
    const label = labelOf(element);
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  grounding.selectors = enclosed.flatMap((element) => describeElement(element).selectors ?? []).slice(0, MAX_AREA_TARGETS);
  const summary = labels.slice(0, MAX_AREA_TARGETS);
  if (summary.length > 0) {
    grounding.accessibleName = summary.join(', ');
  }
  const target = makeTarget('region', grounding);
  target.label =
    summary.length > 0
      ? `Area enclosing ${summary.join(', ')}${enclosed.length > summary.length ? ` and ${enclosed.length - summary.length} more` : ''}`
      : 'A drawn area enclosing nothing the artifact owns';
  targets = [target];
  renderTargets();
}

function enclosedElements(rect: { x: number; y: number; width: number; height: number }): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) => !isLayerNode(element));
  const inside = all.filter((element) => {
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      return false;
    }
    return (
      box.left >= rect.x - 1 &&
      box.top >= rect.y - 1 &&
      box.right <= rect.x + rect.width + 1 &&
      box.bottom <= rect.y + rect.height + 1
    );
  });
  const recognizable = inside.filter((element) => {
    const grounding = describeElement(element);
    return Boolean(grounding.accessibleName ?? grounding.semanticRole);
  });
  const leaves = recognizable.filter(
    (element) => !recognizable.some((other) => other !== element && element.contains(other))
  );
  return (leaves.length > 0 ? leaves : recognizable).slice(0, MAX_AREA_TARGETS);
}

function onPointerDown(event: PointerEvent): void {
  if (tool === 'operate' || event.button !== 0) {
    return;
  }
  const element = event.target as HTMLElement | null;
  if (!element || isLayerNode(element)) {
    return;
  }
  if (tool === 'box') {
    boxDrag = { startX: event.clientX, startY: event.clientY };
    return;
  }
  const startedOnSelected = targets.some(
    (target) => target.element === element || target.element?.contains(element)
  );
  pointDrag = { startX: event.clientX, startY: event.clientY, startedOnSelected, moved: false };
}

function onPointerMove(event: PointerEvent): void {
  if (boxDrag) {
    drawMarquee(boxDrag.startX, boxDrag.startY, event.clientX, event.clientY);
    return;
  }
  if (pointDrag) {
    const distance = Math.hypot(event.clientX - pointDrag.startX, event.clientY - pointDrag.startY);
    if (distance > DRAG_THRESHOLD) {
      pointDrag.moved = true;
    }
  }
  if (tool === 'point') {
    const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    if (element && !isLayerNode(element)) {
      setHover(element);
    } else {
      clearHover();
    }
  }
}

function onPointerUp(event: PointerEvent): void {
  if (boxDrag) {
    const start = boxDrag;
    boxDrag = null;
    removeMarquee();
    const width = Math.abs(event.clientX - start.startX);
    const height = Math.abs(event.clientY - start.startY);
    if (width < MIN_BOX || height < MIN_BOX) {
      post({
        source: 'vil-layer',
        type: 'notice',
        message: `That area is below the ${MIN_BOX}\u00d7${MIN_BOX} minimum, so no Annotation was made.`
      });
      return;
    }
    selectEnclosed({
      x: Math.min(start.startX, event.clientX),
      y: Math.min(start.startY, event.clientY),
      width,
      height
    });
    return;
  }
  if (!pointDrag) {
    return;
  }
  const drag = pointDrag;
  pointDrag = null;
  if (drag.moved) {
    if (drag.startedOnSelected) {
      const selection = document.getSelection();
      selection?.removeAllRanges();
      return;
    }
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && selection.toString().trim().length > 0) {
      targets = [makeTarget('text-range', describeTextRange(selection.getRangeAt(0)))];
      renderTargets();
    }
    return;
  }
  const element = event.target as HTMLElement | null;
  if (!element || isLayerNode(element)) {
    return;
  }
  selectElement(element);
}

function onClick(event: MouseEvent): void {
  if (tool === 'operate') {
    return;
  }
  const element = event.target as HTMLElement | null;
  if (element && isLayerNode(element)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function drawMarquee(x1: number, y1: number, x2: number, y2: number): void {
  let box = document.querySelector(`[${LAYER_ATTRIBUTE}][data-vil-marquee]`) as HTMLElement | null;
  if (!box) {
    box = document.createElement('div');
    box.setAttribute(LAYER_ATTRIBUTE, 'marquee');
    box.setAttribute('data-vil-marquee', '');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `position:fixed;pointer-events:none;border:2px dashed ${ATTENTION_INK};background:${ATTENTION_FILL};border-radius:4px;z-index:2147483001;`;
    overlay.appendChild(box);
  }
  box.style.left = `${Math.min(x1, x2)}px`;
  box.style.top = `${Math.min(y1, y2)}px`;
  box.style.width = `${Math.abs(x2 - x1)}px`;
  box.style.height = `${Math.abs(y2 - y1)}px`;
}

function removeMarquee(): void {
  document.querySelector(`[${LAYER_ATTRIBUTE}][data-vil-marquee]`)?.remove();
}

function clearCandidateMarks(): void {
  for (const mark of candidateMarkBoxes) {
    mark.box.remove();
  }
  candidateMarkBoxes = [];
}

function markCandidates(candidates: CandidateMark[]): void {
  clearCandidateMarks();
  for (const candidate of candidates) {
    const element = candidate.nodeId ? elementByNodeId(document, candidate.nodeId) : selectorElement(candidate.selector);
    if (!element) {
      continue;
    }
    const box = boxFor(element, 'candidate', candidate.label);
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', `Candidate ${candidate.numeral}: ${candidate.label}`);
    const numeral = document.createElement('span');
    numeral.setAttribute(LAYER_ATTRIBUTE, 'candidate-numeral');
    numeral.textContent = String(candidate.numeral);
    numeral.style.cssText =
      `position:absolute;top:-9px;left:-9px;min-width:18px;height:18px;border-radius:999px;` +
      `background:${ATTENTION_INK};color:#fff;font:600 11px/18px system-ui,sans-serif;text-align:center;`;
    box.appendChild(numeral);
    positionBox(box, element);
    candidateMarkBoxes.push({ box, element });
  }
}

function selectorElement(selector: string | undefined): HTMLElement | null {
  if (!selector) {
    return null;
  }
  try {
    return document.querySelector(selector) as HTMLElement | null;
  } catch {
    return null;
  }
}

function markBySelectors(selectors: string[], nodeIds: string[], chosenNodeId?: string): void {
  for (const mark of marks) {
    mark.box.remove();
  }
  marks = [];
  for (const id of nodeIds) {
    const element = elementByNodeId(document, id);
    if (element) {
      marks.push({ element, box: boxFor(element, chosenNodeId === id ? 'owned' : 'candidate', id) });
    }
  }
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        marks.push({ element, box: boxFor(element, 'owned', selector) });
      }
    } catch {
      continue;
    }
  }
  redraw();
}

function configure(nextTool: LayerTool): void {
  tool = nextTool;
  pointDrag = null;
  boxDrag = null;
  removeMarquee();
  document.body.style.cursor = nextTool === 'operate' ? '' : 'crosshair';
  if (nextTool !== 'point') {
    clearHover();
  }
}

function onMessage(event: MessageEvent<ShellMessage>): void {
  const message = event.data;
  if (!message || message.source !== 'vil-shell') {
    return;
  }
  switch (message.type) {
    case 'configure':
      configure(message.tool);
      break;
    case 'clear-selection':
      clearSelection();
      break;
    case 'mark-targets':
      markBySelectors(message.selectors ?? [], message.nodeIds, message.chosenNodeId);
      break;
    case 'mark-candidates':
      markCandidates(message.candidates);
      break;
    case 'request-candidates':
      post({ source: 'vil-layer', type: 'candidates', candidates: extractCandidates(document), revision });
      break;
    case 'before-after':
      redraw();
      break;
  }
}

document.addEventListener('pointerdown', onPointerDown, true);
document.addEventListener('pointermove', onPointerMove, true);
document.addEventListener('pointerup', onPointerUp, true);
document.addEventListener('click', onClick, true);
window.addEventListener('scroll', redraw, true);
window.addEventListener('resize', redraw);
window.addEventListener('message', onMessage as EventListener);

overlay = ensureOverlay();
post({ source: 'vil-layer', type: 'ready' });
void sessionId;
