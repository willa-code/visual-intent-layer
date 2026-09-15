import { buildEnvelope, type ComposerRelationship } from './composer.js';
import { attachSelection, type SelectedTarget } from './selection.js';

export type ReviewMode = 'explore' | 'select' | 'direct';

export type ModeMachine = {
  current: ReviewMode;
  enter(mode: ReviewMode): void;
};

export function modeMachine(onChange?: (mode: ReviewMode) => void): ModeMachine {
  const machine: ModeMachine = {
    current: 'explore',
    enter(mode: ReviewMode): void {
      if (mode !== 'explore' && mode !== 'select' && mode !== 'direct') {
        throw new Error(`unknown mode: ${String(mode)}`);
      }
      machine.current = mode;
      onChange?.(mode);
    }
  };
  return machine;
}

export type Box = { x: number; y: number; width: number; height: number };
export type Viewport = { width: number; height: number };

export type Grounding = {
  selectors?: string[];
  boundingBox: Box & { viewportWidth?: number; viewportHeight?: number; devicePixelRatio?: number };
  textEvidence?: { exactText: string; prefix: string; suffix: string; startOffset: number; endOffset: number };
  semanticRole?: string;
  accessibleName?: string;
  structuralContext?: { ancestorChain: string[]; siblingIndex: number; siblingCount: number };
  geometry?: { centerX: number; centerY: number };
  stableRuntimeId?: string;
};

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
  table: 'table'
};

export function describeElement(element: HTMLElement): Grounding {
  const rect = element.getBoundingClientRect();
  const grounding: Grounding = {
    selectors: [cssPath(element)],
    boundingBox: boxOf(rect),
    semanticRole: element.getAttribute('role') ?? IMPLICIT_ROLES[element.tagName.toLowerCase()],
    accessibleName: accessibleNameOf(element) || undefined,
    structuralContext: {
      ancestorChain: ancestorChainOf(element),
      siblingIndex: siblingIndexOf(element),
      siblingCount: siblingCountOf(element)
    },
    geometry: { centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 }
  };
  const runtimeId = element.getAttribute('data-visual-intent-id');
  if (runtimeId) {
    grounding.stableRuntimeId = runtimeId;
  }
  return grounding;
}

export function describeTextRange(range: Range): Grounding {
  const container =
    range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : (range.commonAncestorContainer.parentElement as HTMLElement | null);
  const fullText = container?.textContent ?? range.toString();
  const exactText = range.toString();
  const startOffset = textOffsetOf(range);
  const grounding: Grounding = {
    selectors: container ? [cssPath(container)] : [],
    boundingBox: boxOf(range.getBoundingClientRect()),
    textEvidence: {
      exactText,
      prefix: fullText.slice(Math.max(0, startOffset - 32), startOffset),
      suffix: fullText.slice(startOffset + exactText.length, startOffset + exactText.length + 32),
      startOffset,
      endOffset: startOffset + exactText.length
    }
  };
  if (container) {
    grounding.semanticRole =
      container.getAttribute('role') ?? IMPLICIT_ROLES[container.tagName.toLowerCase()];
    grounding.structuralContext = {
      ancestorChain: ancestorChainOf(container),
      siblingIndex: siblingIndexOf(container),
      siblingCount: siblingCountOf(container)
    };
  }
  return grounding;
}

export function describeRegion(rect: Box, viewport: Viewport): Grounding {
  return {
    selectors: [],
    boundingBox: { ...rect, viewportWidth: viewport.width, viewportHeight: viewport.height },
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

function boxOf(rect: { x: number; y: number; width: number; height: number }): Grounding['boundingBox'] {
  const viewportWidth = typeof window === 'undefined' ? undefined : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? undefined : window.innerHeight;
  const devicePixelRatio = typeof window === 'undefined' ? undefined : window.devicePixelRatio;
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewportWidth, viewportHeight, devicePixelRatio };
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

export function mountReviewChrome(root: Document): void {
  const body = root.body;
  const explorer = root.getElementById('mode-explore') as HTMLButtonElement | null;
  const selector = root.getElementById('mode-select') as HTMLButtonElement | null;
  const director = root.getElementById('mode-direct') as HTMLButtonElement | null;
  const frame = root.getElementById('artifact-frame') as HTMLIFrameElement | null;
  if (!explorer || !selector || !director) {
    return;
  }
  const buttons: Array<[ReviewMode, HTMLButtonElement]> = [
    ['explore', explorer],
    ['select', selector],
    ['direct', director]
  ];
  const machine = modeMachine((mode) => {
    body.dataset['activeMode'] = mode;
    for (const [name, button] of buttons) {
      button.setAttribute('aria-selected', String(name === mode));
    }
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({ type: 'visual-intent:mode', mode }, '*');
    }
    root.dispatchEvent(new CustomEvent('visual-intent:mode', { detail: mode }));
  });
  for (const [name, button] of buttons) {
    button.addEventListener('click', () => machine.enter(name));
  }
  root.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && machine.current !== 'explore') {
      machine.enter('explore');
    }
    if ((event.key === '1' || event.key === '2' || event.key === '3') && !isTyping(event)) {
      machine.enter(event.key === '1' ? 'explore' : event.key === '2' ? 'select' : 'direct');
    }
  });
  wireComposer(root);
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return !!target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable);
}

export function wireComposer(root: Document): void {
  const frame = root.getElementById('artifact-frame') as HTMLIFrameElement | null;
  const summary = root.getElementById('selection-summary');
  const evidence = root.getElementById('grounding-evidence');
  const evidenceList = root.getElementById('evidence-list');
  const direction = root.getElementById('direction-text') as HTMLTextAreaElement | null;
  const delivery = root.getElementById('delivery-intent') as HTMLSelectElement | null;
  const submit = root.getElementById('submit-intent') as HTMLButtonElement | null;
  const deliveryState = root.getElementById('delivery-state');
  if (!frame || !summary || !evidence || !direction || !delivery || !submit || !deliveryState) {
    return;
  }
  const sessionId = root.body.dataset['session'] ?? '';
  const capability = root.body.dataset['cap'] ?? '';
  let targets: SelectedTarget[] = [];
  let relationships: ComposerRelationship[] = [];
  let relationshipCounter = 0;
  const envelopeId = `env-${crypto.randomUUID()}`;
  const idempotencyKey = `idem-${crypto.randomUUID()}`;

  function renderTargets(): void {
    if (targets.length === 0) {
      summary!.textContent = 'No targets selected. Enter Select mode and click the interface.';
      evidence!.innerHTML = '';
      if (evidenceList) {
        evidenceList.textContent = 'Select targets to preview the envelope evidence.';
      }
      return;
    }
    summary!.textContent =
      targets.length === 1
        ? `1 target selected: ${labelOf(targets[0]!)}`
        : `${targets.length} targets selected: ${targets.map(labelOf).join(', ')}`;
    evidence!.innerHTML = targets.map((target) => evidenceCard(target)).join('');
    if (evidenceList) {
      evidenceList.innerHTML = `<ul>${targets
        .map((target) => `<li>${escapeHtml(labelOf(target))}: selectors, bounding box, role/name evidence</li>`)
        .join('')}</ul><p>Plus written direction, relationships, revision identity, and uncertainty. No source files leave the machine unless exact provenance is shown above.</p>`;
    }
  }

  frame.addEventListener('load', () => {
    const frameDoc = frame.contentDocument;
    if (!frameDoc) {
      return;
    }
    const selection = attachSelection(frameDoc, {
      onHover: () => undefined,
      onSelection: (next) => {
        targets = next;
        renderTargets();
      }
    });
    selection.setMode(root.body.dataset['activeMode'] as ReviewMode);
    root.addEventListener('visual-intent:mode', (event) => {
      selection.setMode((event as CustomEvent<ReviewMode>).detail);
    });
  });

  root.getElementById('rel-add')?.addEventListener('click', () => {
    const type = (root.getElementById('rel-type') as HTMLSelectElement).value;
    const operator = (root.getElementById('rel-operator') as HTMLSelectElement).value;
    const list = root.getElementById('rel-list');
    if (targets.length < 2 || !list) {
      return;
    }
    const entry = {
      relationshipId: `r-${++relationshipCounter}`,
      type,
      operator,
      targetIds: targets.map((target) => target.targetId)
    } as ComposerRelationship;
    relationships = [...relationships, entry];
    const item = root.createElement('li');
    item.textContent = `${entry.type} ${entry.operator} across ${entry.targetIds.length} targets`;
    list.appendChild(item);
  });

  submit.addEventListener('click', () => {
    void (async () => {
      deliveryState!.textContent = '';
      try {
        const envelope = buildEnvelope({
          envelopeId,
          idempotencyKey,
          artifact: {
            id: `artifact-${sessionId}`,
            kind: 'saved-html',
            revision: root.body.dataset['revision'] ?? '',
            displayName: root.title
          },
          targets: targets.map((target) => ({
            targetId: target.targetId,
            kind: target.kind,
            grounding: target.grounding,
            label: labelOf(target)
          })),
          direction: direction!.value,
          deliveryIntent: delivery!.value as 'draft' | 'steering' | 'next-pass',
          relationships
        });
        const response = await fetch(`/api/intents?session=${sessionId}&cap=${capability}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ envelope })
        });
        if (!response.ok) {
          deliveryState!.textContent = `Not delivered: ${await response.text()}`;
          return;
        }
        const result = (await response.json()) as { status: string };
        deliveryState!.textContent = `Delivered: ${result.status}. The agent has not acted yet; only your verification completes this intent.`;
        showVerification(root, sessionId, capability, envelopeId);
      } catch (error) {
        deliveryState!.textContent = error instanceof Error ? error.message : String(error);
      }
    })();
  });

  pollRevisions(root, sessionId, capability);
}

function labelOf(target: SelectedTarget): string {
  return (
    target.grounding.accessibleName ??
    target.grounding.textEvidence?.exactText ??
    target.grounding.semanticRole ??
    target.kind
  );
}

function evidenceCard(target: SelectedTarget): string {
  const grounding = target.grounding;
  const rows = [
    ['Kind', target.kind],
    ['Selector', grounding.selectors?.[0] ?? '(spatial only)'],
    ['Role', grounding.semanticRole ?? '—'],
    ['Name', grounding.accessibleName ?? '—'],
    [
      'Box',
      `${Math.round(grounding.boundingBox.x)}, ${Math.round(grounding.boundingBox.y)} · ${Math.round(grounding.boundingBox.width)}×${Math.round(grounding.boundingBox.height)}`
    ],
    ['Text', grounding.textEvidence?.exactText ?? '—']
  ];
  return `<article class="evidence-card"><h4>${escapeHtml(labelOf(target))}</h4><dl>${rows
    .map(([term, value]) => `<dt>${term}</dt><dd>${escapeHtml(value ?? '—')}</dd>`)
    .join('')}</dl>${provenanceLabel(target)}</article>`;
}

function provenanceLabel(target: SelectedTarget): string {
  if (target.sourceProvenance) {
    const provenance = target.sourceProvenance;
    return `<p class="provenance exact">Source Provenance (exact): ${escapeHtml(provenance.file)}:${provenance.line}:${provenance.column}${provenance.component ? ` · ${escapeHtml(provenance.component)}` : ''}</p>`;
  }
  return '<p class="provenance">Rendered Grounding — no source claim</p>';
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pollRevisions(root: Document, sessionId: string, capability: string): void {
  const banner = root.getElementById('revision-banner');
  const label = root.getElementById('revision-label');
  if (!banner || !label) {
    return;
  }
  const opened = root.body.dataset['revision'] ?? '';
  async function poll(): Promise<void> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}?cap=${capability}`);
      if (!response.ok) {
        return;
      }
      const status = (await response.json()) as { currentRevision: string; changed: boolean };
      if (status.changed) {
        banner!.hidden = false;
        banner!.textContent = `The artifact changed under review. Opened ${opened.slice(0, 18)}…, now ${status.currentRevision.slice(0, 18)}…. Reload the frame to review the new revision; your intent stays attached to the opened revision until you verify.`;
        label!.textContent = `${opened} → ${status.currentRevision}`;
      }
    } catch {
      return;
    }
  }
  window.setInterval(() => void poll(), 2000);
  void poll();
}

function showVerification(root: Document, sessionId: string, capability: string, envelopeId: string): void {
  const section = root.getElementById('verification');
  const resolutions = root.getElementById('resolution-list');
  const state = root.getElementById('verdict-state');
  if (!section || !resolutions || !state) {
    return;
  }
  section.hidden = false;
  async function refresh(): Promise<void> {
    const response = await fetch(`/api/intents/${envelopeId}?session=${sessionId}&cap=${capability}`);
    if (!response.ok) {
      return;
    }
    const status = (await response.json()) as {
      status: string;
      resolutions: Array<{ targetId: string; outcome: string }>;
    };
    resolutions!.innerHTML =
      status.resolutions.length === 0
        ? `<p>Lifecycle: ${escapeHtml(status.status)}. Targets re-resolve after the next artifact revision.</p>`
        : `<ul>${status.resolutions
            .map((entry) => `<li>${escapeHtml(entry.targetId)}: <strong>${escapeHtml(entry.outcome)}</strong></li>`)
            .join('')}</ul>`;
  }
  section.querySelectorAll('button[data-verdict]').forEach((button) => {
    button.addEventListener('click', () => {
      void (async () => {
        const verdict = (button as HTMLButtonElement).dataset['verdict'] ?? '';
        const response = await fetch(`/api/intents/${envelopeId}/verify?session=${sessionId}&cap=${capability}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ verdict })
        });
        state!.textContent = response.ok
          ? `Recorded: ${(await response.json() as { status: string }).status}`
          : `Refused: ${await response.text()}`;
        void refresh();
      })();
    });
  });
  void refresh();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && document.getElementById('mode-explore')) {
  mountReviewChrome(document);
}
