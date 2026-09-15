import type { Annotation, AnnotationState } from '../annotation/model.js';
import { relationSentence, stateLabel } from '../annotation/model.js';
import type { AgentPositionReport } from '../mcp/service.js';
import { candidateLabel } from '../annotation/model.js';
import {
  deriveResolutionLabel,
  resolutionLabelCue,
  resolutionLabelText,
  type ResolutionLabel
} from '../resolution/model.js';
import type { ScoredCandidate, TargetResolutionRecord } from '../resolution/resolve.js';
import { apiBaseUrl } from './runtime.js';
import { button, h, iconButton } from './dom.js';
import type { LayerTool } from './protocol.js';

type Tone = 'default' | 'progress' | 'success' | 'attention' | 'closed' | 'destructive';

export function pill(text: string, tone: Tone = 'default', cue?: string): HTMLElement {
  return h('span', { class: 'pill', dataset: { tone }, attrs: { 'data-tone': tone } }, cue ? `${cue} ` : '', text);
}

export function stateTone(state: AnnotationState): Tone {
  switch (state) {
    case 'draft':
    case 'queued':
    case 'delivered':
    case 'resolved':
      return 'progress';
    case 'acknowledged':
      return 'progress';
    case 'verified':
      return 'success';
    case 'rejected':
    case 'another-pass':
    case 'superseded':
    case 'obsolete':
      return 'closed';
  }
}

export function statePill(state: AnnotationState): HTMLElement {
  return pill(stateLabel(state), stateTone(state));
}

export function resolutionTone(label: ResolutionLabel): Tone {
  switch (label) {
    case 'matched':
      return 'success';
    case 'recovered':
      return 'progress';
    case 'ambiguous':
      return 'attention';
    case 'deleted':
      return 'closed';
  }
}

export function resolutionItem(record: TargetResolutionRecord, label: string): HTMLElement {
  const derived = deriveResolutionLabel(record);
  return h(
    'li',
    { class: 'resolution', dataset: { label: derived }, attrs: { 'data-label': derived } },
    h('span', { class: 'resolution__cue', text: resolutionLabelCue(derived), attrs: { 'aria-hidden': 'true' } }),
    h('span', { text: `${label}: ${resolutionLabelText(derived)}` }),
    record.match === 'unresolved' && record.candidates.length > 0
      ? h('span', { class: 'pill', dataset: { tone: 'attention' }, text: `${record.candidates.length} candidate${record.candidates.length === 1 ? '' : 's'}` })
      : null
  );
}

export function agentPositionEl(report: AgentPositionReport): HTMLElement {
  const cue = report.position === 'awaiting-you' ? '◐' : report.position === 'working' ? '◆' : report.position === 'acknowledged' ? '✓' : '—';
  return h(
    'span',
    {
      class: 'agent-position',
      dataset: { position: report.position },
      attrs: { 'data-position': report.position, role: 'status', 'aria-label': `Agent position: ${report.position}` }
    },
    h('span', { class: 'agent-position__cue', text: cue, attrs: { 'aria-hidden': 'true' } }),
    h('span', { text: report.sentence })
  );
}

export function revisionChip(revision: string, advanced: boolean, title: string): HTMLElement {
  return h(
    'span',
    {
      class: 'revision-chip',
      dataset: { state: advanced ? 'advanced' : 'current' },
      attrs: { 'data-state': advanced ? 'advanced' : 'current', title }
    },
    h('span', { text: advanced ? 'Written before this revision · ' : '', attrs: { 'aria-hidden': 'true' } }),
    h('code', { text: shortRevision(revision) })
  );
}

export function shortRevision(revision: string): string {
  return revision.replace(/^blake3:/, '').slice(0, 12);
}

export function stateSwitch(
  current: 'review' | 'verify',
  options: { verifyDisabled?: boolean; onSelect: (state: 'review' | 'verify') => void }
): HTMLElement {
  const make = (name: 'review' | 'verify', label: string): HTMLButtonElement =>
    h('button', {
      type: 'button',
      text: label,
      attrs: {
        'aria-selected': current === name,
        ...(name === 'verify' && options.verifyDisabled ? { disabled: true } : {})
      },
      on: { click: () => options.onSelect(name) }
    });
  return h(
    'div',
    { class: 'state-switch', attrs: { role: 'tablist', 'aria-label': 'Review or Verify' } },
    make('review', 'Review'),
    make('verify', 'Verify')
  );
}

export const TOOLS: Array<{ tool: LayerTool; label: string; key: string; hint: string }> = [
  { tool: 'pointer', label: 'Pointer', key: 'V', hint: 'Operate the artifact normally' },
  { tool: 'element', label: 'Element', key: 'E', hint: 'Select one or more visible elements' },
  { tool: 'text', label: 'Text', key: 'T', hint: 'Select an exact text range' },
  { tool: 'region', label: 'Region', key: 'G', hint: 'Draw an area' },
  { tool: 'arrange', label: 'Arrange', key: 'A', hint: 'Express a relationship by manipulating targets' }
];

export function toolRow(active: LayerTool, onSelect: (tool: LayerTool) => void): HTMLElement {
  return h(
    'div',
    { class: 'tool-row', attrs: { role: 'toolbar', 'aria-label': 'Selection tools' } },
    TOOLS.map((entry) =>
      h('button', {
        class: 'tool-row__tool',
        type: 'button',
        text: entry.label,
        title: `${entry.hint} (${entry.key})`,
        dataset: { tool: entry.tool },
        attrs: {
          'aria-pressed': active === entry.tool,
          'aria-label': `${entry.label} tool — ${entry.hint}`
        },
        on: { click: () => onSelect(entry.tool) }
      })
    )
  );
}

export function relationSentenceEl(annotation: Pick<Annotation, 'relationships' | 'targets'>): HTMLElement | null {
  const sentence = relationSentence(annotation);
  return sentence ? h('p', { class: 'relation-sentence', text: sentence }) : null;
}

export function candidateChooser(
  annotation: Annotation,
  targetId: string,
  record: TargetResolutionRecord,
  onChoose: (targetId: string, nodeId: string) => void
): HTMLElement {
  const list = h('div', { class: 'section', attrs: { role: 'radiogroup', 'aria-label': `Candidates for ${targetId}` } });
  const chosen = annotation.chosenCandidates[targetId];
  record.candidates.forEach((entry: ScoredCandidate, index: number) => {
    const id = `cand-${annotation.annotationId}-${targetId}-${index}`;
    list.appendChild(
      h(
        'label',
        { class: 'resolution', attrs: { for: id } },
        h('input', {
          id,
          type: 'radio',
          attrs: { name: `cand-${annotation.annotationId}-${targetId}`, value: entry.candidate.nodeId },
          on: { change: () => onChoose(targetId, entry.candidate.nodeId) }
        }),
        h('span', { text: `${index + 1}. ${candidateLabel(entry.candidate)}` }),
        h('span', { class: 'pill', text: `${Math.round(entry.score * 100)}% evidence` })
      )
    );
    if (chosen === entry.candidate.nodeId) {
      const input = list.lastElementChild?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.checked = true;
      }
    }
  });
  return list;
}

export function verdictControls(
  annotation: Annotation,
  options: { blocked: string[]; recorded?: string; onVerdict: (verdict: string) => void }
): HTMLElement {
  const approveBlocked = options.blocked.length > 0;
  const group = h('div', { class: 'chips', attrs: { role: 'group', 'aria-label': 'Decision' } });
  const entries: Array<[string, string, 'primary' | 'secondary' | 'destructive' | 'ghost']> = [
    ['approve', 'Approve', 'primary'],
    ['reject', 'Reject', 'secondary'],
    ['another-pass', 'Request another pass', 'secondary'],
    ['supersede', 'Supersede', 'ghost'],
    ['obsolete', 'Mark obsolete', 'ghost']
  ];
  for (const [verdict, label, variant] of entries) {
    const disabled = verdict === 'approve' && approveBlocked;
    group.appendChild(
      button(label, {
        variant,
        disabled,
        ...(disabled ? { title: options.blocked.join(' ') } : {}),
        onClick: () => options.onVerdict(verdict)
      })
    );
  }
  const wrapper = h('div', { class: 'section' }, group);
  if (approveBlocked) {
    wrapper.appendChild(h('p', { class: 'hint', text: `Approval blocked: ${options.blocked.join(' ')}` }));
  }
  if (options.recorded) {
    wrapper.appendChild(h('p', { class: 'hint', text: options.recorded }));
  }
  return wrapper;
}

export function attachmentChips(
  annotation: Annotation,
  options: { onRemove: (attachmentId: string) => void }
): HTMLElement | null {
  if (annotation.attachments.length === 0) {
    return null;
  }
  return h(
    'div',
    { class: 'chips', attrs: { 'aria-label': 'Reference images' } },
    annotation.attachments.map((attachment) =>
      h(
        'span',
        { class: 'chip', dataset: { state: 'ready' }, attrs: { 'data-state': 'ready' } },
        h('img', {
          src: `${apiBaseUrl()}/api/attachments/${attachment.attachmentId}`,
          alt: attachment.name ?? 'Reference image',
          attrs: { loading: 'lazy' }
        }),
        h('span', { text: attachment.name ?? `${Math.round(attachment.byteLength / 1024)}KB` }),
        iconButton(`Remove ${attachment.name ?? 'reference image'}`, '×', () => options.onRemove(attachment.attachmentId))
      )
    )
  );
}

export function drawer(
  options: { open: boolean; title: string; onClose: () => void },
  body: HTMLElement
): HTMLElement {
  return h(
    'aside',
    {
      class: 'drawer',
      hidden: !options.open,
      attrs: { role: 'dialog', 'aria-modal': 'false', 'aria-label': options.title }
    },
    h(
      'div',
      { class: 'drawer__header' },
      h('h2', { class: 'panel__title', text: options.title }),
      iconButton('Close', '×', options.onClose)
    ),
    h('div', { class: 'drawer__body' }, body)
  );
}

export function overflowMenu(
  options: { open: boolean; items: Array<{ label: string; onSelect: () => void }> }
): HTMLElement {
  return h(
    'div',
    { class: 'overflow-menu', hidden: !options.open, attrs: { role: 'menu', 'aria-label': 'More actions' } },
    options.items.map((item) =>
      h('button', { type: 'button', text: item.label, attrs: { role: 'menuitem' }, on: { click: () => item.onSelect() } })
    )
  );
}

export function disclosureList(items: Array<{ title: string; body: string }>): HTMLElement {
  if (items.length === 0) {
    return h('ul', { class: 'disclosure-list' }, h('li', { text: 'Nothing will leave this machine yet.' }));
  }
  return h(
    'ul',
    { class: 'disclosure-list' },
    items.map((item) =>
      h('li', {}, h('strong', { text: item.title }), h('p', { class: 'hint', text: item.body }))
    )
  );
}

export function toastElement(): HTMLElement {
  return h('div', { class: 'toast', hidden: true, attrs: { role: 'status', 'aria-live': 'polite' } });
}

export function describeEvidence(annotation: Annotation): Array<{ title: string; body: string }> {
  return annotation.targets.map((target, index) => {
    const grounding = target.renderedGrounding;
    const evidence = [
      target.label ? `Label: ${target.label}` : undefined,
      grounding.semanticRole ? `Role: ${grounding.semanticRole}` : undefined,
      grounding.accessibleName ? `Name: ${grounding.accessibleName}` : undefined,
      grounding.selectors?.[0] ? `Selector: ${grounding.selectors[0]}` : undefined,
      `Box: ${Math.round(grounding.boundingBox.x)},${Math.round(grounding.boundingBox.y)} ${Math.round(grounding.boundingBox.width)}×${Math.round(grounding.boundingBox.height)}`
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      title: `Target ${index + 1} of ${annotation.targets.length} — ${target.provenanceConfidence === 'exact' ? 'exact source span' : 'Rendered Grounding only'}`,
      body: evidence
    };
  });
}