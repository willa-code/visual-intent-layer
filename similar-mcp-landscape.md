# Similar MCP landscape: visual intent for agents

_Research date: 14 September 2026. Sources are official product documentation or first-party source repositories unless noted._

## Bottom line

Yes: several MCP products already let a human point at, select, draw on, or annotate a web surface and send structured context to a coding agent. **MarkLayer, Lens Bridge, `annotate-mcp`, `draw2agent`, and `agnt` are direct competitors**, not merely inspiration. Lavish AXI is also a direct workflow competitor, although its agent handoff is a CLI polling API rather than MCP.

The apparently unclaimed part is narrower: I found no documented implementation of a **portable, artifact-neutral Visual Intent Envelope** that combines semantic and spatial targets, relationships among targets, source-level provenance, artifact/revision identity, confidence or abstention, host-neutral delivery semantics, and human verification across successive revisions. That is a negative search result, not proof of absence; young projects, private implementations, and unindexed MCP servers may exist.

Consequently, “visual feedback over MCP” is **not** the breakthrough. A defensible claim would have to be measurable interoperability and reliability beyond the web-annotation products below.

## Classification criteria

- **Direct competitor:** a human marks a visible artifact and the resulting context reaches an agent as the core workflow.
- **Adjacent capability:** overlaps materially, but is restricted to one native canvas, design system, bug-report workflow, or vertically integrated host.
- **Enabling infrastructure:** supplies browser or MCP UI plumbing but no human visual-intent workflow.
- **False positive:** can see or manipulate pixels/pages, but does not let the human visually formulate intent for the agent.

“Source mapping” below means a mapping from the visible target to editable implementation source, not merely a CSS selector or DOM node. “Revision loop” means the system relates feedback, agent work, and human verification across changed artifact states.

## Direct competitors

### MarkLayer — closest commercial-shaped match

- **Interaction surface / human input:** Chrome extension or web viewer over localhost, staging, authenticated, or production pages; supports pinned comments, areas, element selection/inspection, and multi-inspect.
- **Agent handoff:** a local MCP server exposes connect, list/get/watch, acknowledge, resolve, dismiss, and reply operations; agent status appears live in the shared room.
- **Target/source mapping:** annotations include a CSS selector, text fingerprint, and detected React/Vue/Svelte component when available. This is stronger than a screenshot, but the public documentation does not claim an exact source file/span.
- **Revision loop:** explicit `open → in progress → resolved/dismissed → human-only approved` lifecycle. This is the strongest documented human-verification loop found, though it is task-state rather than an artifact revision graph.
- **Open/local:** no account is required for basic rooms; the MCP package is local, while shared rooms live on MarkLayer's service. Openness of the full product was not established in the reviewed first-party material.
- **Evidence:** [MCP visual-feedback guide](https://marklayer.app/guides/claude-code-visual-feedback), [MCP/area/multi-inspect release](https://marklayer.app/changelog/v0-4-0).

### Lens by RenderDraw + Lens Bridge

- **Interaction surface / human input:** Chrome extension for clicking elements and describing visual bugs, QA assertions, and video direction; it can also record click-through guides.
- **Agent handoff:** a VS Code bridge exposes MCP tools for watch/get/acknowledge/resolve/dismiss/reply. Flow mode can route and apply automatically; Queue mode lets the human review proposed fixes before applying them.
- **Target/source mapping:** captures selector, bounding box, computed styles, and detected React/Vue/Angular component hierarchy. That is useful framework context, but not a documented exact source file/span.
- **Revision loop:** pending/resolved workflow plus a pre-apply fix queue; no artifact revision identity or target re-resolution contract is documented.
- **Open/local:** the extension/bridge are MIT-licensed and local, with IndexedDB and SSE; Chrome and a local bridge are required. The repository was very early-stage when reviewed, so maturity should be tested rather than inferred from feature breadth.
- **Evidence:** [Lens source repository](https://github.com/renderdraw/lens), [Lens Bridge marketplace listing](https://marketplace.visualstudio.com/items?itemName=RenderDraw.lens-bridge).

### `annotate-mcp`

- **Interaction surface / human input:** opens a persistent-profile Chrome/Chromium browser and injects a comment/freehand overlay into any top-level page. Supports pins, drawings, linked multi-target groups, and a send queue.
- **Agent handoff:** MCP `open`, `wait`, `list`, `inbox`, screenshot, and resolve tools return notes with DOM targets.
- **Target/source mapping:** selector and element-relative geometry only. The author explicitly notes ambiguous CSS selectors can re-anchor to the wrong sibling; there is no source span.
- **Revision loop:** sent/pending and resolved state; marks track responsive reflow and visibly abstain when an anchored element disappears, but there is no source revision graph.
- **Open/local:** MIT, local, and can retain authenticated browser sessions.
- **Evidence:** [`annotate-mcp` repository](https://github.com/ElaineMHr/annotate-mcp).

### `draw2agent`

- **Interaction surface / human input:** proxies a local development page and overlays Excalidraw; also offers a blank scratch canvas and LAN/iPad drawing.
- **Agent handoff:** `launch_canvas` blocks until submission, then MCP returns a screenshot, structured DOM data, and drawing annotations.
- **Target/source mapping:** DOM context, not documented source provenance.
- **Revision loop:** the last drawing state can be fetched again, but no target recovery, verification state, or revision identity is documented.
- **Open/local:** MIT and local; listed in the [official MCP Registry](https://registry.modelcontextprotocol.io/?q=draw2agent).
- **Evidence:** [`draw2agent` repository](https://github.com/zero-abd/draw2agent).

### `agnt`

- **Interaction surface / human input:** reverse-proxies running applications and injects element inspection, region screenshots, browser-to-agent messages, and a sketch mode with shapes, arrows, freehand marks, and wireframe controls.
- **Agent handoff:** MCP server plus optional skills; provides screenshots, DOM inspection, click context, runtime errors, network/performance data, and direct browser messages.
- **Target/source mapping:** inspected DOM and runtime stack information can help an agent locate code, but no stable visible-target-to-source contract is documented.
- **Revision loop:** bidirectional live channel, not a documented artifact/revision verification model.
- **Open/local:** Apache-2.0 and locally runnable.
- **Evidence:** [`agnt` repository](https://github.com/standardbeagle/agnt).

### Lavish AXI — direct workflow competitor, not an MCP

- **Interaction surface / human input:** local browser around agent-generated HTML; element and text-range annotations, chat, interactive controls, and Mermaid-to-Excalidraw editing.
- **Agent handoff:** local CLI long-polling returns queued feedback; agents can reply into the same browser session. It deliberately uses an AXI/CLI interface rather than MCP.
- **Target/source mapping:** selectors and text boundary anchors; stable Mermaid node IDs. It does not generally map a rendered web element to application source.
- **Revision loop:** file watching/live reload; feedback persists; Mermaid edits carry a source hash and force an explicit stale-source choice. The Mermaid source remains authoritative and there is no general scene-to-source reverse mapping.
- **Open/local:** open-source and local-first; hosted sharing is optional.
- **Evidence:** [Lavish README](https://github.com/kunchenguid/lavish-axi/blob/main/README.md), [architecture details](https://github.com/kunchenguid/lavish-axi/blob/main/AGENTS.md).

## Adjacent capabilities

### Doop

An open-source multiplayer design canvas whose frames render HTML in sandboxed iframes. Humans edit in-browser and pin comments to elements; external agents edit and stream work through built-in MCP, with presence, activity, tasks, undo/redo, and self-hosting. This is very close for **canvas-authored designs**, but it is not documented as a portable review layer over arbitrary running apps or artifact types, and it does not claim source-span provenance or revision-aware re-anchoring. [Doop repository](https://github.com/kgoedecke/doop).

### stagewise

The current open-source stagewise product is a complete agentic IDE with a built-in browser, DOM selection as agent context, design previews, file edits, and diff review. It validates the interaction thesis, but its current first-party positioning is vertically integrated rather than a host-neutral visual-intent MCP. Earlier stagewise toolbar material described DOM comments sent to editor agents, which is even closer, but should not be conflated with the current architecture. [Current stagewise docs](https://docs.stagewise.io/), [current source repository](https://github.com/stagewise-io/stagewise).

### BugHerd MCP

Clients pin feedback directly on a page; MCP gives agents the comment, screenshot, URL, browser/OS data, status, severity, assignees, and history, then lets them update tasks and reply. This is a mature visual-feedback-to-agent queue, but its unit is a BugHerd task rather than a live Visual Intent Envelope; no exact source mapping or artifact revision model is documented. [BugHerd MCP](https://bugherd.com/feature/mcp).

### Jam MCP

Humans record screen/video and voice; Jam captures user events, console/network logs, metadata, and transcripts. MCP lets an agent retrieve and analyze that evidence and comment/update the Jam. This is high-fidelity temporal bug context, but not point/select/arrange intent over a live artifact, and it lacks documented source mapping and a visual revision-verification loop. It is hosted and permission-scoped. [Jam MCP documentation](https://jam.dev/docs/jam-mcp).

### Figma MCP

Desktop selection or links identify native Figma nodes; the agent can extract structured design context and write back to the canvas. Code Connect maps Figma component IDs to code components and can return source paths/snippets—the strongest explicit **design-node-to-code-component provenance** found. However, this is Figma-specific, not a layer over running output; revisions are ordinary Figma iterations rather than portable intent batches. Figma is closed/hosted, with a limited desktop-local option. [Figma MCP tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/), [Code Connect](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/).

### pen.dev, OpenPencil, and tldraw MCP

These products make a native structured canvas readable and writable by agents through MCP. Humans can select, draw, arrange, and refine objects while agents manipulate the same object graph. They are important precedents for using selection, viewport, structured shapes, and spatial relations as agent context, but the meaning stays inside each canvas format rather than annotating arbitrary artifacts or mapping to implementation source. pen.dev uses an open JSON `.pen` format but is a product service; OpenPencil is MIT/local; tldraw provides source-visible SDK and agent/MCP work. [pen.dev](https://www.pen.dev/), [OpenPencil](https://github.com/open-pencil/open-pencil), [tldraw AI integration](https://github.com/tldraw/tldraw/blob/main/apps/docs/content/docs/ai.mdx), [official registry entry](https://registry.modelcontextprotocol.io/?q=io.github.tldraw%2Ftldraw).

### Replit Canvas — closest closed integrated product

Replit Canvas combines running artifact previews and design mockups across web/mobile apps, slides, visualizations, and more. It supports annotations, direct manipulation, multi-select, responsive/state editing, variants, undo, and conversion into production artifacts in the same project. This is strong evidence for broad visual intent, but I found no first-party claim that Canvas is exposed as an MCP server or portable protocol; it is a closed, vertically integrated workspace. [Agent 4 comparison](https://replit.com/blog/whats-changed-agent3-to-agent4), [Canvas annotations](https://docs.replit.com/learn/build-with-agent).

## Enabling infrastructure and false positives

### Official MCP Apps (`ext-apps`) — enabling infrastructure

MCP Apps standardizes a tool-linked UI resource rendered in a sandboxed iframe with bidirectional UI/host/server communication. It is the right host embedding layer, not a Visual Intent Layer by itself. Its official PDF example is a useful per-format precedent: selection and drawing annotations, undo/redo, diff-based persistence, save-back, local file gating, and state restoration—but it edits/annotates PDFs rather than packaging human intent for an implementation agent. [MCP Apps overview](https://github.com/modelcontextprotocol/ext-apps), [PDF example](https://github.com/modelcontextprotocol/ext-apps/blob/main/examples/pdf-server/README.md), [model-context/message pattern](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/patterns.md).

### Playwright MCP and Chrome DevTools MCP — false positives / lower-level enablers

They give an **agent** deterministic browser observation and control: accessibility/DOM snapshots, element references, screenshots, interaction, console/network inspection, tracing, and evaluation. They do not supply a human annotation, drawing, intent queue, or verification UI. They are useful substrates beneath the proposed product, not substitutes for it. [Playwright MCP](https://github.com/microsoft/playwright-mcp), [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp).

## What appears differentiated—and what does not

Already commoditizing:

- Launch or connect to a browser through MCP.
- Point at an element, attach a note, draw on a screenshot/page, and send DOM context.
- Watch/poll feedback, show agent acknowledgement, and mark an item resolved.
- Preserve a local queue and support authenticated pages through a browser extension/profile.
- Use a native canvas selection/object graph as agent context.

Potentially differentiated if proved:

1. **Portable schema:** the same envelope works across independent MCP hosts and across web, canvas, document, slide, image, and video adapters.
2. **Deep provenance:** a visible target resolves to the correct editable source span/component, not just a selector or guessed framework name.
3. **Revision safety:** intent is bound to an artifact revision; the resolver survives bounded changes, exposes confidence, and abstains rather than silently mis-targeting.
4. **Relational intent:** first-class “align A with B,” “place C between A and B,” equivalence, ordering, and constraint semantics—not only separate annotations.
5. **Delivery semantics:** portable Draft / Steer now / Next pass / Stop-and-review behavior with honest host-capability fallbacks.
6. **Verification:** every item closes only after the changed artifact is related back to the original intent and a human can approve or reject it.

The sharp strategic conclusion is therefore: benchmark the first implementation against **MarkLayer + Lens + annotate-mcp + Lavish**, not only Lavish. Treat Figma Code Connect as the provenance benchmark, MarkLayer as the lifecycle benchmark, `annotate-mcp` as the re-anchoring/abstention benchmark, `draw2agent`/`agnt` as the drawing-on-live-app benchmark, and Replit/stagewise as the UX benchmark.

## Search limitations

This review searched the official MCP GitHub organization and Registry plus first-party documentation/source repositories for the named and discovered candidates. MCP is changing quickly; registry metadata is incomplete, product internals may exceed public documentation, and absence of a documented feature was recorded as “not documented,” not “does not exist.” Re-run the scan before making a novelty claim or publishing a competitive matrix.
