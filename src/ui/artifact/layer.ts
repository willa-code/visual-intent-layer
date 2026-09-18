import { provenanceForElement } from '../../adapters/source-stamp.js';
import { relationSentence } from '../../annotation/relations.js';
import { isArtifactDocument } from './bootstrap.js';
import type { ViewedState } from '../../resolution/model.js';
import type { CandidateMark, Grounding, LayerMessage, LayerRelation, LayerTarget, LayerTool, ShellMessage } from '../protocol.js';
import {
  LAYER_ATTRIBUTE,
  describeElement,
  elementByComposedSelector,
  describeRegion,
  describeTextRange,
  elementByNodeId,
  extractCandidates,
  isLayerNode,
  composedSelector,
  rectInReviewedViewport,
  walkComposedElements,
  type RectLike
} from './grounding.js';
import { elementOf, contentDocumentOf, type BoundaryRefusal } from './boundary.js';

const SELECTION_INK = '#2b5fd7';
const SELECTION_HOVER_FILL = 'rgba(43, 95, 215, 0.08)';
const ATTENTION_INK = '#6b4a00';
const ATTENTION_FILL = 'rgba(107, 74, 0, 0.12)';
const MIN_BOX = 12;
const DRAG_THRESHOLD = 5;
const MAX_AREA_TARGETS = 5;
const MAX_TARGETS = 8;
const ALIGN_TOLERANCE = 10;
const SPACING_TOLERANCE = 10;

const script = document.currentScript as HTMLScriptElement | null;
const sessionId = script?.dataset['session'] ?? '';
const revision = script?.dataset['revision'] ?? '';
const addressBase = (script?.dataset['addressBase'] ?? '').replace(/\/+$/, '');
const savedHtmlArtifact = addressBase.startsWith('/artifact/');
const parentWindow = window.parent !== window ? window.parent : undefined;

let tool: LayerTool = 'operate';
let targets: SelectedTarget[] = [];
let hovered: HTMLElement | null = null;
let marks: Mark[] = [];
let regionMarks: HTMLElement[] = [];
let candidateMarkBoxes: Array<{ box: HTMLElement; element: HTMLElement }> = [];
let boxDrag: { startX: number; startY: number; additive: boolean } | null = null;
let pointDrag: {
  startX: number;
  startY: number;
  startedOnSelected: boolean;
  moved: boolean;
  element: HTMLElement;
  ghost?: HTMLElement;
  relation?: LayerRelation;
  refusal?: string;
} | null = null;
let hoverBox: HTMLElement | null = null;
let targetCounter = 0;
let relationCounter = 0;
let overlay: HTMLElement;

type SelectedTarget = LayerTarget & { element?: HTMLElement };
type Mark = { element: HTMLElement; box: HTMLElement };

function post(message: LayerMessage): void {
  parentWindow?.postMessage(message, '*');
}

function postCandidates(trigger: 'shell' | 'view' = 'shell'): void {
  syncFrameDocuments();
  const address = addressOf();
  const extraction = extractCandidates(document);
  post({
    source: 'vil-layer',
    type: 'candidates',
    candidates: extraction.candidates,
    revision,
    trigger,
    ...(extraction.truncated ? { truncated: true } : {}),
    viewed: {
      ...(address ? { address } : {}),
      scroll: { x: window.scrollX, y: window.scrollY },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      ...(viewedDocuments().length > 0 ? { documents: viewedDocuments() } : {})
    }
  });
}

let candidateRequest: number | undefined;

function scheduleCandidateRequest(): void {
  if (pointDrag || boxDrag) {
    return;
  }
  if (candidateRequest !== undefined) {
    window.clearTimeout(candidateRequest);
  }
  candidateRequest = window.setTimeout(() => {
    candidateRequest = undefined;
    postCandidates('view');
  }, 250);
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

function boxFor(element: Element | null, kind: 'owned' | 'drawn' | 'candidate' | 'hover' | 'relation', label: string): HTMLElement {
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
        : kind === 'relation'
          ? `border:1px dashed ${SELECTION_INK};background:${SELECTION_HOVER_FILL};`
          : `border:1px solid ${SELECTION_INK};`;
  box.style.cssText = `position:fixed;pointer-events:none;border-radius:4px;box-sizing:border-box;${border}`;
  if (kind !== 'candidate') {
    box.setAttribute('aria-hidden', 'true');
  }
  overlay.appendChild(box);
  return box;
}

function positionBox(box: HTMLElement, element: Element): void {
  const rect = rectInReviewedViewport(element, document);
  box.style.left = `${rect.x}px`;
  box.style.top = `${rect.y}px`;
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
  const grounding = describeElement(element, document);
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

function addressOf(): string | undefined {
  return addressOfWindow(window);
}

function addressOfWindow(win: Window | null | undefined): string | undefined {
  if (!win) {
    return undefined;
  }
  const location = win.location;
  let path = location.pathname;
  if (addressBase && (path === addressBase || path.startsWith(`${addressBase}/`))) {
    path = path.slice(addressBase.length).replace(/^\/+/, '');
  }
  const relative = `${path}${location.search}${location.hash}`;
  return relative.length > 0 ? relative : undefined;
}

function documentChainFor(element: HTMLElement): NonNullable<LayerTarget['runtimeState']>['documents'] {
  const frames: HTMLElement[] = [];
  let win = element.ownerDocument.defaultView;
  while (win?.frameElement && win !== document.defaultView) {
    const frame = win.frameElement as HTMLElement;
    frames.unshift(frame);
    win = frame.ownerDocument.defaultView;
  }
  const chain = frames.map((frame) => {
    let inner: Document | null = null;
    try {
      inner = (frame as HTMLIFrameElement).contentDocument;
    } catch {
      inner = null;
    }
    const address = inner ? addressOfWindow(inner.defaultView) : undefined;
    const scroll = inner?.defaultView
      ? { x: inner.defaultView.scrollX, y: inner.defaultView.scrollY }
      : { x: 0, y: 0 };
    return { path: composedSelector(frame, document), ...(address ? { address } : {}), scroll };
  });
  return chain.length > 0 ? chain : undefined;
}

function viewedDocuments(): NonNullable<ViewedState['documents']> {
  return frameDocuments()
    .map((inner) => {
      const frame = inner.defaultView?.frameElement as HTMLElement | null;
      const address = addressOfWindow(inner.defaultView);
      return {
        path: frame ? composedSelector(frame, document) : '',
        ...(address ? { address } : {}),
        scroll: { x: inner.defaultView?.scrollX ?? 0, y: inner.defaultView?.scrollY ?? 0 }
      };
    })
    .filter((entry) => entry.path.length > 0);
}

function makeTarget(kind: LayerTarget['kind'], grounding: Grounding, element?: HTMLElement): SelectedTarget {
  const address = addressOf();
  const documents = element ? documentChainFor(element) : undefined;
  const target: SelectedTarget = {
    targetId: `t-${++targetCounter}`,
    kind,
    grounding,
    provenanceConfidence: 'unavailable',
    ...(element ? { element } : {}),
    ...(address || documents ? { runtimeState: { ...(address ? { address } : {}), ...(documents ? { documents } : {}) } } : {})
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

function isSelected(element: HTMLElement): boolean {
  return targets.some((target) => target.element === element);
}

function appendTarget(target: SelectedTarget): boolean {
  if (targets.length >= MAX_TARGETS) {
    post({
      source: 'vil-layer',
      type: 'notice',
      message: `A set holds at most ${MAX_TARGETS} targets, so that one was not added. Remove one first.`
    });
    return false;
  }
  targets = [...targets, target];
  return true;
}

function selectElement(element: HTMLElement, additive: boolean): void {
  if (!additive) {
    targets = [makeTarget('element', describeElement(element, document), element)];
    renderTargets();
    return;
  }
  if (isSelected(element)) {
    targets = targets.filter((entry) => entry.element !== element);
    renderTargets();
    return;
  }
  appendTarget(makeTarget('element', describeElement(element, document), element));
  renderTargets();
}

function clearSelection(): void {
  targets = [];
  renderTargets();
}

function selectEnclosed(rect: { x: number; y: number; width: number; height: number }, additive: boolean): void {
  const view = { width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY };
  const grounding = describeRegion(rect, view);
  const enclosed = enclosedElements(rect);
  const holes = unreadableHoles(rect);
  const labels: string[] = [];
  for (const element of enclosed) {
    const label = labelOf(element);
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  grounding.selectors = enclosed.flatMap((element) => describeElement(element, document).selectors ?? []).slice(0, MAX_AREA_TARGETS);
  const summary = labels.slice(0, MAX_AREA_TARGETS);
  if (summary.length > 0) {
    grounding.accessibleName = summary.join(', ');
  }
  const target = makeTarget('region', grounding);
  const enclosedText =
    summary.length > 0
      ? `${summary.join(', ')}${enclosed.length > summary.length ? ` and ${enclosed.length - summary.length} more` : ''}`
      : undefined;
  const holeText = holes.length > 0 ? holes.map(describeHole).join(' and ') : undefined;
  target.label =
    enclosedText && holeText
      ? `Area enclosing ${enclosedText}, and ${holeText}`
      : holeText
        ? `A drawn area over ${holeText}`
        : enclosedText
          ? `Area enclosing ${enclosedText}`
          : 'A drawn area enclosing nothing the artifact owns';
  if (additive) {
    appendTarget(target);
  } else {
    targets = [target];
  }
  renderTargets();
}

function describeHole(hole: BoundaryRefusal): string {
  switch (hole) {
    case 'closed-shadow-root':
      return 'a closed shadow root';
    case 'cross-origin-frame':
      return 'a frame served from another origin';
    case 'policy-blocked-frame':
      return "a frame the artifact's content policy blocks";
    case 'unloaded-frame':
      return 'a frame that has not loaded';
  }
}

function unreadableHoles(rect: { x: number; y: number; width: number; height: number }): BoundaryRefusal[] {
  const holes = new Set<BoundaryRefusal>();
  for (const frame of Array.from(document.querySelectorAll('iframe, frame'))) {
    if (!overlaps(rect, rectInReviewedViewport(frame, document))) {
      continue;
    }
    if (savedHtmlArtifact) {
      holes.add('policy-blocked-frame');
      continue;
    }
    const inner = contentDocumentOf(frame);
    if (inner) {
      continue;
    }
    holes.add(inner === null && !sameOrigin(frame) ? 'cross-origin-frame' : 'unloaded-frame');
  }
  return [...holes];
}

function sameOrigin(frame: Element): boolean {
  const src = frame.getAttribute('src');
  if (!src) {
    return true;
  }
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

function overlaps(
  rect: { x: number; y: number; width: number; height: number },
  box: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.x < rect.x + rect.width &&
    box.x + box.width > rect.x &&
    box.y < rect.y + rect.height &&
    box.y + box.height > rect.y
  );
}

function enclosedElements(rect: { x: number; y: number; width: number; height: number }): HTMLElement[] {
  const all = walkComposedElements(document).elements.filter((element) => !isLayerNode(element));
  const inside = all.filter((element) => {
    const box = rectInReviewedViewport(element, document);
    if (box.width === 0 || box.height === 0) {
      return false;
    }
    return (
      box.x >= rect.x - 1 &&
      box.y >= rect.y - 1 &&
      box.x + box.width <= rect.x + rect.width + 1 &&
      box.y + box.height <= rect.y + rect.height + 1
    );
  });
  const recognizable = inside.filter((element) => {
    const grounding = describeElement(element, document);
    return Boolean(grounding.accessibleName ?? grounding.semanticRole);
  });
  const leaves = recognizable.filter(
    (element) => !recognizable.some((other) => other !== element && element.contains(other))
  );
  return (leaves.length > 0 ? leaves : recognizable).slice(0, MAX_AREA_TARGETS);
}

function eventElement(event: Event): HTMLElement | null {
  return elementOf(event.composedPath()[0]);
}

function documentOfEvent(event: Event): Document {
  const first = event.composedPath()[0] as Node | undefined;
  return first?.ownerDocument ?? document;
}

function reviewedPoint(event: PointerEvent): { x: number; y: number } {
  const offset = viewportOffsetOf(documentOfEvent(event));
  return { x: event.clientX + offset.x, y: event.clientY + offset.y };
}

function viewportOffsetOf(doc: Document): { x: number; y: number } {
  const win = doc.defaultView;
  if (!win?.frameElement || win === document.defaultView) {
    return { x: 0, y: 0 };
  }
  const frame = win.frameElement as HTMLElement;
  const frameRect = frame.getBoundingClientRect();
  const parent = viewportOffsetOf(frame.ownerDocument);
  return { x: frameRect.x + frame.clientLeft + parent.x, y: frameRect.y + frame.clientTop + parent.y };
}

function elementAtPoint(clientX: number, clientY: number, doc: Document): HTMLElement | null {
  let element = doc.elementFromPoint(clientX, clientY) as HTMLElement | null;
  while (element?.shadowRoot) {
    const inner = element.shadowRoot.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!inner || inner === element) {
      break;
    }
    element = inner;
  }
  return element;
}

function frameDocuments(): Document[] {
  const docs: Document[] = [];
  for (const frame of Array.from(document.querySelectorAll('iframe, frame'))) {
    let inner: Document | null = null;
    try {
      inner = (frame as HTMLIFrameElement).contentDocument;
    } catch {
      inner = null;
    }
    if (inner && inner !== document && !docs.includes(inner)) {
      docs.push(inner);
    }
  }
  return docs;
}

const attachedDocuments = new Set<Document>();
const boundFrames = new Set<Element>();

function onPointerCancel(): void {
  if (pointDrag?.startedOnSelected) {
    cancelRelationDrag();
  }
}

function onViewportChange(): void {
  redraw();
  scheduleCandidateRequest();
}

function attachToDocument(doc: Document): void {
  if (attachedDocuments.has(doc)) {
    return;
  }
  attachedDocuments.add(doc);
  doc.addEventListener('pointerdown', onPointerDown, true);
  doc.addEventListener('pointermove', onPointerMove, true);
  doc.addEventListener('pointerup', onPointerUp, true);
  doc.addEventListener('pointercancel', onPointerCancel, true);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('keydown', onKeyDown, true);
  doc.defaultView?.addEventListener('scroll', onViewportChange, true);
  doc.defaultView?.addEventListener('resize', onViewportChange, true);
}

function syncFrameDocuments(): void {
  for (const frame of Array.from(document.querySelectorAll('iframe, frame'))) {
    if (!boundFrames.has(frame)) {
      boundFrames.add(frame);
      frame.addEventListener('load', () => {
        syncFrameDocuments();
        scheduleCandidateRequest();
      });
    }
    let inner: Document | null = null;
    try {
      inner = (frame as HTMLIFrameElement).contentDocument;
    } catch {
      inner = null;
    }
    if (inner) {
      attachToDocument(inner);
    }
  }
}

function refusalForEvent(event: Event): BoundaryRefusal | undefined {
  const doc = documentOfEvent(event);
  if (doc === document) {
    return undefined;
  }
  if (savedHtmlArtifact) {
    return 'policy-blocked-frame';
  }
  return undefined;
}

function postBoundaryRefusal(refusal: BoundaryRefusal): void {
  post({ source: 'vil-layer', type: 'notice', message: boundaryRefusalNotice(refusal) });
}

function boundaryRefusalNotice(refusal: BoundaryRefusal): string {
  switch (refusal) {
    case 'closed-shadow-root':
      return 'That host has a closed shadow root, so this surface cannot look inside it.';
    case 'cross-origin-frame':
      return 'That frame is served from another origin, so this surface cannot look inside it.';
    case 'policy-blocked-frame':
      return "That frame is blocked by the artifact's content policy, so this surface never loaded it and cannot look inside it.";
    case 'unloaded-frame':
      return 'That frame has not loaded, so there is nothing inside it to point at yet.';
  }
}

function onPointerDown(event: PointerEvent): void {
  if (candidateRequest !== undefined) {
    window.clearTimeout(candidateRequest);
    candidateRequest = undefined;
  }
  if (tool === 'operate' || event.button !== 0) {
    return;
  }
  const element = eventElement(event);
  if (!element || isLayerNode(element)) {
    return;
  }
  const refusal = refusalForEvent(event);
  if (refusal) {
    postBoundaryRefusal(refusal);
    return;
  }
  if (tool === 'box') {
    const start = reviewedPoint(event);
    boxDrag = { startX: start.x, startY: start.y, additive: event.shiftKey };
    return;
  }
  const startedOnSelected = targets.some(
    (target) => target.element === element || target.element?.contains(element)
  );
  pointDrag = { startX: event.clientX, startY: event.clientY, startedOnSelected, moved: false, element };
}

function onPointerMove(event: PointerEvent): void {
  if (boxDrag) {
    const point = reviewedPoint(event);
    drawMarquee(boxDrag.startX, boxDrag.startY, point.x, point.y);
    return;
  }
  if (pointDrag) {
    const distance = Math.hypot(event.clientX - pointDrag.startX, event.clientY - pointDrag.startY);
    if (distance > DRAG_THRESHOLD) {
      pointDrag.moved = true;
    }
    if (pointDrag.moved && pointDrag.startedOnSelected) {
      updateRelationDrag(event);
      return;
    }
  }
  if (tool === 'point') {
    const element = elementAtPoint(event.clientX, event.clientY, documentOfEvent(event));
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
    const point = reviewedPoint(event);
    const endX = point.x;
    const endY = point.y;
    const startX = start.startX;
    const startY = start.startY;
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    if (width < MIN_BOX || height < MIN_BOX) {
      post({
        source: 'vil-layer',
        type: 'notice',
        message: `That area is below the ${MIN_BOX}\u00d7${MIN_BOX} minimum, so no Annotation was made.`
      });
      return;
    }
    selectEnclosed(
      {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width,
        height
      },
      start.additive
    );
    return;
  }
  if (!pointDrag) {
    return;
  }
  const drag = pointDrag;
  pointDrag = null;
  if (drag.moved) {
    if (drag.startedOnSelected) {
      finishRelationDrag(drag);
      return;
    }
    const selection = selectionIn(drag.element);
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && selection.toString().trim().length > 0) {
      const target = makeTarget('text-range', describeTextRange(selection.getRangeAt(0), document));
      if (event.shiftKey) {
        appendTarget(target);
      } else {
        targets = [target];
      }
      renderTargets();
    }
    return;
  }
  const element = eventElement(event);
  if (!element || isLayerNode(element)) {
    return;
  }
  if (refusalForEvent(event)) {
    return;
  }
  selectElement(element, event.shiftKey);
}

function targetNameOf(targetId: string): string {
  const target = targets.find((entry) => entry.targetId === targetId);
  return target?.label ?? (target?.element ? labelOf(target.element) : targetId);
}

function updateRelationDrag(event: PointerEvent): void {
  const drag = pointDrag;
  if (!drag || !drag.moved || !drag.startedOnSelected) {
    return;
  }
  const rect = rectInReviewedViewport(drag.element, document);
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.ghost) {
    drag.ghost = boxFor(drag.element, 'relation', '');
    drag.ghost.setAttribute('aria-hidden', 'true');
  }
  drag.ghost.style.left = `${rect.left + dx}px`;
  drag.ghost.style.top = `${rect.top + dy}px`;
  drag.ghost.style.width = `${rect.width}px`;
  drag.ghost.style.height = `${rect.height}px`;
  drag.ghost.style.display = 'block';
  const result = computeRelation(drag.element, rect, dx, dy, {
    alt: event.altKey,
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey
  });
  drag.relation = result.relation;
  drag.refusal = result.refusal;
  post({
    source: 'vil-layer',
    type: 'relation-preview',
    sentence: drag.relation ? relationSentence(drag.relation, targetNameOf) : null
  });
}

function finishRelationDrag(drag: NonNullable<typeof pointDrag>): void {
  clearRelationGhost(drag);
  document.getSelection()?.removeAllRanges();
  const relation = drag.relation;
  if (!relation) {
    post({ source: 'vil-layer', type: 'relation-preview', sentence: null });
    post({
      source: 'vil-layer',
      type: 'notice',
      message: drag.refusal ?? 'That drag does not express a relation the product knows, so nothing was recorded.'
    });
    return;
  }
  relation.relationshipId = `rel-${++relationCounter}`;
  post({ source: 'vil-layer', type: 'relation', relation, sentence: relationSentence(relation, targetNameOf) });
}

function clearRelationGhost(drag: NonNullable<typeof pointDrag>): void {
  drag.ghost?.remove();
  drag.ghost = undefined;
}

function cancelRelationDrag(): void {
  const drag = pointDrag;
  if (!drag) {
    return;
  }
  pointDrag = null;
  clearRelationGhost(drag);
  document.getSelection()?.removeAllRanges();
  post({ source: 'vil-layer', type: 'relation-preview', sentence: null });
}

type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

function boxOfElement(element: HTMLElement): Box {
  const rect = rectInReviewedViewport(element, document);
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    width: rect.width,
    height: rect.height
  };
}

function boxOfTarget(target: SelectedTarget): Box | undefined {
  if (target.element?.isConnected) {
    return boxOfElement(target.element);
  }
  const bounds = target.grounding.boundingBox;
  if (!bounds) {
    return undefined;
  }
  return { left: bounds.x, top: bounds.y, right: bounds.x + bounds.width, bottom: bounds.y + bounds.height, width: bounds.width, height: bounds.height };
}

function computeRelation(
  dragged: HTMLElement,
  rect: RectLike,
  dx: number,
  dy: number,
  modifiers: { alt: boolean; ctrl: boolean; shift: boolean }
): { relation?: LayerRelation; refusal?: string } {
  const draggedTarget = targets.find((entry) => entry.element === dragged);
  if (!draggedTarget) {
    return {};
  }
  const box: Box = { left: rect.left + dx, top: rect.top + dy, right: rect.right + dx, bottom: rect.bottom + dy, width: rect.width, height: rect.height };
  const others = targets
    .filter((entry) => entry !== draggedTarget)
    .map((entry) => ({ target: entry, box: boxOfTarget(entry) }))
    .filter((entry): entry is { target: SelectedTarget; box: Box } => Boolean(entry.box));
  if (others.length === 0) {
    return {};
  }
  const draggedId = draggedTarget.targetId;
  const nearest = nearestTo(box, others);
  if (modifiers.alt) {
    if (targets.length < 3) {
      return { refusal: 'Equal spacing needs three or more targets, so nothing was recorded.' };
    }
    return { relation: spacingFor(box, draggedId, dx, dy) };
  }
  if (modifiers.ctrl) {
    return {
      relation: { relationshipId: '', type: 'equivalence', operator: 'shared-property', targetIds: [draggedId, nearest.target.targetId] }
    };
  }
  if (modifiers.shift) {
    const operator = Math.abs(dx) >= Math.abs(dy) ? 'same-width' : 'same-height';
    return {
      relation: { relationshipId: '', type: 'comparative-size', operator, targetIds: [draggedId, nearest.target.targetId] }
    };
  }
  return {
    relation:
      containmentFor(box, others, draggedId) ??
      orderingFor(box, dx, dy, nearest.box, draggedId, nearest.target.targetId) ??
      alignmentFor(box, nearest.box, draggedId, nearest.target.targetId)
  };
}

function nearestTo(box: Box, others: Array<{ target: SelectedTarget; box: Box }>): { target: SelectedTarget; box: Box } {
  return others
    .map((entry) => ({
      ...entry,
      distance: Math.hypot(
        entry.box.left + entry.box.width / 2 - (box.left + box.width / 2),
        entry.box.top + entry.box.height / 2 - (box.top + box.height / 2)
      )
    }))
    .sort((a, b) => a.distance - b.distance)[0]!;
}

function containmentFor(
  box: Box,
  others: Array<{ target: SelectedTarget; box: Box }>,
  draggedId: string
): LayerRelation | undefined {
  const centreX = box.left + box.width / 2;
  const centreY = box.top + box.height / 2;
  const container = others.find(
    (entry) =>
      centreX > entry.box.left &&
      centreX < entry.box.right &&
      centreY > entry.box.top &&
      centreY < entry.box.bottom
  );
  if (!container) {
    return undefined;
  }
  return { relationshipId: '', type: 'containment', operator: 'member-of', targetIds: [draggedId, container.target.targetId] };
}

function spacingFor(box: Box, draggedId: string, dx: number, dy: number): LayerRelation | undefined {
  const entries = targets
    .map((target) => {
      const targetBox = target.targetId === draggedId ? box : boxOfTarget(target);
      return targetBox ? { targetId: target.targetId, box: targetBox } : undefined;
    })
    .filter((entry): entry is { targetId: string; box: Box } => Boolean(entry));
  if (entries.length < 3) {
    return undefined;
  }
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const centres = entries
    .map((entry) => ({ targetId: entry.targetId, centre: horizontal ? entry.box.left + entry.box.width / 2 : entry.box.top + entry.box.height / 2 }))
    .sort((a, b) => a.centre - b.centre);
  const gaps = centres.slice(1).map((entry, index) => entry.centre - centres[index]!.centre);
  const smallest = Math.min(...gaps);
  const largest = Math.max(...gaps);
  if (smallest <= 0 || largest - smallest > SPACING_TOLERANCE) {
    return undefined;
  }
  return { relationshipId: '', type: 'spacing', operator: 'equal-gap', targetIds: centres.map((entry) => entry.targetId) };
}

function orderingFor(
  box: Box,
  dx: number,
  dy: number,
  other: Box,
  draggedId: string,
  otherId: string
): LayerRelation | undefined {
  if (Math.abs(dx) >= Math.abs(dy)) {
    const overlap = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
    if (overlap <= Math.min(box.height, other.height) * 0.5 || Math.abs(dx) < other.width * 0.6) {
      return undefined;
    }
    return { relationshipId: '', type: 'ordering', operator: dx > 0 ? 'after' : 'before', targetIds: [draggedId, otherId] };
  }
  const overlap = Math.min(box.right, other.right) - Math.max(box.left, other.left);
  if (overlap <= Math.min(box.width, other.width) * 0.5 || Math.abs(dy) < other.height * 0.6) {
    return undefined;
  }
  return { relationshipId: '', type: 'ordering', operator: dy > 0 ? 'after' : 'before', targetIds: [draggedId, otherId] };
}

function alignmentFor(
  box: Box,
  other: Box,
  draggedId: string,
  otherId: string
): LayerRelation | undefined {
  const candidates: Array<{ operator: LayerRelation['operator']; delta: number }> = [
    { operator: 'align-left', delta: Math.abs(box.left - other.left) },
    { operator: 'align-right', delta: Math.abs(box.right - other.right) },
    { operator: 'align-center', delta: Math.abs(box.left + box.width / 2 - (other.left + other.width / 2)) },
    { operator: 'align-top', delta: Math.abs(box.top - other.top) },
    { operator: 'align-middle', delta: Math.abs(box.top + box.height / 2 - (other.top + other.height / 2)) }
  ];
  const best = candidates.sort((a, b) => a.delta - b.delta)[0]!;
  if (best.delta > ALIGN_TOLERANCE) {
    return undefined;
  }
  return { relationshipId: '', type: 'alignment', operator: best.operator, targetIds: [draggedId, otherId] };
}

function onClick(event: MouseEvent): void {
  if (tool === 'operate') {
    return;
  }
  const element = eventElement(event);
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
  return elementByComposedSelector(selector, document) ?? null;
}

function markBySelectors(selectors: string[], nodeIds: string[], chosenNodeId?: string): void {
  targets = [];
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
    const element = elementByComposedSelector(selector, document);
    if (element) {
      marks.push({ element, box: boxFor(element, 'owned', selector) });
    }
  }
  redraw();
}

function configure(nextTool: LayerTool): void {
  tool = nextTool;
  pointDrag?.ghost?.remove();
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
    case 'cancel-relation':
      cancelRelationDrag();
      break;
    case 'mark-targets':
      markBySelectors(message.selectors ?? [], message.nodeIds, message.chosenNodeId);
      break;
    case 'mark-candidates':
      markCandidates(message.candidates);
      break;
    case 'request-candidates': {
      postCandidates();
      break;
    }
    case 'before-after':
      redraw();
      break;
  }
}

function onDocumentClick(event: MouseEvent): void {
  if (!addressBase.startsWith('/artifact/')) {
    return;
  }
  const target = eventElement(event);
  const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null | undefined;
  if (!anchor) {
    return;
  }
  if (anchor.target && anchor.target !== '_self') {
    return;
  }
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
    return;
  }
  if (!(url.pathname === addressBase || url.pathname.startsWith(`${addressBase}/`))) {
    return;
  }
  if (!/\.html?$/i.test(url.pathname)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  post({
    source: 'vil-layer',
    type: 'notice',
    message: `${documentNameOf(url.pathname)} is another document. This artifact is reviewed as one document, so it is not served with pointing.`,
    action: 'back-to-artifact'
  });
}

function documentNameOf(pathname: string): string {
  const name = pathname.split('/').filter(Boolean).pop() ?? pathname;
  return name;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !pointDrag) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  cancelRelationDrag();
}

function selectionIn(element: HTMLElement): Selection | null {
  const root = element.getRootNode() as ShadowRoot & { getSelection?: () => Selection | null };
  if (typeof root.getSelection === 'function') {
    const selection = root.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection;
    }
  }
  return element.ownerDocument.getSelection();
}

function start(): void {
  attachToDocument(document);
  document.addEventListener('click', onDocumentClick, true);
  window.addEventListener('blur', () => {
    if (pointDrag?.startedOnSelected) {
      cancelRelationDrag();
    }
  });
  window.addEventListener('load', syncFrameDocuments);
  window.addEventListener('message', onMessage as EventListener);
  window.addEventListener('visual-intent:applied-revision', ((event: CustomEvent<{ revision?: unknown }>) => {
    const supplied = event.detail?.revision;
    post({
      source: 'vil-layer',
      type: 'applied',
      ...(typeof supplied === 'string' && supplied.length > 0 ? { revision: supplied } : {})
    });
  }) as EventListener);
  overlay = ensureOverlay();
  syncFrameDocuments();
  post({ source: 'vil-layer', type: 'ready', revision });
}

if (isArtifactDocument(window.frameElement, sessionId)) {
  start();
}
void sessionId;
