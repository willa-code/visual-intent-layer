import type { Annotation } from '../annotation/model.js';
import { approvalBlockers } from '../annotation/model.js';
import type { AgentPositionReport } from '../mcp/service.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import {
  agentPositionEl,
  candidateChooser,
  disclosureList,
  drawer,
  overflowMenu,
  pill,
  relationSentenceEl,
  resolutionItem,
  revisionChip,
  statePill,
  stateSwitch,
  toastElement,
  toolRow,
  verdictControls
} from './components.js';
import { button, h, iconButton } from './dom.js';

const COLOUR_TOKENS: Array<[string, string]> = [
  ['canvas', 'var(--canvas)'],
  ['surface', 'var(--surface)'],
  ['surface.raised', 'var(--surface-raised)'],
  ['surface.sunken', 'var(--surface-sunken)'],
  ['ink.primary', 'var(--ink-primary)'],
  ['ink.secondary', 'var(--ink-secondary)'],
  ['ink.muted', 'var(--ink-muted)'],
  ['line.default', 'var(--line-default)'],
  ['line.strong', 'var(--line-strong)'],
  ['accent', 'var(--accent)'],
  ['accent.ink', 'var(--accent-ink)']
];

const SEMANTIC_TOKENS: Array<[string, string, string]> = [
  ['attention', 'var(--attention-surface)', 'var(--attention-ink)'],
  ['progress', 'var(--progress-surface)', 'var(--progress-ink)'],
  ['success', 'var(--success-surface)', 'var(--success-ink)'],
  ['closed', 'var(--closed-surface)', 'var(--closed-ink)'],
  ['destructive', 'var(--destructive-surface)', 'var(--destructive-ink)']
];

const TYPE_TOKENS: Array<[string, string]> = [
  ['type.meta', 'var(--type-meta)'],
  ['type.label', 'var(--type-label)'],
  ['type.body', 'var(--type-body)'],
  ['type.panel.title', 'var(--type-panel-title)'],
  ['type.stage.title', 'var(--type-stage-title)'],
  ['type.identity', 'var(--type-identity)']
];

const RESOLUTION_RECORDS: TargetResolutionRecord[] = [
  { targetId: 't-1', match: 'exact', candidates: [], selectedNodeId: 'node-1', resolvedAt: '' },
  {
    targetId: 't-2',
    match: 'recovered',
    candidates: [{ candidate: { nodeId: 'node-2', selectors: ['main > button.cta'], accessibleName: 'Place order' }, score: 0.7, matchedAnchors: ['accessible-name'] }],
    selectedNodeId: 'node-2',
    resolvedAt: ''
  },
  {
    targetId: 't-3',
    match: 'unresolved',
    candidates: [
      { candidate: { nodeId: 'node-3', selectors: ['main > button.cta'], accessibleName: 'Place order' }, score: 0.5, matchedAnchors: [] },
      { candidate: { nodeId: 'node-4', selectors: ['aside > button.cta'], accessibleName: 'Place order' }, score: 0.48, matchedAnchors: [] }
    ],
    resolvedAt: ''
  },
  { targetId: 't-4', match: 'unresolved', candidates: [], resolvedAt: '' }
];

function sampleAnnotation(state: Annotation['state'], overrides: Partial<Annotation> = {}): Annotation {
  const targets: Annotation['targets'] = [
    {
      targetId: 't-1',
      kind: 'element',
      renderedGrounding: {
        selectors: ['main > button.checkout-submit'],
        boundingBox: { x: 320, y: 480, width: 200, height: 44, viewportWidth: 1280, viewportHeight: 800 },
        semanticRole: 'button',
        accessibleName: 'Place order'
      },
      provenanceConfidence: 'unavailable',
      label: 'Place order button'
    }
  ];
  const relationships: Annotation['relationships'] =
    state === 'draft'
      ? [{ relationshipId: 'rel-1', type: 'alignment', operator: 'align-left', targetIds: ['t-1'] }]
      : [];
  return {
    annotationId: `ann-${state}`,
    artifactId: 'artifact-demo',
    writtenRevision: 'blake3:demo',
    revisionRelation: 'current',
    state,
    order: 0,
    note: 'Make the Place order button impossible to miss.',
    targets,
    relationships,
    references: [],
    attachments: [],
    resolutions: [],
    chosenCandidates: {},
    history: [],
    createdAt: '',
    updatedAt: '',
    ...overrides
  };
}

function swatch(label: string, value: string, ink?: string): HTMLElement {
  return h(
    'div',
    { class: 'swatch' },
    h('div', { class: 'swatch__chip', style: { background: value, ...(ink ? { color: ink } : {}) } }, ink ? 'Aa' : ''),
    h('div', { class: 'swatch__label', text: label })
  );
}

function panel(title: string, ...children: Array<Node | string | null>): HTMLElement {
  return h('div', { class: 'gallery__panel' }, h('h3', { class: 'panel__title', text: title }), ...children);
}

function themeSection(theme: 'light' | 'dark'): HTMLElement {
  const agentStates: AgentPositionReport[] = [
    { position: 'awaiting-you', sentence: 'Your agent is holding the call and waiting for you right now.', hostCanHold: true, queuedDurably: 0 },
    { position: 'working', sentence: 'Your agent is working.', hostCanHold: false, queuedDurably: 0 },
    { position: 'acknowledged', sentence: 'Your agent has acknowledged the direction.', hostCanHold: false, queuedDurably: 0 },
    { position: 'stepped-away', sentence: 'Your agent has stepped away; 2 Annotations are queued durably.', hostCanHold: false, queuedDurably: 2 }
  ];
  const section = h(
    'section',
    { class: 'gallery', dataset: { theme }, attrs: { 'data-theme': theme, style: `background: var(--canvas); color: var(--ink-primary); padding: 24px; border-radius: 16px;` } },
    h('h1', { text: `${theme === 'light' ? 'Light' : 'Dark'} design language` }),
    h('h2', { text: 'Colour primitives' }),
    h('div', { class: 'gallery__row' }, ...COLOUR_TOKENS.map(([label, value]) => swatch(label, value))),
    h('h2', { text: 'Semantic surface pairs' }),
    h('div', { class: 'gallery__row' }, ...SEMANTIC_TOKENS.map(([label, surface, ink]) => swatch(label, surface, ink))),
    h('h2', { text: 'Type scale' }),
    h(
      'div',
      { class: 'gallery__row' },
      ...TYPE_TOKENS.map(([label, value]) =>
        panel(label, h('p', { text: `The quick brown fox — ${label}`, style: { font: value, margin: '0' } }))
      )
    ),
    h('h2', { text: 'Spacing, metrics, radius, elevation and motion' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel(
        'spacing',
        h(
          'div',
          { class: 'gallery__row' },
          [4, 8, 12, 16, 20, 24, 32, 40, 48].map((value) =>
            h('div', { class: 'swatch' }, h('div', { class: 'swatch__chip', style: { background: 'var(--accent)', width: `${value}px`, height: '12px' } }), h('div', { class: 'swatch__label', text: `${value}` }))
          )
        )
      ),
      panel(
        'metrics',
        h('p', { class: 'hint', text: 'Top bar 48 · panel 380 · drawer 380 · card max 340 · control 32 / 28 / 36 · icon 28' })
      ),
      panel('radius', h('div', { class: 'gallery__row' }, h('div', { style: { width: '56px', height: '40px', background: 'var(--surface-sunken)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-input)' } }), h('div', { style: { width: '56px', height: '40px', background: 'var(--surface-sunken)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-card)' } }), h('div', { style: { width: '56px', height: '40px', background: 'var(--surface-sunken)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-overlay)' } }), h('div', { style: { width: '56px', height: '40px', background: 'var(--surface-sunken)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-pill)' } }))),
      panel('elevation', h('div', { class: 'gallery__row' }, h('div', { style: { width: '80px', height: '48px', background: 'var(--surface)', border: '1px solid var(--line-default)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-card)' } }), h('div', { style: { width: '80px', height: '48px', background: 'var(--surface)', border: '1px solid var(--line-default)', borderRadius: 'var(--radius-overlay)', boxShadow: 'var(--elevation-overlay)' } }))),
      panel('motion', h('p', { class: 'hint', text: 'fast · base · deliberate, easing cubic-bezier(.2,.8,.2,1); reduced motion removes transitions and lift' }))
    ),
    h('h2', { text: 'State vocabulary' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel(
        'Annotation states',
        h(
          'div',
          { class: 'chips' },
          (
            ['draft', 'queued', 'delivered', 'resolved', 'acknowledged', 'verified', 'rejected', 'another-pass', 'superseded', 'obsolete'] as Annotation['state'][]
          ).map((state) => statePill(state))
        )
      ),
      panel('Resolution labels', h('ul', { class: 'resolution-list' }, ...RESOLUTION_RECORDS.map((record) => resolutionItem(record, record.targetId)))),
      panel(
        'Revision',
        revisionChip('blake3:0123456789abcdef', false, 'current revision'),
        revisionChip('blake3:0123456789abcdef', true, 'written before this revision')
      ),
      panel('Provenance confidence labelled separately', pill('exact source span', 'progress'), ' ', pill('inferred', 'closed'), ' ', pill('unavailable', 'attention'))
    ),
    h('h2', { text: 'Agent position' }),
    h('div', { class: 'gallery__row' }, ...agentStates.map((state) => panel(state.position, agentPositionEl(state)))),
    h('h2', { text: 'Controls' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel('Button', ...[
        button('Primary', { variant: 'primary' }),
        ' ',
        button('Secondary', { variant: 'secondary' }),
        ' ',
        button('Ghost', { variant: 'ghost' }),
        ' ',
        button('Destructive', { variant: 'destructive' }),
        ' ',
        button('Disabled', { disabled: true })
      ]),
      panel('IconButton', iconButton('More actions', '⋯', () => undefined)),
      panel('Pill / Badge', pill('matched', 'success'), ' ', pill('ambiguous', 'attention'), ' ', h('span', { class: 'badge', text: '3' })),
      panel('StateSwitch', stateSwitch('review', { onSelect: () => undefined }), ' ', stateSwitch('verify', { onSelect: () => undefined })),
      panel('ToolRow', toolRow('element', () => undefined)),
      panel('OverflowMenu', overflowMenu({ open: true, items: [{ label: 'Reload artifact', onSelect: () => undefined }, { label: 'End session', onSelect: () => undefined }] })),
      panel(
        'Textarea / Select',
        h('textarea', { class: 'textarea', attrs: { rows: '3' }, text: 'Make the Place order button impossible to miss.' }),
        h('select', { class: 'select' }, h('option', { text: 'Next pass' }), h('option', { text: 'Steering' }))
      ),
      panel('Toast', toastElement()),
      panel('RelationSentence', relationSentenceEl(sampleAnnotation('draft')) ?? h('span')),
      panel('BeforeAfterToggle (reference)', h('div', { class: 'before-after' }, h('button', { attrs: { 'aria-pressed': 'false' }, text: 'Before the change' }), h('button', { attrs: { 'aria-pressed': 'true' }, text: 'After the change' }))),
      panel('Drawer (open)', drawer({ open: true, title: 'Needs you', onClose: () => undefined }, disclosureList([{ title: 'Annotation would leave on send', body: 'Selector, role, name, box' }])))
    ),
    h('h2', { text: 'Annotations and verification' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel('Queue list', queueItemSample()),
      panel('AnnotationRow — ambiguous', annotationRowSample(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[2]!], chosenCandidates: {} }))),
      panel('AnnotationRow — deleted', annotationRowSample(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[3]!] }))),
      panel('AnnotationRow — advanced', annotationRowSample(sampleAnnotation('acknowledged', { revisionRelation: 'advanced', resolutions: [RESOLUTION_RECORDS[1]!] }))),
      panel('CandidateChooser', candidateChooser(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[2]!] }), 't-3', RESOLUTION_RECORDS[2]!, () => undefined)),
      panel('VerdictControls', verdictControls(sampleAnnotation('acknowledged'), { blocked: [], onVerdict: () => undefined })),
      panel('VerdictControls blocked', verdictControls(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[3]!] }), { blocked: ['Place order button could not be found in this revision, so approval is blocked.'], onVerdict: () => undefined })),
      panel('AttachmentChip', attachmentChipSample())
    ),
    h('h2', { text: 'Component inventory' }),
    inventoryRow()
  );
  return section;
}

function inventoryRow(): HTMLElement {
  return h(
    'div',
    { class: 'gallery__row' },
    panel(
      'AttentionTrigger',
      h('button', { class: 'attention-trigger', type: 'button' }, h('span', { text: 'Needs you' }), h('span', { class: 'attention-trigger__badge', text: '3' })),
      h('button', { class: 'attention-trigger', type: 'button', hidden: true, text: 'hidden at zero' })
    ),
    panel(
      'AnchoredCard / AnnotationCard',
      h(
        'div',
        { class: 'anchored-card', style: { position: 'static', width: '100%' } },
        h('p', { class: 'anchored-card__target', text: 'Target 1 of 1 — Place order button' }),
        h('label', { class: 'field__label', text: 'What should change?' }),
        h('textarea', { class: 'textarea', attrs: { rows: '3' }, text: 'Make the Place order button impossible to miss.' }),
        h('p', { class: 'relation-sentence', text: 'Preview — not recorded yet: Buy button should align on the left.' }),
        h('div', { class: 'anchored-card__actions' }, button('Queue', { variant: 'primary' }), h('div', { class: 'chips' }, iconButton('Remove the last target', '⌫', () => undefined), iconButton('Attach a reference image', '🖼', () => undefined), iconButton('Delete Annotation', '×', () => undefined)))
      )
    ),
    panel('Composer', h('textarea', { class: 'textarea', attrs: { rows: '3' }, text: 'Empty, typing and over-threshold share this control.' }), h('textarea', { class: 'textarea', dataset: { overThreshold: 'true' }, attrs: { rows: '2' }, text: 'Over threshold.' })),
    panel(
      'SendControls',
      h('select', { class: 'select' }, h('option', { text: 'Next pass — queue for a clean turn' }), h('option', { text: 'Steering — at the next safe boundary' })),
      button('Send the queue', { variant: 'primary' }),
      button('Send the queue', { variant: 'primary', disabled: true, title: 'There is nothing queued to send.' }),
      h('p', { class: 'hint', text: 'Send is disabled because the Annotation Queue is empty.' })
    ),
    panel('ScrollArea', h('div', { class: 'panel__scroll', style: { maxHeight: '160px', border: '1px solid var(--line-default)', borderRadius: 'var(--radius-card)' } }, Array.from({ length: 12 }, (_, index) => h('p', { class: 'hint', text: `Scrollable row ${index + 1}` })))),
    panel('Listbox', h('select', { class: 'select', attrs: { size: '4' } }, h('option', { text: 'Pointer' }), h('option', { text: 'Element' }), h('option', { text: 'Text' }), h('option', { text: 'Region' }))),
    panel('Dialog', drawer({ open: true, title: 'Needs you', onClose: () => undefined }, h('p', { class: 'hint', text: 'Chrome layers may trap focus; the artifact never does.' }))),
    panel('Tooltip', h('button', { class: 'button', type: 'button', title: 'Hover or focus for the tooltip', text: 'Focusable control' })),
    panel(
      'ArtifactFrame states',
      h('p', { class: 'hint', text: 'loading · ready · unreachable · policy-blocked' }),
      h('div', { class: 'stage__placeholder', style: { position: 'static', padding: '16px' } }, h('h2', { text: 'This artifact will contact a remote origin' }), h('ul', {}, h('li', {}, h('code', { text: 'https://cdn.example.com' }))))
    ),
    panel(
      'OverlayMark / Marquee / RelationGuide',
      h(
        'div',
        { style: { position: 'relative', height: '120px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-card)' } },
        h('div', { style: { position: 'absolute', left: '12px', top: '12px', width: '90px', height: '34px', border: '1px solid var(--accent)', background: 'rgba(43,95,215,.14)', borderRadius: '4px' } }),
        h('div', { style: { position: 'absolute', left: '120px', top: '12px', width: '90px', height: '34px', border: '2px dashed var(--attention-ink)', background: 'rgba(107,74,0,.12)', borderRadius: '4px' } }),
        h('div', { style: { position: 'absolute', left: '12px', top: '70px', width: '198px', height: '2px', background: 'var(--accent)' } }),
        h('div', { style: { position: 'absolute', left: '12px', top: '64px', width: '12px', height: '12px', borderRadius: '999px', background: 'var(--accent)' } })
      )
    )
  );
}

function queueItemSample(): HTMLElement {
  const annotation = sampleAnnotation('queued');
  return h(
    'li',
    { class: 'queue-item', attrs: { 'data-active': 'true' } },
    h(
      'div',
      { class: 'queue-item__body' },
      h('div', { class: 'queue-item__meta' }, statePill(annotation.state), pill('1 target')),
      h('p', { class: 'queue-item__note', text: annotation.note })
    )
  );
}

function annotationRowSample(annotation: Annotation): HTMLElement {
  const row = h(
    'article',
    { class: 'annotation-row' },
    h('div', { class: 'annotation-row__head' }, statePill(annotation.state), annotation.revisionRelation === 'advanced' ? pill('Written before this revision', 'attention', '◆') : pill('Written against this revision', 'closed', '=')),
    h('p', { class: 'annotation-row__note', text: annotation.note }),
    relationSentenceEl(annotation) ?? h('span'),
    h('ul', { class: 'resolution-list' }, ...annotation.resolutions.map((record) => resolutionItem(record, record.targetId))),
    verdictControls(annotation, { blocked: approvalBlockers(annotation), onVerdict: () => undefined })
  );
  return row;
}

function attachmentChipSample(): HTMLElement {
  return h(
    'div',
    { class: 'chips' },
    h('span', { class: 'chip', dataset: { state: 'uploading' }, attrs: { 'data-state': 'uploading' } }, 'uploading… reference.png'),
    h('span', { class: 'chip', dataset: { state: 'ready' }, attrs: { 'data-state': 'ready' } }, 'reference.png'),
    h('span', { class: 'chip', dataset: { state: 'failed' }, attrs: { 'data-state': 'failed' } }, 'failed — retry')
  );
}

document.body.classList.add('gallery-body');
document.body.append(themeSection('light'), themeSection('dark'));
document.documentElement.dataset['galleryReady'] = 'true';