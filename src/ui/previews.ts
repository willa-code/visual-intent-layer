import type { ComposerRelationship } from './composer.js';

export type PreviewKind = 'drag-to-reorder' | 'align' | 'match-size';

export type PreviewEvidence = {
  startedAt: string;
  confirmedAt?: string;
  discardedAt?: string;
};

export type ConfirmedPreview = {
  relationship: ComposerRelationship;
  preview: { previewId: string; kind: PreviewKind; reversible: true; interactionEvidence: PreviewEvidence };
};

export type PreviewHandle = {
  evidence: PreviewEvidence;
  confirm(): ConfirmedPreview;
  discard(): void;
};

let previewCounter = 0;
let relationshipCounter = 0;

export function createReorderPreview(doc: Document, elements: HTMLElement[], targetIds: string[]): PreviewHandle {
  const layer = ensureLayer(doc);
  const ghosts = elements.map((element) => ghostOf(doc, element));
  for (const ghost of ghosts) {
    layer.appendChild(ghost);
  }
  return handle(doc, layer, 'drag-to-reorder', {
    relationshipId: `r-preview-${++relationshipCounter}`,
    type: 'ordering',
    operator: 'before',
    targetIds: [...targetIds]
  });
}

export function createAlignPreview(
  doc: Document,
  elements: HTMLElement[],
  operator: 'align-left' | 'align-center' | 'align-right' | 'align-top' | 'align-middle',
  targetIds: string[]
): PreviewHandle {
  const layer = ensureLayer(doc);
  for (const element of elements) {
    layer.appendChild(ghostOf(doc, element));
  }
  return handle(doc, layer, 'align', {
    relationshipId: `r-preview-${++relationshipCounter}`,
    type: 'alignment',
    operator,
    targetIds: [...targetIds]
  });
}

export function createMatchSizePreview(
  doc: Document,
  source: HTMLElement,
  target: HTMLElement,
  operator: 'same-width' | 'same-height',
  targetIds: string[]
): PreviewHandle {
  const layer = ensureLayer(doc);
  const ghost = ghostOf(doc, target);
  const sourceRect = source.getBoundingClientRect();
  if (operator === 'same-width') {
    ghost.style.width = `${sourceRect.width}px`;
  } else {
    ghost.style.height = `${sourceRect.height}px`;
  }
  layer.appendChild(ghost);
  return handle(doc, layer, 'match-size', {
    relationshipId: `r-preview-${++relationshipCounter}`,
    type: 'comparative-size',
    operator,
    targetIds: [...targetIds]
  });
}

function handle(doc: Document, layer: HTMLElement, kind: PreviewKind, relationship: ComposerRelationship): PreviewHandle {
  const evidence: PreviewEvidence = { startedAt: new Date().toISOString() };
  const previewId = `preview-${++previewCounter}`;
  let settled = false;
  return {
    evidence,
    confirm(): ConfirmedPreview {
      evidence.confirmedAt = new Date().toISOString();
      settled = true;
      return { relationship, preview: { previewId, kind, reversible: true, interactionEvidence: { ...evidence } } };
    },
    discard(): void {
      if (!settled) {
        evidence.discardedAt = new Date().toISOString();
      }
      layer.remove();
      void doc;
    }
  };
}

function ensureLayer(doc: Document): HTMLElement {
  const existing = doc.getElementById('visual-intent-preview-layer');
  if (existing) {
    existing.remove();
  }
  const layer = doc.createElement('div');
  layer.id = 'visual-intent-preview-layer';
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
  doc.body.appendChild(layer);
  return layer;
}

function ghostOf(doc: Document, element: HTMLElement): HTMLElement {
  const rect = element.getBoundingClientRect();
  const ghost = doc.createElement('div');
  ghost.className = 'intent-ghost';
  ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border:2px solid #7c3aed;background:rgba(124,58,237,0.14);border-radius:4px;`;
  ghost.setAttribute('aria-hidden', 'true');
  return ghost;
}
