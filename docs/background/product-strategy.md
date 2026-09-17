# Visual Intent Layer: product strategy and build recommendation

_Decision brief completed 15 September 2026. Revised September 2026: TypeScript-only V0, Personal Proof validated on pi; the spec is authoritative for V0 scope._

> **Corrected on steering.** ADR-0018 supersedes the assumption that an agent
> reads new direction at a host-negotiated safe boundary. Steering and
> interruption are seen at the agent's Check-In: a convention this product
> publishes, not a capability it detects. Every mention of "live-steering" or
> "steering support" below should be read as Check-In.

## Executive verdict

Build it—but build a deliberately narrow Proof Product, not a general visual agent platform.

The feasible and valuable first product is the cleanest way for a Builder-Reviewer to inspect a web interface an agent just built, point to or manipulate the intended result, deliver that intent to the agent, and verify the next revision. It should work as an independent local product, integrate through ordinary MCP tools, and progressively enhance into an embedded MCP App or live-steering experience where the host supports it.

The opportunity is real, but the broad original thesis needs qualification:

- **Feasibility:** high for a polished web review loop; moderate for reliable rendered-target-to-source provenance; low for a trustworthy universal layer over every visual artifact in the first release.
- **User value:** credible and directly testable for spatial, relational, and multi-target changes. Visual interaction is not inherently better for every instruction; the product wins when it removes the translation burden between what the human sees and what the agent needs to change.
- **Innovation:** visual feedback over MCP, DOM selection, drawing overlays, and agent-readable canvases already exist. The potentially original contribution is a portable, revision-aware, confidence-bearing Visual Intent Envelope connected to editable source and human verification.
- **Product advantage:** superior UI/UX can itself justify the project. A breakthrough claim is optional. Reliability and latency measurements should guide engineering and provide honest comparisons rather than dictate marketing.
- **Portfolio value:** strong. The product can demonstrate product judgment, interaction design, browser instrumentation, local-service engineering, protocol interoperability, security, state modelling, and empirical benchmarking in one coherent artifact. A Rust systems layer is deferred past Personal Proof.

## Product thesis

> A local-first visual direction layer that converts what a human points to, selects, relates, or demonstrates on an agent-produced web interface into source-grounded, revision-safe intent an agent can act on—and keeps the human in control of delivery and verification.

The project should not try to own agent transport, browsers, general canvases, or artifact storage. MCP owns transport, the browser owns rendering, and the user's project owns source. The product owns the mapping between visible human intent and trustworthy agent action.

## Target user and first job

The first user is a **Builder-Reviewer**: someone comfortable directing an agent and evaluating software output, whether or not they personally write the code.

The first job is:

> “The agent has built or changed this interface. Help me show it exactly what I mean, send that direction at the right time, and verify the correction.”

This is a better initial wedge than blank-canvas planning because:

- a real artifact already exists;
- targets and outcomes can be measured;
- the workflow naturally exercises agent handoff and revision verification;
- the user can compare it directly with screenshot-and-chat; and
- source provenance creates meaningful technical differentiation.

Blank-canvas planning, diagrams, documents, slides, images, and video may later enter the same Visual Direction Loop through adapters. They should not shape V0.

## V0 experience

### Open

The user or agent invokes one MCP entry tool against saved HTML or a local React/Vite application. A capable host embeds the review interface; every other host receives a local-browser fallback.

The artifact opens in its ordinary operating state and behaves normally. Pointing at things and boxing an area are obvious and reversible.

### Express intent

The Builder-Reviewer can:

- select an element;
- select a text range;
- mark a visible region;
- attach written direction and supporting references;
- select multiple targets;
- express alignment, ordering, spacing, containment, equivalence, or size relationships; and
- experiment with a small number of Intent Previews: drag-to-reorder, align, and match size, each guilty until proven against selection plus text.

The source does not change during visual manipulation. The UI shows a reversible proposal and converts it into an implementation-neutral relationship or transformation. The agent decides how to implement it in authoritative source.

Unrestricted drawing, general shapes, infinite canvas behavior, and direct visual source editing are excluded until evidence shows that the core interaction set is insufficient.

### Deliver

Intent remains explicit about timing:

- **Draft:** retain locally and do not send;
- **Steer now:** amend active work at the next boundary the host supports;
- **Next pass:** hold for a later implementation turn; and
- **Stop and review:** deliberately interrupt work and return control where supported.

The UI distinguishes local queuing, host acceptance, agent acknowledgement, and implementation. It never implies that accepting a message means the agent has already acted on it. On hosts without steering support (expected on pi), steering is labelled unsupported and the intent is retained safely.

### Verify

When a new artifact revision appears, the product resolves each original target and labels it exact, recovered, ambiguous, stale, or deleted. The Builder-Reviewer compares the outcome and approves, rejects, requests another pass, supersedes the intent, or marks it obsolete. Deleted targets block approval. Ambiguous targets show candidates and never auto-resolve. A revision advance before delivery marks the envelope stale and re-resolves targets.

Agent acknowledgement is not completion. Human verification is.

## Support boundary

V0 supports browser-rendered surfaces through one loop. An artifact type differs only in how much evidence its targets can carry and in how its revision is identified, never in the loop itself.

**Saved or generated HTML** is close to the editable source of truth. The product serves local assets safely, watches revisions, and grounds feedback directly in the artifact.

**A local running application** produces visible DOM from components, state, data, routing and build tooling. V0 deeply supports one stack—React with Vite is the recommended starting point—and offers generic Rendered Grounding elsewhere. The application is served faithfully through the review proxy: its requests arrive as a client would send them, its update channel is proxied, and it gets a content policy that admits its own traffic and nothing else.

The evidence contract is tiered:

1. **Rendered Grounding and Runtime State Evidence:** DOM identity, accessible semantics, text evidence, structure, geometry, and the address the artifact was showing, plus the content-addressed artifact revision (BLAKE3 over canonical bytes plus asset manifest). A Builder-Reviewer may attach a **Captured View**, a browser-composited image taken by an explicit permissioned capture rather than a re-render.
2. **Source Provenance:** a build-time source-location stamp the artifact carries, read from the product's own attribute or a known working third-party attribute, identifying the editable file and line.

The UI must not silently promote a likely file or component into exact provenance. `exact` is claimed only where an instrumented artifact stamped a source location, per Target; when evidence is ambiguous or unavailable, it says so.

Authenticated production applications, arbitrary cross-origin private apps, and universal framework provenance are not V0 commitments.

## Why no general canvas dependency

The product requires interaction primitives, not a canvas product:

- hit testing;
- target outlines and handles;
- multi-selection;
- relationship guides;
- ghost previews;
- region and arrow evidence where justified; and
- smooth pan, scroll, zoom, focus, and keyboard behavior.

These should be implemented using the smallest product-owned browser layer capable of delivering exceptional interaction. A general canvas engine adds its own object model, event ownership, coordinate systems, accessibility constraints, and licensing surface before proving that those capabilities create user value.

tldraw remains useful interaction research, not a runtime assumption. Other engines may later be optional adapters. The Visual Intent Envelope must never depend on their record formats.

## Product and protocol architecture

```text
Rendered artifact
    ↓
Target and provenance adapter
    ↓
Product-owned interaction surface
    ↓
Visual Intent Envelope + local lifecycle
    ↓
MCP delivery adapter
    ↓
Agent changes authoritative source
    ↓
Revision resolver
    ↓
Human verification
```

The independent local product is primary. MCP is the transport and discovery boundary, not the domain model.

### Compatibility promise

- **Baseline Compatibility:** any conforming MCP host can invoke ordinary tools and receive a structured envelope. V0 is validated on pi via pi-mcp-adapter and designed to work on other conforming hosts such as codex, claude code, and opencode.
- **Certified Experience:** deferred past Personal Proof. When published, a host-and-version matrix identifies where embedded UI, steering, subscriptions, and lifecycle behavior have actually been verified.
- **Progressive enhancement:** unsupported optional capabilities fall back honestly rather than failing the core workflow. Browser fallback is the primary V0 experience on pi.

A thin optional Skill teaches an agent when the Visual Direction Loop is preferable to prose and how to handle its lifecycle. The MCP server remains self-describing and useful without the Skill.

## Implementation recommendation

Ship a TypeScript-only V0. Keep the local-authority boundary narrow so a Rust daemon can replace the Node runtime later only if measurements demand it.

### TypeScript responsibilities (V0)

- browser review UI;
- DOM capture and interaction layer;
- MCP App View;
- React/Vite provenance instrumentation;
- local server and MCP server;
- secure file and asset access;
- revision and envelope state machine;
- file watching; and
- durable local persistence, recovery, limits, and audit trail.

### Deferred Rust responsibilities

A future Rust daemon would own the local server, MCP serving, files and assets, revision state, persistence, recovery, policy, and native distribution. It returns only if startup, memory, install, or reliability measurements demand it.

Distribute V0 as an npm package plus MCP configuration and thin Skill in one installable plugin, published via npm, GitHub, and the MCP Registry. Node is required. No Rust toolchain is required. Signed binaries and platform matrices are deferred. Generate TypeScript types from one experimental JSON Schema, preserving the option to generate compatible Rust types later, and isolate MCP extension churn behind a narrow adapter.

A future Rust boundary would be justified by startup time, resource use, recovery, filesystem safety, and distribution—not by an unsupported claim that it makes the browser or agent faster.

## Build sequence

### 0. Baseline the existing workflow

Choose several real interface corrections and perform them with screenshot-and-chat. Record time to accepted correction, clarification turns, and failure modes. This provides a comparison before product enthusiasm biases the baseline.

### 1. Prove the smallest loop in TypeScript

Open one saved HTML artifact, select an element or text range, submit a structured envelope, update the artifact, reload it, and verify the change. Make this loop feel unusually clean before adding breadth.

### 2. Prove the proxied application

Connect to one local React/Vite application. Forward its requests faithfully, proxy its update channel, give it a policy that admits its own traffic, and read a build-time source stamp for exact Source Provenance. Make evidence levels visible and keep the revision the artifact reports separate from the revision a source offers.

### 3. Prove target resolution

Create the mutation benchmark early. Reorder siblings, insert wrappers, change class names, alter unrelated text, move components, and delete targets. Measure exact resolution, recovery, false confidence, ambiguity, and stale/deleted detection.

### 4. Prove higher-fidelity visual intent

Add multi-selection, relational commands, and only three experimental Intent Previews: reorder, align, and match size. Compare them with ordinary annotations. Each preview is guilty until proven; retain only the interactions that reduce explanation effort or improve accepted results.

### 5. Add durable delivery and host adapters

Implement Draft and Next pass in the local state model first. Add Steer now only for hosts that expose it; elsewhere label it unsupported and retain intent safely. Validate ordinary MCP delivery on pi, keep browser fallback first-class, and test restart recovery, duplicate delivery, and acknowledgement semantics.

### 6. Polish and validate Personal Proof

Make invocation, selection, uncertainty, delivery, agent activity, and verification visually effortless. Use the product repeatedly on its own interface and record baseline comparisons. Defer five independent Builder-Reviewers past Personal Proof.

### 7. Defer the Rust runtime

Past Personal Proof. Return to a Rust daemon only if startup, memory, install, or reliability measurements demand it; then move the local authority, secure the filesystem and network boundary, ship native binaries, and publish reproducible benchmarks.

## Proof Product completion boundary

Personal Proof is complete when it:

1. reviews saved HTML and a local React/Vite application;
2. supports selection, relations, and experimental previews under the guilty-until-proven rule;
3. emits a versioned experimental Visual Intent Envelope;
4. works through ordinary MCP tools on pi, with browser fallback first-class and embedded UI where supported;
5. preserves Draft, Next pass, acknowledgement, and verification state, with honest steering labels;
6. exposes ambiguous, stale, deleted, or unavailable targets honestly and requires explicit disposition;
7. survives restart without losing intent;
8. includes mutation, latency, reliability, and pi-compatibility tests, with the multi-host matrix deferred;
9. installs via npm with Node required and no Rust toolchain; and
10. has been repeatedly used by its builder against a recorded screenshot-and-chat baseline, with five independent Builder-Reviewers deferred.

General canvases, additional frameworks and artifact types, hosted collaboration, teams, analytics, and commercial services remain outside this boundary, as do the Certified Experience matrix, SBOMs, reproducible builds, fuzz testing, and signed binaries.

## Evaluation

### UI/UX superiority

The primary test is behavioral:

> For visually grounded corrections, do Builder-Reviewers choose this over explaining the same thing in chat?

Evaluate:

- obvious invocation;
- time until the artifact is usable;
- instantaneous-feeling hover and selection;
- minimal and comprehensible controls;
- relational language understandable without CSS vocabulary;
- visible uncertainty;
- unambiguous delivery timing and state;
- visible agent acknowledgement;
- low-navigation before/after verification; and
- state preservation through reloads and failures.

### User-value evidence

Measure rather than solicit only opinions:

- time to accepted correction;
- clarification turns;
- targeting failures;
- rejected revisions;
- setup and recovery friction; and
- voluntary repeat use.

Personal use is the fastest discovery loop. Independent use is needed before generalizing the value claim.

### Latency and engineering evidence

Track these as regression budgets and comparative evidence:

- invocation to review surface ready;
- pointer action to visual response;
- application save to refreshed artifact;
- submit to host acceptance;
- revision arrival to target resolution;
- server startup and idle memory;
- recovery after process or connection failure; and
- envelope bytes versus screenshot-and-chat baseline as a token-efficiency signal.

Publish results only when the methodology and comparison are reproducible. No breakthrough claim is required.

### Optional research gates

The earlier research targets remain local regression signals during Personal Proof rather than launch gates or marketing requirements:

- at least 95% correct source-target resolution on a defined mutation set;
- under 1% confidently wrong;
- explicit ambiguity and abstention;
- at least 40% lower accepted-correction time on suitable tasks; and
- baseline delivery designed for any conforming host, with the two-host gate deferred.

Missing these targets means the implementation or positioning should change; it does not invalidate a product whose experience is already clearly superior.

## Principal risks and responses

### The product becomes an annotation tool with MCP attached

**Response:** make relational intent, revision identity, evidence confidence, and human verification part of the core model from the first slice.

### Provenance requires intrusive framework instrumentation

**Response:** preserve useful Rendered Grounding without it, deeply support one willing development stack, and measure whether users accept the adapter in exchange for precision.

### Visual interaction takes longer than chat

**Response:** baseline real corrections first, minimize modes, and remove manipulations that do not reduce explanation or iteration time.

### Scope expands toward a general design canvas

**Response:** require every new visual primitive to demonstrate a missing intent that selection, relations, references, and text cannot convey adequately.

### MCP host behavior fragments the experience

**Response:** own durable state locally, keep ordinary tools as the baseline, provide a browser fallback, negotiate optional capabilities, and defer the certification matrix past Personal Proof.

### Native runtime scope slows discovery

**Response:** ship TypeScript-only in V0 with a narrow local-authority boundary; a Rust daemon returns only if measurements demand it.

### Local review creates a security boundary around untrusted artifacts

**Response:** bind to loopback, use unguessable capabilities, validate Host and Origin, sandbox rendered content, confine canonical paths, bound assets and requests, disclose outbound evidence, publish SECURITY.md with a threat model, default telemetry to off, audit dependencies, and test malicious fixtures. SBOMs, reproducible builds, and fuzz testing are deferred.

### Superior UI remains subjective

**Response:** combine builder judgment with repeat-choice behavior, correction time, clarification turns, observable errors, and independent sessions. Preserve taste without using taste as the only evidence.

## Open-source and commercial posture

Keep the local direction loop permissively open:

- envelope schema;
- local runtime;
- browser UI;
- MCP tools;
- resolver benchmark; and
- initial adapters.

If commercial demand appears, monetize services around the core: hosted collaboration, managed sharing, organization policy, analytics, enterprise identity, and supported integrations. Do not cripple privacy, provenance, reliability, or verification to manufacture a paid tier.

## Competitive position

Do not position the product as “Lavish but faster” or “visual feedback through MCP.” Both are too narrow and the latter is already crowded.

Benchmark:

- Lavish for local generated-HTML experience;
- MarkLayer for review lifecycle;
- Lens for framework context;
- `annotate-mcp` for re-anchoring and honest missing targets;
- `draw2agent` and `agnt` for drawing over live applications;
- Figma Code Connect for source provenance; and
- Replit, Cursor, stagewise, and v0 for interaction polish.

The differentiated position is:

> The most precise and trustworthy open-source Visual Direction Loop between a human, a rendered interface, its editable source, and any MCP-capable agent.

## Final recommendation

Proceed.

The project is sufficiently feasible to produce a strong public product and sufficiently difficult to display meaningful engineering depth. Its likely success comes from focus: one exceptional web-interface correction loop, a product-owned interaction model, honest provenance, durable delivery semantics, and human verification.

Do not wait for proof of a universal platform or technical breakthrough. Do not begin with a Rust daemon, general canvas, every framework, or every artifact type. First prove on pi that the Visual Direction Loop feels materially better than chat on work you genuinely perform. Then make that experience reliable, portable, measurable, and beautifully open.

## Supporting research and decisions

- [Initial product research](product-research.md)
- [MCP integration and implementation research](mcp-integration-research.md)
- [Competitive MCP landscape](similar-mcp-landscape.md)
- [tldraw and canvas fit](tldraw-fit-research.md)
- [Domain glossary](../../CONTEXT.md)
- [Architecture decisions](../adr/)
