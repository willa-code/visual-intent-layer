# MCP Integration, Lavish, and Live Agent Feedback

Research snapshot: 2026-09-14. Sources are protocol specifications, official product documentation, and first-party source code.

> **Superseded in part, 2026-09-18, by ADR-0013 and ADR-0031.** Section 4's
> Rust/TypeScript split was the researched recommendation; the decision taken is
> TypeScript-only with Node required (ADR-0013), and the Rust insertion boundary is
> preserved but unbuilt. The "thin Skill distributed in the same plugin" conclusion is
> reversed by ADR-0031, which ships no Skill. The SDK-tier survey remains valid research.

## Executive conclusion

The best architecture is **not MCP tool or Skill**. It is a small MCP surface for capability and transport, plus a thin Skill for proactive discovery and the multi-step Visual Direction Loop.

- A well-described MCP entry tool is enough when the user explicitly asks to open visual review, or when the trigger and action are simple enough to explain in one or two sentences.
- A Skill earns its place when the agent must decide *when* visual direction will be more useful than chat, follow a review lifecycle, choose a host-specific fallback, or resume an existing session. The Skill should teach policy; it should not duplicate tool schemas.
- Package the MCP server/App and Skill together as a plugin where the host supports that distribution model. OpenAI explicitly describes Skills as reusable workflows, supports declaring an MCP dependency from a Skill, and recommends plugins for installable distribution ([OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)).
- Treat **steer now** and **next pass** as different user actions. Steering adds intent to active work; queueing schedules a later turn. Neither MCP core nor MCP Apps guarantees how a host schedules a message.
- Lavish is a strong benchmark for local, generated HTML. It is not a full running-app integration and does not map rendered elements back to React/TypeScript source locations. That gap is a credible place to innovate.

## 1. When MCP descriptions are sufficient—and when a Skill helps

### What the protocols and hosts actually guarantee

MCP exposes a tool name, description, input schema, optional output schema, and annotations. The description is a hint that helps a model understand what the tool does and when to use it; the server does not control whether the model calls it ([MCP tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)). OpenAI likewise recommends crisp descriptions stating what a tool does and when to use it, and notes that the model chooses whether to call an ordinarily available tool. An API application can separately constrain or require tool use with `tool_choice`, but that is an OpenAI API/host control, not an MCP protocol guarantee ([OpenAI model tool guidance](https://developers.openai.com/api/docs/guides/latest-model)).

An MCP App does not appear merely because the server is connected. The host discovers a tool linked to a `ui://` resource; after that tool is called, a capable host fetches and renders the UI. MCP Apps are optional, capability-negotiated extensions, and client support varies ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [MCP Apps specification proposal](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)).

OpenAI Skills add a different layer. Codex and ChatGPT initially see a Skill's name and description, may invoke it explicitly or match it implicitly, and only then load the full workflow instructions. A Skill can declare an MCP tool dependency. This is progressive workflow disclosure, not a replacement for the MCP tools themselves ([OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)).

### Practical decision rule

**MCP descriptions alone are sufficient when:**

- The user explicitly says “open visual review,” “let me point to changes,” or invokes the tool by name.
- One entry call is enough to start the experience.
- Preconditions and parameters are small and deterministic.
- The host already exposes the server reliably and supports the required MCP App capability.

A suitable model-visible entry tool could be:

> `open_visual_direction`: Open an interactive surface when the user wants to inspect, point to, arrange, or annotate visible work and have that intent returned to the agent. Use for spatial or multi-element feedback that would be lossy in prose; do not use for a simple yes/no question.

After entry, UI-only actions such as selecting, drawing, saving a draft, or paging can be hidden from the model with MCP Apps tool visibility. This avoids crowding the agent context while the App calls them directly ([MCP Apps patterns](https://apps.extensions.modelcontextprotocol.io/api/documents/Patterns.html)).

**A Skill is useful when:**

- The agent should proactively notice that a roadmap, comparison, UI review, or other spatial task would benefit from visual direction even though the user did not name the tool.
- The workflow spans “render/open → wait for human → receive envelope → revise → present verification → close or continue.”
- The agent must choose between an embedded MCP App and a local-browser fallback based on host capability.
- Artifact preparation needs guidance, such as adding source provenance, preserving stable target IDs, or capturing a revision.
- Long waits, stale annotations, agent acknowledgements, or resuming sessions require consistent policy.

The Skill should remain thin: trigger criteria, lifecycle, fallback, and safety rules. Tool descriptions and schemas remain authoritative for individual calls. This division is independently validated by Lavish: its executable CLI is usable directly, while its recommended Skill and optional session hook mainly improve discovery, invocation guidance, and resumption of live sessions ([Lavish README](https://github.com/kunchenguid/lavish-axi/blob/main/README.md)).

### Recommendation

Ship three layers, but keep only one product:

1. **Core local service and Visual Intent Envelope** — host-independent state and revision semantics.
2. **MCP server + MCP App** — the standard agent connection and embedded UI when supported.
3. **Thin Agent Skill, distributed in the same plugin** — proactive trigger policy, review lifecycle, and fallback instructions.

The Skill is not technically necessary for explicit use. It is strategically useful if “the agent knows when to bring the human into a visual loop” is part of the product promise. Test this with an invocation eval: explicit requests, clear spatial-review tasks, ambiguous visual tasks, and negative examples where plain chat is faster.

## 2. What Lavish AXI actually supports

### Artifact and application behavior

Lavish opens a **saved local HTML file** through a local server. It injects an annotation SDK, watches the file for live reload, and lets native controls remain interactive. Custom controls can opt out of annotation with `data-lavish-action`, and artifact code can queue feedback programmatically ([Lavish README: feedback controls](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L309-L320), [artifact SDK source](https://github.com/kunchenguid/lavish-axi/blob/main/src/artifact-sdk.js#L1127-L1159)).

This is useful interactivity, but it is not equivalent to attaching to an arbitrary running application. The artifact is rendered in a sandboxed iframe with scripts, forms, popups, and downloads allowed but without same-origin access. Apps that depend on their normal origin, authentication cookies, local storage, service workers, or backend routing may not behave as they do in their real runtime ([Lavish README: security model](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L287-L300), [Lavish server sandbox policy](https://github.com/kunchenguid/lavish-axi/blob/main/src/server.js#L104-L108)).

### Private/local data and sandboxing

The core review loop is local-first: the server binds to loopback by default and session state stays under `~/.lavish-axi/`. Host-header checks mitigate DNS rebinding. Binding beyond loopback exposes an unauthenticated service capable of serving local files and is explicitly warned against ([Lavish README: local server](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L342-L350)).

“Local-first” does not mean “air-gapped.” Remote scripts, fonts, or CDN assets may still make network requests. Sharing is a separate, explicit action that uploads the artifact to the third-party `ht-ml.app`; shares are public by default unless password protection is selected ([Lavish README: export and sharing](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L300-L308)).

For the proposed product, private applications are feasible if the capture runtime stays local. MCP does not require uploading the app itself. Send only the Visual Intent Envelope and the evidence the user approves to the chosen agent/host. If the agent already has repository access, source edits continue through that host's existing permission model. Privacy claims must still disclose any screenshots, DOM excerpts, data values, or source locations included in the envelope.

### Assets

Lavish serves relative sibling images, CSS, fonts, and scripts from the artifact directory; root-prefixed paths do not work through its artifact route. Export inlines local assets, leaves remote references as network links, strips the annotation SDK, confines local reads to the artifact directory, redacts unsafe `file://` references, and applies size caps ([Lavish README: assets](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L300-L308), [export implementation](https://github.com/kunchenguid/lavish-axi/blob/main/src/export-bundle.js#L3086-L3108)).

### Targeting versus source provenance

Lavish provides good **rendered-target anchoring**:

- Element annotations include a CSS locator and DOM context.
- Text selections include a common-ancestor selector plus boundary paths and offsets.
- Table targets add visible row and column names.
- Mermaid nodes preserve diagram/node identities across some rerenders.

These mechanisms are documented in its [README](https://github.com/kunchenguid/lavish-axi/blob/main/README.md#L326-L329), [artifact SDK](https://github.com/kunchenguid/lavish-axi/blob/main/src/artifact-sdk.js#L1020-L1066), and [maintainer architecture notes](https://github.com/kunchenguid/lavish-axi/blob/main/AGENTS.md#L252-L255).

However, first-party docs and source reveal no source-map or framework instrumentation that maps a rendered target to an original React/Vue component, TypeScript file, or exact source span. Its authoritative artifact is the HTML file itself. Therefore:

> Lavish maps human feedback to rendered DOM targets inside local HTML; it does not provide general rendered-element-to-application-source provenance.

That distinction matters. A superior running-app mode would need an explicit integration such as a Vite/Babel/SWC plugin, framework dev metadata, source maps, stable runtime IDs, or a browser/devtools companion. An MCP App iframe alone cannot inspect another arbitrary page: its sandbox deliberately prevents access to the host DOM and user data ([MCP Apps security model](https://modelcontextprotocol.io/extensions/apps/overview#security-model)).

## 3. Steering versus queueing in live agent sessions

### Protocol and product facts

**Codex host interface.** Codex App Server defines `turn/steer` as appending user input to the active in-flight turn. It requires the expected active turn ID, fails without an active turn, creates no new turn, and accepts no turn-level model, working-directory, sandbox, or output-schema overrides ([OpenAI Codex App Server](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn)).

**OpenAI Responses WebSocket.** The lower-level API describes steering as input queued for a continuation of an active response. Acceptance means the server owns the input, not that it has already affected generation. At a safe boundary, the active response may end as `incomplete` with reason `steered`, followed by a successor response that commits the input. Steering can remain pending while client-owned tool output or approval is outstanding ([OpenAI Responses API steering reference](https://developers.openai.com/api/reference/cli/resources/beta/subresources/responses)).

**Codex's separate follow-up queue.** First-party Codex source keeps queued user messages separate from pending steers: a queued message waits while a turn runs and is used to start a follow-up after the turn completes ([Codex input queue](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget/input_queue.rs), [Codex turn runtime](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget/turn_runtime.rs)). Cursor documents a comparable distinction: queued messages execute sequentially after the current task, while its default message path attempts to attach feedback at the next available point, typically after a tool call ([Cursor planning and message queueing](https://docs.cursor.com/en/agent/planning)).

The important semantic distinction is:

| User intent | Delivery meaning |
|---|---|
| **Steer now** | Amend or redirect the active turn at the next safe host/model boundary. |
| **Next pass** | Preserve the instruction for a later turn after current work finishes. |
| **Draft** | Save locally; do not send to the agent yet. |
| **Stop and review** | Interrupt active work, then begin a review turn. This requires explicit host support and should be visibly disruptive. |

“Steer” does not promise instantaneous cancellation of a command or tool call. “Queued steering input” in the Responses API also should not be confused with a product's separate follow-up queue.

### MCP limitation

MCP Apps can send a message, update model context, and call tools through the host, but the host controls available capabilities and scheduling ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)). Core MCP does not define “attach this message to the currently running agent turn” versus “start a later turn.” Therefore the visual product must detect host capabilities and honestly label behavior:

- If a host exposes active-turn steering, offer **Steer now**.
- If it exposes only conversation messages, label the action **Send to agent** and do not promise timing.
- Always offer a product-owned **Next pass** queue so intent is durable across hosts.

### Recommended Visual Direction Loop

Do not choose between a rigid revision batch and normal agent steering. Support both, explicitly:

1. Every envelope is anchored to the artifact revision the user actually saw.
2. While the agent is idle, **Send batch** begins the next implementation turn.
3. While the agent works, default to **Add to next pass** for additive polish and unrelated changes.
4. Offer **Steer now** for corrections that would invalidate active work (“wrong screen,” “stop changing layout,” “use the selected reference instead”).
5. If the artifact revision advances before delivery, mark the envelope stale and re-resolve its targets. Never silently attach it to a different revision.
6. Show delivery states separately: draft, queued locally, accepted by host, committed to active/successor turn, acknowledged by agent, resolved, ambiguous, obsolete.

This preserves the responsive feel of modern agent sessions without allowing visual feedback to race silently against a moving artifact. It also makes the Visual Intent Envelope valuable independently of any single host's steering implementation.

## 4. SDK and implementation-language decision

### Verified SDK status

The official 2026-07-28 SDK catalog currently classifies TypeScript, Python, C#, Go, and Rust as Tier 1; Java and Ruby as Tier 2; and Swift, PHP, and Kotlin as Tier 3. The catalog says all official SDKs cover servers, clients, local and remote transports, and type-safe protocol compliance. Tier 1 requires full scored core conformance and defined maintenance commitments, but the tier rules explicitly exclude experimental features and protocol extensions such as Tasks and MCP Apps ([official MCP SDK catalog](https://modelcontextprotocol.io/docs/2026-07-28/sdk), [SDK tier rules](https://modelcontextprotocol.io/community/sdk-tiers)).

That final distinction is important here. MCP Apps and Tasks are separately negotiated extensions. Their support and ergonomics vary even among Tier 1 SDKs.

| Language | Verified current state | Product-specific assessment (inference) |
|---|---|---|
| **TypeScript** | SDK v2 is the stable `2026-07-28` line, runs on Node/Bun/Deno, has stdio/HTTP/auth packages, and runs core conformance in CI. Core subscriptions have examples. The official MCP Apps SDK, React hooks, App Bridge, server helpers, templates, and examples are TypeScript. The Tasks extension remains tracked separately and current official issues document gaps in task methods and task notifications ([TS SDK](https://github.com/modelcontextprotocol/typescript-sdk), [TS roadmap](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/ROADMAP.md), [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps), [Tasks tracking](https://github.com/modelcontextprotocol/typescript-sdk/issues/2189)). | Best UI, browser-instrumentation, and MCP Apps iteration speed. A Node daemon is easy to ship through npm but brings a runtime, larger dependency surface, and weaker single-binary deployment than Rust or Go. |
| **Rust** | Official `rmcp` is Tier 1, implements stable `2026-07-28` with backward compatibility, and documents discovery, stateless HTTP, MRTR, caching, subscriptions, and the `io.modelcontextprotocol/tasks` extension. It is Tokio/Serde-based and offers tool macros ([Rust SDK](https://github.com/modelcontextprotocol/rust-sdk)). No first-party Rust MCP Apps View/server-helper package comparable to `@modelcontextprotocol/ext-apps` is documented; Apps support is still separately tracked ([Rust conformance tracker](https://github.com/modelcontextprotocol/rust-sdk/issues/977)). | Best fit for a long-lived local daemon, strict path handling, bounded resource use, fast startup, file watching, and a portable binary. Slower product iteration and more integration code at the MCP Apps boundary. Rust improves operational quality; it does not make browser rendering or agent reasoning faster. |
| **Go** | Official Tier 1 SDK v1.7+ supports `2026-07-28` and earlier versions. Its protocol guide documents stateless discovery and transport-neutral subscriptions. Capability-extension fields allow an Apps declaration, but there is no official Go View SDK comparable to ext-apps and no documented official Tasks implementation ([Go SDK](https://github.com/modelcontextprotocol/go-sdk), [Go protocol guide](https://github.com/modelcontextprotocol/go-sdk/blob/main/docs/protocol.md), [Go Apps discussion](https://github.com/modelcontextprotocol/go-sdk/issues/815)). | Excellent alternative for a small cross-platform daemon and single binary, with simpler development than Rust. It offers no decisive advantage for this product given the explicit Rust engineering goal and the same TypeScript UI requirement. |
| **Python** | SDK v2 is the stable `2026-07-28` line with stdio/HTTP and very concise typed tool registration; subscriptions are documented. It includes server-side Apps helpers, though browser Views still use the JavaScript/TypeScript ext-apps client. The current release explicitly lists the Tasks extension as not implemented ([Python SDK](https://github.com/modelcontextprotocol/python-sdk), [Python Apps helper](https://github.com/modelcontextprotocol/python-sdk/blob/main/src/mcp/server/apps.py), [Python subscriptions](https://github.com/modelcontextprotocol/python-sdk/blob/main/docs/client/subscriptions.md), [Python release notes](https://github.com/modelcontextprotocol/python-sdk/releases)). | Fastest for experiments and analysis adapters, but weaker for a polished always-on desktop daemon and self-contained cross-platform installation. Still needs TypeScript for the View itself. |
| **C#** | Official Tier 1 SDK ships dedicated `ModelContextProtocol.Extensions.Apps` and `.Tasks` packages; the Tasks package includes polling, input, cancellation, and a task-store abstraction. Its v2 line targets `2026-07-28` and supports stateless operation ([C# SDK](https://github.com/modelcontextprotocol/csharp-sdk), [C# Tasks](https://github.com/modelcontextprotocol/csharp-sdk/blob/main/docs/concepts/tasks/tasks.md), [C# stateless model](https://github.com/modelcontextprotocol/csharp-sdk/blob/main/docs/concepts/stateless/stateless.md)). | Strongest non-TypeScript choice for Apps server helpers and Windows/.NET integration, but it adds no advantage for a browser-first, cross-platform open-source product unless .NET embedding becomes a distribution requirement. The View still remains web technology. |

Java, Ruby, Swift, PHP, and Kotlin do not materially improve this product's first implementation. Java may matter later for enterprise embeddings; Swift would matter for a macOS-only native shell. Their lower official tiers and narrower strategic fit do not justify choosing them for the core now.

### Tasks and subscriptions: do not make them V0 dependencies

The 2026-07-28 core replaces earlier subscription mechanisms with the transport-neutral `subscriptions/listen`. Rust, TypeScript, Go, and Python all document current subscription support. This is useful for list/resource changes, but a compatible SDK does not guarantee that every target host exposes subscriptions to an MCP App in the way this UI needs.

Tasks are now the `io.modelcontextprotocol/tasks` extension rather than core. They are durable handles for expensive or human-gated work, support polling after reconnect, and require explicit support from both sides ([MCP Tasks overview](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/extensions/tasks/overview.mdx), [Tasks SEP-2663](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2663-tasks-extension.md)). Rust and C# have documented implementations; Python explicitly does not yet; TypeScript still has tracked gaps. Host support varies independently.

Therefore:

- Persist sessions, revisions, queued envelopes, and delivery acknowledgements in the product's own store.
- Use ordinary MCP tools everywhere.
- Add subscriptions as progressive enhancement for fresh state.
- Add Tasks only for genuinely long-running tool work after host interoperability tests pass. Do not represent the entire human review session as one mandatory MCP Task.

### Recommended language split

Use **TypeScript for every browser boundary and Rust for the local authority**:

```text
TypeScript
├── independent browser UI
├── MCP App View (@modelcontextprotocol/ext-apps)
├── injected capture SDK
└── Vite/framework provenance adapter

Rust
├── local daemon and loopback HTTP server
├── MCP server (rmcp; stdio + Streamable HTTP)
├── artifact/file access and watcher
├── revision + envelope state machine
├── SQLite persistence
└── asset serving, policy, limits, and audit trail
```

The Rust daemon can serve the compiled TypeScript assets and declare the MCP App's `ui://` resource using normal MCP resource/tool metadata. The browser View still uses the official TypeScript MCP Apps client library. Keep a very small `mcp-app-adapter` module so extension churn is isolated; do not leak MCP wire types into the envelope/domain model.

This split is a deliberate trade:

- **Why not all TypeScript?** It would maximize early velocity and use the best-supported Apps tooling, and is the correct fallback if shipping speed is the only goal. But it would not test the intended systems claim. The local daemon is a legitimate Rust boundary: it is long-lived, filesystem-facing, security-sensitive, concurrency-heavy, and distributable as a single binary.
- **Why not all Rust?** The capture surface is DOM-native. Reimplementing the official Apps View SDK, React bindings, browser tooling, and framework adapters in Rust/WASM would slow learning without improving user value.
- **Why not Rust merely for speed?** Most perceived latency will come from browser rendering, user action, host/tool scheduling, and agent generation. Set Rust success criteria around startup, idle memory, watcher latency, and safe large-artifact handling; do not market unmeasured end-to-end speedups.

### Distribution and maintenance implications

Build the TypeScript UI into static assets during release and embed them in the Rust binary. Publish signed binaries for macOS, Windows, and Linux. A thin npm launcher can preserve the familiar `npx` path and download the correct binary; the plugin bundles the Skill and MCP configuration. End users should not need a Rust or Node toolchain.

This creates two build ecosystems, so enforce a narrow boundary:

- Define the Visual Intent Envelope once as JSON Schema and generate Rust and TypeScript types.
- Run official MCP conformance against the Rust server and browser contract tests against the TypeScript View.
- Pin and regularly test both the newest `2026-07-28` path and a legacy host path.
- Keep Tasks optional until its cross-SDK and host matrix is green.
- Budget for platform binary signing/notarization, updater security, and source-map/framework compatibility; those are more likely maintenance costs than raw server performance.

Rust's memory safety helps the native daemon, but it does not remove web risks. The decisive controls remain loopback-only binding, unguessable per-session capability tokens, Host/Origin validation, CSP and iframe sandboxing, canonical path confinement including symlinks, request/body/asset limits, explicit network egress, and redaction before envelopes leave the machine.

## Product implications

The near-term product should therefore be:

- **One product surface**, usable independently and embeddable as an MCP App.
- **One model-visible entry tool**, with most UI mechanics app-only.
- **One thin Skill**, installed with the MCP integration, for proactive invocation and lifecycle behavior.
- **Two capture modes:** isolated local HTML (Lavish-compatible baseline) and instrumented running app (the provenance-focused differentiator).
- **Three delivery states users understand:** draft, steer now, next pass.
- **A local data plane by default**, with explicit disclosure of what each envelope sends to the agent or any sharing service.

The most defensible breakthrough is not “MCP-based Lavish.” It is reliable, revision-aware translation from visual human intent to editable source provenance across hosts, while preserving human control over when that intent joins active agent work.
