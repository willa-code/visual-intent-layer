import type { Annotation } from '../annotation/model.js';
import { approvalBlockers } from '../annotation/model.js';
import type { AgentPositionReport } from '../mcp/service.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import {
  agentPositionEl,
  attachmentChips,
  candidateChooser,
  checkedSentence,
  disclosureList,
  drawer,
  modeIsland,
  overflowMenu,
  pill,
  relationSentenceEl,
  resolutionItem,
  revisionChip,
  statePill,
  stopAction,
  themeControl,
  toastElement,
  verdictControls
} from './components.js';
import { button, h, iconButton } from './dom.js';
import { icon, iconNames } from './icons.js';

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
  ['type.rail.title', 'var(--type-rail-title)'],
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
  return {
    annotationId: `ann-${state}`,
    artifactId: 'artifact-demo',
    writtenRevision: 'blake3:demo',
    revisionRelation: 'current',
    state,
    order: 0,
    note: 'Make the Place order button impossible to miss.',
    targets,
    relationships: [],
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
  return h('div', { class: 'gallery__panel' }, h('h3', { class: 'rail__title', text: title }), ...children);
}

function themeSection(theme: 'light' | 'dark'): HTMLElement {
  const agentStates: AgentPositionReport[] = [
    { position: 'awaiting-you', sentence: 'Your agent is holding the call and waiting for you right now.', hostCanHold: true, queuedDurably: 0, channel: 'held-call', pendingInterruption: false },
    { position: 'working', sentence: 'Your agent is working.', hostCanHold: false, queuedDurably: 0, channel: 'next-check-in', lastCheckedInAt: new Date().toISOString(), pendingInterruption: false },
    { position: 'acknowledged', sentence: 'Your agent has acknowledged the direction.', hostCanHold: false, queuedDurably: 0, channel: 'next-check-in', pendingInterruption: false },
    { position: 'stepped-away', sentence: 'Your agent has stepped away; 2 Annotations are queued durably.', hostCanHold: false, queuedDurably: 2, channel: 'next-check-in', pendingInterruption: false }
  ];
  return h(
    'section',
    {
      class: 'gallery',
      dataset: { theme },
      attrs: { 'data-theme': theme, style: 'background: var(--canvas); color: var(--ink-primary); padding: 24px; border-radius: 16px;' }
    },
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
            h(
              'div',
              { class: 'swatch' },
              h('div', { class: 'swatch__chip', style: { background: 'var(--accent)', width: `${value}px`, height: '12px' } }),
              h('div', { class: 'swatch__label', text: `${value}` })
            )
          )
        )
      ),
      panel('metrics', h('p', { class: 'hint', text: 'Rail 380 · drawer 380 · card max 340 · control 32 / 28 / 36 · icon 18 · island tile 36' })),
      panel(
        'radius',
        h(
          'div',
          { class: 'gallery__row' },
          ...[8, 12, 16, 999].map((radius) =>
            h('div', { style: `width:56px;height:40px;background:var(--surface-sunken);border:1px solid var(--line-strong);border-radius:${radius}px` })
          )
        )
      ),
      panel(
        'elevation',
        h(
          'div',
          { class: 'gallery__row' },
          h('div', { style: 'width:80px;height:48px;background:var(--surface);border:1px solid var(--line-default);border-radius:12px;box-shadow:var(--elevation-card)' }),
          h('div', { style: 'width:80px;height:48px;background:var(--surface);border:1px solid var(--line-default);border-radius:16px;box-shadow:var(--elevation-overlay)' })
        )
      ),
      panel('motion', h('p', { class: 'hint', text: 'fast · base · deliberate, easing cubic-bezier(.2,.8,.2,1); reduced motion removes transitions and lift' }))
    ),
    h('h2', { text: 'Icons — one set, one stroke weight' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel(
        'Every chrome icon',
        h(
          'div',
          { class: 'chips' },
          ...iconNames().map((name) => {
            const cell = h('span', { class: 'chip' });
            cell.appendChild(icon(name, { size: 18 }));
            cell.append(name);
            return cell;
          })
        )
      )
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
      panel('Revision', revisionChip('blake3:0123456789abcdef', false, 'current revision'), revisionChip('blake3:0123456789abcdef', true, 'written before this revision')),
      panel('Provenance confidence labelled separately', pill('exact source span', 'progress'), ' ', pill('inferred', 'closed'), ' ', pill('unavailable', 'attention'))
    ),
    h('h2', { text: 'Agent position and the Check-In convention' }),
    h(
      'div',
      { class: 'gallery__row' },
      ...agentStates.map((state) =>
        panel(state.position, agentPositionEl(state), h('p', { class: 'hint', text: checkedSentence(state) }))
      ),
      panel(
        'StopAction',
        stopAction({ offered: true, report: agentStates[1]!, onStop: () => undefined }) ?? h('span'),
        stopAction({ offered: false, report: agentStates[1]!, onStop: () => undefined }) ?? h('p', { class: 'hint', text: 'Absent when the agent is not working and has not acknowledged anything.' })
      )
    ),
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
      panel('IconButton', iconButton('More actions', 'more', () => undefined)),
      panel('Pill / Badge', pill('matched', 'success'), ' ', pill('ambiguous', 'attention'), ' ', h('span', { class: 'badge', text: '3' })),
      panel('ThemeControl', themeControl('auto', () => undefined), ' ', themeControl('light', () => undefined), ' ', themeControl('dark', () => undefined)),
      panel('OverflowMenu', overflowMenu({ open: true, items: [{ label: 'Reload artifact', icon: 'reload', onSelect: () => undefined }, { label: 'End session', icon: 'close', onSelect: () => undefined }], extra: h('div', { class: 'overflow-menu__theme' }, h('span', { class: 'hint', text: 'Theme' }), themeControl('auto', () => undefined)) })),
      panel('Textarea', h('textarea', { class: 'textarea', attrs: { rows: '3' }, text: 'Make the Place order button impossible to miss.' })),
      panel('Toast', toastElement()),
      panel('BeforeAfterToggle (present only while a selected row has something to compare)', h('div', { class: 'before-after' }, h('button', { attrs: { 'aria-pressed': 'false' }, text: 'Before (01234567)' }), h('button', { attrs: { 'aria-pressed': 'true' }, text: 'After (89abcdef)' }))),
      panel('Dialog / Drawer', drawer({ open: true, title: 'Needs you', onClose: () => undefined }, disclosureList([{ title: 'Annotation would leave on send', body: 'Selector, role, name, box' }]))),
      panel('Listbox', h('select', { class: 'select', attrs: { size: '3' } }, h('option', { text: 'Point at things' }), h('option', { text: 'Box an area' }), h('option', { text: 'Operating the artifact' }))),
      panel('ScrollArea', h('div', { class: 'rail__scroll', style: 'max-height:160px;border:1px solid var(--line-default);border-radius:12px' }, Array.from({ length: 12 }, (_, index) => h('p', { class: 'hint', text: `Scrollable row ${index + 1}` }))))
    ),
    h('h2', { text: 'The surface composition' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel('ModeIsland — resting', modeIsland('operate', () => undefined)),
      panel('ModeIsland — point armed', modeIsland('point', () => undefined)),
      panel('ModeIsland — box armed', modeIsland('box', () => undefined)),
      panel(
        'OverlayMark / DrawnTargetBoundary',
        h(
          'div',
          { style: 'position:relative;height:120px;background:var(--surface-sunken);border-radius:12px' },
          h('div', { style: 'position:absolute;left:12px;top:12px;width:90px;height:34px;border:1px solid var(--accent);background:rgba(43,95,215,.14);border-radius:4px' }),
          h('div', { style: 'position:absolute;left:120px;top:12px;width:90px;height:34px;border:2px dashed var(--attention-ink);background:rgba(107,74,0,.12);border-radius:4px' })
        )
      ),
      panel(
        'ArtifactFrame states',
        h('p', { class: 'hint', text: 'loading · ready · unreachable · policy-blocked · changed' }),
        h('div', { class: 'stage__placeholder', style: 'position:static;padding:16px' }, h('h2', { text: 'This artifact will contact a remote origin' }), h('ul', {}, h('li', {}, h('code', { text: 'https://cdn.example.com' }))))
      ),
      panel('RelationGuide / RelationHandle / RelationSentence', h('p', { class: 'hint', text: 'Not built in this iteration: Relational Intent is deferred, see design.md §11.' }))
    ),
    h('h2', { text: 'Annotations and verification' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel('AnnotationList — unsent', annotationRowSample(sampleAnnotation('queued'), { actions: 'unsent' })),
      panel('AnnotationList — delivered with verdicts', annotationRowSample(sampleAnnotation('delivered', { resolutions: [RESOLUTION_RECORDS[0]!] }), { amend: true })),
      panel('AnnotationList — ambiguous', annotationRowSample(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[2]!], chosenCandidates: {} }), { candidates: true })),
      panel('AnnotationList — deleted, approval blocked', annotationRowSample(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[3]!] }), { candidates: false })),
      panel('AnnotationList — written before this revision', annotationRowSample(sampleAnnotation('acknowledged', { revisionRelation: 'advanced', resolutions: [RESOLUTION_RECORDS[1]!] }), {})),
      panel('AnnotationList — superseded with successor', annotationRowSample(sampleAnnotation('superseded', { supersededBy: 'ann-successor' }), {})),
      panel('CandidateChooser', candidateChooser(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[2]!] }), 't-3', RESOLUTION_RECORDS[2]!, () => undefined)),
      panel('VerdictControls', verdictControls(sampleAnnotation('acknowledged'), { blocked: [], onVerdict: () => undefined })),
      panel('VerdictControls blocked', verdictControls(sampleAnnotation('resolved', { resolutions: [RESOLUTION_RECORDS[3]!] }), { blocked: ['Place order button could not be found in this revision, so approval is blocked.'], onVerdict: () => undefined })),
      panel('AttachmentChip', attachmentChipSample()),
      panel(
        'AnchoredCard — no instruction copy',
        h(
          'div',
          { class: 'anchored-card', style: 'position:static;width:100%' },
          h('p', { class: 'anchored-card__target' }, 'Place order button'),
          h('textarea', { class: 'textarea', attrs: { rows: '3', placeholder: 'What should change?' } }),
          h('div', { class: 'anchored-card__actions' }, button('Queue', { variant: 'primary' }), h('div', { class: 'chips' }, iconButton('Attach a reference image', 'attach', () => undefined), iconButton('Delete Annotation ann-demo', 'delete', () => undefined)))
        )
      ),
      panel('SendAction', button('Send the queue', { variant: 'primary' }), h('p', { class: 'hint', text: '2 Annotations will be delivered as Next-Pass Intent. Direction is read at the agent\u2019s next Check-In.' }))
    ),
    h('h2', { text: 'Deferred and test-only' }),
    h(
      'div',
      { class: 'gallery__row' },
      panel('RelationSentence (envelope support only)', relationSentenceEl(sampleAnnotation('draft', { relationships: [{ relationshipId: 'rel-1', type: 'alignment', operator: 'align-left', targetIds: ['t-1'] }] })) ?? h('span'))
    )
  );
}

function annotationRowSample(annotation: Annotation, options: { amend?: boolean; candidates?: boolean; actions?: 'unsent' }): HTMLElement {
  const row = h(
    'article',
    { class: 'annotation-row', attrs: { 'data-state': annotation.state } },
    h(
      'div',
      { class: 'annotation-row__head' },
      statePill(annotation.state),
      annotation.revisionRelation === 'advanced' ? pill('Written before this revision', 'attention', 'alert') : pill('Written against this revision', 'closed', 'check')
    ),
    annotation.supersededBy ? h('p', { class: 'hint', text: `Replaced by “Make it clearer.”` }) : null,
    h('p', { class: 'annotation-row__note', text: annotation.note }),
    relationSentenceEl(annotation) ?? h('span'),
    h('ul', { class: 'resolution-list' }, ...annotation.resolutions.map((record) => resolutionItem(record, record.targetId))),
    options.candidates
      ? candidateChooser(annotation, 't-3', RESOLUTION_RECORDS[2]!, () => undefined)
      : null,
    verdictControls(annotation, { blocked: approvalBlockers(annotation), onVerdict: () => undefined }),
    h(
      'div',
      { class: 'annotation-row__actions' },
      button('Show on the artifact', { variant: 'ghost' }),
      ...(options.amend ? [button('Amend', { variant: 'ghost' })] : []),
      ...(options.actions === 'unsent' ? [iconButton('Move up', 'move-up', () => undefined), iconButton('Move down', 'move-down', () => undefined), iconButton('Delete Annotation ann-queued', 'delete', () => undefined)] : [])
    )
  );
  return row;
}

function attachmentChipSample(): HTMLElement {
  return h(
    'div',
    { class: 'chips' },
    h('span', { class: 'chip', dataset: { state: 'uploading' }, attrs: { 'data-state': 'uploading' } }, 'uploading… reference.png'),
    h('span', { class: 'chip', dataset: { state: 'ready' }, attrs: { 'data-state': 'ready' } }, 'reference.png'),
    h('span', { class: 'chip', dataset: { state: 'failed' }, attrs: { 'data-state': 'failed' } }, 'failed — retry'),
    attachmentChips(sampleAnnotation('draft', { attachments: [{ attachmentId: 'att-1', mediaType: 'image/png', byteLength: 10, sha256: 'a'.repeat(64), name: 'reference.png' }] }), { onRemove: () => undefined }) ?? h('span')
  );
}

document.body.classList.add('gallery-body');
document.body.append(themeSection('light'), themeSection('dark'));
document.documentElement.dataset['galleryReady'] = 'true';
