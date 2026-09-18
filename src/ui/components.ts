import type { Annotation, AnnotationState, AnchorOutcome, VerificationVerdict } from '../annotation/model.js';
import { anchorOutcomeText, stateLabel } from '../annotation/model.js';
import type { AgentPositionReport } from '../mcp/service.js';
import type { SessionPass } from './api.js';
import { deriveResolutionLabel, resolutionLabelText, type ResolutionLabel, type RuntimeStateContext } from '../resolution/model.js';
import type { TargetResolutionRecord } from '../resolution/resolve.js';
import { apiBaseUrl } from './runtime.js';
import { button, h, iconButton } from './dom.js';
import { icon, type IconName } from './icons.js';
import type { LayerTool } from './protocol.js';

type Tone = 'default' | 'progress' | 'private' | 'success' | 'attention' | 'closed' | 'destructive';

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
      return 'private';
    case 'delivered':
    case 'resolved':
    case 'acknowledged':
      return 'progress';
    case 'verified':
      return 'success';
    case 'not-fixed':
    case 'replaced':
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
  'not-fixed': 'redo',
  replaced: 'redo',
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
    case 'state-only':
      return 'attention';
    case 'deleted':
      return 'closed';
  }
}

export function resolutionItem(
  record: TargetResolutionRecord,
  label: string,
  state?: RuntimeStateContext,
  outcome?: AnchorOutcome,
  declared = false
): HTMLElement {
  const derived = deriveResolutionLabel(record, state);
  const cueName: IconName =
    derived === 'matched'
      ? 'check'
      : derived === 'recovered'
        ? 'recovered'
        : derived === 'ambiguous' || derived === 'state-only'
          ? 'ambiguous'
          : 'deleted';
  const item = h('li', { class: 'resolution', dataset: { label: derived }, attrs: { 'data-label': derived } });
  const cue = h('span', { class: 'resolution__cue', attrs: { 'aria-hidden': 'true' } });
  cue.appendChild(icon(cueName, { size: 14 }));
  const comparison =
    outcome && (derived === 'matched' || derived === 'recovered') ? ` · ${anchorOutcomeText(outcome)}` : '';
  const text = declared ? `${label}: Declared missing by you` : `${label}: ${resolutionLabelText(derived)}${comparison}`;
  item.append(cue, h('span', { text }));
  return item;
}

export function statusLine(passes: SessionPass[], report: AgentPositionReport, queueCount: number): HTMLElement {
  const ready = [...passes].reverse().find((pass) => pass.state === 'ready');
  const inFlight = [...passes].reverse().find((pass) => pass.state === 'in-flight');
  const text = statusText(passes, report, queueCount, ready, inFlight);
  return h('p', {
    class: 'status-line',
    text,
    dataset: { state: statusState(report, queueCount, ready, inFlight) },
    attrs: { 'data-state': statusState(report, queueCount, ready, inFlight), role: 'status', 'aria-live': 'polite' }
  });
}

function statusState(
  report: AgentPositionReport,
  queueCount: number,
  ready: SessionPass | undefined,
  inFlight: SessionPass | undefined
): string {
  if (ready) {
    return 'ready';
  }
  if (queueCount > 0) {
    return 'open';
  }
  if (inFlight) {
    return report.position === 'stepped-away' ? 'stepped-away' : 'in-flight';
  }
  return 'idle';
}

function statusText(
  passes: SessionPass[],
  report: AgentPositionReport,
  queueCount: number,
  ready: SessionPass | undefined,
  inFlight: SessionPass | undefined
): string {
  const held = report.channel === 'held-call' ? ' · call held' : '';
  if (ready) {
    return `Your turn · Pass ${passNumber(passes, ready)} ready${held}`;
  }
  if (queueCount > 0) {
    return `Your turn · ${queueCount} note${queueCount === 1 ? '' : 's'} to send${held}`;
  }
  if (inFlight) {
    const whose = report.position === 'stepped-away' ? 'Agent away' : "Agent's turn";
    return `${whose} · Pass ${passNumber(passes, inFlight)} in flight${held}`;
  }
  return 'Your turn · nothing queued';
}

export function passNumber(passes: SessionPass[], pass: SessionPass): number {
  const index = passes.findIndex((entry) => entry.passId === pass.passId);
  return index === -1 ? passes.length : index + 1;
}

export function passStateLabel(state: SessionPass['state']): string {
  switch (state) {
    case 'open':
      return 'Open';
    case 'in-flight':
      return 'In flight';
    case 'ready':
      return 'Ready';
    case 'closed':
      return 'Closed';
    case 'withdrawn':
      return 'Taken back';
  }
}

export function agentDisclosure(report: AgentPositionReport): HTMLElement {
  return h(
    'details',
    { class: 'agent-disclosure' },
    h('summary', { text: 'Agent' }),
    h('p', { class: 'hint', text: checkedSentence(report) })
  );
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

export const MODE_TILES: Array<{ mode: Exclude<LayerTool, 'operate'>; icon: IconName; filledIcon: IconName; label: string; key: string; hint: string }> = [
  { mode: 'point', icon: 'point', filledIcon: 'point-filled', label: 'Point at things', key: 'P', hint: 'Click a thing to point at it, or drag across words to take exactly those words. (P)' },
  { mode: 'box', icon: 'box', filledIcon: 'box-filled', label: 'Box an area', key: 'B', hint: 'Drag to bound an area that is not one thing. (B)' }
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
    tile.appendChild(icon(armed ? entry.filledIcon : entry.icon, { size: 20 }));
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

export function repointAction(annotation: Annotation, options: { active: boolean; onRepoint: () => void }): HTMLElement {
  const control = button(options.active ? 'Point at the right target, then click it' : 'Re-point this target', {
    variant: options.active ? 'primary' : 'secondary',
    title: 'The next thing you point at becomes this Annotation\u2019s target.',
    onClick: options.onRepoint
  });
  control.dataset['action'] = 'repoint';
  control.dataset['annotation'] = annotation.annotationId;
  control.append(options.active ? '…' : '');
  control.prepend(icon('point', { size: 14 }));
  return control;
}

export function declareMissingAction(
  annotation: Annotation,
  targetId: string,
  options: { onDeclare: () => void }
): HTMLElement {
  const control = button('Declare missing', {
    variant: 'ghost',
    title: 'You have checked, and this target no longer exists in the artifact.',
    onClick: options.onDeclare
  });
  control.dataset['action'] = 'declare-missing';
  control.dataset['target'] = targetId;
  control.dataset['annotation'] = annotation.annotationId;
  control.prepend(icon('deleted', { size: 14 }));
  return control;
}

export function verdictControls(
  annotation: Annotation,
  options: { blocked: string[]; recorded?: VerificationVerdict; onVerdict: (verdict: string) => void; onReopen?: () => void }
): HTMLElement {
  const approveBlocked = options.blocked.length > 0;
  const group = h('div', { class: 'chips', attrs: { role: 'group', 'aria-label': 'Decision' } });
  const visible: Array<[VerificationVerdict, string, IconName]> = [
    ['approve', 'Approve', 'check'],
    ['not-fixed', 'Not Fixed', 'redo']
  ];
  for (const [verdict, label, iconName] of visible) {
    const disabled = verdict === 'approve' && approveBlocked;
    const control = button(label, {
      variant: verdict === 'approve' ? 'primary' : 'secondary',
      disabled,
      ...(disabled ? { title: options.blocked.join(' ') } : {}),
      onClick: () => options.onVerdict(verdict)
    });
    control.dataset['verdict'] = verdict;
    markRecorded(control, options.recorded === verdict);
    control.prepend(icon(iconName, { size: 14 }));
    group.appendChild(control);
  }
  const overflow = h('details', { class: 'verdict-overflow' });
  overflow.appendChild(h('summary', { text: 'More verdicts' }));
  const overflowBody = h('div', { class: 'verdict-overflow__body' });
  const obsolete = button('Mark obsolete', { variant: 'ghost', onClick: () => options.onVerdict('obsolete') });
  obsolete.dataset['verdict'] = 'obsolete';
  markRecorded(obsolete, options.recorded === 'obsolete');
  obsolete.prepend(icon('obsolete', { size: 14 }));
  overflowBody.appendChild(obsolete);
  overflow.appendChild(overflowBody);
  group.appendChild(overflow);
  const wrapper = h('div', { class: 'section' }, group);
  if (options.recorded && options.onReopen) {
    const reopen = button('Undo decision', { variant: 'ghost', onClick: options.onReopen });
    reopen.dataset['action'] = 'undo-decision';
    wrapper.appendChild(reopen);
  }
  if (approveBlocked) {
    wrapper.appendChild(h('p', { class: 'hint', text: `Approval is blocked: ${options.blocked.join(' ')}` }));
  }
  return wrapper;
}

function markRecorded(control: HTMLButtonElement, recorded: boolean): void {
  control.setAttribute('aria-pressed', String(recorded));
  if (recorded) {
    control.dataset['recorded'] = 'true';
  }
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

export type NoticeOptions = {
  message: string;
  action?: { label: string; onSelect: () => void };
  onDismiss: () => void;
};

export function noticeElement(options: NoticeOptions): HTMLElement {
  const notice = h('div', {
    class: 'notice',
    attrs: { role: 'status', 'aria-live': 'polite' }
  });
  notice.appendChild(h('p', { class: 'notice__text', text: options.message }));
  const actions = h('div', { class: 'notice__actions' });
  if (options.action) {
    actions.appendChild(button(options.action.label, { variant: 'secondary', onClick: options.action.onSelect }));
  }
  actions.appendChild(iconButton('Dismiss notice', 'close', options.onDismiss));
  notice.appendChild(actions);
  return notice;
}

export function coachmark(options: { title: string; body: string; anchor: HTMLElement; onDismiss: () => void }): HTMLElement {
  const rect = options.anchor.getBoundingClientRect();
  return h(
    'div',
    {
      class: 'coachmark',
      attrs: { role: 'note' },
      style: { left: `${Math.round(rect.left)}px`, top: `${Math.round(rect.bottom + 8)}px` }
    },
    h('p', { class: 'coachmark__title', text: options.title }),
    h('p', { class: 'coachmark__body', text: options.body }),
    button('Got it', { variant: 'ghost', onClick: options.onDismiss })
  );
}

export function passHeader(options: {
  pass: SessionPass;
  number: number;
  outstanding: number;
  onClose: () => void;
  onAnotherPass?: () => void;
  carriedAway?: number;
}): HTMLElement {
  const { pass } = options;
  const header = h('header', {
    class: 'pass-header',
    dataset: { state: pass.state },
    attrs: { 'data-state': pass.state, 'data-pass': pass.passId }
  });
  const head = h(
    'div',
    { class: 'pass-header__head' },
    h('span', { class: 'pass-header__title', text: `Pass ${options.number}` }),
    pill(passStateLabel(pass.state), passTone(pass.state)),
    h('span', {
      class: 'pass-header__outstanding',
      text:
        options.outstanding === 0
          ? 'Nothing left to decide'
          : pass.state === 'closed'
            ? `${options.outstanding} never decided`
            : `${options.outstanding} to decide`
    })
  );
  header.appendChild(head);
  header.appendChild(
    h('p', {
      class: 'hint',
      text: `${pass.outcome.changed} changed · ${pass.outcome.same} same · ${pass.outcome.notFound} not found`
    })
  );
  if (options.carriedAway && options.carriedAway > 0) {
    header.appendChild(
      h('p', {
        class: 'hint',
        text: `${options.carriedAway} carried into a later Pass`
      })
    );
  }
  const actions = h('div', { class: 'chips' });
  if (pass.state === 'ready' && options.onAnotherPass) {
    const again = button('Try again', { variant: 'primary', onClick: options.onAnotherPass });
    again.dataset['action'] = 'another-pass';
    actions.appendChild(again);
  }
  if (pass.state !== 'closed' && pass.state !== 'withdrawn') {
    const close = button(`Close Pass ${options.number}`, { variant: 'ghost', onClick: options.onClose });
    close.dataset['action'] = 'close-pass';
    actions.appendChild(close);
  }
  if (pass.state === 'closed' && pass.closedAt) {
    header.appendChild(h('p', { class: 'hint', text: `Closed ${relativeTime(pass.closedAt)}` }));
  }
  if (actions.childElementCount > 0) {
    header.appendChild(actions);
  }
  return header;
}

function passTone(state: SessionPass['state']): Tone {
  switch (state) {
    case 'open':
    case 'in-flight':
      return 'progress';
    case 'ready':
      return 'attention';
    case 'closed':
    case 'withdrawn':
      return 'closed';
  }
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
