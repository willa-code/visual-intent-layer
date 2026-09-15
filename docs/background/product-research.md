# MCP-Native Visual Review Runtime

## Product Research / Exploration

### Working thesis

Build a **standards-native visual review layer for AI agents**, designed around the latest MCP architecture rather than inventing a proprietary agent-to-review communication loop.

The opportunity is not:

> "Rewrite Lavish in Rust."

Nor is it:

> "Build a faster Lavish."

The stronger thesis is:

> **Build the review layer for agent-generated interfaces and visual artifacts, natively on MCP.**

Or from the user's perspective:

> **See what your agent made. Point at what needs changing.**

The system should make it exceptionally easy for a human to inspect an artifact produced by an AI agent, point precisely at something, explain what should change, and have that feedback arrive back at the agent in a structured and reliable form.

---

# 1. Why This Exists

Agent-generated artifacts are becoming increasingly sophisticated:

- HTML applications
- dashboards
- reports
- diagrams
- generated interfaces
- data visualizations
- slides
- interactive documents
- prototypes

Yet the human-to-agent review loop is still surprisingly primitive.

The common workflow remains something like:

1. Agent generates artifact.
2. Human opens artifact.
3. Human visually finds something wrong.
4. Human goes back to chat.
5. Human attempts to describe the location in prose.
6. Agent guesses which element the human means.
7. Agent modifies it.
8. Human manually verifies again.

For example:

> "The second card near the top, make the subtitle smaller and move the button slightly left."

This is lossy communication.

The ideal interaction is instead:

1. Click the actual card.
2. Select the actual text.
3. Add comment.
4. Agent receives exact target information.
5. Agent edits artifact.
6. Review surface updates.
7. Existing feedback remains correctly attached where possible.

The central primitive becomes:

    Human intent
        ↓
    precise visual target
        ↓
    stable artifact identity
        ↓
    structured feedback
        ↓
    MCP
        ↓
    compatible agent

---

# 2. Inspiration: Lavish AXI

Lavish is an interesting implementation of this idea.

Its core philosophy is unusually strong:

> The review loop between one person and one agent over one local HTML file.

Important ideas from Lavish include:

- local-first operation
- saved HTML remains authoritative
- rendered artifact is still portable HTML
- click/select rather than describe
- annotations tied to artifact context
- live reload
- layout issue detection
- attachments
- Mermaid → whiteboard review
- agent feedback loop
- token-efficient outputs
- long polling instead of repeated agent checks
- contextual disclosure of instructions
- human chooses what matters

Lavish's product philosophy is stronger than merely being an HTML editor.

It recognizes that:

> Interaction is often a better communication medium than prose.

This is worth preserving.

---

# 3. Where Lavish Becomes Less Compelling With Modern MCP

Lavish was designed around an AXI philosophy:

> A CLI can itself be an agent interface.

The CLI is therefore effectively its own protocol.

Conceptually:

    agent
      │
      ▼
    lavish open file.html
      │
      ▼
    browser review
      │
      ▼
    lavish poll file.html
      │
      ▼
    human feedback
      │
      ▼
    agent resumes

This works across many agent harnesses because almost every capable coding agent can execute shell commands.

That universality is useful.

However, MCP has evolved considerably.

The latest stable MCP core specification is:

    MCP 2026-07-28

Important changes include:

- stateless protocol core
- self-describing requests
- improved discovery
- modern request routing
- Multi Round-Trip Requests
- cacheable list operations
- formal extensions framework
- Tasks
- subscriptions / streaming primitives
- improved authentication architecture
- MCP Apps ecosystem

Most importantly for this use case:

## MCP Apps

MCP Apps now provides a standardized mechanism for:

    MCP Tool
       +
    interactive HTML UI
       +
    sandboxed host rendering
       +
    bidirectional communication

A server can expose:

    review_artifact(...)

and associate it with:

    ui://review/app

The MCP host can then render the review interface directly.

The UI can communicate with:

- the MCP server
- host tools
- resources
- model context
- the conversation

This means a substantial portion of the custom infrastructure Lavish needs to build is becoming standardized.

---

# 4. The Key Conclusion

Lavish remains useful.

But its strongest defensibility is no longer:

> "Agents need an alternative interface because MCP cannot support interactive review."

That argument is increasingly weak.

Instead, its valuable layer is:

> Purpose-built artifact review semantics.

Examples:

- precise DOM targeting
- visual annotation
- revision handling
- layout diagnostics
- artifact identity
- annotation persistence
- whiteboards
- artifact export
- local filesystem semantics
- review state

Therefore, the opportunity is to move **one abstraction level above MCP**.

Do not compete with MCP.

Build one of the best applications of MCP.

---

# 5. Proposed Product

Working placeholder:

## MCP Review

A lightweight local visual-review runtime for AI-generated artifacts.

Architecture:

                    MCP Host
        ChatGPT / Claude / VS Code / Goose
                         │
                         │ MCP 2026-07-28
                         ▼
              ┌──────────────────────┐
              │     Review Server    │
              │        Rust          │
              │                      │
              │ artifact manager     │
              │ revision tracking    │
              │ feedback store       │
              │ file watcher         │
              │ diagnostics          │
              │ task lifecycle       │
              └──────────┬───────────┘
                         │
                         │ MCP Apps
                         ▼
              ┌──────────────────────┐
              │    Review UI         │
              │    TypeScript        │
              │                      │
              │ rendered artifact    │
              │ click / select       │
              │ annotate             │
              │ comment              │
              │ inspect              │
              │ visual diff          │
              └──────────────────────┘

Example agent invocation:

    review_artifact({
        path: "/project/dashboard.html"
    })

The result is an interactive visual review surface.

The human can:

- click an element
- select text
- attach a screenshot/file
- leave comments
- mark issues
- inspect revisions
- compare changes

The agent receives structured feedback rather than prose guessing.

---

# 6. Why Rust Makes Sense

Rust should not be used merely because:

> Rust is fast.

That is too shallow a justification.

The stronger reasons are:

## 6.1 Distribution

Lavish currently relies on:

    Node
    npm
    npx
    JS dependencies
    package resolution

A Rust implementation could potentially ship as:

    mcp-review

One native executable.

Benefits:

- easier installation
- fewer runtime assumptions
- fewer dependency-resolution failures
- no Node version dependency
- no npm installation at invocation
- simple desktop/server deployment

---

## 6.2 Startup Performance

A native executable should generally provide:

- lower process startup overhead
- no Node runtime initialization
- no `npx` package-resolution path
- no dynamic JS dependency loading

Important:

This should be benchmarked rather than marketed with unsupported performance numbers.

The interesting metric is not CPU benchmark performance.

Measure:

    command invocation
        →
    review UI ready

and:

    file save
        →
    UI update

and:

    human feedback
        →
    agent receives feedback

Those are the product latency metrics that actually matter.

---

## 6.3 Memory

A focused native server should generally have a smaller baseline runtime footprint than:

    Node runtime
    +
    Express
    +
    WebSocket stack
    +
    dependency graph

Again, this should be measured.

---

## 6.4 Reliability

Rust is especially attractive for:

- filesystem watchers
- concurrency
- persistent state
- lifecycle handling
- protocol implementations
- embedded servers
- crash-resistant infrastructure
- strongly typed state transitions

For example:

    ReviewState =
        Created
        | AwaitingHuman
        | FeedbackReady
        | AwaitingAgent
        | Updating
        | Closed

A strongly typed implementation can make invalid states significantly harder to produce.

---

## 6.5 Security

The review server handles:

- arbitrary generated HTML
- filesystem paths
- local assets
- user attachments
- network requests
- browser communication
- agent communication

That is meaningful attack surface.

Rust helps reduce classes of memory-safety bugs and is well suited to implementing a constrained local daemon.

But browser sandboxing remains equally important.

---

# 7. Where Rust Does NOT Help Much

The project should not become ideologically "all Rust."

The browser still needs to perform:

- HTML rendering
- CSS layout
- DOM traversal
- text selection
- highlighting
- accessibility inspection
- browser events
- canvas rendering

These are fundamentally browser-side tasks.

Therefore:

    MCP server
    persistence
    filesystem
    event system
    artifact indexing
        ↓
    Rust is excellent

while:

    review interface
    browser DOM
    visual interactions
    MCP App View
        ↓
    TypeScript is more appropriate

Do not introduce WASM merely to increase the Rust percentage.

---

# 8. Recommended Technology Architecture

    /core
        Rust

    /mcp-server
        Rust
        official MCP Rust SDK

    /artifact-engine
        Rust

    /review-store
        Rust

    /watcher
        Rust

    /ui
        TypeScript

    /ui/review
        TypeScript

    /ui/artifact-runtime
        TypeScript

    /ui/mcp-app
        official MCP Apps JS/TS SDK

Conceptually:

              Rust
      ┌───────────────────┐
      │ MCP server        │
      │ review engine     │
      │ persistence       │
      │ artifact indexing │
      │ file watcher      │
      │ diagnostics       │
      └─────────┬─────────┘
                │
              ui://
                │
      ┌─────────▼─────────┐
      │ MCP Apps View     │
      │ TypeScript        │
      │ official SDK      │
      └───────────────────┘

This is preferable to forcing the entire stack into Rust.

---

# 9. Official MCP Rust Support Makes This More Viable

An important ecosystem change is that there is now an official:

    modelcontextprotocol/rust-sdk

The current project roadmap reports support for the stable:

    MCP 2026-07-28

protocol surface and MCP conformance.

This matters strategically.

The architecture no longer depends on a random third-party Rust MCP implementation.

Therefore the trust stack can become:

    official MCP specification
          +
    official MCP Rust SDK
          +
    official MCP Apps extension
          +
    MCP registry
          +
    open-source implementation
          +
    signed releases

This feels much closer to infrastructure users could trust.

---

# 10. "Official" Should Be a Product Property

The product itself would not be an official MCP project unless adopted by the MCP maintainers.

That distinction should remain explicit.

However, the project can still feel substantially more legitimate than a random GitHub/npm package.

Potential trust stack:

- Official MCP protocol
- Official MCP SDK
- MCP Apps
- Official MCP Registry publishing
- verified publisher identity
- signed native binaries
- reproducible builds
- release attestations
- SBOMs
- transparent security policy
- documented threat model
- zero telemetry by default
- automated protocol conformance
- fuzz testing
- dependency auditing
- stable semantic versioning

The message is not:

> "MCP officially endorses this."

Instead:

> "This is built almost entirely using MCP-standard primitives and distributed through MCP-standard channels."

That is much stronger and more honest.

---

# 11. Distribution

Instead of:

    npx -y lavish-axi

the ideal user experience becomes closer to:

    MCP Server
    └── Review

The implementation can additionally ship:

    mcp-review

as a native binary for:

- macOS ARM
- macOS x86
- Linux ARM
- Linux x86
- Windows

Potential package channels:

- MCP Registry
- GitHub Releases
- Homebrew
- Winget
- Cargo
- package-manager integrations

The MCP Registry also provides a useful provenance mechanism because publisher/package identity can be verified.

This significantly strengthens user trust.

---

# 12. Biggest Architectural Improvement: Remove Custom Agent Polling

Lavish currently needs a custom pattern:

    lavish open artifact.html

    lavish poll artifact.html

The poll waits until the human produces feedback.

This requires complicated instructions around:

- foreground/background processes
- whether the harness resumes an agent
- poll lifecycle
- disconnected clients
- wake-up behavior
- agent presence

This is clever engineering around a missing primitive.

Modern MCP increasingly provides those primitives directly.

Potential model:

    review.open(...)
         │
         ▼
    Review Task
         │
         ├── state = awaiting_user
         │
         ▼
    user interacts
         │
         ▼
    feedback event
         │
         ▼
    task/subscription update
         │
         ▼
    agent continues

This separates:

    review lifecycle

from:

    shell-process lifecycle

That is a major conceptual improvement.

---

# 13. MCP Tasks

The Tasks extension is particularly relevant.

A review operation is naturally asynchronous:

    agent creates artifact
          ↓
    human may inspect for 5 seconds
    or 5 minutes
    or several hours
          ↓
    human submits feedback
          ↓
    agent resumes

That does not map elegantly to a continuously blocked CLI invocation.

It maps naturally to:

    ReviewTask {
        id
        artifact
        state
        feedback
    }

Possible states:

    created
    awaiting_user
    feedback_ready
    acknowledged
    updating
    complete
    cancelled

Important architecture rule:

Do NOT make the product's internal state model identical to MCP Tasks.

Instead:

    internal ReviewSession
            ↓
        MCP adapter
            ↓
          Task

This protects the product if MCP Tasks evolve.

---

# 14. MCP Subscriptions / Events

Similarly, feedback should not fundamentally depend on:

    poll()
    poll()
    poll()
    poll()

Modern MCP provides increasingly sophisticated event/subscription primitives.

Ideal:

    review feedback created
            ↓
    ReviewEvent
            ↓
    subscription/event stream
            ↓
    host/agent notified

Fallback:

    feedback.list(review_id)

Therefore the architecture remains usable even when a particular host does not expose every modern MCP feature.

---

# 15. Most Important Technical Opportunity: Precise Targeting

This is where the project could become genuinely differentiated.

Do not simply attach feedback to:

    CSS selector

CSS selectors are fragile.

Example:

    #app > div:nth-child(2) > div:nth-child(3)

The agent changes the DOM.

Now that selector may refer to:

- something else
- nothing
- the wrong card

Instead, treat annotation identity as a fundamental research problem.

---

# 16. Multi-Anchor Annotation Model

Each user annotation should produce several independent anchors.

Example:

    AnnotationTarget {
        artifact_revision

        node_fingerprint

        css_path
        structural_path

        text_exact
        text_prefix
        text_suffix

        tag
        role
        accessible_name

        bounding_box

        nearby_content_hash
        ancestor_context
    }

This means the system can recover annotations after the document changes.

---

# 17. Target Resolution

Suppose the user selects:

    "JWT authentication"

The agent modifies the surrounding card.

The system should attempt recovery using multiple signals.

For example:

    exact node identity       0.40
    text quote similarity     0.25
    structural similarity     0.15
    ancestor context          0.10
    nearby text               0.05
    geometry                  0.05

Then return:

    target_resolution:
        status: recovered
        confidence: 0.94

Potential resolution statuses:

    exact
    recovered
    ambiguous
    stale
    deleted

This provides meaningful reliability guarantees.

"Accurate feedback" becomes a measurable property.

---

# 18. Artifact Revisions Should Be First-Class

Another important improvement is explicit artifact versioning.

Every artifact version receives a revision identifier.

For example:

    revision =
        BLAKE3(
            artifact contents
            +
            relevant local assets
        )

Then:

    Artifact {
        uri
        revision
    }

Example:

    artifact:
        uri: file:///project/dashboard.html
        revision: 71bc5a...

Every annotation references the revision where it was created.

---

# 19. Why Revision Awareness Matters

Suppose:

    user comments on revision A

Meanwhile:

    agent writes revision B

Without revision tracking, the agent may accidentally apply stale feedback to the wrong artifact state.

With explicit revisions:

    Feedback created against revision A.

    Current revision: B.

    Target resolution:
        recovered

    confidence:
        98%

Or:

    Target no longer exists.

    status:
        stale

    Recommended action:
        request human confirmation

That is much safer than blindly replaying comments.

---

# 20. Revision Awareness Enables Visual Diffing

Once revisions exist:

    rev 12
       ↓
    rev 13

can produce:

    3 annotated elements changed
    2 issues resolved
    1 comment still open
    1 previous issue reappeared
    1 annotation became ambiguous

Eventually this could support:

- DOM diff
- text diff
- semantic diff
- screenshot diff
- layout diff
- annotation movement
- issue regression detection

This could become one of the strongest differentiators.

---

# 21. Reliability: Feedback Should Be Append-Only

Feedback should never rely on destructive consumption.

Avoid:

    take_feedback()
        ↓
    delete feedback
        ↓
    attempt delivery

because network failure between deletion and delivery creates complicated restoration semantics.

Instead use:

    FeedbackEvent {
        id
        review_id
        artifact_revision
        created_at
        payload
        acknowledged_by_agent_at
    }

Reading never deletes the event.

The agent explicitly acknowledges it.

Therefore:

    delivery = at-least-once

and:

    handling = idempotent

A duplicate request becomes harmless.

---

# 22. Event Model

Potential event stream:

    ReviewCreated
    ArtifactLoaded
    RevisionCreated
    AnnotationCreated
    AnnotationEdited
    AnnotationResolved
    FeedbackSubmitted
    FeedbackAcknowledged
    AgentReplyReceived
    ArtifactUpdated
    TargetRecovered
    TargetBecameAmbiguous
    ReviewClosed

Internally:

    review_event_id = monotonically increasing

Agents track:

    last_acknowledged_event

This naturally supports:

- retries
- crashes
- reconnects
- offline clients
- resumed agents
- event replay
- diagnostics

---

# 23. MCP Tool Surface Should Stay Small

Do not create a huge MCP tool namespace.

Potential model-facing API:

    review.open
    review.get
    review.close

    feedback.list
    feedback.ack

    artifact.snapshot
    artifact.diff

Possibly even smaller.

For example:

    review_artifact
    get_review_feedback
    acknowledge_review_feedback

The important principle is:

> The agent should see the user's intent surface, not the UI implementation surface.

---

# 24. MCP App-Only Tools

MCP Apps supports operations that are available to the UI but hidden from the language model.

Use this heavily.

Potential internal UI actions:

    review.ui.highlight
    review.ui.resolve_target
    review.ui.upload_attachment
    review.ui.viewport
    review.ui.refresh
    review.ui.navigation

These should not pollute the model's tool list.

Conceptually:

    visibility = ["app"]

This provides a cleaner model interface and reduces unnecessary model context/tool confusion.

---

# 25. Separate Three Layers

The system should clearly separate:

## Artifact

What the agent created.

Example:

    dashboard.html

---

## Review

The human interaction session.

Example:

    review_23914

---

## Feedback

Structured human intent.

Example:

    feedback_81

Therefore:

    Artifact
       │
       ├── Revision A
       ├── Revision B
       └── Revision C

    Review
       │
       ├── Annotation 1
       ├── Annotation 2
       └── FeedbackEvent 3

This prevents artifact identity and review-state identity from becoming accidentally coupled.

---

# 26. The Browser Sandbox Still Matters

MCP does not magically make generated HTML safe.

Agent-generated artifacts may contain:

- arbitrary JavaScript
- network requests
- embedded scripts
- malformed markup
- attempted parent-frame access
- malicious dependencies

The review surface should therefore retain strong isolation.

Possible structure:

    MCP App iframe
        │
        ▼
    Review UI
        │
        ▼
    nested artifact iframe
        │
        └── restricted sandbox

The artifact iframe should not automatically receive:

    allow-same-origin

or unnecessary browser privileges.

The review app communicates through:

    postMessage

or an equivalent constrained channel.

Lavish already demonstrates good thinking here.

---

# 27. Local-First Should Remain Core

A major advantage of Lavish is:

> The artifact remains a normal local file.

Preserve this.

The product should not require uploading artifacts to a SaaS service.

Ideal:

    project/
        dashboard.html

The agent edits:

    dashboard.html

The review runtime observes it.

The file remains usable without the review tool.

This matters philosophically:

> Review metadata should augment the artifact, not own it.

---

# 28. The Artifact Is Authoritative

Avoid creating a proprietary editor format.

For HTML:

    saved HTML = source of truth

Review state lives separately.

For example:

    .review/
        sessions/
        annotations/
        revisions/

or an internal local database.

The HTML itself should remain portable.

---

# 29. Fallback Strategy Is Essential

Pure MCP Apps dependency would currently be too restrictive.

Host capabilities vary.

Therefore:

                      Review Core
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
        MCP Adapter               Browser Adapter
             │                         │
             ▼                         ▼
       native MCP App             localhost UI

Possible third adapter:

             CLI Adapter
                 │
                 ▼
          arbitrary agent

This creates graceful degradation.

Best experience:

    MCP Apps

Fallback:

    MCP tool + local browser

Lowest-common-denominator fallback:

    CLI / JSON output

---

# 30. Capability Detection

The runtime should detect host capabilities.

For example:

    capabilities:
        mcp_apps: true
        tasks: true
        subscriptions: true

Then choose:

    inline MCP App
        +
    asynchronous Task
        +
    events

If:

    mcp_apps: false

then:

    launch local browser
        +
    regular MCP tools

The user should not need to understand this distinction.

---

# 31. Where This Beats Lavish

Potential advantages:

## Standards Alignment

Lavish:

    proprietary AXI/CLI contract

Alternative:

    MCP 2026-07-28

---

## Native Agent Integration

Lavish:

    agent shells out

Alternative:

    agent calls MCP directly

---

## Native UI Integration

Lavish:

    external browser

Alternative:

    MCP App inside compatible host

with browser fallback.

---

## Async Lifecycle

Lavish:

    long-running CLI poll

Alternative:

    ReviewSession
        +
    MCP Tasks
        +
    event/subscription support

---

## Reliability

Lavish:

    destructive feedback delivery
        +
    restoration logic

Alternative:

    append-only event log
        +
    acknowledgement

---

## Annotation Accuracy

Lavish:

    DOM/context targeting

Alternative:

    multi-anchor target resolution
        +
    confidence scoring
        +
    revision awareness

---

## Artifact History

Lavish:

    live file/session

Alternative:

    content-addressed revisions
        +
    diff semantics

---

## Distribution

Lavish:

    npm / npx

Alternative:

    native binary
        +
    MCP Registry
        +
    GitHub releases
        +
    signed artifacts

---

## Trust

Lavish:

    community repository

Alternative:

    official protocol
        +
    official SDK
        +
    official extension
        +
    validated publisher identity
        +
    open-source implementation

---

# 32. Where Lavish Still Wins

The comparison should remain intellectually honest.

## Universal Agent Compatibility

Lavish essentially requires:

    shell access

Most coding agents already have this.

MCP Apps support is less universal.

Therefore Lavish can work in environments where the proposed project's richer experience may not.

---

## Architectural Simplicity

Lavish controls its entire protocol.

A standardized implementation must handle:

- MCP negotiation
- host capability differences
- Tasks compatibility
- Apps compatibility
- extension evolution
- protocol updates

---

## Development Velocity

A mostly-JavaScript system can iterate very quickly.

Rust + TypeScript increases build complexity.

---

## Ecosystem Maturity

MCP 2026-07-28 is relatively new.

Some extensions remain younger than the core protocol.

Therefore the project must maintain good fallbacks.

---

# 33. Comparison Table

| Area | Lavish | Proposed MCP-Native Review |
|---|---|---|
| Agent interface | AXI / CLI | MCP 2026-07-28 |
| UI integration | Separate browser | MCP Apps + browser fallback |
| Backend | Node.js | Rust |
| Browser UI | JavaScript | TypeScript |
| Distribution | npm / GitHub | MCP Registry + native releases |
| Discovery | skill/plugin instructions | MCP discovery |
| Feedback waiting | custom long poll | Review task/events |
| Feedback persistence | consumptive delivery | append-only events |
| Artifact identity | canonical path | URI + revision |
| Annotation targeting | DOM/context | multi-anchor resolver |
| Stale feedback handling | limited | explicit revision/confidence |
| Visual diff | limited | first-class opportunity |
| Host independence | excellent | good with fallback |
| Inline host UX | limited | excellent |
| Trust surface | community package | standards-first |
| Runtime overhead | Node | native Rust |
| Complexity | moderate | higher |
| Standards alignment | low-medium | very high |

---

# 34. What "Faster" Should Mean

Do not optimize for synthetic Rust benchmarks.

Measure user-visible latency.

Important metrics:

## Startup latency

    agent invokes review
        →
    artifact visible

---

## Reload latency

    agent saves file
        →
    human sees update

---

## Feedback latency

    human clicks submit
        →
    agent receives structured feedback

---

## Target-resolution latency

    revised artifact loaded
        →
    previous annotations reattached

---

## Resource footprint

Measure:

- idle memory
- CPU while watching
- binary size
- browser overhead
- time to ready state

---

# 35. What "More Accurate" Should Mean

Accuracy should be measurable.

Potential benchmark:

Generate artifact.

Create:

    N annotations

Then automatically mutate DOM:

- reorder siblings
- insert wrapper elements
- change class names
- move cards
- edit unrelated text
- change layout
- replace components

Then measure whether each annotation still resolves to the correct logical element.

Metrics:

    exact-resolution rate

    recovered-resolution rate

    false-positive rate

    ambiguous-resolution rate

    stale-target detection rate

This could become a very interesting technical benchmark in its own right.

---

# 36. What "More Reliable" Should Mean

Potential reliability properties:

## Idempotency

Repeated agent calls produce the same effect.

---

## Crash Recovery

Server restart does not lose feedback.

---

## Replayability

Events can be replayed.

---

## Revision Consistency

Feedback always identifies the artifact revision it references.

---

## Explicit Acknowledgement

Feedback is never silently consumed.

---

## Deterministic State

Every review state transition can be reconstructed.

---

## File Integrity

Review runtime never unexpectedly mutates the user's artifact.

---

# 37. Security Model

A high-trust implementation should explicitly document its threat model.

Potential assumptions:

### Untrusted

- artifact HTML
- artifact JavaScript
- attachments
- agent-generated code
- arbitrary project contents

### Trusted

- review binary
- browser host
- local OS user

Protections:

- sandboxed iframe
- no arbitrary host filesystem access from artifact
- constrained resource serving
- path canonicalization
- directory traversal prevention
- Origin validation
- Host validation
- CSRF protection
- tokenized iframe channels
- attachment isolation
- CSP where practical
- dependency audit
- fuzz testing

Lavish already has surprisingly good security thinking here.

Do not regress.

---

# 38. Trust / Provenance Strategy

To make this feel substantially more credible than:

    random-github-user/review

use:

## Verified MCP publisher

Publish through the MCP Registry with validated identity.

---

## Signed Releases

Potential tooling:

    Sigstore
    cosign

---

## Build Provenance

Use CI-generated release attestations.

---

## SBOM

Publish software bill of materials.

---

## Reproducible Builds

Where feasible.

---

## Security Policy

Include:

    SECURITY.md

with:

- disclosure process
- threat model
- supported versions
- response expectations

---

## Minimal Telemetry

Default:

    telemetry = off

Or ideally:

    no telemetry

unless users explicitly opt in.

Local review tools handle potentially sensitive artifacts.

Privacy should become part of the trust story.

---

# 39. Possible Product Positioning

Avoid:

> Rust Lavish.

Avoid:

> Faster HTML reviewer.

Avoid:

> MCP alternative to Lavish.

Better:

> The visual review layer for AI agents.

or:

> Review what your agent builds.

or:

> Point at it. Your agent understands.

or:

> Structured visual feedback for AI-generated artifacts.

or:

> Human review infrastructure for agent-generated interfaces.

The product category matters.

---

# 40. Potential Long-Term Primitive

The most interesting long-term opportunity may not actually be HTML.

The deeper primitive is:

    Feedback {
        artifact
        revision
        target
        intent
        evidence
    }

That abstraction could potentially work across:

    HTML
    dashboards
    diagrams
    reports
    charts
    slides
    canvas artifacts
    generated applications
    notebooks

Different artifact types require different target resolvers.

For example:

HTML:

    DOM target

Slides:

    slide + object target

Diagram:

    node + edge target

Chart:

    mark + series + coordinate target

Document:

    text-range target

The feedback model remains approximately the same.

---

# 41. Possible Future Architecture

                       Review Protocol
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
          HTML            Slides          Diagrams
        Resolver          Resolver          Resolver
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                         Feedback
                             │
                             ▼
                            MCP
                             │
                             ▼
                           Agent

This starts looking less like:

    HTML annotation tool

and more like:

    visual human-agent feedback infrastructure

That could be substantially more important.

---

# 42. Suggested V1

Keep V1 extremely focused.

Build:

    Rust MCP server

    official MCP Rust SDK

    MCP Apps review UI

    local HTML loading

    file watching

    artifact revisions

    click-element annotation

    text-range annotation

    comments

    structured feedback

    feedback acknowledgement

    browser fallback

Do not initially build:

- Mermaid whiteboards
- collaborative reviews
- cloud hosting
- artifact publishing
- Tailscale
- AI design recommendations
- automated redesign
- giant component libraries
- dozens of artifact types
- visual regression platform
- complicated auth
- organization accounts
- proprietary artifact formats

First prove the primitive.

---

# 43. V1 Experience

Agent:

    review_artifact({
        path: "/project/index.html"
    })

Human sees artifact.

Human clicks:

    Pricing Card #2

Human writes:

    "The hierarchy here feels backwards.
     Make the price dominant and reduce emphasis
     on the description."

System captures:

    artifact:
        path: /project/index.html
        revision: af371...

    target:
        type: element

        tag: section

        role: region

        accessible_name: Pro plan

        text:
            exact: Pro
            nearby: $49/month

        structural_path:
            ...

        bounding_box:
            ...

        fingerprint:
            ...

    feedback:
        text: ...

Agent receives structured feedback.

Agent edits file.

Review reloads.

System attempts to resolve the previous target against the new revision.

Result:

    target_resolution:
        status: recovered
        confidence: 0.97

The reviewer immediately sees whether the requested change worked.

That single loop should feel exceptional.

---

# 44. V1 Success Criterion

The project succeeds if this statement becomes true:

> This is the cleanest and most reliable way in the MCP ecosystem for a human to point at something an agent rendered and have the agent understand exactly what they mean.

Not:

> We support more features than Lavish.

Feature count is not the moat.

The moat should initially be:

    precision
        +
    reliability
        +
    standards alignment
        +
    excellent UX

---

# 45. Research Questions Worth Stress-Testing

Before building heavily, investigate:

## MCP Host Compatibility

How consistently do major hosts implement:

- MCP Apps
- Tasks
- subscriptions
- structuredContent
- app-only tools
- persistent MCP connections

Hosts worth testing include:

- ChatGPT
- Claude
- VS Code
- Goose
- coding-agent environments
- desktop MCP clients

---

## Local File Semantics

How should an MCP App safely access:

    /project/index.html

without exposing arbitrary filesystem capabilities?

Likely architecture:

    MCP server reads local file
        ↓
    sanitizes / serves artifact
        ↓
    MCP App review iframe

Do not rely on:

    file://

inside browser sandboxes.

---

## Asset Loading

Need correct handling for:

    ./image.png
    ./styles.css
    ./script.js
    ../assets/*
    fonts
    module imports

Relative asset semantics are surprisingly important.

---

## Annotation Stability

Build an automated mutation benchmark early.

This is likely one of the project's strongest technical opportunities.

---

## Large Artifacts

Test:

- large DOMs
- generated dashboards
- thousands of elements
- large SVGs
- many annotations

---

## Security

Test intentionally malicious artifacts.

---

# 46. Potential Benchmark Against Lavish

A meaningful comparison could measure:

## Installation

    time to first successful review

---

## Startup

    invoke → browser/UI ready

---

## Reload

    file write → updated screen

---

## Feedback Delivery

    submit → agent receives

---

## Resource Usage

    RSS memory
    CPU idle
    binary/runtime size

---

## Annotation Accuracy

    correct target after DOM mutations

---

## Failure Recovery

Test:

- kill server
- kill browser
- kill agent
- restart process
- duplicate request
- network disconnect

Then measure whether:

    feedback is preserved

and:

    state is recoverable

This would produce much stronger evidence than claiming:

> Rust is faster.

---

# 47. Important Design Principle

Separate:

    protocol
        from
    product semantics

MCP should handle:

- transport
- discovery
- host interaction
- UI embedding
- asynchronous primitives

The Review Core should handle:

- artifact identity
- revisions
- annotations
- target resolution
- feedback
- review lifecycle
- diffs
- diagnostics

This means:

    MCP
      ↓
    Review Adapter
      ↓
    Review Core

rather than:

    Review Core = MCP implementation

That architectural boundary is important for longevity.

---

# 48. Potential Repository Structure

    mcp-review/
    │
    ├── crates/
    │   │
    │   ├── review-core/
    │   │
    │   ├── review-server/
    │   │
    │   ├── artifact-store/
    │   │
    │   ├── annotation-engine/
    │   │
    │   ├── target-resolver/
    │   │
    │   ├── revision-engine/
    │   │
    │   └── mcp-adapter/
    │
    ├── ui/
    │   │
    │   ├── review-app/
    │   ├── artifact-runtime/
    │   └── components/
    │
    ├── benchmarks/
    │   │
    │   ├── startup/
    │   ├── annotations/
    │   ├── mutation/
    │   └── reliability/
    │
    ├── tests/
    │   │
    │   ├── fixtures/
    │   ├── malicious-artifacts/
    │   └── host-compatibility/
    │
    ├── docs/
    │   │
    │   ├── architecture.md
    │   ├── threat-model.md
    │   ├── annotation-model.md
    │   └── protocol.md
    │
    └── SECURITY.md

---

# 49. Pros of Building This

## Standards-native

The product aligns with where agent interoperability appears to be heading.

## Better trust story

Official protocol + official SDK + registry + native signed binary.

## Potentially lower overhead

Especially startup, memory and dependency overhead.

## Better reliability model

Append-only events, explicit acknowledgement and revisions.

## Better annotation semantics

Multi-anchor recovery could materially outperform naive DOM references.

## Better host integration

MCP Apps can enable inline review.

## Broader long-term opportunity

Potential evolution into generic artifact-review infrastructure.

## Interesting open-source engineering

The project combines:

- Rust
- MCP
- browser sandboxing
- agent infrastructure
- DOM algorithms
- distributed-state semantics
- UX
- security

It has meaningful technical depth.

---

# 50. Cons / Risks

## MCP Apps coverage

Not every agent host will support every capability.

## Rust + TS complexity

Two-language architecture introduces maintenance overhead.

## MCP evolution

Newer extensions may continue changing.

## Browser remains the expensive component

Rust cannot accelerate browser layout itself.

## Hard annotation problem

Reliable target recovery is technically non-trivial.

## Local asset handling

HTML artifacts can have complex dependency graphs.

## Security complexity

Executing arbitrary agent-generated HTML is inherently sensitive.

## Lavish's CLI portability is genuinely good

A shell command works almost everywhere.

Therefore browser/CLI fallback should not be considered a temporary hack.

It should be a deliberate compatibility layer.

---

# 51. Recommendation

This project appears worth pursuing.

But the key is to avoid thinking of it as:

    Lavish++
    
Instead:

    Lavish identifies an important UX primitive.

    MCP now standardizes much of the infrastructure
    beneath that primitive.

    Therefore rebuild the product around the standard,
    while investing deeply in the layer that MCP does
    not provide:

        review semantics
        annotation identity
        artifact revisions
        target resolution
        reliability
        visual UX

The project's strongest thesis becomes:

> **MCP provides communication between agents and software. This provides precise communication between humans and the artifacts those agents create.**

---

# 52. Final Product Thesis

The project should aim to establish this primitive:

    Human visually identifies something
               ↓
    system converts that perception
    into a stable machine-readable target
               ↓
    structured intent travels over MCP
               ↓
    agent modifies the artifact
               ↓
    system verifies whether the target
    and feedback remain valid
               ↓
    human reviews again

The core insight is:

> Humans are excellent at visually recognizing what is wrong, but poor at translating spatial/visual intent into textual coordinates an agent can reliably interpret.

The review runtime closes that gap.

MCP provides the standardized agent transport.

Rust provides a strong systems foundation.

The differentiated product is the layer in between.

---

# 53. Useful Upstream References

Primary projects/specifications to track:

- Model Context Protocol specification, particularly the 2026-07-28 release
- Official MCP Rust SDK: `modelcontextprotocol/rust-sdk`
- MCP Apps / `modelcontextprotocol/ext-apps`
- MCP Tasks extension
- MCP Registry
- MCP roadmap around subscriptions, Tasks and agentic messaging
- Lavish AXI: `kunchenguid/lavish-axi`
- AXI project / philosophy from `kunchenguid/axi`

Important areas of MCP development to continuously watch:

- MCP Apps host adoption
- Tasks stabilization
- server-initiated event primitives
- subscriptions
- local-server distribution
- registry adoption
- security guidance
- native desktop host support

These upstream changes could allow additional custom infrastructure to be removed over time.

---

# 54. North Star

Do not try to own:

    agent transport

MCP should own that.

Do not try to own:

    HTML

The browser should own that.

Do not try to own:

    artifact storage

The user's project should own that.

Own:

> **The mapping between what a human sees and what an agent needs to understand.**

That is the potentially valuable primitive.

