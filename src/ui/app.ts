import type { Annotation } from '../annotation/model.js';
import { approvalBlockers, isInQueue, isVerification, stateLabel } from '../annotation/model.js';
import type { ResolutionCandidate } from '../resolution/resolve.js';
import { Api, type Policy, type SessionSnapshot, type SessionStatus } from './api.js';
import {
  agentPositionEl,
  attachmentChips,
  annotationStateCue,
  candidateChooser,
  checkedSentence,
  describeEvidence,
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
  verdictControls,
  type ThemeChoice
} from './components.js';
import { button, clear, h, iconButton, qs } from './dom.js';
import { icon, type IconName } from './icons.js';
import type { LayerMessage, LayerTarget, LayerTool, ShellMessage, ShellMarkTargets } from './protocol.js';
import { debounce, readConfig, type ShellConfig } from './runtime.js';

const THEME_KEY = 'vil-theme';
const HINT_KEY_PREFIX = 'vil-hint-';

class App {
  private readonly config: ShellConfig = readConfig();
  private readonly api = new Api(this.config.sessionId, this.config.capability);
  private snapshot!: SessionSnapshot;
  private policy?: Policy;
  private mode: LayerTool = 'operate';
  private selection: LayerTarget[] = [];
  private activeAnnotationId?: string;
  private amendFor?: string;
  private candidates?: ResolutionCandidate[];
  private resolvedRevision?: string;
  private currentRevision = this.config.revision;
  private adoptedRevision = this.config.revision;
  private reading = false;
  private artifactLoaded = false;
  private drawerOpen = false;
  private menuOpen = false;
  private toastTimer?: number;
  private beforeAfter: 'before' | 'after' = 'after';
  private selectedRowId?: string;
  private closedHidden = true;
  private theme: ThemeChoice = readStoredTheme();
  private hintDismissed = false;
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
  private railScroll!: HTMLElement;
  private railFooter!: HTMLElement;
  private cardHost!: HTMLElement;
  private banner!: HTMLElement;
  private beforeAfterHost!: HTMLElement;
  private islandHost!: HTMLElement;
  private hintHost!: HTMLElement;
  private drawerHost!: HTMLElement;
  private menuHost!: HTMLElement;
  private toast!: HTMLElement;

  async start(): Promise<void> {
    this.buildShell();
    this.applyTheme();
    window.addEventListener('message', (event) => this.onLayerMessage(event));
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
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
    this.hintHost = h('div', { class: 'hint-host' });
    this.cardHost = h('div', { class: 'card-host' });
    this.stage.append(this.placeholder, this.iframe, this.banner, this.beforeAfterHost, this.cardHost, this.islandHost, this.hintHost);

    this.railHead = h('header', { class: 'rail__head' });
    this.railScroll = h('div', { class: 'rail__scroll' });
    this.railFooter = h('div', { class: 'rail__footer' });
    const rail = h(
      'aside',
      { class: 'rail', attrs: { 'aria-label': 'Annotations' } },
      this.railHead,
      this.railScroll,
      this.railFooter
    );

    const workspace = h('div', { class: 'workspace' }, this.stage, rail);
    this.drawerHost = h('div');
    this.menuHost = h('div');
    this.toast = toastElement();

    document.body.append(workspace, this.drawerHost, this.menuHost, this.toast);
  }

  private async refresh(): Promise<void> {
    try {
      this.snapshot = await this.api.snapshot();
    } catch (error) {
      this.showToast(`Could not read local state: ${messageOf(error)}`);
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
    this.renderHint();
    this.renderDrawer();
    this.renderMenu();
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
      { class: 'rail__agent' },
      agentPositionEl(this.snapshot.agent),
      this.stopAction()
    );
    const actions = h('div', { class: 'rail__actions' });
    const attention = this.attentionItems();
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
    const all = [...this.snapshot.annotations].sort((a, b) => a.order - b.order);
    const open = all.filter((annotation) => !isClosed(annotation.state));
    const closed = all.filter((annotation) => isClosed(annotation.state));
    open.sort((a, b) => rank(a) - rank(b) || a.order - b.order);

    const lastRun = this.lastResolvedAt();
    const header = h('div', { class: 'rail__list-head' });
    header.appendChild(
      h('span', { class: 'rail__count', text: open.length === 0 ? 'Nothing open' : `${open.length} needing attention` })
    );
    if (lastRun) {
      header.appendChild(h('span', { class: 'hint', text: `Re-resolved ${relativeTime(lastRun)}` }));
    }
    this.railScroll.appendChild(header);

    if (open.length === 0 && (closed.length === 0 || this.closedHidden)) {
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

    const list = h('ul', { class: 'annotation-list' });
    for (const annotation of open) {
      list.appendChild(this.annotationRow(annotation));
    }
    if (!this.closedHidden) {
      for (const annotation of closed) {
        list.appendChild(this.annotationRow(annotation));
      }
    }
    if (list.childElementCount > 0) {
      this.railScroll.appendChild(list);
    }

    if (closed.length > 0) {
      const toggle = button(this.closedHidden ? `Show ${closed.length} closed` : 'Hide closed', {
        variant: 'ghost',
        onClick: () => {
          this.closedHidden = !this.closedHidden;
          this.renderList();
        }
      });
      toggle.dataset['toggle'] = 'closed';
      this.railScroll.appendChild(toggle);
    }
  }

  private annotationRow(annotation: Annotation): HTMLElement {
    const row = h('article', {
      class: 'annotation-row',
      dataset: { active: String(annotation.annotationId === this.selectedRowId) },
      attrs: { 'data-active': annotation.annotationId === this.selectedRowId, 'data-state': annotation.state }
    });
    const head = h(
      'div',
      { class: 'annotation-row__head' },
      statePill(annotation.state),
      annotation.revisionRelation === 'advanced'
        ? pill('Written before this revision', 'attention', 'alert')
        : pill('Written against this revision', 'closed', 'check')
    );
    row.appendChild(head);

    if (annotation.supersedes) {
      const predecessor = this.snapshot.annotations.find((entry) => entry.annotationId === annotation.supersedes);
      row.appendChild(
        h('p', {
          class: 'hint',
          text: `Amends ${predecessor?.note ? `“${trim(predecessor.note)}”` : annotation.supersedes}`
        })
      );
    }
    if (annotation.supersededBy) {
      const successor = this.snapshot.annotations.find((entry) => entry.annotationId === annotation.supersededBy);
      row.appendChild(
        h('p', {
          class: 'hint',
          text: `Replaced by ${successor?.note ? `“${trim(successor.note)}”` : annotation.supersededBy}`
        })
      );
    }

    if (this.amendFor === annotation.annotationId) {
      row.appendChild(this.amendEditor(annotation));
    } else {
      row.appendChild(h('p', { class: 'annotation-row__note', text: annotation.note || 'No note' }));
      row.appendChild(relationSentenceEl(annotation) ?? h('span'));
    }

    const targets = h('ul', { class: 'resolution-list' });
    for (const resolution of annotation.resolutions) {
      const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
      const label = target?.label ?? target?.renderedGrounding.accessibleName ?? target?.kind ?? resolution.targetId;
      targets.appendChild(resolutionItem(resolution, label));
    }
    if (annotation.resolutions.length > 0) {
      row.appendChild(targets);
    }
    for (const resolution of annotation.resolutions) {
      if (resolution.match === 'unresolved' && resolution.candidates.length > 0) {
        const target = annotation.targets.find((entry) => entry.targetId === resolution.targetId);
        row.appendChild(
          h('p', {
            class: 'hint',
            text: `Choose a candidate for ${target?.label ?? resolution.targetId}; nothing is auto-selected.`
          })
        );
        row.appendChild(
          candidateChooser(annotation, resolution.targetId, resolution, (targetId, nodeId) => void this.choose(targetId, nodeId))
        );
      }
    }

    const delivered = isDelivered(annotation.state);
    if (delivered) {
      row.appendChild(this.verdictBlock(annotation));
    }
    if (annotation.attachments.length > 0) {
      row.appendChild(
        attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) }) ??
          h('span')
      );
    }
    if (annotation.verification) {
      row.appendChild(
        h('p', { class: 'hint', text: `Recorded: ${stateLabel(annotation.state)} at ${annotation.verification.at}` })
      );
    }

    const actions = h('div', { class: 'annotation-row__actions' });
    actions.appendChild(
      button('Show on the artifact', { variant: 'ghost', onClick: () => void this.activateAnnotation(annotation.annotationId) })
    );
    if (delivered) {
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
      if ((event.target as HTMLElement).closest('button, input, textarea, label')) {
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
      h('p', { class: 'hint', text: 'This supersedes what was sent; the record of what the agent was told stays.' }),
      textarea,
      h('p', { class: 'amend-editor__was', text: annotation.supersedes ? `Was: ${trim(this.noteOf(annotation.supersedes), 160)}` : '' }),
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

  private verdictBlock(annotation: Annotation): HTMLElement {
    const blocked = approvalBlockers(annotation);
    return verdictControls(annotation, {
      blocked,
      ...(annotation.verification ? { recorded: `Recorded: ${annotation.verification.verdict}` } : {}),
      onVerdict: (verdict) => void this.verdict(annotation.annotationId, verdict)
    });
  }

  private renderFooter(): void {
    clear(this.railFooter);
    const queue = this.queue();
    const report = this.snapshot.agent;
    const send = button('Send the queue', {
      variant: 'primary',
      disabled: queue.length === 0,
      ...(queue.length === 0 ? { title: 'There is nothing queued to send.' } : {}),
      onClick: () => void this.sendQueue()
    });
    send.dataset['action'] = 'send';
    const wrapper = h(
      'div',
      { class: 'send-action' },
      send,
      h('p', {
        class: 'hint',
        text:
          queue.length === 0
            ? 'Send is disabled because nothing is queued.'
            : `${queue.length} Annotation${queue.length === 1 ? '' : 's'} will be delivered as Next-Pass Intent. ${checkedSentence(report)}`
      })
    );
    this.railFooter.appendChild(wrapper);
  }

  private renderIsland(): void {
    clear(this.islandHost);
    this.islandHost.appendChild(modeIsland(this.mode, (mode) => this.setMode(mode)));
  }

  private renderHint(): void {
    clear(this.hintHost);
    if (this.hintDismissed || window.localStorage.getItem(`${HINT_KEY_PREFIX}${this.config.artifactId}`) === 'seen') {
      return;
    }
    const hint = h(
      'div',
      { class: 'first-run-hint', attrs: { role: 'note' } },
      h('p', { text: 'Point at things by clicking, or drag across words to take exactly those words. Box an area to mark a patch that is not one thing. Press V to go back to operating the artifact.' }),
      button('Got it', {
        variant: 'ghost',
        onClick: () => {
          window.localStorage.setItem(`${HINT_KEY_PREFIX}${this.config.artifactId}`, 'seen');
          this.hintDismissed = true;
          this.renderHint();
        }
      })
    );
    this.hintHost.appendChild(hint);
  }

  private renderCard(): void {
    clear(this.cardHost);
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    const target = this.selection[0];
    const resolution = annotation.resolutions[0];
    const bounds = target?.grounding.boundingBox;
    const card = h('div', {
      class: 'anchored-card',
      attrs: { role: 'dialog', 'aria-label': 'Annotation card' }
    });
    card.appendChild(this.targetLine(annotation, target));
    const textarea = h('textarea', {
      class: 'textarea',
      attrs: { rows: '4', placeholder: 'What should change?', 'aria-label': 'What should change?' },
      dataset: { overThreshold: 'false' },
      on: { input: (event) => this.onNoteInput((event.target as HTMLTextAreaElement).value) }
    }) as HTMLTextAreaElement;
    textarea.value = annotation.note;
    card.appendChild(textarea);
    const relationSentence = relationSentenceEl(annotation);
    if (relationSentence) {
      card.appendChild(relationSentence);
    }
    card.appendChild(this.attachmentRow(annotation));
    const actions = h(
      'div',
      { class: 'anchored-card__actions' },
      button('Queue', { variant: 'primary', onClick: () => void this.queueActive() })
    );
    const iconRow = h('div', { class: 'chips' });
    iconRow.appendChild(iconButton('Attach a reference image', 'attach', () => this.pickAttachment()));
    iconRow.appendChild(
      iconButton(`Delete Annotation ${annotation.annotationId}`, 'delete', () => void this.deleteAnnotation(annotation.annotationId))
    );
    actions.appendChild(iconRow);
    card.appendChild(actions);

    this.cardHost.appendChild(card);
    positionCard(card, bounds, this.stage, this.islandHost);
    card.addEventListener('paste', (event) => this.onPaste(event as ClipboardEvent));
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', (event) => this.onDrop(event as DragEvent));
    textarea.focus();
    if (resolution && resolution.match === 'unresolved' && resolution.candidates.length > 0) {
      card.appendChild(candidateChooser(annotation, resolution.targetId, resolution, (targetId, nodeId) => void this.choose(targetId, nodeId)));
    }
  }

  private targetLine(annotation: Annotation, target: LayerTarget | undefined): HTMLElement {
    const line = h('p', { class: 'anchored-card__target' });
    const kind = target?.kind ?? annotation.targets[0]?.kind ?? 'element';
    line.appendChild(icon(kindIcon(kind), { size: 14 }));
    line.append(describeTarget(target ?? annotation.targets[0]));
    return line;
  }

  private attachmentRow(annotation: Annotation): HTMLElement {
    const pending = this.uploads.filter((upload) => upload.annotationId === annotation.annotationId);
    const ready = attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) });
    if (!ready && pending.length === 0) {
      if (annotation.note.trim().length > 0) {
        return h('div', { class: 'section' });
      }
      return h(
        'div',
        { class: 'section' },
        h('p', { class: 'hint', text: 'Add an image by picking a file, pasting, or dropping it here.' })
      );
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

  private renderDrawer(): void {
    clear(this.drawerHost);
    if (!this.drawerOpen) {
      return;
    }
    const body = h('div', { class: 'section' });
    body.appendChild(h('p', { class: 'section__title', text: 'What leaves this machine' }));
    const leaving = this.queue();
    body.appendChild(
      disclosureList(
        leaving.length === 0
          ? []
          : [
              {
                title: `${leaving.length} Annotation${leaving.length === 1 ? '' : 's'} would leave on send`,
                body: leaving.flatMap((annotation) => describeEvidence(annotation)).map((item) => `${item.title}: ${item.body}`).join(' | ')
              },
              {
                title: 'Remote origin contact',
                body: (this.policy?.remoteOrigins ?? []).length > 0 ? (this.policy?.remoteOrigins ?? []).join(', ') : 'None declared by this artifact.'
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
          { label: 'End session', icon: 'close', onSelect: () => this.endSession() }
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
        this.configureLayer();
        if (this.beforeAfter === 'after') {
          this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
        }
        break;
      case 'selection':
        void this.onSelection(message.targets);
        break;
      case 'candidates':
        this.candidates = message.candidates;
        void this.resolveAll(message.revision);
        break;
      case 'notice':
        this.showToast(message.message);
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
    const active = this.activeAnnotation();
    if (active && isInQueue(active.state)) {
      try {
        await this.api.patchAnnotation(active.annotationId, { targets });
        await this.refresh();
      } catch (error) {
        this.showToast(messageOf(error));
      }
    } else {
      try {
        const annotation = await this.api.createAnnotation(targets);
        this.activeAnnotationId = annotation.annotationId;
        this.selectedRowId = annotation.annotationId;
        await this.refresh();
      } catch (error) {
        this.showToast(messageOf(error));
      }
    }
    this.renderCard();
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
      .catch((error) => this.showToast(messageOf(error)));
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
    await this.api.patchAnnotation(pending.annotationId, { note: pending.value }).catch((error) => this.showToast(messageOf(error)));
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
      this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
      this.renderCard();
      this.showToast('Queued. It stays on this machine until you send.');
    } catch (error) {
      this.showToast(messageOf(error));
    }
  }

  private async sendQueue(): Promise<void> {
    try {
      await this.flushNote();
      const result = await this.api.send();
      if (result.delivered === false) {
        this.showToast(result.reason ?? 'Nothing was delivered.');
        return;
      }
      this.activeAnnotationId = undefined;
      await this.refresh();
      this.showToast(`Delivered as Next-Pass Intent${result.holding ? ' to a call that is being held' : '; the agent reads it at its next Check-In'}.`);
    } catch (error) {
      this.showToast(messageOf(error));
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
      this.showToast(
        `Amendment delivered as Steering Intent${result.holding ? ' to a call that is being held' : '; the agent reads it at its next Check-In'}.`
      );
    } catch (error) {
      this.showToast(messageOf(error));
    }
  }

  private async requestStop(): Promise<void> {
    try {
      const result = await this.api.interrupt();
      await this.refresh();
      this.showToast(result.message);
    } catch (error) {
      this.showToast(messageOf(error));
    }
  }

  private async deleteAnnotation(annotationId: string): Promise<void> {
    try {
      await this.api.deleteAnnotation(annotationId);
      if (this.activeAnnotationId === annotationId) {
        this.activeAnnotationId = undefined;
        this.selection = [];
        this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
      }
      await this.refresh();
      this.renderCard();
    } catch (error) {
      this.showToast(messageOf(error));
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
      this.showToast(messageOf(error));
    }
  }

  private async choose(targetId: string, nodeId: string): Promise<void> {
    const annotation = this.activeAnnotation() ?? this.deliverable().find((entry) => entry.targets.some((target) => target.targetId === targetId));
    if (!annotation) {
      return;
    }
    try {
      await this.api.chooseCandidate(annotation.annotationId, targetId, nodeId);
      await this.refresh();
    } catch (error) {
      this.showToast(messageOf(error));
    }
  }

  private async verdict(annotationId: string, verdict: string): Promise<void> {
    try {
      await this.api.verify(annotationId, verdict);
      await this.refresh();
    } catch (error) {
      this.showToast(`Refused: ${messageOf(error)}`);
    }
  }

  private async removeAttachment(annotationId: string, attachmentId: string): Promise<void> {
    try {
      await this.api.removeAttachment(annotationId, attachmentId);
      await this.refresh();
      this.renderCard();
    } catch (error) {
      this.showToast(messageOf(error));
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
      this.showToast('That file is larger than the 5MB limit, so its bytes were never read.');
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
      this.showToast(`${file.type || 'That file'} is not an allowed reference image type.`);
      return;
    }
    this.uploads.push({ id, annotationId: annotation.annotationId, name: file.name, file, state: 'uploading' });
    this.renderCard();
    try {
      await this.api.uploadAttachment(annotation.annotationId, file);
      this.uploads = this.uploads.filter((upload) => upload.id !== id);
      await this.refresh();
      this.renderCard();
      this.showToast('Reference image attached.');
    } catch (error) {
      const entry = this.uploads.find((upload) => upload.id === id);
      if (entry) {
        entry.state = 'failed';
        entry.reason = messageOf(error);
      }
      this.renderCard();
      this.showToast(`Upload failed: ${messageOf(error)}`);
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
    this.iframe.src = mode === 'before' ? `/artifact/${this.config.sessionId}/before` : this.config.src || `/artifact/${this.config.sessionId}`;
    this.renderBeforeAfter();
    this.showToast(mode === 'before' ? 'Showing the revision this direction was written against.' : 'Showing the revision the result came from.');
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
        await this.api.resolve(annotation.annotationId, revision, this.candidates);
      }
      this.resolvedRevision = revision;
      await this.refresh();
    } catch (error) {
      this.showToast(messageOf(error));
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

  private async pollStatus(): Promise<void> {
    try {
      const status = await this.api.status();
      if (status.currentRevision) {
        this.currentRevision = status.currentRevision;
      }
      if (status.adoptedRevision) {
        this.adoptedRevision = status.adoptedRevision;
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
    this.banner.append(
      h('span', { text: 'The artifact changed under review.' }),
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
      this.showToast(messageOf(error));
    }
  }

  private lastResolvedAt(): string | undefined {
    return this.snapshot.annotations
      .flatMap((annotation) => annotation.resolutions.map((resolution) => resolution.resolvedAt))
      .filter((value) => value.length > 0)
      .sort()
      .pop();
  }

  private attentionItems(): number {
    const unresolved = this.snapshot.annotations.filter(
      (annotation) => !isVerification(annotation.state) && annotation.resolutions.some((resolution) => resolution.match === 'unresolved')
    ).length;
    const advanced = this.snapshot.annotations.filter(
      (annotation) => annotation.revisionRelation === 'advanced' && !isVerification(annotation.state)
    ).length;
    const leaving = this.queue().length > 0 ? 1 : 0;
    return unresolved + advanced + leaving;
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

  private endSession(): void {
    this.showToast('Session ended. Your unsent Annotations are still stored on this machine.');
    window.close();
  }

  private async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied.');
    } catch {
      this.showToast('Could not copy to the clipboard.');
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable);
    if (typing) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void this.sendQueue();
      } else if (event.key === 'Enter' && target?.tagName === 'TEXTAREA' && !event.shiftKey) {
        event.preventDefault();
        void this.queueActive();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.activeAnnotationId = undefined;
        this.renderCard();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (this.drawerOpen) {
        this.toggleDrawer(false);
      } else if (this.menuOpen) {
        this.toggleMenu(false);
      } else if (this.amendFor) {
        this.closeAmend();
      } else if (this.activeAnnotationId) {
        this.activeAnnotationId = undefined;
        this.renderCard();
      } else if (this.selection.length > 0) {
        this.selection = [];
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

  private deliverable(): Annotation[] {
    return this.snapshot.annotations.filter((annotation) => !isInQueue(annotation.state));
  }

  private postToLayer(message: ShellMessage): void {
    this.iframe.contentWindow?.postMessage(message, '*');
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.hidden = false;
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, 4000);
  }
}

function kindIcon(kind: string): IconName {
  return kind === 'region' ? 'box' : kind === 'text-range' ? 'amend' : 'point';
}

function isClosed(state: Annotation['state']): boolean {
  return state === 'verified' || state === 'superseded' || state === 'obsolete';
}

function isDelivered(state: Annotation['state']): boolean {
  return state === 'delivered' || state === 'resolved' || state === 'acknowledged';
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
  islandHost: HTMLElement
): void {
  const stageRect = stage.getBoundingClientRect();
  const islandRect = islandHost.getBoundingClientRect();
  const width = 340;
  const height = card.getBoundingClientRect().height || 240;
  const floor = islandRect.height > 0 ? stageRect.height - islandRect.height - 24 : stageRect.height;
  if (!bounds) {
    card.style.left = `${Math.max(12, stageRect.width / 2 - width / 2)}px`;
    card.style.top = `${Math.max(12, floor / 2 - height / 2)}px`;
    return;
  }
  let left = bounds.x + bounds.width + 12;
  if (left + width > stageRect.width - 12) {
    left = bounds.x - width - 12;
  }
  left = Math.max(12, Math.min(left, stageRect.width - width - 12));
  const top = Math.max(12, Math.min(bounds.y, floor - height - 12));
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const app = new App();
void app.start();

export { App };
