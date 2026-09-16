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
import { icon, type IconName } from './icons.js';
import type { LayerTool } from './protocol.js';

type Tone = 'default' | 'progress' | 'success' | 'attention' | 'closed' | 'destructive';

export function pill(text: string, tone: Tone = 'default', cue?: IconName | string): HTMLElement {
  const element = h('span', { class: 'pill', dataset: { tone }, attrs: { 'data-tone': tone } });
  if (cue) {
    if (typeof cue === 'string' && cue.length <= 1) {
      element.append(cue, ' ');
    } else {
      element.appendChild(icon(cue as IconName, { size: 12 }));
    }
  }
  element.append(text);
  return element;
}

export function stateTone(state: AnnotationState): Tone {
  switch (state) {
    case 'draft':
    case 'queued':
    case 'delivered':
    case 'resolved':
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

const STATE_CUES: Record<AnnotationState, IconName> = {
  draft: 'amend',
  queued: 'move-up',
  delivered: 'send',
  resolved: 'recovered',
  acknowledged: 'check',
  verified: 'check',
  rejected: 'reject',
  'another-pass': 'another-pass',
  superseded: 'another-pass',
  obsolete: 'obsolete'
};

export function annotationStateCue(state: AnnotationState): IconName {
  return STATE_CUES[state];
}

export function statePill(state: AnnotationState): HTMLElement {
  const element = h('span', {
    class: 'pill',
    dataset: { tone: stateTone(state) },
    attrs: { 'data-tone': stateTone(state), 'data-state': state }
  });
  element.appendChild(icon(annotationStateCue(state), { size: 12 }));
  element.append(stateLabel(state));
  return element;
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
  const cueName: IconName = derived === 'matched' ? 'check' : derived === 'recovered' ? 'recovered' : derived === 'ambiguous' ? 'ambiguous' : 'deleted';
  const item = h('li', { class: 'resolution', dataset: { label: derived }, attrs: { 'data-label': derived } });
  const cue = h('span', { class: 'resolution__cue', attrs: { 'aria-hidden': 'true' } });
  if (typeof resolutionLabelCue(derived) === 'string' && resolutionLabelCue(derived).length <= 2) {
    cue.textContent = resolutionLabelCue(derived);
  } else {
    cue.appendChild(icon(cueName, { size: 14 }));
  }
  item.append(cue, h('span', { text: `${label}: ${resolutionLabelText(derived)}` }));
  if (record.match === 'unresolved' && record.candidates.length > 0) {
    item.appendChild(pill(`${record.candidates.length} candidate${record.candidates.length === 1 ? '' : 's'}`, 'attention'));
  }
  return item;
}

export function agentPositionEl(report: AgentPositionReport): HTMLElement {
  const cue: IconName =
    report.position === 'awaiting-you'
      ? 'attention'
      : report.position === 'working'
        ? 'send'
        : report.position === 'acknowledged'
          ? 'check'
          : 'obsolete';
  const element = h('span', {
    class: 'agent-position',
    dataset: { position: report.position },
    attrs: { 'data-position': report.position, role: 'status', 'aria-label': `Agent position: ${report.position}` }
  });
  const cueEl = h('span', { class: 'agent-position__cue', attrs: { 'aria-hidden': 'true' } });
  cueEl.appendChild(icon(cue, { size: 14 }));
  element.append(
    cueEl,
    h('span', { class: 'agent-position__sentence', text: report.sentence }),
    h('span', { class: 'agent-position__checked', text: checkedSentence(report) })
  );
  return element;
}

export function checkedSentence(report: AgentPositionReport): string {
  const channel = report.channel === 'held-call' ? 'A call is being held right now.' : 'Direction is read at the agent\u2019s next Check-In.';
  if (!report.lastCheckedInAt) {
    return `${channel} The agent has never checked in, so a request will wait until it does.`;
  }
  return `${channel} Last checked in ${relativeTime(report.lastCheckedInAt)}.`;
}

function relativeTime(iso: string): string {
  const delta = Date.now() - Date.parse(iso);
  if (!Number.isFinite(delta)) {
    return `at ${iso}`;
  }
  const seconds = Math.max(0, Math.round(delta / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.round(hours / 24)}d ago`;
}

export function revisionChip(revision: string, advanced: boolean, title: string): HTMLElement {
  return h(
    'span',
    {
      class: 'revision-chip',
      dataset: { state: advanced ? 'advanced' : 'current' },
      attrs: { 'data-state': advanced ? 'advanced' : 'current', title }
    },
    h('code', { text: shortRevision(revision) })
  );
}

export function shortRevision(revision: string): string {
  return revision.replace(/^blake3:/, '').slice(0, 12);
}

export const MODE_TILES: Array<{ mode: Exclude<LayerTool, 'operate'>; icon: IconName; label: string; key: string; hint: string }> = [
  { mode: 'point', icon: 'point', label: 'Point at things', key: 'P', hint: 'Click a thing to point at it, or drag across words to take exactly those words. (P)' },
  { mode: 'box', icon: 'box', label: 'Box an area', key: 'B', hint: 'Drag to bound an area that is not one thing. (B)' }
];

export function modeIsland(active: LayerTool, onSelect: (mode: LayerTool) => void): HTMLElement {
  const island = h('div', {
    class: 'mode-island',
    dataset: { state: active },
    attrs: { 'data-state': active, role: 'toolbar', 'aria-label': 'Pointing mode' }
  });
  for (const entry of MODE_TILES) {
    const armed = active === entry.mode;
    const tile = h('button', {
      class: 'mode-tile',
      type: 'button',
      title: entry.hint,
      dataset: { mode: entry.mode },
      attrs: {
        'data-mode': entry.mode,
        'aria-pressed': armed,
        'aria-label': `${entry.label}${armed ? ', armed' : ''}`
      },
      on: { click: () => onSelect(armed ? 'operate' : entry.mode) }
    });
    tile.appendChild(icon(entry.icon, { size: 20 }));
    island.appendChild(tile);
  }
  return island;
}

export function stopAction(options: { offered: boolean; report: AgentPositionReport; onStop: () => void }): HTMLElement | null {
  if (!options.offered) {
    return null;
  }
  const wrapper = h('div', { class: 'stop-action' });
  const stop = h('button', {
    class: 'button',
    type: 'button',
    dataset: { variant: 'destructive' },
    on: { click: options.onStop }
  });
  stop.appendChild(icon('stop', { size: 14 }));
  stop.append('Ask the agent to stop');
  wrapper.append(
    stop,
    h('p', {
      class: 'hint',
      text: `This asks the agent to stop; it does not stop anything itself. ${checkedSentence(options.report)}`
    }),
    ...(options.report.pendingInterruption
      ? [
          h('p', {
            class: 'hint',
            text: options.report.pendingInterruptionSince
              ? `A stop was requested ${relativeTime(options.report.pendingInterruptionSince)} and the agent has not collected it yet.`
              : 'A stop has been requested and the agent has not collected it yet.'
          })
        ]
      : [])
  );
  return wrapper;
}

export type ThemeChoice = 'auto' | 'light' | 'dark';

export function themeControl(current: ThemeChoice, onSelect: (choice: ThemeChoice) => void): HTMLElement {
  const group = h('div', { class: 'theme-control', attrs: { role: 'radiogroup', 'aria-label': 'Theme' } });
  const entries: Array<{ choice: ThemeChoice; icon: IconName; label: string }> = [
    { choice: 'auto', icon: 'theme-auto', label: 'Match the platform' },
    { choice: 'light', icon: 'theme-light', label: 'Light' },
    { choice: 'dark', icon: 'theme-dark', label: 'Dark' }
  ];
  for (const entry of entries) {
    const selected = current === entry.choice;
    const control = h('button', {
      class: 'theme-control__choice',
      type: 'button',
      title: entry.label,
      attrs: { role: 'radio', 'aria-checked': selected, 'aria-label': entry.label },
      on: { click: () => onSelect(entry.choice) }
    });
    control.appendChild(icon(entry.icon, { size: 16 }));
    group.appendChild(control);
  }
  return group;
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
  const entries: Array<[string, string, IconName, 'primary' | 'secondary' | 'ghost']> = [
    ['approve', 'Approve', 'check', 'primary'],
    ['reject', 'Reject', 'reject', 'secondary'],
    ['another-pass', 'Request another pass', 'another-pass', 'secondary'],
    ['obsolete', 'Mark obsolete', 'obsolete', 'ghost']
  ];
  for (const [verdict, label, iconName, variant] of entries) {
    const disabled = verdict === 'approve' && approveBlocked;
    const control = button(label, {
      variant,
      disabled,
      ...(disabled ? { title: options.blocked.join(' ') } : {}),
      onClick: () => options.onVerdict(verdict)
    });
    control.dataset['verdict'] = verdict;
    control.prepend(icon(iconName, { size: 14 }));
    group.appendChild(control);
  }
  const wrapper = h('div', { class: 'section' }, group);
  if (approveBlocked) {
    wrapper.appendChild(h('p', { class: 'hint', text: `Approval is refused: ${options.blocked.join(' ')}` }));
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
        iconButton(`Remove ${attachment.name ?? 'reference image'}`, 'close', () => options.onRemove(attachment.attachmentId))
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
      h('h2', { class: 'rail__title', text: options.title }),
      iconButton('Close', 'close', options.onClose)
    ),
    h('div', { class: 'drawer__body' }, body)
  );
}

export function overflowMenu(
  options: { open: boolean; items: Array<{ label: string; icon?: IconName; onSelect: () => void }>; extra?: HTMLElement }
): HTMLElement {
  return h(
    'div',
    { class: 'overflow-menu', hidden: !options.open, attrs: { role: 'menu', 'aria-label': 'More actions' } },
    options.items.map((item) =>
      h(
        'button',
        { type: 'button', attrs: { role: 'menuitem' }, on: { click: () => item.onSelect() } },
        item.icon ? icon(item.icon, { size: 16 }) : '',
        item.label
      )
    ),
    ...(options.extra ? [options.extra] : [])
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
