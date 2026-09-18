import type { Annotation } from '../annotation/model.js';
import { anchorOutcome, approvalBlockers, isAmendable, isAttemptable, isInQueue, isVerification, missingRelationTargets, relationsAmong, targetName } from '../annotation/model.js';
import { relationSentence } from '../annotation/relations.js';
import { deriveResolutionLabel, type RuntimeStateContext } from '../resolution/model.js';
import type { ResolutionCandidate, TargetResolutionRecord } from '../resolution/resolve.js';
import { Api, type Policy, type SessionPass, type SessionSnapshot, type SessionStatus } from './api.js';
import {
  agentDisclosure,
  attachmentChips,
  coachmark,
  describeEvidence,
  disclosureList,
  drawer,
  modeIsland,
  noticeElement,
  overflowMenu,
  passHeader,
  passNumber,
  pill,
  repointAction,
  resolutionItem,
  revisionChip,
  statePill,
  statusLine,
  stopAction,
  themeControl,
  verdictControls,
  type ThemeChoice
} from './components.js';
import { button, clear, h, iconButton, qs } from './dom.js';
import { CAPTURE_SUPPORT_STATEMENT, captureArtifactView, captureAvailable, captureUnavailableReason } from './capture.js';
import { icon, type IconName } from './icons.js';
import type { LayerMessage, LayerRelation, LayerTarget, LayerTool, ShellMarkTargets, ShellMessage } from './protocol.js';
import { debounce, readConfig, type ShellConfig } from './runtime.js';

const THEME_KEY = 'vil-theme';
const GUIDANCE_KEY = 'vil-guidance';
const NOTICE_TIMEOUT_MS = 6000;

class App {
  private readonly config: ShellConfig = readConfig();
  private readonly api = new Api(this.config.sessionId, this.config.capability);
  private snapshot!: SessionSnapshot;
  private policy?: Policy;
  private mode: LayerTool = 'operate';
  private selection: LayerTarget[] = [];
  private relationPreview?: string;
  private activeAnnotationId?: string;
  private amendFor?: string;
  private repointFor?: string;
  private candidates?: ResolutionCandidate[];
  private viewedAddress?: string;
  private resolvedRevision?: string;
  private currentRevision = this.config.revision;
  private adoptedRevision = this.config.revision;
  private revisionBasis: 'document' | 'files' = 'document';
  private reading = false;
  private artifactLoaded = false;
  private drawerOpen = false;
  private menuOpen = false;
  private noticeTimer?: number;
  private notice?: { message: string; action?: { label: string; onSelect: () => void } };
  private coachmarkId?: string;
  private coachmarkAnchor?: HTMLElement;
  private guidance = readGuidance();
  private beforeAfter: 'before' | 'after' = 'after';
  private selectedRowId?: string;
  private closedHidden = true;
  private theme: ThemeChoice = readStoredTheme();
  private uploads: Array<{
    id: string;
    annotationId: string;
    name: string;
    file: File;
    state: 'uploading' | 'failed';
    reason?: string;
  }> = [];
  private focusTrapHandler?: (event: KeyboardEvent) => void;

  private iframe!: HTMLIFrameElement;
  private stage!: HTMLElement;
  private placeholder!: HTMLElement;
  private railHead!: HTMLElement;
  private railNotice!: HTMLElement;
  private railScroll!: HTMLElement;
  private railFooter!: HTMLElement;
  private cardHost!: HTMLElement;
  private banner!: HTMLElement;
  private coachmarkHost!: HTMLElement;
  private beforeAfterHost!: HTMLElement;
  private islandHost!: HTMLElement;
  private drawerHost!: HTMLElement;
  private menuHost!: HTMLElement;

  async start(): Promise<void> {
    this.buildShell();
    this.applyTheme();
    window.addEventListener('message', (event) => this.onLayerMessage(event));
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('pointerup', () => this.postToLayer({ source: 'vil-shell', type: 'cancel-relation' }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.refresh();
      }
    });
    await this.refresh();
    window.setInterval(() => void this.pollStatus(), 3000);
    void this.pollStatus();
  }

  private buildShell(): void {
    this.stage = h('section', { class: 'stage', attrs: { 'aria-label': 'Artifact under review' } });
    this.placeholder = h('div', { class: 'stage__placeholder' }, h('h2', { text: 'Preparing the artifact' }));
    this.iframe = h('iframe', {
      class: 'artifact-frame',
      title: 'Artifact under review',
      hidden: true,
      attrs: { src: 'about:blank', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups' }
    });
    this.banner = h('div', { class: 'banner', hidden: true, attrs: { role: 'alert' } });
    this.beforeAfterHost = h('div', { class: 'before-after-host', hidden: true });
    this.islandHost = h('div', { class: 'island-host' });
    this.cardHost = h('div', { class: 'card-host' });
    this.stage.append(this.placeholder, this.iframe, this.beforeAfterHost, this.banner, this.cardHost, this.islandHost);

    this.railHead = h('header', { class: 'rail__head' });
    this.railNotice = h('div', { class: 'rail__notice', hidden: true });
    this.railScroll = h('div', { class: 'rail__scroll' });
    this.railFooter = h('div', { class: 'rail__footer' });
    const rail = h(
      'aside',
      { class: 'rail', attrs: { 'aria-label': 'Annotations' } },
      this.railNotice,
      this.railHead,
      this.railScroll,
      this.railFooter
    );

    const workspace = h('div', { class: 'workspace' }, this.stage, rail);
    this.drawerHost = h('div');
    this.menuHost = h('div');
    this.coachmarkHost = h('div', { class: 'coachmark-host' });

    document.body.append(workspace, this.drawerHost, this.menuHost, this.coachmarkHost);
  }

  private async refresh(): Promise<void> {
    try {
      this.snapshot = await this.api.snapshot();
    } catch (error) {
      this.showNotice(`Could not read local state: ${messageOf(error)}`);
      return;
    }
    if (!this.policy) {
      this.policy = await this.api.policy().catch(() => undefined);
    }
    if (!this.artifactLoaded) {
      this.renderGate();
    }
    this.renderRailHead();
    this.renderList();
    this.renderFooter();
    this.renderIsland();
    this.renderDrawer();
    this.renderMenu();
    this.renderCandidateMarks();
  }

  private renderGate(): void {
    clear(this.placeholder);
    const remote = this.policy?.remoteOrigins ?? [];
    if (remote.length === 0) {
      this.placeholder.append(
        h('h2', { text: 'Loading the artifact' }),
        h('p', { class: 'hint', text: 'No remote origin was declared by this artifact.' })
      );
      this.loadArtifact();
      return;
    }
    const gate = h(
      'div',
      { class: 'policy-gate' },
      h('h2', { text: 'This artifact will contact a remote origin' }),
      h('p', {
        class: 'hint',
        text: 'Before it loads, here is what it will contact. Runtime data requests stay blocked; only declared stylesheets, fonts and images are allowed.'
      }),
      h('ul', {}, remote.map((origin) => h('li', {}, h('code', { text: origin })))),
      h(
        'div',
        { class: 'chips' },
        button('Load artifact and allow these origins', { variant: 'primary', onClick: () => this.loadArtifact() }),
        button('Do not load', {
          variant: 'secondary',
          onClick: () => {
            clear(this.placeholder);
            this.placeholder.append(
              h('h2', { text: 'Artifact not loaded' }),
              h('p', {
                class: 'hint',
                text: 'You declined the remote origins. Nothing contacted the network. Reload this page to reconsider.'
              })
            );
          }
        })
      )
    );
    this.placeholder.append(gate);
  }

  private loadArtifact(): void {
    this.artifactLoaded = true;
    this.placeholder.hidden = true;
    this.iframe.hidden = false;
    this.iframe.src = this.config.src || `/artifact/${this.config.sessionId}`;
  }

  private renderRailHead(): void {
    clear(this.railHead);
    const advanced = this.snapshot.annotations.some((annotation) => annotation.revisionRelation === 'advanced');
    const identity = h(
      'div',
      { class: 'rail__identity' },
      h('span', { class: 'rail__name', text: this.config.name }),
      h('span', { class: 'rail__kind', text: this.config.kind === 'react-vite-app' ? 'running application' : 'saved HTML' })
    );
    const revision = h(
      'div',
      { class: 'rail__revision' },
      h('span', { class: 'rail__revision-label', text: 'Revision under review' }),
      revisionChip(this.adoptedRevision, advanced, `Revision ${this.adoptedRevision}`)
    );
    const agentRow = h(
      'div',
      { class: 'rail__status' },
      statusLine(this.snapshot.passes, this.snapshot.agent, this.queue().length),
      agentDisclosure(this.snapshot.agent),
      this.stopAction()
    );
    const actions = h('div', { class: 'rail__actions' });
    const attention = this.needsDecisionCount();
    if (attention > 0) {
      actions.appendChild(this.attentionTrigger(attention));
    }
    const overflow = h('button', {
      class: 'icon-button',
      type: 'button',
      title: 'More actions',
      attrs: { 'aria-label': 'More actions', 'aria-haspopup': 'menu' },
      on: { click: () => this.toggleMenu(!this.menuOpen) }
    });
    overflow.appendChild(icon('more', { size: 16 }));
    actions.appendChild(overflow);

    this.railHead.append(identity, revision, agentRow, actions);
  }

  private attentionTrigger(count: number): HTMLElement {
    const trigger = h('button', {
      class: 'attention-trigger',
      type: 'button',
      title: 'What needs a decision',
      on: { click: () => this.toggleDrawer(!this.drawerOpen) }
    });
    trigger.append(
      icon('attention', { size: 14 }),
      h('span', { text: 'Needs you' }),
      h('span', {
        class: 'attention-trigger__badge',
        text: String(count),
        attrs: { 'aria-label': `${count} items need a decision` }
      })
    );
    return trigger;
  }

  private stopAction(): HTMLElement | null {
    return stopAction({
      offered: this.snapshot.agent.position === 'working' || this.snapshot.agent.position === 'acknowledged',
      report: this.snapshot.agent,
      onStop: () => void this.requestStop()
    });
  }

  private renderList(): void {
    clear(this.railScroll);
    const passes = this.snapshot.passes;
    const passIds = new Set(passes.map((pass) => pass.passId));
    const ungrouped = this.snapshot.annotations.filter((annotation) => !annotation.passId || !passIds.has(annotation.passId));

    if (ungrouped.length > 0) {
      const queue = ungrouped.filter((annotation) => isInQueue(annotation.state));
      const open = ungrouped.filter((annotation) => !isInQueue(annotation.state) && !isClosed(annotation.state));
      open.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
      this.railScroll.appendChild(this.annotationList([...queue, ...open]));
    }

    for (const pass of passes) {
      const members = this.snapshot.annotations
        .filter((annotation) => annotation.passId === pass.passId)
        .sort((a, b) => a.order - b.order);
      const outstanding = members.filter((annotation) => !isVerification(annotation.state)).length;
      const attemptable = members.filter((annotation) => isAttemptable(annotation.state)).length;
      const carriedAway = pass.annotationIds.filter((id) => {
        const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === id);
        return annotation !== undefined && annotation.passId !== undefined && annotation.passId !== pass.passId;
      }).length;
      const group = h(
        'section',
        { class: 'pass-group', dataset: { state: pass.state }, attrs: { 'data-state': pass.state, 'data-pass': pass.passId } },
        passHeader({
          pass,
          number: passNumber(passes, pass),
          outstanding,
          onClose: () => void this.closePass(pass.passId),
          ...(attemptable > 0 ? { onAnotherPass: () => void this.anotherPass(pass.passId) } : {}),
          ...(carriedAway > 0 ? { carriedAway } : {})
        }),
        this.annotationList(members, { hideClosed: this.closedHidden })
      );
      this.railScroll.appendChild(group);
    }

    const hasRows = this.railScroll.querySelector('.annotation-row');
    if (!hasRows) {
      this.railScroll.appendChild(
        h('div', {
          class: 'empty',
          text:
            this.selection.length > 0
              ? 'Write the note in the card beside your target, then queue it.'
              : 'Point at something in the artifact to begin, or pick a tile in the mode island.'
        })
      );
    }
  }

  private annotationList(annotations: Annotation[], options: { hideClosed?: boolean } = {}): HTMLElement {
    const list = h('ul', { class: 'annotation-list' });
    const closed = annotations.filter((annotation) => isClosed(annotation.state));
    const visible = options.hideClosed ? annotations.filter((annotation) => !isClosed(annotation.state)) : annotations;
    visible.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
    for (const annotation of visible) {
      list.appendChild(this.annotationRow(annotation));
    }
    if (options.hideClosed && closed.length > 0) {
      const toggle = button(`Show ${closed.length} closed`, {
        variant: 'ghost',
        onClick: () => {
          this.closedHidden = false;
          this.renderList();
        }
      });
      toggle.dataset['toggle'] = 'closed';
      list.appendChild(h('li', {}, toggle));
    }
    return list;
  }

  private annotationRow(annotation: Annotation): HTMLElement {
    const row = h('article', {
      class: 'annotation-row',
      dataset: { active: String(annotation.annotationId === this.selectedRowId) },
      attrs: { 'data-active': annotation.annotationId === this.selectedRowId, 'data-state': annotation.state }
    });
    const head = h('div', { class: 'annotation-row__head' }, statePill(annotation.state));
    if (annotation.revisionRelation === 'advanced') {
      head.appendChild(pill('Written before this revision', 'attention', 'alert'));
    }
    if (annotation.resolvedRevision && annotation.resolvedRevision !== annotation.writtenRevision) {
      head.appendChild(
        h('span', {
          class: 'annotation-row__result-revision',
          text: `Result from ${annotation.resolvedRevision.replace(/^blake3:/, '').slice(0, 8)}`
        })
      );
    }
    row.appendChild(head);

    if (annotation.replaces) {
      const predecessor = this.snapshot.annotations.find((entry) => entry.annotationId === annotation.replaces);
      row.appendChild(
        h('p', {
          class: 'hint',
          text: `Replaced ${predecessor?.note ? `“${trim(predecessor.note)}”` : annotation.replaces}`
        })
      );
    }
    if (annotation.replacedBy) {
      const successor = this.snapshot.annotations.find((entry) => entry.annotationId === annotation.replacedBy);
      row.appendChild(
        h('p', {
          class: 'hint',
          text: `Replaced by ${successor?.note ? `“${trim(successor.note)}”` : annotation.replacedBy}`
        })
      );
    }

    if (this.amendFor === annotation.annotationId) {
      row.appendChild(this.amendEditor(annotation));
    } else {
      row.appendChild(h('p', { class: 'annotation-row__note', text: annotation.note || 'No note' }));
    }

    for (const relation of annotation.relationships) {
      row.appendChild(
        h('p', {
          class: 'relation-sentence',
          dataset: { relation: 'true' },
          text: relationSentence(relation, (targetId) => targetName(annotation.targets, targetId))
        })
      );
    }
    if (missingRelationTargets(annotation).length > 0) {
      row.appendChild(
        h('p', {
          class: 'hint',
          text: 'A target this relation names is no longer in this Annotation, so the relation cannot be judged against it.'
        })
      );
    }

    const targets = h('ul', { class: 'resolution-list' });
    const stateFor = this.stateContextFor(annotation);
    for (const resolution of annotation.resolutions) {
      const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
      const label = target?.label ?? target?.renderedGrounding.accessibleName ?? target?.kind ?? resolution.targetId;
      targets.appendChild(resolutionItem(resolution, label, stateFor(resolution), anchorOutcome(annotation, resolution)));
    }
    if (annotation.resolutions.length > 0) {
      row.appendChild(targets);
    }
    for (const resolution of annotation.resolutions) {
      if (resolution.match !== 'unresolved') {
        continue;
      }
      const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
      const label = target?.label ?? resolution.targetId;
      row.appendChild(h('p', { class: 'hint', text: unresolvedSentence(label, resolution, stateFor(resolution)) }));
      row.appendChild(
        repointAction(annotation, {
          active: this.repointFor === annotation.annotationId,
          onRepoint: () => this.startRepoint(annotation.annotationId)
        })
      );
    }

    if (isDecidable(annotation.state)) {
      row.appendChild(this.verdictBlock(annotation));
    }
    if (annotation.attachments.length > 0) {
      row.appendChild(
        attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) }) ??
          h('span')
      );
    }

    const actions = h('div', { class: 'annotation-row__actions' });
    actions.appendChild(
      iconButton(
        `Show ${trim(annotation.note) || 'this note'} on the artifact`,
        'show',
        () => void this.activateAnnotation(annotation.annotationId)
      )
    );
    if (isAmendable(annotation.state)) {
      const amend = button('Amend', { variant: 'ghost', onClick: () => this.openAmend(annotation.annotationId) });
      amend.prepend(icon('amend', { size: 14 }));
      amend.dataset['action'] = 'amend';
      actions.appendChild(amend);
    }
    if (isInQueue(annotation.state)) {
      actions.appendChild(iconButton('Move up', 'move-up', () => void this.move(annotation.annotationId, -1)));
      actions.appendChild(iconButton('Move down', 'move-down', () => void this.move(annotation.annotationId, 1)));
      actions.appendChild(iconButton(`Delete Annotation ${annotation.annotationId}`, 'delete', () => void this.deleteAnnotation(annotation.annotationId)));
    }
    row.appendChild(actions);
    row.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('button, input, textarea, label, summary, details, a')) {
        return;
      }
      this.selectRow(annotation.annotationId);
    });
    return row;
  }

  private amendEditor(annotation: Annotation): HTMLElement {
    const textarea = h('textarea', {
      class: 'textarea',
      attrs: { rows: '3', placeholder: 'What should change?' },
      on: { input: () => undefined }
    }) as HTMLTextAreaElement;
    textarea.value = annotation.note;
    const wrapper = h(
      'div',
      { class: 'amend-editor' },
      h('p', { class: 'hint', text: 'This replaces what was sent; the record of what the agent was told stays.' }),
      textarea,
      h('p', { class: 'amend-editor__was', text: annotation.replaces ? `Was: ${trim(this.noteOf(annotation.replaces), 160)}` : '' }),
      h(
        'div',
        { class: 'chips' },
        button('Deliver the amendment', {
          variant: 'primary',
          onClick: () => void this.submitAmend(annotation.annotationId, textarea.value)
        }),
        button('Cancel', { variant: 'ghost', onClick: () => this.closeAmend() })
      )
    );
    queueMicrotask(() => textarea.focus());
    return wrapper;
  }

  private noteOf(annotationId: string): string {
    return this.snapshot.annotations.find((entry) => entry.annotationId === annotationId)?.note ?? '';
  }

  private stateContextFor(annotation: Annotation): (resolution: TargetResolutionRecord) => RuntimeStateContext {
    const revisionUnchanged = annotation.writtenRevision === this.adoptedRevision;
    return (resolution) => {
      const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
      return {
        revisionUnchanged,
        targetAddress: target?.runtimeState?.address,
        viewedAddress: resolution.viewedAddress
      };
    };
  }

  private verdictBlock(annotation: Annotation): HTMLElement {
    const blocked = approvalBlockers(annotation, this.stateContextFor(annotation));
    return verdictControls(annotation, {
      blocked,
      ...(annotation.verification ? { recorded: annotation.verification.verdict } : {}),
      onVerdict: (verdict) => void this.verdict(annotation.annotationId, verdict)
    });
  }

  private renderFooter(): void {
    clear(this.railFooter);
    const queue = this.queue();
    const send = button('Send the queue', {
      variant: 'primary',
      disabled: queue.length === 0,
      ...(queue.length === 0 ? { title: 'There is nothing queued to send.' } : {}),
      onClick: () => void this.sendQueue()
    });
    send.dataset['action'] = 'send';
    this.railFooter.appendChild(h('div', { class: 'send-action' }, send));
  }

  private renderIsland(): void {
    clear(this.islandHost);
    this.islandHost.appendChild(modeIsland(this.mode, (mode) => this.setMode(mode)));
  }

  private renderCoachmark(): void {
    clear(this.coachmarkHost);
    if (!this.coachmarkId || !this.coachmarkAnchor) {
      return;
    }
    const entry = COACHMARKS[this.coachmarkId];
    if (!entry) {
      return;
    }
    const element = coachmark({
      title: entry.title,
      body: entry.body,
      anchor: this.coachmarkAnchor,
      onDismiss: () => this.dismissCoachmark()
    });
    this.coachmarkHost.appendChild(element);
    const anchorRect = this.coachmarkAnchor.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    let top = anchorRect.bottom + 8;
    if (top + box.height > window.innerHeight - 8) {
      top = anchorRect.top - box.height - 8;
    }
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - box.width - 8));
    element.style.top = `${Math.round(top)}px`;
    element.style.left = `${Math.round(left)}px`;
  }

  private renderCard(): void {
    clear(this.cardHost);
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    const target = this.selection.length > 0 ? this.selection[this.selection.length - 1] : undefined;
    const resolution = annotation.resolutions[0];
    const bounds = target?.grounding.boundingBox;
    const card = h('div', {
      class: 'anchored-card',
      attrs: { role: 'dialog', 'aria-label': 'Annotation card' }
    });
    card.appendChild(this.targetLine(annotation, target));
    card.appendChild(this.relationLine(annotation));
    const textarea = h('textarea', {
      class: 'textarea',
      attrs: { rows: '4', placeholder: 'What should change?', 'aria-label': 'What should change?' },
      dataset: { overThreshold: 'false' },
      on: { input: (event) => this.onNoteInput((event.target as HTMLTextAreaElement).value) }
    }) as HTMLTextAreaElement;
    textarea.value = annotation.note;
    card.appendChild(textarea);
    card.appendChild(this.attachmentRow(annotation));
    const actions = h(
      'div',
      { class: 'anchored-card__actions' },
      button('Queue', { variant: 'primary', onClick: () => void this.queueActive() })
    );
    const iconRow = h('div', { class: 'chips' });
    const capture = iconButton(
      `Capture a view of the artifact — ${CAPTURE_SUPPORT_STATEMENT}`,
      'show',
      () => void this.captureView()
    );
    capture.dataset['action'] = 'capture-view';
    iconRow.appendChild(capture);
    iconRow.appendChild(iconButton('Attach a reference image', 'attach', () => this.pickAttachment()));
    iconRow.appendChild(
      iconButton(`Delete Annotation ${annotation.annotationId}`, 'delete', () => void this.deleteAnnotation(annotation.annotationId))
    );
    actions.appendChild(iconRow);
    card.appendChild(actions);

    this.cardHost.appendChild(card);
    positionCard(card, bounds, this.stage, this.islandHost, !this.beforeAfterHost.hidden);
    card.addEventListener('paste', (event) => this.onPaste(event as ClipboardEvent));
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', (event) => this.onDrop(event as DragEvent));
    textarea.focus();
    void resolution;
  }

  private relationLine(annotation: Annotation): HTMLElement {
    const wrap = h('div', { class: 'relation-sentences' });
    for (const relation of annotation.relationships) {
      wrap.appendChild(
        h('p', {
          class: 'relation-sentence',
          text: relationSentence(relation, (targetId) => targetName(annotation.targets, targetId))
        })
      );
    }
    const preview = h('p', { class: 'relation-sentence', attrs: { 'data-relation-preview': 'true' } }) as HTMLElement;
    preview.hidden = !this.relationPreview;
    preview.textContent = this.relationPreview ? `Preview — not recorded yet: ${this.relationPreview}` : '';
    wrap.appendChild(preview);
    if (missingRelationTargets(annotation).length > 0) {
      wrap.appendChild(
        h('p', {
          class: 'hint',
          text: 'A target this relation names is no longer in this Annotation, so the relation cannot be judged against it.'
        })
      );
    }
    return wrap;
  }

  private targetLine(annotation: Annotation, target: LayerTarget | undefined): HTMLElement {
    const line = h('p', { class: 'anchored-card__target' });
    const members = annotation.targets.length > 0 ? annotation.targets : this.selection;
    const kind = target?.kind ?? annotation.targets[0]?.kind ?? 'element';
    line.appendChild(icon(kindIcon(kind), { size: 14 }));
    if (members.length <= 1) {
      line.append(describeTarget(target ?? annotation.targets[0]));
      return line;
    }
    const names = members.map((entry) => describeTarget(entry));
    const shown = names.slice(0, 3);
    const rest = names.length - shown.length;
    line.append(`${shown.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`);
    return line;
  }

  private attachmentRow(annotation: Annotation): HTMLElement {
    const pending = this.uploads.filter((upload) => upload.annotationId === annotation.annotationId);
    const ready = attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) });
    if (!ready && pending.length === 0) {
      return h('div', { class: 'section' });
    }
    return h(
      'div',
      { class: 'section' },
      ready ?? h('span'),
      h(
        'div',
        { class: 'chips' },
        pending.map((upload) =>
          h(
            'span',
            {
              class: 'chip',
              dataset: { state: upload.state },
              attrs: { 'data-state': upload.state, title: upload.reason ?? upload.name }
            },
            upload.state === 'uploading' ? `uploading ${upload.name}…` : `${upload.name} failed — ${upload.reason ?? 'retry'}`,
            ...(upload.state === 'failed' ? [button('Retry', { variant: 'ghost', onClick: () => void this.retryUpload(upload.id) })] : [])
          )
        )
      )
    );
  }

  private policyDisclosure(): string {
    const policy = this.policy;
    if (!policy) {
      return 'The artifact policy has not been read yet.';
    }
    if (policy.kind === 'proxied-application') {
      return `${policy.application?.permits.join('; ') ?? 'This application through the review origin'}. ${policy.application?.note ?? ''}`.trim();
    }
    return policy.remoteOrigins.length > 0 ? policy.remoteOrigins.join(', ') : 'None declared by this artifact.';
  }

  private renderDrawer(): void {
    clear(this.drawerHost);
    if (!this.drawerOpen) {
      return;
    }
    const body = h('div', { class: 'section' });
    body.appendChild(h('p', { class: 'section__title', text: 'What leaves this machine' }));
    const leaving = this.queue();
    const capturedViews = leaving
      .flatMap((annotation) => annotation.attachments)
      .filter((attachment) => isCapturedView(attachment));
    body.appendChild(
      disclosureList(
        leaving.length === 0
          ? []
          : [
              {
                title: `${leaving.length} Annotation${leaving.length === 1 ? '' : 's'} would leave on send`,
                body: leaving.flatMap((annotation) => describeEvidence(annotation)).map((item) => `${item.title}: ${item.body}`).join(' | ')
              },
              ...(capturedViews.length > 0
                ? [
                    {
                      title: `${capturedViews.length} Captured View${capturedViews.length === 1 ? '' : 's'} would leave on send`,
                      body: 'A Captured View is a browser-composited image of the artifact as you saw it, stored as bytes. It leaves this machine with the queue. It is never a re-render, and nothing moves the artifact out of this tab to take it.'
                    }
                  ]
                : []),
              {
                title: 'Remote origin contact',
                body: this.policyDisclosure()
              }
            ]
      )
    );

    body.appendChild(h('p', { class: 'section__title', text: 'Needs a decision' }));
    const unresolved = this.snapshot.annotations.filter(
      (annotation) => !isVerification(annotation.state) && annotation.resolutions.some((resolution) => resolution.match === 'unresolved')
    );
    if (unresolved.length === 0) {
      body.appendChild(h('p', { class: 'hint', text: 'No unresolved or ambiguous target right now.' }));
    } else {
      const list = h('ul', { class: 'disclosure-list' });
      for (const annotation of unresolved) {
        list.appendChild(
          h(
            'li',
            {},
            h('strong', { text: annotation.note || annotation.annotationId }),
            h('div', { class: 'chips' }, button('Go to it', { variant: 'ghost', onClick: () => this.activateAnnotation(annotation.annotationId) }))
          )
        );
      }
      body.appendChild(list);
    }

    body.appendChild(h('p', { class: 'section__title', text: 'Revision' }));
    body.appendChild(
      h('p', {
        class: 'hint',
        text:
          this.snapshot.annotations.some((annotation) => annotation.revisionRelation === 'advanced')
            ? 'The artifact has moved on since at least one Annotation was written. Those are labelled "written before this revision".'
            : 'Every Annotation was written against the revision now on screen.'
      })
    );
    if (this.revisionBasis === 'files') {
      body.appendChild(
        h('p', {
          class: 'hint',
          text: `This revision is derived from the application's files, not from the running document: it can report a change the page has not applied, and it can miss a change outside the watched set. The artifact reports the revision it actually holds, and that report is what an Annotation is stamped with.`
        })
      );
    } else if (this.config.kind === 'react-vite-app') {
      body.appendChild(
        h('p', {
          class: 'hint',
          text: `This revision comes from the document the application serves, not from the running page. The artifact reports the revision it holds, and an Annotation is stamped with that report; a change is adopted only when the artifact reports it, and an application whose page reports no update event stays at the revision it was served.`
        })
      );
    }
    if (this.snapshot.migration.migrated.length > 0 || this.snapshot.migration.skipped.length > 0 || this.snapshot.migration.unreadable.length > 0) {
      body.appendChild(h('p', { class: 'section__title', text: 'Migration' }));
      body.appendChild(
        disclosureList([
          {
            title: `${this.snapshot.migration.migrated.length} older envelope${this.snapshot.migration.migrated.length === 1 ? '' : 's'} read as Annotations`,
            body: 'One Annotation per target, each carrying the shared written direction.'
          },
          ...(this.snapshot.migration.skipped.length > 0
            ? [{ title: `${this.snapshot.migration.skipped.length} record${this.snapshot.migration.skipped.length === 1 ? '' : 's'} left untouched`, body: this.snapshot.migration.skipped.map((entry) => `${entry.envelopeId}: ${entry.reason}`).join(' | ') }]
            : []),
          ...(this.snapshot.migration.unreadable.length > 0
            ? [{ title: 'Unreadable state preserved', body: this.snapshot.migration.unreadable.map((entry) => `${entry.file}: ${entry.reason}`).join(' | ') }]
            : [])
        ])
      );
    }
    this.drawerHost.appendChild(drawer({ open: true, title: 'Needs you', onClose: () => this.toggleDrawer(false) }, body));
  }

  private renderMenu(): void {
    clear(this.menuHost);
    this.menuHost.appendChild(
      overflowMenu({
        open: this.menuOpen,
        items: [
          { label: 'Reload artifact', icon: 'reload', onSelect: () => void this.reloadArtifact() },
          { label: 'Copy artifact path', icon: 'show', onSelect: () => void this.copy(this.snapshot.artifact.source) },
          {
            label: 'Copy evidence for the queue',
            icon: 'check',
            onSelect: () => void this.copy(this.queue().flatMap((annotation) => describeEvidence(annotation)).map((item) => `${item.title}: ${item.body}`).join('\n'))
          },
          { label: 'Open the disclosure', icon: 'attention', onSelect: () => this.toggleDrawer(true) },
          {
            label: this.guidance.suppressed ? 'Restore guidance' : 'Clear all guidance',
            icon: 'attention',
            onSelect: () => this.toggleGuidance()
          },
          { label: 'End session', icon: 'close', onSelect: () => void this.endSession() }
        ],
        extra: h(
          'div',
          { class: 'overflow-menu__theme' },
          h('span', { class: 'hint', text: 'Theme' }),
          themeControl(this.theme, (choice) => this.setTheme(choice))
        )
      })
    );
  }

  private setTheme(choice: ThemeChoice): void {
    this.theme = choice;
    window.localStorage.setItem(THEME_KEY, choice);
    this.applyTheme();
    this.renderMenu();
  }

  private applyTheme(): void {
    if (this.theme === 'auto') {
      delete document.documentElement.dataset['theme'];
    } else {
      document.documentElement.dataset['theme'] = this.theme;
    }
  }

  private setMode(mode: LayerTool): void {
    this.mode = mode;
    this.configureLayer();
    this.renderIsland();
    if (mode === 'point' || mode === 'box') {
      const anchor = qs<HTMLElement>(this.islandHost, `[data-mode="${mode}"]`);
      if (anchor) {
        this.maybeCoachmark(`mode:${mode}`, anchor);
      }
    }
  }

  private maybeCoachmark(id: string, anchor: HTMLElement): void {
    if (this.guidance.suppressed || this.guidance.dismissed[id]) {
      return;
    }
    this.coachmarkId = id;
    this.coachmarkAnchor = anchor;
    this.renderCoachmark();
  }

  private dismissCoachmark(): void {
    if (this.coachmarkId) {
      this.guidance.dismissed[this.coachmarkId] = true;
      writeGuidance(this.guidance);
    }
    this.coachmarkId = undefined;
    this.coachmarkAnchor = undefined;
    this.renderCoachmark();
  }

  private toggleGuidance(): void {
    if (this.guidance.suppressed) {
      this.guidance = { suppressed: false, dismissed: {} };
    } else {
      this.guidance = { suppressed: true, dismissed: {} };
      this.coachmarkId = undefined;
      this.coachmarkAnchor = undefined;
    }
    writeGuidance(this.guidance);
    this.renderCoachmark();
    this.renderMenu();
  }

  private configureLayer(): void {
    this.postToLayer({ source: 'vil-shell', type: 'configure', tool: this.mode, revision: this.adoptedRevision, sessionId: this.config.sessionId });
  }

  private selectRow(annotationId: string): void {
    this.selectedRowId = annotationId;
    this.renderList();
    this.renderBeforeAfter();
  }

  private async activateAnnotation(annotationId: string): Promise<void> {
    this.selectedRowId = annotationId;
    const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === annotationId);
    if (annotation) {
      this.selection = annotation.targets.map((target) => ({
        targetId: target.targetId,
        kind: target.kind,
        grounding: target.renderedGrounding,
        label: target.label,
        provenanceConfidence: target.provenanceConfidence,
        ...(target.sourceProvenance ? { sourceProvenance: target.sourceProvenance } : {}),
        ...(target.regionEvidence ? { regionEvidence: target.regionEvidence } : {})
      })) as LayerTarget[];
      const selectors = annotation.targets.flatMap((target) => target.renderedGrounding.selectors ?? []);
      const mark: ShellMarkTargets = { source: 'vil-shell', type: 'mark-targets', nodeIds: [], selectors };
      this.postToLayer(mark);
    }
    this.renderCard();
    this.renderList();
    this.renderBeforeAfter();
  }

  private onLayerMessage(event: MessageEvent<LayerMessage>): void {
    if (event.source !== this.iframe.contentWindow) {
      return;
    }
    const message = event.data;
    if (!message || message.source !== 'vil-layer') {
      return;
    }
    switch (message.type) {
      case 'ready':
        void this.adoptReportedRevision(message.revision);
        this.configureLayer();
        if (this.beforeAfter === 'after') {
          this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
        }
        break;
      case 'applied':
        void this.onApplied(message.revision);
        break;
      case 'selection':
        void this.onSelection(message.targets);
        break;
      case 'relation-preview':
        this.relationPreview = message.sentence ?? undefined;
        this.updateRelationPreview();
        break;
      case 'relation':
        this.relationPreview = undefined;
        this.updateRelationPreview();
        void this.onRelation(message.relation);
        break;
      case 'candidates':
        this.candidates = message.candidates;
        this.viewedAddress = message.address;
        void this.resolveAll(message.revision);
        break;      case 'notice':
        this.showNotice(
          message.message,
          message.action === 'back-to-artifact'
            ? { label: 'Back to the reviewed document', onSelect: () => void this.reloadArtifact() }
            : undefined
        );
        break;
      case 'hover':
        break;
    }
  }

  private async onSelection(targets: LayerTarget[]): Promise<void> {
    this.selection = targets;
    if (targets.length === 0) {
      this.renderCard();
      return;
    }
    if (this.repointFor) {
      const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === this.repointFor);
      if (annotation) {
        await this.submitRepoint(annotation, targets);
      }
      return;
    }
    const active = this.activeAnnotation();
    if (active && isInQueue(active.state)) {
      try {
        const { relationships, removed } = relationsAmong(active.relationships, targets);
        await this.api.patchAnnotation(active.annotationId, { targets, relationships });
        await this.refresh();
        if (removed > 0) {
          this.showNotice(removedRelationsNotice(removed));
        }
      } catch (error) {
        this.showNotice(messageOf(error));
      }
    } else {
      try {
        const annotation = await this.api.createAnnotation(targets);
        this.activeAnnotationId = annotation.annotationId;
        this.selectedRowId = annotation.annotationId;
        await this.refresh();
      } catch (error) {
        this.showNotice(messageOf(error));
      }
    }
    this.renderCard();
  }

  private async onRelation(relation: LayerRelation): Promise<void> {
    const annotation = this.activeAnnotation();
    if (!annotation || !isInQueue(annotation.state)) {
      return;
    }
    const samePairing = (entry: { targetIds: readonly string[] }): boolean =>
      entry.targetIds.length === relation.targetIds.length &&
      [...entry.targetIds].sort().join('\u0000') === [...relation.targetIds].sort().join('\u0000');
    if (relation.targetIds.length === 0) {
      return;
    }
    const relationships = [
      ...annotation.relationships.filter((entry) => !samePairing(entry)),
      relation
    ] as Annotation['relationships'];
    try {
      await this.api.patchAnnotation(annotation.annotationId, { relationships });
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private updateRelationPreview(): void {
    const element = qs<HTMLElement>(this.cardHost, '[data-relation-preview]');
    if (!element) {
      return;
    }
    element.hidden = !this.relationPreview;
    element.textContent = this.relationPreview ? `Preview — not recorded yet: ${this.relationPreview}` : '';
  }

  private onNoteInput(value: string): void {
    const annotationId = this.activeAnnotationId;
    if (!annotationId) {
      return;
    }
    const textarea = qs<HTMLTextAreaElement>(this.cardHost, 'textarea');
    if (textarea) {
      textarea.dataset['overThreshold'] = String(value.length > 1200);
    }
    this.pendingNote = { annotationId, value };
    this.saveNote(annotationId, value);
  }

  private pendingNote?: { annotationId: string; value: string };

  private readonly saveNote = debounce((annotationId: string, value: string) => {
    const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === annotationId);
    if (!annotation || !isInQueue(annotation.state)) {
      return;
    }
    void this.api
      .patchAnnotation(annotationId, { note: value })
      .then(() => this.refresh())
      .catch((error) => this.showNotice(messageOf(error)));
  }, 250);

  private async flushNote(): Promise<void> {
    this.saveNote.cancel();
    const pending = this.pendingNote;
    if (!pending) {
      return;
    }
    this.pendingNote = undefined;
    const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === pending.annotationId);
    if (!annotation || annotation.note === pending.value) {
      return;
    }
    await this.api.patchAnnotation(pending.annotationId, { note: pending.value }).catch((error) => this.showNotice(messageOf(error)));
  }

  private async queueActive(): Promise<void> {
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    try {
      await this.flushNote();
      await this.api.queueAnnotation(annotation.annotationId);
      await this.refresh();
      this.activeAnnotationId = undefined;
      this.selection = [];
      this.relationPreview = undefined;
      this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
      this.renderCard();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async sendQueue(): Promise<void> {
    try {
      await this.flushNote();
      const result = await this.api.send();
      if (result.delivered === false) {
        this.showNotice(result.reason ?? 'Nothing was delivered.');
        return;
      }
      this.activeAnnotationId = undefined;
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error), { label: 'Try again', onSelect: () => void this.sendQueue() });
    }
  }

  private openAmend(annotationId: string): void {
    this.amendFor = annotationId;
    this.renderList();
  }

  private closeAmend(): void {
    this.amendFor = undefined;
    this.renderList();
  }

  private async submitAmend(annotationId: string, note: string): Promise<void> {
    try {
      const result = await this.api.amend(annotationId, note);
      this.amendFor = undefined;
      this.selectedRowId = result.successor.annotationId;
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async requestStop(): Promise<void> {
    try {
      const result = await this.api.interrupt();
      await this.refresh();
      this.showNotice(result.message);
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async deleteAnnotation(annotationId: string): Promise<void> {
    try {
      await this.api.deleteAnnotation(annotationId);
      if (this.activeAnnotationId === annotationId) {
        this.activeAnnotationId = undefined;
        this.selection = [];
        this.relationPreview = undefined;
        this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
      }
      await this.refresh();
      this.renderCard();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async move(annotationId: string, delta: number): Promise<void> {
    const queue = this.queue();
    const index = queue.findIndex((annotation) => annotation.annotationId === annotationId);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= queue.length) {
      return;
    }
    const ids = queue.map((annotation) => annotation.annotationId);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved!);
    try {
      await this.api.reorder(ids);
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private startRepoint(annotationId: string): void {
    this.repointFor = this.repointFor === annotationId ? undefined : annotationId;
    this.activeAnnotationId = undefined;
    this.amendFor = undefined;
    this.renderCard();
    this.renderList();
    if (this.repointFor) {
      this.setMode('point');
    }
  }

  private async submitRepoint(annotation: Annotation, targets: LayerTarget[]): Promise<void> {
    try {
      const { relationships, removed } = relationsAmong(annotation.relationships, targets);
      await this.api.repoint(annotation.annotationId, targets, relationships);
      this.repointFor = undefined;
      this.resolvedRevision = undefined;
      await this.refresh();
      this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
      if (removed > 0) {
        this.showNotice(removedRelationsNotice(removed));
      }
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async closePass(passId: string): Promise<void> {
    try {
      await this.api.closePass(passId);
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async anotherPass(passId: string): Promise<void> {
    try {
      await this.api.anotherPass(passId);
      await this.refresh();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async verdict(annotationId: string, verdict: string): Promise<void> {
    try {
      await this.api.verify(annotationId, verdict);
      await this.refresh();
    } catch (error) {
      this.showNotice(`Refused: ${messageOf(error)}`);
    }
  }

  private async removeAttachment(annotationId: string, attachmentId: string): Promise<void> {
    try {
      await this.api.removeAttachment(annotationId, attachmentId);
      await this.refresh();
      this.renderCard();
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private async captureView(): Promise<void> {
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    if (!captureAvailable()) {
      this.showNotice(captureUnavailableReason());
      return;
    }
    const result = await captureArtifactView(this.iframe);
    if (!result.ok) {
      this.showNotice(result.reason);
      return;
    }
    const file = new File([result.blob], 'Captured View.png', { type: 'image/png' });
    try {
      await this.api.uploadAttachment(annotation.annotationId, file);
      await this.refresh();
      this.renderCard();
      this.showNotice('Captured View attached: a browser-composited image of the artifact, cropped to it.');
    } catch (error) {
      this.showNotice(`The Captured View could not be stored: ${messageOf(error)}`);
    }
  }

  private pickAttachment(): void {
    const input = h('input', { type: 'file', attrs: { accept: 'image/*' }, style: { display: 'none' } });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        void this.upload(file);
      }
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  private onPaste(event: ClipboardEvent): void {
    const item = [...(event.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      event.preventDefault();
      void this.upload(file);
    }
  }

  private onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      event.preventDefault();
      void this.upload(file);
    }
  }

  private async upload(file: File): Promise<void> {
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    const id = `upload-${crypto.randomUUID()}`;
    if (file.size > 5 * 1024 * 1024) {
      this.uploads.push({
        id,
        annotationId: annotation.annotationId,
        name: file.name,
        file,
        state: 'failed',
        reason: 'larger than the 5MB limit, so its bytes were never read'
      });
      this.renderCard();
      this.showNotice('That file is larger than the 5MB limit, so its bytes were never read.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.uploads.push({
        id,
        annotationId: annotation.annotationId,
        name: file.name,
        file,
        state: 'failed',
        reason: `${file.type || 'that file'} is not an allowed reference image type`
      });
      this.renderCard();
      this.showNotice(`${file.type || 'That file'} is not an allowed reference image type.`);
      return;
    }
    this.uploads.push({ id, annotationId: annotation.annotationId, name: file.name, file, state: 'uploading' });
    this.renderCard();
    try {
      await this.api.uploadAttachment(annotation.annotationId, file);
      this.uploads = this.uploads.filter((upload) => upload.id !== id);
      await this.refresh();
      this.renderCard();
    } catch (error) {
      const entry = this.uploads.find((upload) => upload.id === id);
      if (entry) {
        entry.state = 'failed';
        entry.reason = messageOf(error);
      }
      this.renderCard();
      this.showNotice(`Upload failed: ${messageOf(error)}`);
    }
  }

  private async retryUpload(id: string): Promise<void> {
    const entry = this.uploads.find((upload) => upload.id === id);
    if (!entry) {
      return;
    }
    this.uploads = this.uploads.filter((upload) => upload.id !== id);
    await this.upload(entry.file);
  }

  private comparisonFor(annotation: Annotation | undefined): { from: string; to: string } | undefined {
    if (!annotation) {
      return undefined;
    }
    const to = annotation.resolvedRevision ?? annotation.writtenRevision;
    if (!annotation.resolutions.length || annotation.writtenRevision === to) {
      return undefined;
    }
    return { from: annotation.writtenRevision, to };
  }

  private renderBeforeAfter(): void {
    clear(this.beforeAfterHost);
    const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === this.selectedRowId);
    const comparison = this.comparisonFor(annotation);
    if (!comparison) {
      this.beforeAfterHost.hidden = true;
      return;
    }
    this.beforeAfterHost.hidden = false;
    const make = (mode: 'before' | 'after', label: string): HTMLButtonElement =>
      h('button', {
        type: 'button',
        text: label,
        attrs: { 'aria-pressed': this.beforeAfter === mode },
        on: { click: () => this.setBeforeAfter(mode) }
      });
    this.beforeAfterHost.appendChild(
      h(
        'div',
        { class: 'before-after', attrs: { role: 'group', 'aria-label': 'Revision comparison' } },
        make('before', `Before (${shortRevisionOf(comparison.from)})`),
        make('after', `After (${shortRevisionOf(comparison.to)})`)
      )
    );
  }

  private setBeforeAfter(mode: 'before' | 'after'): void {
    this.beforeAfter = mode;
    const annotation = this.snapshot.annotations.find((entry) => entry.annotationId === this.selectedRowId);
    const comparison = this.comparisonFor(annotation);
    if (mode === 'before' && comparison) {
      this.iframe.src = `/artifact/${this.config.sessionId}/before?revision=${encodeURIComponent(comparison.from)}`;
    } else {
      this.iframe.src = this.config.src || `/artifact/${this.config.sessionId}`;
    }
    this.renderBeforeAfter();
    this.renderCandidateMarks();
  }

  private async resolveAll(revision: string): Promise<void> {
    if (!this.candidates || this.beforeAfter === 'before') {
      return;
    }
    if (this.reading) {
      this.queuedRevision = revision;
      return;
    }
    if (this.resolvedRevision === revision) {
      return;
    }
    this.reading = true;
    try {
      const eligible = this.snapshot.annotations.filter(
        (annotation) => !isInQueue(annotation.state) && !isVerification(annotation.state)
      );
      for (const annotation of eligible) {
        await this.api.resolve(annotation.annotationId, revision, this.candidates, this.viewedAddress);
      }
      this.resolvedRevision = revision;
      await this.refresh();
      this.renderCandidateMarks();
    } catch (error) {
      this.showNotice(messageOf(error));
    } finally {
      this.reading = false;
      const next = this.queuedRevision;
      this.queuedRevision = undefined;
      if (next && next !== this.resolvedRevision) {
        await this.resolveAll(next);
      }
    }
  }

  private queuedRevision?: string;

  private renderCandidateMarks(): void {
    if (this.beforeAfter !== 'after') {
      this.postToLayer({ source: 'vil-shell', type: 'mark-candidates', candidates: [] });
      return;
    }
    const marks: Array<{ nodeId?: string; selector?: string; numeral: number; label: string }> = [];
    for (const annotation of this.snapshot.annotations) {
      for (const resolution of annotation.resolutions) {
        if (resolution.match !== 'unresolved' || resolution.candidates.length === 0) {
          continue;
        }
        resolution.candidates.forEach((entry, index) => {
          const candidate = entry.candidate;
          marks.push({
            nodeId: candidate.nodeId,
            ...(candidate.selectors?.[0] ? { selector: candidate.selectors[0] } : {}),
            numeral: index + 1,
            label: candidate.accessibleName ?? candidate.semanticRole ?? candidate.tag ?? candidate.nodeId
          });
        });
      }
    }
    this.postToLayer({ source: 'vil-shell', type: 'mark-candidates', candidates: marks });
  }

  private async onApplied(revision?: string): Promise<void> {
    if (revision && revision.length > 0) {
      await this.adoptReportedRevision(revision);
      return;
    }
    try {
      const status = await this.api.status();
      await this.adoptReportedRevision(status.currentRevision);
    } catch {
      return;
    }
  }

  private async adoptReportedRevision(revision: string): Promise<void> {
    if (revision.length === 0) {
      return;
    }
    const changed = revision !== this.adoptedRevision;
    this.adoptedRevision = revision;
    try {
      const status = await this.api.reportAdopted(revision);
      this.currentRevision = status.currentRevision;
    } catch {
      return;
    }
    if (changed) {
      this.configureLayer();
      this.renderRailHead();
    }
  }

  private async pollStatus(): Promise<void> {
    try {
      const status = await this.api.status();
      if (status.currentRevision) {
        this.currentRevision = status.currentRevision;
      }
      if (status.adoptedRevision) {
        this.adoptedRevision = status.adoptedRevision;
      }
      if (status.revisionBasis) {
        this.revisionBasis = status.revisionBasis;
      }
      if (status.changed) {
        this.renderBanner(status);
      } else if (!this.banner.hidden) {
        this.banner.hidden = true;
      }
      const agent = await this.api.agent();
      this.snapshot.agent = agent;
      this.renderRailHead();
      this.renderFooter();
    } catch {
      return;
    }
  }

  private renderBanner(status: SessionStatus): void {
    this.banner.hidden = false;
    clear(this.banner);
    const showing = shortRevisionOf(this.adoptedRevision);
    const offering = shortRevisionOf(status.currentRevision);
    const basis = status.revisionBasis === 'files' ? ' read from files' : '';
    this.banner.append(
      h('span', {
        text: `The artifact is showing ${showing}; the source now offers ${offering}${basis}. Reload to review the new revision.`
      }),
      button('Reload artifact', { variant: 'secondary', onClick: () => void this.reloadArtifact() })
    );
    void status;
  }

  private async reloadArtifact(): Promise<void> {
    try {
      const status = await this.api.reload();
      this.adoptedRevision = status.adoptedRevision;
      this.currentRevision = status.currentRevision;
      this.resolvedRevision = undefined;
      this.beforeAfter = 'after';
      this.banner.hidden = true;
      this.artifactLoaded = true;
      this.placeholder.hidden = true;
      this.iframe.hidden = false;
      this.iframe.src = this.config.src || `/artifact/${this.config.sessionId}`;
      await this.refresh();
      this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
    } catch (error) {
      this.showNotice(messageOf(error));
    }
  }

  private lastResolvedAt(): string | undefined {
    return this.snapshot.annotations
      .flatMap((annotation) => annotation.resolutions.map((resolution) => resolution.resolvedAt))
      .filter((value) => value.length > 0)
      .sort()
      .pop();
  }

  private needsDecisionCount(): number {
    return this.snapshot.annotations.filter(needsDecision).length;
  }

  private toggleDrawer(open: boolean): void {
    this.drawerOpen = open;
    this.renderDrawer();
    if (open) {
      this.trapFocus(this.drawerHost, () => this.toggleDrawer(false));
    } else {
      this.releaseFocus();
    }
  }

  private toggleMenu(open: boolean): void {
    this.menuOpen = open;
    this.renderMenu();
  }

  private trapFocus(container: HTMLElement, onEscape: () => void): void {
    this.releaseFocus();
    this.focusTrapHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', this.focusTrapHandler);
  }

  private releaseFocus(): void {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = undefined;
    }
  }

  private async endSession(): Promise<void> {
    let message: string;
    try {
      const result = await this.api.endSession();
      message = result.message;
    } catch {
      message = 'The session could not be ended, so the review URL still authorizes. Your unsent Annotations are still stored on this machine.';
    }
    this.showNotice(message);
    window.close();
  }

  private async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotice('Copied.');
    } catch {
      this.showNotice('Could not copy to the clipboard.');
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable);
    if (typing) {
      const textarea = target?.tagName === 'TEXTAREA' ? (target as HTMLTextAreaElement) : undefined;
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!this.amendFor) {
          void this.sendQueue();
        }
      } else if (event.key === 'Enter' && textarea && !event.shiftKey) {
        event.preventDefault();
        if (this.amendFor) {
          void this.submitAmend(this.amendFor, textarea.value);
        } else {
          void this.queueActive();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (this.coachmarkId) {
          this.dismissCoachmark();
          return;
        }
        if (this.amendFor) {
          this.closeAmend();
          return;
        }
        this.activeAnnotationId = undefined;
        this.renderCard();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (this.coachmarkId) {
        this.dismissCoachmark();
      } else if (this.menuOpen) {
        this.toggleMenu(false);
      } else if (this.drawerOpen) {
        this.toggleDrawer(false);
      } else if (this.amendFor) {
        this.closeAmend();
      } else if (this.repointFor) {
        this.startRepoint(this.repointFor);
      } else if (this.activeAnnotationId) {
        this.activeAnnotationId = undefined;
        this.renderCard();
      } else if (this.selection.length > 0) {
        this.selection = [];
        this.relationPreview = undefined;
        this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
      } else if (this.mode !== 'operate') {
        this.setMode('operate');
      } else {
        this.focusIsland();
      }
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'p') {
      this.setMode('point');
    } else if (key === 'b') {
      this.setMode('box');
    } else if (key === 'v') {
      this.setMode('operate');
    }
  }

  private focusIsland(): void {
    qs<HTMLButtonElement>(this.islandHost, '.mode-tile')?.focus();
  }

  private activeAnnotation(): Annotation | undefined {
    return this.snapshot.annotations.find((annotation) => annotation.annotationId === this.activeAnnotationId);
  }

  private queue(): Annotation[] {
    return this.snapshot.annotations.filter((annotation) => isInQueue(annotation.state));
  }

  private postToLayer(message: ShellMessage): void {
    this.iframe.contentWindow?.postMessage(message, '*');
  }

  private showNotice(message: string, action?: { label: string; onSelect: () => void }): void {
    this.notice = action ? { message, action } : { message };
    this.renderNotice();
    if (this.noticeTimer !== undefined) {
      window.clearTimeout(this.noticeTimer);
      this.noticeTimer = undefined;
    }
    if (!action) {
      this.noticeTimer = window.setTimeout(() => {
        this.notice = undefined;
        this.renderNotice();
      }, NOTICE_TIMEOUT_MS);
    }
  }

  private renderNotice(): void {
    clear(this.railNotice);
    if (!this.notice) {
      this.railNotice.hidden = true;
      return;
    }
    this.railNotice.hidden = false;
    this.railNotice.appendChild(
      noticeElement({
        message: this.notice.message,
        ...(this.notice.action ? { action: this.notice.action } : {}),
        onDismiss: () => {
          this.notice = undefined;
          this.renderNotice();
        }
      })
    );
  }
}

function kindIcon(kind: string): IconName {
  return kind === 'region' ? 'box' : kind === 'text-range' ? 'amend' : 'point';
}

function isClosed(state: Annotation['state']): boolean {
  return state === 'replaced' || state === 'obsolete';
}

function isCapturedView(attachment: Annotation['attachments'][number]): boolean {
  return (attachment.name ?? '').startsWith('Captured View');
}

function isDelivered(state: Annotation['state']): boolean {
  return state === 'delivered' || state === 'resolved' || state === 'acknowledged';
}

function isDecidable(state: Annotation['state']): boolean {
  return isDelivered(state) || isVerification(state);
}

function rank(annotation: Annotation): number {
  if (annotation.resolutions.some((resolution) => resolution.match === 'unresolved')) {
    return 0;
  }
  if (isDelivered(annotation.state)) {
    return 1;
  }
  if (isInQueue(annotation.state)) {
    return 2;
  }
  return 3;
}

function trim(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function shortRevisionOf(revision: string): string {
  return revision.replace(/^blake3:/, '').slice(0, 8);
}

function readStoredTheme(): ThemeChoice {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

type GuidanceState = { suppressed: boolean; dismissed: Record<string, boolean> };

const COACHMARKS: Record<string, { title: string; body: string }> = {
  'mode:point': {
    title: 'Pointing',
    body: 'Click a thing, or drag across words to take exactly those words. Press V to operate the artifact again.'
  },
  'mode:box': {
    title: 'Boxing an area',
    body: 'Drag to bound a patch that is not one thing. Press V to operate the artifact again.'
  }
};

function readGuidance(): GuidanceState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUIDANCE_KEY) ?? '{}') as Partial<GuidanceState>;
    return {
      suppressed: parsed.suppressed === true,
      dismissed: typeof parsed.dismissed === 'object' && parsed.dismissed !== null ? parsed.dismissed : {}
    };
  } catch {
    return { suppressed: false, dismissed: {} };
  }
}

function writeGuidance(guidance: GuidanceState): void {
  window.localStorage.setItem(GUIDANCE_KEY, JSON.stringify(guidance));
}

function needsDecision(annotation: Annotation): boolean {
  if (isVerification(annotation.state)) {
    return false;
  }
  return isDelivered(annotation.state) || annotation.resolutions.some((resolution) => resolution.match === 'unresolved');
}

function relativeTime(iso: string): string {
  const delta = Date.now() - Date.parse(iso);
  const seconds = Math.max(0, Math.round(delta / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return `${Math.round(minutes / 60)}h ago`;
}

function describeTarget(target: Annotation['targets'][number] | LayerTarget | undefined): string {
  if (!target) {
    return 'Target';
  }
  const grounding = 'grounding' in target ? target.grounding : target.renderedGrounding;
  return target.label ?? grounding.accessibleName ?? grounding.semanticRole ?? target.kind;
}

function positionCard(
  card: HTMLElement,
  bounds: { x: number; y: number; width: number; height: number } | undefined,
  stage: HTMLElement,
  islandHost: HTMLElement,
  comparisonVisible: boolean
): void {
  const stageRect = stage.getBoundingClientRect();
  const islandRect = islandHost.getBoundingClientRect();
  const width = 340;
  const height = card.getBoundingClientRect().height || 240;
  const ceiling = comparisonVisible ? 56 : 12;
  const floor = islandRect.height > 0 ? stageRect.height - islandRect.height - 24 : stageRect.height;
  if (!bounds) {
    card.style.left = `${Math.max(12, stageRect.width / 2 - width / 2)}px`;
    card.style.top = `${Math.max(ceiling, floor / 2 - height / 2)}px`;
    return;
  }
  let left = bounds.x + bounds.width + 12;
  if (left + width > stageRect.width - 12) {
    left = bounds.x - width - 12;
  }
  left = Math.max(12, Math.min(left, stageRect.width - width - 12));
  const top = Math.max(ceiling, Math.min(bounds.y, floor - height - 12));
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function removedRelationsNotice(count: number): string {
  return count === 1
    ? 'The relation was removed because a target it named is no longer in this Annotation.'
    : `${count} relations were removed because they named targets no longer in this Annotation.`;
}

function unresolvedSentence(label: string, resolution: TargetResolutionRecord, state: RuntimeStateContext): string {
  if (deriveResolutionLabel(resolution, state) === 'state-only') {
    return `${label} may exist only in a state no longer on screen, so approval is blocked.`;
  }
  if (resolution.candidates.length === 0) {
    return `${label} is not in this revision, so approval is blocked.`;
  }
  return `${label} could not be matched in this revision, so approval is blocked.`;
}

const app = new App();
void app.start();

export { App };
