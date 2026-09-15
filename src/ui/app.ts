import type { Annotation, AnnotationRelation } from '../annotation/model.js';
import { approvalBlockers, isInQueue, isVerification, stateLabel } from '../annotation/model.js';
import type { ResolutionCandidate } from '../resolution/resolve.js';
import { Api, type Policy, type SessionSnapshot } from './api.js';
import {
  TOOLS,
  agentPositionEl,
  attachmentChips,
  candidateChooser,
  describeEvidence,
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
  toolRow
} from './components.js';
import { button, clear, h, iconButton, qs } from './dom.js';
import type { LayerMessage, LayerRelation, LayerTarget, LayerTool, ShellMessage, ShellMarkTargets } from './protocol.js';
import { debounce, readConfig, type ShellConfig } from './runtime.js';
type View = 'review' | 'verify';

class App {
  private readonly config: ShellConfig = readConfig();
  private readonly api = new Api(this.config.sessionId, this.config.capability);
  private snapshot!: SessionSnapshot;
  private policy?: Policy;
  private view: View = 'review';
  private tool: LayerTool = 'element';
  private selection: LayerTarget[] = [];
  private activeAnnotationId?: string;
  private candidates?: ResolutionCandidate[];
  private resolvedRevision?: string;
  private currentRevision = this.config.revision;
  private reading = false;
  private artifactLoaded = false;
  private drawerOpen = false;
  private menuOpen = false;
  private toastTimer?: number;
  private beforeAfter: 'before' | 'after' = 'after';
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
  private panelScroll!: HTMLElement;
  private panelFooter!: HTMLElement;
  private panelTitle!: HTMLElement;
  private topbarRight!: HTMLElement;
  private cardHost!: HTMLElement;
  private banner!: HTMLElement;
  private beforeAfterHost!: HTMLElement;
  private drawerHost!: HTMLElement;
  private menuHost!: HTMLElement;
  private toast!: HTMLElement;

  async start(): Promise<void> {
    this.buildShell();
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
    this.topbarRight = h('div', { class: 'topbar__right', id: 'topbar-right' });
    const topbar = h(
      'header',
      { class: 'topbar', attrs: { role: 'banner' } },
      h(
        'div',
        { class: 'identity' },
        h('span', { class: 'identity__name', text: this.config.name }),
        h('span', { class: 'identity__kind', text: this.config.kind === 'react-vite-app' ? 'running application' : 'saved HTML' }),
        revisionChip(this.config.revision, false, `Revision ${this.config.revision}`)
      ),
      h('div', { id: 'state-switch-host' }),
      h('div', { id: 'tool-row-host' }),
      this.topbarRight
    );

    this.stage = h('section', { class: 'stage', attrs: { 'aria-label': 'Artifact under review' } });
    this.placeholder = h('div', { class: 'stage__placeholder' }, h('h2', { text: 'Preparing the artifact' }));
    this.iframe = h('iframe', {
      class: 'artifact-frame',
      title: 'Artifact under review',
      hidden: true,
      attrs: { src: 'about:blank', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups' }
    });
    this.banner = h('div', { class: 'banner', hidden: true, attrs: { role: 'alert' } });
    this.beforeAfterHost = h('div', { hidden: true });
    this.cardHost = h('div', { class: 'card-host' });
    this.stage.append(this.placeholder, this.iframe, this.banner, this.beforeAfterHost, this.cardHost);

    this.panelTitle = h('h2', { class: 'panel__title', text: 'Annotation Queue' });
    this.panelScroll = h('div', { class: 'panel__scroll' });
    this.panelFooter = h('div', { class: 'panel__footer' });
    const panel = h(
      'aside',
      { class: 'panel', attrs: { 'aria-label': 'Annotations' } },
      h(
        'div',
        { class: 'panel__header' },
        this.panelTitle,
        h('span', { id: 'panel-count', class: 'pill' })
      ),
      this.panelScroll,
      this.panelFooter
    );

    const workspace = h('div', { class: 'workspace' }, this.stage, panel);
    this.drawerHost = h('div');
    this.menuHost = h('div');
    this.toast = toastElement();

    document.body.append(topbar, workspace, this.drawerHost, this.menuHost, this.toast);
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
    this.renderTopbar();
    this.renderPanel();
    this.renderDrawer();
    this.renderMenu();
  }

  private renderGate(): void {
    clear(this.placeholder);
    const remote = this.policy?.remoteOrigins ?? [];
    if (remote.length === 0) {
      this.placeholder.append(h('h2', { text: 'Loading the artifact' }), h('p', { class: 'hint', text: 'No remote origin was declared by this artifact.' }));
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
              h('p', { class: 'hint', text: 'You declined the remote origins. Nothing contacted the network. Reload this page to reconsider.' })
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

  private renderTopbar(): void {
    const parent = this.topbarRight.parentElement!;
    const switchHost = qs(parent, '#state-switch-host');
    const toolHost = qs(parent, '#tool-row-host');
    if (switchHost) {
      clear(switchHost);
      switchHost.appendChild(
        stateSwitch(this.view, {
          verifyDisabled: !this.hasDeliverable(),
          onSelect: (state) => {
            this.view = state;
            this.renderTopbar();
            this.renderPanel();
            this.renderDrawer();
            void this.enterView(state);
          }
        })
      );
    }
    if (toolHost) {
      clear(toolHost);
      if (this.view === 'review') {
        toolHost.appendChild(toolRow(this.tool, (tool) => this.selectTool(tool)));
      }
    }

    clear(this.topbarRight);
    this.topbarRight.append(agentPositionEl(this.snapshot.agent));
    if (this.view === 'review' && this.selection.length > 0) {
      this.topbarRight.appendChild(pill(`${this.selection.length} target${this.selection.length === 1 ? '' : 's'} selected`, 'progress'));
    }
    const attention = this.attentionItems();
    if (attention > 0) {
      this.topbarRight.appendChild(
        h(
          'button',
          {
            class: 'attention-trigger',
            type: 'button',
            title: 'What needs a decision',
            on: { click: () => this.toggleDrawer(!this.drawerOpen) }
          },
          h('span', { text: 'Needs you', attrs: { 'aria-hidden': 'true' } }),
          h('span', {
            class: 'attention-trigger__badge',
            text: String(attention),
            attrs: { 'aria-label': `${attention} items need a decision` }
          })
        )
      );
    }
    this.topbarRight.appendChild(iconButton('More actions', '⋯', () => this.toggleMenu(!this.menuOpen)));
  }


  private renderPanel(): void {
    clear(this.panelScroll);
    clear(this.panelFooter);
    const count = qs(document, '#panel-count');
    const queue = this.queue();
    if (this.view === 'review') {
      this.panelTitle.textContent = 'Annotation Queue';
      if (count) {
        count.textContent = queue.length === 0 ? 'empty' : `${queue.length} unsent`;
      }
      this.renderQueue(queue);
      this.renderSendControls(queue);
    } else {
      this.panelTitle.textContent = 'Verify';
      const deliverable = this.deliverable();
      if (count) {
        count.textContent = `${deliverable.length} to decide`;
      }
      this.renderVerify(deliverable);
    }
  }

  private renderQueue(queue: Annotation[]): void {
    this.panelScroll.appendChild(h('p', { class: 'section__title', text: 'Unsent' }));
    if (queue.length === 0) {
      this.panelScroll.appendChild(
        h('div', {
          class: 'empty',
          text:
            this.selection.length > 0
              ? 'Write the note in the card next to your target, then queue it.'
              : 'Pick the Element, Text or Region tool and select something in the artifact.'
        })
      );
      return;
    }
    const list = h('ul', { class: 'queue-list' });
    queue.forEach((annotation, index) => {
      const item = h(
        'li',
        {
          class: 'queue-item',
          dataset: { active: String(annotation.annotationId === this.activeAnnotationId) },
          attrs: { 'data-active': annotation.annotationId === this.activeAnnotationId },
          on: { click: () => this.activateAnnotation(annotation.annotationId) }
        },
        h(
          'div',
          { class: 'queue-item__body' },
          h('div', { class: 'queue-item__meta' }, statePill(annotation.state), pill(`${annotation.targets.length} target${annotation.targets.length === 1 ? '' : 's'}`)),
          h('p', { class: 'queue-item__note', text: annotation.note || 'No note yet' }),
          relationSentenceEl(annotation),
          annotation.revisionRelation === 'advanced' ? pill('Written before this revision', 'attention', '◆') : null
        ),
        h(
          'div',
          { class: 'queue-item__actions' },
          iconButton('Move up', '↑', () => void this.move(index, -1)),
          iconButton('Move down', '↓', () => void this.move(index, 1)),
          iconButton('Delete Annotation', '×', () => void this.deleteAnnotation(annotation.annotationId))
        )
      );
      list.appendChild(item);
    });
    this.panelScroll.appendChild(list);
  }

  private renderSendControls(queue: Annotation[]): void {
    this.panelFooter.appendChild(h('p', { class: 'section__title', text: 'Send' }));
    const intent = h(
      'select',
      { class: 'select', attrs: { 'aria-label': 'Delivery timing' } },
      h('option', { text: 'Next pass — queue for a clean turn', attrs: { value: 'next-pass' } }),
      h('option', { text: 'Steering — at the next safe boundary', attrs: { value: 'steering' } }),
      h('option', { text: 'Draft — keep on this machine', attrs: { value: 'draft' } })
    );
    const send = button('Send the queue', {
      variant: 'primary',
      disabled: queue.length === 0,
      ...(queue.length === 0 ? { title: 'There is nothing queued to send.' } : {}),
      onClick: () => void this.sendQueue((intent as HTMLSelectElement).value as 'next-pass' | 'steering' | 'draft')
    });
    this.panelFooter.append(intent, send, h('p', { class: 'hint', text: this.snapshot.agent.sentence }));
    if (queue.length === 0) {
      this.panelFooter.appendChild(h('p', { class: 'hint', text: 'Send is disabled because the Annotation Queue is empty.' }));
    }
  }

  private renderVerify(annotations: Annotation[]): void {
    if (annotations.length === 0) {
      this.panelScroll.appendChild(
        h('div', { class: 'empty', text: 'Nothing has been delivered yet, so there is nothing to verify.' })
      );
      return;
    }
    for (const annotation of annotations) {
      this.panelScroll.appendChild(this.annotationRow(annotation));
    }
  }

  private annotationRow(annotation: Annotation): HTMLElement {
    const row = h('article', {
      class: 'annotation-row',
      dataset: { active: String(annotation.annotationId === this.activeAnnotationId) },
      attrs: { 'data-active': annotation.annotationId === this.activeAnnotationId }
    });
    row.appendChild(
      h(
        'div',
        { class: 'annotation-row__head' },
        statePill(annotation.state),
        annotation.revisionRelation === 'advanced'
          ? pill('Written before this revision', 'attention', '◆')
          : pill('Written against this revision', 'closed', '=')
      )
    );
    row.appendChild(h('p', { class: 'annotation-row__note', text: annotation.note || 'No note' }));
    row.appendChild(relationSentenceEl(annotation) ?? h('span'));

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

    const blocked = approvalBlockers(annotation);
    row.appendChild(this.verdictBlock(annotation, blocked));

    if (annotation.attachments.length > 0) {
      row.appendChild(
        attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) }) ??
          h('span')
      );
    }
    if (annotation.verification) {
      row.appendChild(
        h('p', { class: 'hint', text: `Recorded: ${annotation.verification.verdict} at ${annotation.verification.at}` })
      );
    }
    if (isVerification(annotation.state)) {
      row.appendChild(h('p', { class: 'hint', text: `Settled: ${stateLabel(annotation.state)}` }));
    }
    row.appendChild(
      button('Show on the artifact', { variant: 'ghost', onClick: () => this.activateAnnotation(annotation.annotationId) })
    );
    return row;
  }

  private verdictBlock(annotation: Annotation, blocked: string[]): HTMLElement {
    const group = h('div', { class: 'chips', attrs: { role: 'group', 'aria-label': `Decision for ${annotation.annotationId}` } });
    const entries: Array<[string, string, 'primary' | 'secondary' | 'ghost']> = [
      ['approve', 'Approve', 'primary'],
      ['reject', 'Reject', 'secondary'],
      ['another-pass', 'Request another pass', 'secondary'],
      ['supersede', 'Supersede', 'ghost'],
      ['obsolete', 'Mark obsolete', 'ghost']
    ];
    for (const [verdict, label, variant] of entries) {
      const disabled = verdict === 'approve' && blocked.length > 0;
      group.appendChild(
        button(label, {
          variant,
          disabled,
          ...(disabled ? { title: blocked.join(' ') } : {}),
          onClick: () => void this.verdict(annotation.annotationId, verdict)
        })
      );
    }
    const wrap = h('div', { class: 'section' }, group);
    if (blocked.length > 0) {
      wrap.appendChild(h('p', { class: 'hint', text: `Approval is refused: ${blocked.join(' ')}` }));
    }
    return wrap;
  }


  private renderCard(): void {
    clear(this.cardHost);
    const annotation = this.activeAnnotation();
    if (!annotation || this.view !== 'review') {
      return;
    }
    const target = this.selection[0] ?? annotation.targets[0];
    const bounds = target?.grounding.boundingBox;
    const card = h(
      'div',
      { class: 'anchored-card', attrs: { role: 'dialog', 'aria-label': 'Annotation card' } },
      h('p', { class: 'anchored-card__target', text: describeTarget(this.selection[0] ?? annotation.targets[0]) }),
      h('label', { class: 'field__label', text: 'What should change?' }),
      h('textarea', {
        class: 'textarea',
        attrs: { rows: '4', placeholder: 'Describe the change the agent should make…' },
        dataset: { overThreshold: 'false' },
        on: { input: (event) => this.onNoteInput((event.target as HTMLTextAreaElement).value) }
      }),
      relationSentenceEl(annotation),
      h('p', {
        class: 'relation-sentence',
        hidden: true,
        dataset: { relationPreview: 'true' },
        attrs: { 'aria-live': 'polite' }
      }),
      this.attachmentRow(annotation),
      h(
        'div',
        { class: 'anchored-card__actions' },
        button('Queue', { variant: 'primary', onClick: () => void this.queueActive() }),
        h(
          'div',
          { class: 'chips' },
          iconButton('Remove the last target', '⌫', () => void this.removeLastTarget()),
          iconButton('Attach a reference image', '🖼', () => this.pickAttachment()),
          iconButton('Delete Annotation', '×', () => void this.deleteAnnotation(annotation.annotationId))
        )
      ),
      h('p', { class: 'hint', text: 'Enter queues this Annotation. Cmd/Ctrl+Enter queues and sends. Escape never discards your writing.' })
    );
    const textarea = card.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = annotation.note;
    this.cardHost.appendChild(card);
    positionCard(card, bounds, this.stage);
    card.addEventListener('paste', (event) => this.onPaste(event as ClipboardEvent));
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', (event) => this.onDrop(event as DragEvent));
    textarea.focus();
  }

  private attachmentRow(annotation: Annotation): HTMLElement {
    const pending = this.uploads.filter((upload) => upload.annotationId === annotation.annotationId);
    const ready = attachmentChips(annotation, { onRemove: (id) => void this.removeAttachment(annotation.annotationId, id) });
    if (!ready && pending.length === 0) {
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
            ...(upload.state === 'failed'
              ? [button('Retry', { variant: 'ghost', onClick: () => void this.retryUpload(upload.id) })]
              : [])
          )
        )
      )
    );
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
            h(
              'div',
              { class: 'chips' },
              button('Go to it', { variant: 'ghost', onClick: () => this.activateAnnotation(annotation.annotationId) })
            )
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
            ? [
                {
                  title: `${this.snapshot.migration.skipped.length} record${this.snapshot.migration.skipped.length === 1 ? '' : 's'} left untouched`,
                  body: this.snapshot.migration.skipped.map((entry) => `${entry.envelopeId}: ${entry.reason}`).join(' | ')
                }
              ]
            : []),
          ...(this.snapshot.migration.unreadable.length > 0
            ? [
                {
                  title: 'Unreadable state preserved',
                  body: this.snapshot.migration.unreadable.map((entry) => `${entry.file}: ${entry.reason}`).join(' | ')
                }
              ]
            : [])
        ])
      );
    }

    this.drawerHost.appendChild(
      drawer({ open: true, title: 'Needs you', onClose: () => this.toggleDrawer(false) }, body)
    );
  }

  private renderMenu(): void {
    clear(this.menuHost);
    this.menuHost.appendChild(
      overflowMenu({
        open: this.menuOpen,
        items: [
          { label: 'Reload artifact', onSelect: () => void this.reloadArtifact() },
          { label: 'Copy artifact path', onSelect: () => void this.copy(this.snapshot.artifact.source) },
          {
            label: 'Copy evidence for the queue',
            onSelect: () =>
              void this.copy(this.queue().flatMap((annotation) => describeEvidence(annotation)).map((item) => `${item.title}: ${item.body}`).join('\n'))
          },
          { label: 'Open the disclosure', onSelect: () => this.toggleDrawer(true) },
          { label: 'End session', onSelect: () => this.endSession() }
        ]
      })
    );
  }


  private selectTool(tool: LayerTool): void {
    this.tool = tool;
    this.configureLayer();
    this.renderTopbar();
  }

  private configureLayer(): void {
    this.postToLayer({ source: 'vil-shell', type: 'configure', tool: this.tool, revision: this.config.revision, sessionId: this.config.sessionId });
  }

  private async activateAnnotation(annotationId: string): Promise<void> {
    this.activeAnnotationId = annotationId;
    const annotation = this.activeAnnotation();
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
    this.renderPanel();
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
        if (this.view === 'verify') {
          this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
          this.markVerifyTargets();
        }
        break;
      case 'selection':
        void this.onSelection(message.targets);
        break;
      case 'relation':
        this.relationPreview = undefined;
        this.updateRelationPreview();
        void this.onRelation(message.relation, message.sentence);
        break;
      case 'relation-preview':
        this.relationPreview = message.sentence ?? undefined;
        this.updateRelationPreview();
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
      this.renderTopbar();
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
        await this.refresh();
      } catch (error) {
        this.showToast(messageOf(error));
      }
    }
    this.renderCard();
    this.renderTopbar();
  }

  private async onRelation(relation: LayerRelation, sentence: string): Promise<void> {
    let annotation = this.activeAnnotation();
    if (!annotation) {
      if (this.selection.length === 0) {
        return;
      }
      annotation = await this.api.createAnnotation(this.selection);
      this.activeAnnotationId = annotation.annotationId;
    }
    const relationships: AnnotationRelation[] = [
      ...annotation.relationships.filter((entry) => entry.relationshipId !== relation.relationshipId),
      relation as AnnotationRelation
    ];
    try {
      await this.api.patchAnnotation(annotation.annotationId, { relationships });
      await this.refresh();
      this.showToast(sentence);
    } catch (error) {
      this.showToast(messageOf(error));
    }
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
  private relationPreview?: string;

  private updateRelationPreview(): void {
    const element = qs<HTMLElement>(this.cardHost, '[data-relation-preview]');
    if (!element) {
      return;
    }
    element.hidden = !this.relationPreview;
    element.textContent = this.relationPreview
      ? `Preview — not recorded yet: ${this.relationPreview}`
      : '';
  }

  private readonly saveNote = debounce((annotationId: string, value: string) => {
    void this.api
      .patchAnnotation(annotationId, { note: value })
      .then(() => this.refresh())
      .catch((error) => this.showToast(messageOf(error)));
  }, 250);

  private async flushNote(): Promise<void> {
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

  private async removeLastTarget(): Promise<void> {
    const annotation = this.activeAnnotation();
    if (!annotation) {
      return;
    }
    if (annotation.targets.length <= 1) {
      this.showToast('An Annotation needs at least one target, so the last one stays.');
      return;
    }
    const remaining = annotation.targets.slice(0, -1);
    try {
      this.postToLayer({ source: 'vil-shell', type: 'remove-last' });
      await this.api.patchAnnotation(annotation.annotationId, { targets: remaining });
      await this.refresh();
      await this.activateAnnotation(annotation.annotationId);
    } catch (error) {
      this.showToast(messageOf(error));
    }
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

  private async sendQueue(intent: 'next-pass' | 'steering' | 'draft'): Promise<void> {
    try {
      await this.flushNote();
      const result = await this.api.send(intent);
      this.activeAnnotationId = undefined;
      await this.refresh();
      this.showToast(`${result.delivery} Envelope ${result.envelopeId.slice(0, 12)}…`);
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

  private async move(index: number, delta: number): Promise<void> {
    const queue = this.queue();
    const target = index + delta;
    if (target < 0 || target >= queue.length) {
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

  private async enterView(view: View): Promise<void> {
    if (view === 'verify') {
      this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
      this.markVerifyTargets();
      this.renderBeforeAfter();
    } else {
      this.beforeAfterHost.hidden = true;
    }
    this.renderCard();
  }

  private markVerifyTargets(): void {
    if (this.view !== 'verify') {
      return;
    }
    const annotations = this.deliverable();
    const selectors = [...new Set(annotations.flatMap((annotation) => annotation.targets.flatMap((target) => target.renderedGrounding.selectors ?? [])))];
    const nodeIds =
      this.beforeAfter === 'after'
        ? annotations.flatMap((annotation) => Object.values(annotation.chosenCandidates))
        : [];
    this.postToLayer({ source: 'vil-shell', type: 'mark-targets', nodeIds, selectors });
  }

  private renderBeforeAfter(): void {
    clear(this.beforeAfterHost);
    this.beforeAfterHost.hidden = false;
    const make = (mode: 'before' | 'after'): HTMLButtonElement =>
      h('button', {
        type: 'button',
        text: mode === 'before' ? 'Before the change' : 'After the change',
        attrs: { 'aria-pressed': this.beforeAfter === mode },
        on: { click: () => this.setBeforeAfter(mode) }
      });
    this.beforeAfterHost.appendChild(
      h('div', { class: 'before-after', attrs: { role: 'group', 'aria-label': 'Revision comparison' } }, make('before'), make('after'))
    );
  }

  private setBeforeAfter(mode: 'before' | 'after'): void {
    this.beforeAfter = mode;
    this.iframe.src =
      mode === 'before' ? `/artifact/${this.config.sessionId}/before` : this.config.src || `/artifact/${this.config.sessionId}`;
    this.renderBeforeAfter();
    this.showToast(
      mode === 'before'
        ? 'Showing the revision this direction was written against.'
        : 'Showing the current revision.'
    );
  }

  private async resolveAll(revision: string): Promise<void> {
    if (!this.candidates || this.reading || this.resolvedRevision === revision) {
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
    }
  }

  private async pollStatus(): Promise<void> {
    try {
      const status = await this.api.status();
      if (status.currentRevision) {
        this.currentRevision = status.currentRevision;
      }
      if (status.changed) {
        this.banner.hidden = false;
        clear(this.banner);
        this.banner.append(
          h('span', {
            text: `The artifact changed under review. You are looking at the revision it was opened with; the file is now ${status.currentRevision.slice(0, 18)}….`
          }),
          button('Reload artifact', { variant: 'secondary', onClick: () => void this.reloadArtifact() })
        );
      }
      const agent = await this.api.agent();
      this.snapshot.agent = agent;
      this.renderTopbar();
    } catch {
      return;
    }
  }

  private async reloadArtifact(): Promise<void> {
    this.banner.hidden = true;
    this.resolvedRevision = undefined;
    this.artifactLoaded = true;
    this.placeholder.hidden = true;
    this.iframe.hidden = false;
    this.iframe.src = this.config.src || `/artifact/${this.config.sessionId}`;
    await this.refresh();
    if (this.view === 'verify') {
      this.postToLayer({ source: 'vil-shell', type: 'request-candidates' });
    }
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      if (this.view === 'verify') {
        this.view = 'review';
        this.renderTopbar();
        this.renderPanel();
        void this.enterView('review');
      } else {
        this.view = 'review';
        this.renderTopbar();
        this.renderPanel();
      }
      return;
    }
    if (typing) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void this.sendQueue('next-pass');
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
      } else if (this.activeAnnotationId) {
        this.activeAnnotationId = undefined;
        this.renderCard();
      } else if (this.selection.length > 0) {
        this.selection = [];
        this.postToLayer({ source: 'vil-shell', type: 'clear-selection' });
        this.renderTopbar();
      } else if (this.view === 'verify') {
        this.view = 'review';
        this.renderTopbar();
        this.renderPanel();
      }
      return;
    }
    if (this.view !== 'review') {
      return;
    }
    const entry = TOOLS.find((candidate) => candidate.key.toLowerCase() === event.key.toLowerCase());
    if (entry) {
      this.selectTool(entry.tool);
    }
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

  private hasDeliverable(): boolean {
    return this.deliverable().length > 0;
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

function describeTarget(target: Annotation['targets'][number] | LayerTarget | undefined): string {
  if (!target) {
    return 'Target';
  }
  const grounding = 'grounding' in target ? target.grounding : target.renderedGrounding;
  return target.label ?? grounding.accessibleName ?? grounding.semanticRole ?? target.kind;
}

function positionCard(card: HTMLElement, bounds: { x: number; y: number; width: number; height: number } | undefined, stage: HTMLElement): void {
  const stageRect = stage.getBoundingClientRect();
  const width = 340;
  const height = card.getBoundingClientRect().height || 280;
  if (!bounds) {
    card.style.left = `${Math.max(12, stageRect.width / 2 - width / 2)}px`;
    card.style.top = `${Math.max(12, stageRect.height / 2 - height / 2)}px`;
    return;
  }
  let left = bounds.x + bounds.width + 12;
  if (left + width > stageRect.width - 12) {
    left = bounds.x - width - 12;
  }
  let top = bounds.y;
  left = Math.max(12, Math.min(left, stageRect.width - width - 12));
  top = Math.max(12, Math.min(top, stageRect.height - height - 12));
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const app = new App();
void app.start();

export { App };