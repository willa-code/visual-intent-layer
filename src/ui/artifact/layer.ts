import { provenanceForElement } from '../../adapters/react-provenance.js';
import type {
  Grounding,
  LayerMessage,
  LayerRelation,
  LayerTarget,
  LayerTool,
  ShellMessage
} from '../protocol.js';
import {
  LAYER_ATTRIBUTE,
  describeElement,
  describeRegion,
  describeTextRange,
  elementByNodeId,
  extractCandidates
} from './grounding.js';

const SELECTION_INK = '#2b5fd7';
const SELECTION_HOVER_FILL = 'rgba(43, 95, 215, 0.08)';
const SELECTION_MARK_FILL = 'rgba(43, 95, 215, 0.14)';
const SELECTION_SHADOW = 'rgba(43, 95, 215, 0.35)';
const ATTENTION_INK = '#6b4a00';
const ATTENTION_FILL = 'rgba(107, 74, 0, 0.12)';

const script = document.currentScript as HTMLScriptElement | null;
const sessionId = script?.dataset['session'] ?? '';
const revision = script?.dataset['revision'] ?? '';
const parentWindow = window.parent !== window ? window.parent : undefined;

let tool: LayerTool = 'pointer';
let targets: SelectedTarget[] = [];
let hovered: HTMLElement | null = null;
let marks: Mark[] = [];
let regionMarks: HTMLElement[] = [];
let marquee: { startX: number; startY: number; active: boolean } | null = null;
let dragging: DragState | null = null;
let targetCounter = 0;
let relationCounter = 0;
let overlay: HTMLElement;

type SelectedTarget = LayerTarget & { element?: HTMLElement };
type Mark = { element: HTMLElement; box: HTMLElement };
type DragState = {
  element: HTMLElement;
  targetId: string;
  startX: number;
  startY: number;
  ghost: HTMLElement;
  relation?: LayerRelation;
};

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
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
  document.body.appendChild(element);
  return element;
}

function boxFor(element: Element, kind: 'selected' | 'candidate', label: string): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute(LAYER_ATTRIBUTE, 'mark');
  box.setAttribute('data-vil-mark', kind);
  box.setAttribute('role', 'presentation');
  box.title = label;
  box.style.cssText = `position:fixed;pointer-events:none;border-radius:4px;box-sizing:border-box;${
    kind === 'selected'
      ? `border:1px solid ${SELECTION_INK};box-shadow:0 0 0 1px ${SELECTION_SHADOW};`
      : `border:2px dashed ${ATTENTION_INK};`
  }`;
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
  if (hovered && hovered.isConnected && hoverBox) {
    positionBox(hoverBox, hovered);
  }
}

let hoverBox: HTMLElement | null = null;

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
    hoverBox = boxFor(element, 'candidate', '');
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
      next.push({ element: target.element, box: boxFor(target.element, 'selected', target.label ?? '') });
    } else if (!target.element) {
      const bounds = target.grounding.boundingBox;
      const box = document.createElement('div');
      box.setAttribute(LAYER_ATTRIBUTE, 'mark');
      box.setAttribute('data-vil-mark', 'selected');
      box.style.cssText = `position:fixed;pointer-events:none;border-radius:4px;box-sizing:border-box;border:1px solid ${SELECTION_INK};left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;`;
      overlay.appendChild(box);
      regionMarks.push(box);
    }
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

export function selectElement(element: HTMLElement, additive: boolean): void {
  const target = makeTarget('element', describeElement(element), element);
  targets = additive ? [...targets.filter((entry) => entry.element !== element), target] : [target];
  renderTargets();
}

function clearSelection(): void {
  targets = [];
  renderTargets();
}

function removeLast(): void {
  targets = targets.slice(0, -1);
  renderTargets();
}

function onPointerOver(event: Event): void {
  if (tool !== 'element') {
    return;
  }
  const element = event.target as HTMLElement | null;
  setHover(element);
}

function onClick(event: MouseEvent): void {
  if (tool !== 'element') {
    return;
  }
  const element = event.target as HTMLElement | null;
  if (!element || isLayerNode(element)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  selectElement(element, event.shiftKey);
}

function onSelectionChange(): void {
  if (tool !== 'text') {
    return;
  }
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (range.toString().trim().length === 0) {
    return;
  }
  targets = [makeTarget('text-range', describeTextRange(range))];
  renderTargets();
}

function onPointerDown(event: PointerEvent): void {
  const element = event.target as HTMLElement | null;
  if (!element || isLayerNode(element)) {
    return;
  }
  if (tool === 'region') {
    event.preventDefault();
    marquee = { startX: event.clientX, startY: event.clientY, active: true };
    return;
  }
  if (tool === 'arrange') {
    const selected = targets.find((target) => target.element === element || target.element?.contains(element));
    if (!selected?.element) {
      return;
    }
    event.preventDefault();
    startDrag(selected.element, selected.targetId, event);
  }
}

function onPointerMove(event: PointerEvent): void {
  if (marquee?.active) {
    drawMarquee(marquee.startX, marquee.startY, event.clientX, event.clientY);
    return;
  }
  if (dragging) {
    updateDrag(event);
  }
  if (tool === 'element') {
    const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    if (element && !isLayerNode(element)) {
      setHover(element);
    }
  }
}

function onPointerUp(event: PointerEvent): void {
  if (marquee?.active) {
    marquee.active = false;
    removeMarquee();
    const width = Math.abs(event.clientX - marquee.startX);
    const height = Math.abs(event.clientY - marquee.startY);
    if (width < 12 || height < 12) {
      post({ source: 'vil-layer', type: 'notice', message: 'That region is below the minimum size, so no Annotation was made.' });
      marquee = null;
      return;
    }
    const view = { width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY };
    const grounding = describeRegion(
      {
        x: Math.min(marquee.startX, event.clientX),
        y: Math.min(marquee.startY, event.clientY),
        width,
        height
      },
      view
    );
    targets = [makeTarget('region', grounding)];
    marquee = null;
    renderTargets();
    return;
  }
  if (dragging) {
    finishDrag();
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (targets.length > 0) {
      clearSelection();
    }
  }
}

document.addEventListener('pointerover', onPointerOver, true);
document.addEventListener('click', onClick, true);
document.addEventListener('selectionchange', onSelectionChange);
document.addEventListener('pointerdown', onPointerDown, true);
document.addEventListener('pointermove', onPointerMove, true);
document.addEventListener('pointerup', onPointerUp, true);
document.addEventListener('keydown', onKeyDown, true);
window.addEventListener('scroll', redraw, true);
window.addEventListener('resize', redraw);

function isLayerNode(element: Element): boolean {
  return !!element.closest(`[${LAYER_ATTRIBUTE}]`);
}

function drawMarquee(x1: number, y1: number, x2: number, y2: number): void {
  let box = document.querySelector(`[${LAYER_ATTRIBUTE}][data-vil-marquee]`) as HTMLElement | null;
  if (!box) {
    box = document.createElement('div');
    box.setAttribute(LAYER_ATTRIBUTE, 'marquee');
    box.setAttribute('data-vil-marquee', '');
    box.style.cssText =
      `position:fixed;pointer-events:none;border:2px dashed ${ATTENTION_INK};background:${ATTENTION_FILL};border-radius:4px;z-index:2147483001;`;
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

function startDrag(element: HTMLElement, targetId: string, event: PointerEvent): void {
  const ghost = boxFor(element, 'selected', '');
  ghost.style.border = `2px solid ${SELECTION_INK}`;
  ghost.style.background = SELECTION_MARK_FILL;
  dragging = { element, targetId, startX: event.clientX, startY: event.clientY, ghost };
}

function updateDrag(event: PointerEvent): void {
  if (!dragging) {
    return;
  }
  const dx = event.clientX - dragging.startX;
  const dy = event.clientY - dragging.startY;
  const rect = dragging.element.getBoundingClientRect();
  dragging.ghost.style.left = `${rect.left + dx}px`;
  dragging.ghost.style.top = `${rect.top + dy}px`;
  dragging.ghost.style.width = `${rect.width}px`;
  dragging.ghost.style.height = `${rect.height}px`;
  const relation = computeRelation(dragging.element, rect, dx, dy, event);
  dragging.relation = relation;
  post({ source: 'vil-layer', type: 'relation-preview', sentence: relation ? relationSentence(relation, dragging.element) : null });
}

function finishDrag(): void {
  if (!dragging) {
    return;
  }
  const relation = dragging.relation;
  const element = dragging.element;
  dragging.ghost.remove();
  dragging = null;
  if (relation) {
    relation.relationshipId = `rel-${++relationCounter}`;
    post({ source: 'vil-layer', type: 'relation', relation, sentence: relationSentence(relation, element) });
  } else {
    post({ source: 'vil-layer', type: 'relation-preview', sentence: null });
  }
}

function computeRelation(
  dragged: HTMLElement,
  rect: DOMRect,
  dx: number,
  dy: number,
  event: PointerEvent
): LayerRelation | undefined {
  const others = targets.filter((target) => target.element && target.element !== dragged);
  if (others.length === 0) {
    return undefined;
  }
  const draggedCenterX = rect.x + dx + rect.width / 2;
  const draggedCenterY = rect.y + dy + rect.height / 2;
  const container = others.find((target) => {
    const other = target.element!.getBoundingClientRect();
    return draggedCenterX > other.left && draggedCenterX < other.right && draggedCenterY > other.top && draggedCenterY < other.bottom;
  });
  if (container) {
    return { relationshipId: '', type: 'containment', operator: 'member-of', targetIds: [dragging!.targetId, container.targetId] };
  }
  const nearest = others
    .map((target) => {
      const other = target.element!.getBoundingClientRect();
      const distance = Math.hypot(other.x + other.width / 2 - draggedCenterX, other.y + other.height / 2 - draggedCenterY);
      return { target, other, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]!;
  if (event.shiftKey) {
    const operator = Math.abs(dx) >= Math.abs(dy) ? 'same-width' : 'same-height';
    return { relationshipId: '', type: 'comparative-size', operator, targetIds: [dragging!.targetId, nearest.target.targetId] };
  }
  if (event.altKey) {
    return {
      relationshipId: '',
      type: 'spacing',
      operator: 'equal-gap',
      targetIds: targets.map((target) => target.targetId)
    };
  }
  if (event.metaKey || event.ctrlKey) {
    return {
      relationshipId: '',
      type: 'equivalence',
      operator: 'shared-property',
      targetIds: [dragging!.targetId, nearest.target.targetId]
    };
  }
  const verticalOverlap =
    Math.min(rect.bottom + dy, nearest.other.bottom) - Math.max(rect.top + dy, nearest.other.top);
  const horizontalGap = Math.abs(draggedCenterX - (nearest.other.x + nearest.other.width / 2));
  if (verticalOverlap > rect.height * 0.5 && horizontalGap > nearest.other.width * 0.6 && Math.abs(dx) > Math.abs(dy)) {
    return {
      relationshipId: '',
      type: 'ordering',
      operator: dx > 0 ? 'after' : 'before',
      targetIds: [dragging!.targetId, nearest.target.targetId]
    };
  }
  return alignmentFor(rect, dx, dy, nearest.other, nearest.target.targetId);
}

function alignmentFor(
  rect: DOMRect,
  dx: number,
  dy: number,
  other: DOMRect,
  otherId: string
): LayerRelation | undefined {
  const candidates: Array<{ operator: string; delta: number }> = [
    { operator: 'align-left', delta: Math.abs(rect.left + dx - other.left) },
    { operator: 'align-right', delta: Math.abs(rect.right + dx - other.right) },
    { operator: 'align-center', delta: Math.abs(rect.left + dx + rect.width / 2 - (other.left + other.width / 2)) },
    { operator: 'align-top', delta: Math.abs(rect.top + dy - other.top) },
    { operator: 'align-middle', delta: Math.abs(rect.top + dy + rect.height / 2 - (other.top + other.height / 2)) }
  ];
  candidates.sort((a, b) => a.delta - b.delta);
  const best = candidates[0];
  if (!best) {
    return undefined;
  }
  return { relationshipId: '', type: 'alignment', operator: best.operator, targetIds: [dragging!.targetId, otherId] };
}

function relationSentence(relation: LayerRelation, dragged: HTMLElement): string {
  const names = relation.targetIds.map((targetId) => {
    const target = targets.find((entry) => entry.targetId === targetId);
    return target?.label ?? (target?.element ? labelOf(target.element) : targetId);
  });
  const name = names[0] ?? labelOf(dragged);
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
      return `${names.join(' and ') || 'The selected targets'} should be equally spaced.`;
    case 'member-of':
      return `${name} should be contained inside ${other}.`;
    case 'shared-property':
      return `${name} and ${other} should share the same visible property.`;
    case 'same-width':
      return `${name} should be the same width as ${other}.`;
    case 'same-height':
      return `${name} should be the same height as ${other}.`;
    default:
      return `${name} and ${other} should ${relation.operator}.`;
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
      marks.push({ element, box: boxFor(element, chosenNodeId === id ? 'selected' : 'candidate', id) });
    }
  }
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        marks.push({ element, box: boxFor(element, 'selected', selector) });
      }
    } catch {
      continue;
    }
  }
  redraw();
}

function configure(nextTool: LayerTool): void {
  tool = nextTool;
  document.body.style.cursor = nextTool === 'pointer' ? '' : 'crosshair';
  if (nextTool !== 'element') {
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
    case 'remove-last':
      removeLast();
      break;
    case 'mark-targets':
      markBySelectors(message.selectors ?? [], message.nodeIds, message.chosenNodeId);
      break;
    case 'request-candidates':
      post({ source: 'vil-layer', type: 'candidates', candidates: extractCandidates(document), revision });
      break;
    case 'before-after':
      redraw();
      break;
  }
}

window.addEventListener('message', onMessage as EventListener);

overlay = ensureOverlay();
post({ source: 'vil-layer', type: 'ready' });