# Visual Intent Layer Proof Product

Status: superseded in part by `.scratch/review-surface/spec.md`

## Superseded decisions

The following decisions in this document are no longer in force and must not be
implemented from here. They are replaced by `.scratch/review-surface/spec.md`.

- The three interaction modes (Explore / Select / Direct) — replaced by the two
  Review Surface states, Review and Verify, with a tool row inside Review.
- One envelope per submission carrying one shared written direction and one
  verdict — replaced by durable Annotations delivered as a batch envelope and
  verified individually.
- The five resolution outcomes (exact, recovered, ambiguous, stale, deleted) —
  replaced by `match` (`exact` / `recovered` / `unresolved`) with candidates,
  plus an Annotation-level revision relation. See ADR-0016.
- Relational Intent expressed through relation type and operator pickers —
  replaced by direct manipulation with a reduced operator set.
- The three Intent Previews as separate experimental manipulations — folded into
  Relational Intent as its input method.
- The embedded MCP App view as a V0 deliverable — deferred until a host supports
  it. See ADR-0015.

Everything else still holds: the domain model and glossary, the Envelope as the
portable contract, the delivery lifecycle, resolution semantics and abstention,
the security posture as amended by ADR-0015, and distribution.

## Problem Statement

Builder-Reviewers can recognize visual problems in agent-produced interfaces quickly, but converting what they see into precise natural-language instructions is slow and lossy. Screenshots, prose, DOM selectors, and disconnected annotations often fail to preserve which visible target the human meant, how multiple targets relate, which artifact revision was reviewed, or whether the next agent revision actually satisfied the intent.

Existing tools prove demand for visual feedback, browser annotation, canvas manipulation, and MCP handoff, but these capabilities are fragmented. Many polished experiences are closed or vertically integrated. Open alternatives commonly stop at transmitting comments, screenshots, DOM context, or canvas objects. They do not consistently connect visible intent to editable source, survive revisions with explicit confidence, distinguish delivery timing during an active agent session, and retain human verification as the completion condition.

The Builder-Reviewer needs a fast, local-first Visual Direction Loop that works with an already-connected agent. It must let the human identify and relate visible targets without technical vocabulary, deliver that intent at a deliberate time, and verify the result without depending on a specific agent host or general-purpose canvas product.

## Solution

Build a polished Proof Product for reviewing and redirecting web interfaces that an agent has just built or modified.

The product opens saved HTML or a supported local running application in an independent browser review surface, with an embedded MCP App experience where the host supports it. The Builder-Reviewer explores the application normally, enters an explicit interaction mode, selects elements, text ranges, regions, or multiple targets, and expresses written, relational, or limited direct-manipulation intent.

Every submission becomes a versioned Visual Intent Envelope containing artifact and revision identity, visible target evidence, available Source Provenance, spatial and semantic context, desired transformation and constraints, delivery intent, and explicit uncertainty. Visual manipulation creates a reversible Intent Preview; it never directly mutates authoritative source.

The envelope travels through ordinary MCP tools to any conforming host. Optional host capabilities progressively add embedded UI, active-turn steering, subscriptions, or richer lifecycle behavior. Product-owned Draft and Next-Pass states remain durable across hosts. A local browser fallback preserves the complete interaction when embedded UI is unavailable.

After the agent changes the source, the product observes a new artifact revision, resolves the original targets, exposes whether each resolution is exact, recovered, ambiguous, stale, or deleted, and presents the result for human verification. Agent acknowledgement or a source change does not complete the intent; only the Builder-Reviewer can approve, reject, supersede, or mark it obsolete.

V0 supports Artifact Mode for saved or generated HTML and Application Mode for a local React/Vite application. Generic Rendered Grounding remains useful without instrumentation, while a narrow application adapter supplies stronger Source Provenance. The product owns its interaction model and uses the smallest purpose-built browser layer needed; it does not depend on tldraw or another general-purpose canvas SDK.

## User Stories

1. As a Builder-Reviewer, I want to open an agent-produced HTML artifact from my agent session, so that I can inspect it without manually configuring a separate review workflow.
2. As a Builder-Reviewer, I want to open a local running application, so that I can review the interface in its realistic interactive state.
3. As a Builder-Reviewer, I want the artifact to become usable quickly, so that visual review does not interrupt my creative flow.
4. As a Builder-Reviewer, I want to browse and interact with the application normally in Explore mode, so that I can reach the state I need to review.
5. As a Builder-Reviewer, I want entering Select or Direct mode to be obvious and reversible, so that I never confuse reviewing the application with operating it.
6. As a Builder-Reviewer, I want hovered targets to respond immediately, so that the review surface feels precise and trustworthy.
7. As a Builder-Reviewer, I want to select a visible element, so that I can direct the agent without describing its location in prose.
8. As a Builder-Reviewer, I want to select an exact text range, so that my direction is attached to the words I mean rather than a broad container.
9. As a Builder-Reviewer, I want to mark a visible region when no semantic element is suitable, so that I can still express spatial intent.
10. As a Builder-Reviewer, I want to select multiple targets, so that I can express one relationship or transformation across them.
11. As a Builder-Reviewer, I want the current selection to remain visually clear while I write, so that I do not lose the target of my thought.
12. As a Builder-Reviewer, I want to attach written direction to selected targets, so that visual grounding and semantic explanation reinforce each other.
13. As a Builder-Reviewer, I want to attach supporting references, so that I can demonstrate the desired appearance or behavior when words are insufficient.
14. As a Builder-Reviewer, I want to express that targets should align, so that I do not need to describe CSS or coordinates.
15. As a Builder-Reviewer, I want to express ordering among targets, so that the agent understands which item should precede or follow another.
16. As a Builder-Reviewer, I want to express spacing relationships, so that the agent understands the intended rhythm without arbitrary pixel instructions.
17. As a Builder-Reviewer, I want to express containment, so that the agent knows that an item belongs inside a particular visible group.
18. As a Builder-Reviewer, I want to express equivalence, so that the agent knows two targets should share a visible property or behavior.
19. As a Builder-Reviewer, I want to request that one target match another target's size, so that I can communicate comparative intent directly.
20. As a Builder-Reviewer, I want to drag a reversible proxy to propose a new order, so that I can demonstrate the arrangement I mean.
21. As a Builder-Reviewer, I want to preview alignment and size relationships before sending them, so that I can correct my own intent first.
22. As a Builder-Reviewer, I want visual manipulation to leave source unchanged, so that experimentation is safe and reversible.
23. As a Builder-Reviewer, I want the product to preserve the visible relationship I requested rather than only raw coordinates, so that the agent can choose an appropriate responsive implementation.
24. As a Builder-Reviewer, I want to understand what evidence identifies my target, so that I can judge whether the agent will receive enough context.
25. As a Builder-Reviewer, I want Rendered Grounding and Source Provenance to be labelled distinctly, so that a DOM match is not mistaken for an exact source location.
26. As a Builder-Reviewer, I want ambiguity to be visible before submission, so that I can refine a target instead of sending misleading evidence.
27. As a Builder-Reviewer, I want the system to abstain from claiming a source location when evidence is weak, so that confidence is earned rather than implied.
28. As a Builder-Reviewer, I want to save incomplete direction as Draft Intent, so that composing it does not affect the agent prematurely.
29. As a Builder-Reviewer, I want to send Steering Intent while an agent is working when the host supports it, so that I can redirect work that is heading in the wrong direction.
30. As a Builder-Reviewer, I want honest language about when steering will take effect, so that I do not assume an active command was cancelled instantly.
31. As a Builder-Reviewer, I want to retain direction as Next-Pass Intent, so that additive changes wait for a clean subsequent turn.
32. As a Builder-Reviewer, I want to request a Review Interruption explicitly, so that disruptive stopping is never accidental.
33. As a Builder-Reviewer, I want to see whether intent is local, accepted by the host, acknowledged by the agent, or implemented, so that transport state is not confused with completion.
34. As a Builder-Reviewer, I want my Draft and Next-Pass Intent to survive a process restart, so that a tool failure does not discard my work.
35. As a Builder-Reviewer, I want a refreshed artifact to appear promptly after the agent saves changes, so that iteration feels continuous.
36. As a Builder-Reviewer, I want the product to resolve my original targets in the new revision, so that I can review the same intended subject after surrounding changes.
37. As a Builder-Reviewer, I want to know whether target resolution was exact, recovered, ambiguous, stale, or deleted, so that I can interpret the comparison safely.
38. As a Builder-Reviewer, I want to compare the requested intent with the resulting revision, so that verification requires little navigation or memory.
39. As a Builder-Reviewer, I want to approve a satisfactory result, so that the intent becomes Verified Intent.
40. As a Builder-Reviewer, I want to reject a result and request another pass, so that unsatisfactory work remains open with its context intact.
41. As a Builder-Reviewer, I want to supersede outdated direction, so that a newer decision can replace it without erasing history.
42. As a Builder-Reviewer, I want to mark intent obsolete when the underlying requirement disappears, so that deletion or changed direction is not misrepresented as success.
43. As a Builder-Reviewer, I want the review surface to preserve state through reloads and recoverable failures, so that reliability supports rather than interrupts the direction loop.
44. As a Builder-Reviewer, I want clear keyboard, focus, and accessibility behavior, so that the review layer does not make the underlying application harder to operate.
45. As a Builder-Reviewer, I want a local-first workflow, so that private application content is not implicitly uploaded to another service.
46. As a Builder-Reviewer, I want to see what evidence will leave my machine, so that I can make an informed privacy decision before delivery.
47. As a Builder-Reviewer, I want saved HTML to retain its local styles, images, fonts, and scripts where safely possible, so that I review a faithful artifact.
48. As a Builder-Reviewer, I want a browser fallback when my agent host cannot embed MCP Apps, so that host limitations do not block the workflow.
49. As a Builder-Reviewer, I want the product to work with any conforming MCP agent at baseline, so that I am not locked into one vendor.
50. As a Builder-Reviewer, I want baseline MCP delivery designed to work on any conforming host, so that validating on pi gives confidence other hosts can connect. A published Certified Experience matrix is deferred past Personal Proof.
51. As an agent, I want one clearly described entry tool, so that I can open visual direction when the user's intent would be lossy in prose.
52. As an agent, I want a structured Visual Intent Envelope, so that I receive targets, relationships, evidence, constraints, revision identity, and uncertainty without reverse-engineering a screenshot.
53. As an agent, I want implementation-neutral intent rather than simulated CSS edits, so that I can choose a source change consistent with the application's architecture.
54. As an agent, I want exact Source Provenance when available, so that I can navigate to editable code with less search and guessing.
55. As an agent, I want Rendered Grounding when Source Provenance is unavailable, so that visual direction remains useful without pretending to be exact.
56. As an agent, I want stale or ambiguous envelopes identified before acting, so that I do not confidently modify the wrong target.
57. As an agent, I want to acknowledge intent without marking it verified, so that implementation status and human acceptance remain distinct.
58. As an agent, I want a thin optional Skill describing when and how to use the Visual Direction Loop, so that I can invoke it proactively without duplicating MCP tool contracts.
59. As an application-adapter author, I want a versioned open envelope schema, so that I can add new artifact or framework support without depending on one host.
60. As an application-adapter author, I want canvas- and framework-specific evidence to remain optional extensions, so that the portable contract is not coupled to one rendering engine.
61. As an open-source adopter, I want the complete local Visual Direction Loop under a permissive license, so that I can inspect, modify, and use the trustworthy core without a hosted subscription.
62. As an open-source adopter, I want installation via npm without a Rust toolchain, so that trying the product does not require becoming a contributor. Node is a V0 runtime requirement.
63. As a maintainer, I want a TypeScript-only V0 with a narrow local-authority boundary, so that a Rust daemon can replace the Node runtime later only if measurements demand it.
64. As a maintainer, I want one versioned envelope schema as the contract, so that future Rust and TypeScript types can be generated from it without protocol drift.
65. As a maintainer, I want local lifecycle state to remain independent of optional MCP capabilities, so that host fragmentation cannot lose user intent.
66. As a maintainer, I want target-resolution confidence and abstention measured against controlled mutations, so that reliability claims are reproducible.
67. As a maintainer, I want user-visible latency measured at meaningful boundaries, so that optimization improves the actual experience rather than synthetic computation.
68. As a maintainer, I want startup, idle resource use, and recovery measured in TypeScript, so that a future native runtime must earn its complexity against real numbers.
69. As a maintainer, I want malicious artifact fixtures, so that local-first execution does not obscure the security boundary.
70. As a maintainer, I want baseline delivery validated on pi via pi-mcp-adapter and designed for other conforming hosts, so that portability is real without requiring a multi-host matrix for Personal Proof.
71. As a product builder, I want to compare representative corrections against screenshot-and-chat before optimizing the product, so that improvement has an honest baseline.
72. As a product builder, I want to observe whether I voluntarily choose the product again during dogfood, so that repeat use grounds early UI judgment before any external claim.
73. As a product builder, I want interactions that do not reduce explanation or correction effort removed or deferred, so that capability breadth does not dilute the core experience.
74. As a product builder, I want hosted collaboration and enterprise services separated from the open local core, so that future monetization preserves user trust.

## Implementation Decisions

### Product boundary

- V0 is a Proof Product for reviewing and redirecting web interfaces that an agent has just built or modified.
- The independent local review product is primary. MCP provides discovery and transport; it does not define the domain or own durable review state.
- Blank-canvas planning is a compatible future entry point, not a V0 driver.
- The product owns the Visual Direction Loop, Visual Intent Envelope, target resolution, delivery lifecycle, and human verification.
- The user's project remains the authority for editable source and artifact storage.

### Artifact support

- Artifact Mode supports saved or generated HTML with bounded local asset serving and file-change observation.
- Application Mode supports a local running React/Vite application as the first deeply integrated stack.
- Other browser-rendered applications may receive generic Rendered Grounding but are not promised exact Source Provenance.
- Authenticated production applications, arbitrary private cross-origin applications, and universal framework support are excluded from V0.
- Each opened artifact has a stable identity independent of any particular filesystem spelling or host conversation.
- Every observable content state used for direction has an immutable, content-addressed revision identity computed with BLAKE3 over canonical artifact bytes plus a local asset manifest.

### Interaction model

- Explore mode preserves ordinary page interaction.
- Select mode supports element, text-range, region, and multi-target selection.
- Direct mode experiments with a deliberately small set of Intent Previews: drag-to-reorder, align, and match size. Each preview is guilty until proven and is removed unless it reduces explanation or correction effort versus selection plus text.
- Written direction and supporting references can accompany any selected target set.
- Relational Intent represents ordering (before, after, inside), alignment (left, center, right, top, middle), spacing (equal gap, preserved rhythm), containment (visual group membership), equivalence (shared visible property or behavior), and comparative sizing (same width, same height) without requiring CSS vocabulary.
- Intent Previews are reversible visual proposals. They do not mutate the DOM or authoritative source.
- The envelope stores implementation-neutral desired relationships and constraints rather than treating raw pixel displacement as the requested implementation.
- The first implementation uses the smallest product-owned browser overlay necessary for these interactions.
- No general-purpose canvas SDK or canvas-native record format is a required dependency.
- New drawing or manipulation primitives must demonstrate user value not adequately covered by selection, relationships, references, and text.

### Visual Intent Envelope

- The envelope is a product-owned, versioned, experimental open schema rather than an asserted standard.
- The portable envelope includes artifact identity, content-addressed artifact revision, one or more target descriptions, semantic and spatial evidence, Rendered Grounding, available Source Provenance, desired transformation, constraints, relationships, human direction, references, delivery intent, and confidence state. CSS selectors, bounding boxes, and screenshots are evidence, not portable identity.
- Canvas-, host-, browser-, and framework-specific records may appear as optional evidence extensions but cannot become required portable semantics. The envelope is designed artifact-neutral so future adapters can add artifact types without breaking the core.
- Schema evolution defines version identification, validation, backward compatibility expectations, migrations, and conformance fixtures before any stable release.
- TypeScript domain types are generated from the schema in V0. The schema preserves the option to generate compatible Rust types later without protocol drift.
- MCP wire types remain outside the envelope and core domain model.

### Grounding, provenance, and resolution

- Rendered Grounding identifies visible targets without claiming knowledge of editable source.
- Source Provenance is a stronger evidence level supplied only when an instrumented adapter (Vite plugin plus source map plus stable runtime identity) identifies the editable component and source span as file, line, column, and component.
- Provenance Confidence is explicit and visible to both the Builder-Reviewer and agent.
- Inferred source locations are never presented as exact facts.
- Target identity uses multiple independent anchors where available, including semantic role and accessible name, text evidence, structural context, geometry, stable runtime identity, and source evidence.
- Re-resolution never silently selects an uncertain target.
- Resolution outcomes include exact, recovered, ambiguous, stale, and deleted.
- A mutation benchmark is built early to measure recovery and false confidence under controlled artifact changes.

### Delivery and lifecycle

- Draft Intent is stored locally and has no agent-side effect.
- Steering Intent requests amendment of active work at the next safe boundary supported by the host and does not promise immediate cancellation.
- Next-Pass Intent remains in a product-owned durable queue until a later implementation turn.
- Review Interruption is an explicit disruptive action and is shown only where it can be represented honestly.
- Host acceptance, agent acknowledgement, source modification, and human verification are separate lifecycle events.
- Delivery operations are idempotent and carry stable identifiers so retries cannot create silent duplicate intent.
- The local state model, not an MCP Task, is authoritative for sessions, revisions, queued envelopes, acknowledgements, and verification.
- MCP Tasks, subscriptions, and similar capabilities are progressive enhancements rather than V0 dependencies.
- State transitions and delivery history survive process restart and can be reconstructed.

### Verification

- A delivered envelope cannot become Verified Intent solely through agent acknowledgement or observed source modification.
- The resulting artifact revision is associated with the originating envelope and its prior revision.
- Original targets are re-resolved against the resulting revision before verification is offered.
- The Builder-Reviewer can approve, reject, request another pass, supersede, or mark intent obsolete.
- Verification history is retained and survives restart.
- Ambiguous, stale, and deleted targets remain visible and require explicit human disposition. Deleted targets block approval. Ambiguous targets show candidates and never auto-resolve. A revision advance before delivery marks the envelope stale and re-resolves targets rather than silently attaching to a new revision.

### MCP and host integration

- One model-visible entry tool opens or resumes the Visual Direction Loop.
- Most interface mechanics remain application-only rather than expanding the model-visible tool surface.
- Tool names, descriptions, structured input, structured output, and errors are sufficient for explicit invocation without a Skill.
- A thin optional Skill teaches proactive invocation, host fallback, delivery timing, and verification behavior without duplicating tool schemas.
- Ordinary MCP tools provide Baseline Compatibility for conforming hosts.
- MCP Apps provide the embedded view when host capabilities permit.
- A local browser provides the complete fallback experience when the host cannot embed the view.
- Host capabilities are negotiated and unsupported behavior degrades with explicit labels.
- Baseline delivery is designed to work on any conforming host, including codex, claude code, and opencode. V0 is validated on pi via pi-mcp-adapter. A published Certified Experience matrix is deferred past Personal Proof and, when it exists, names exact host versions tested without restricting other agents from connecting.

### Runtime and language boundaries

- V0 is TypeScript-only to maximize learning speed at browser and MCP App boundaries.
- TypeScript owns the browser UI, DOM interaction layer, MCP App View, React/Vite provenance adapter, local server, MCP server, files and assets, revision state, durable persistence, and recovery.
- The local-authority boundary (files, revisions, envelopes, persistence, delivery) stays narrow so a Rust daemon can replace the Node runtime later only if startup, memory, install, or reliability measurements demand it.
- V0 is distributed via npm and requires Node. No Rust toolchain is required. Single-binary distribution is deferred.
- A future Rust boundary would be justified by safe filesystem behavior, process lifecycle, bounded resource use, startup, recovery, and native distribution rather than browser-rendering or model-speed claims.
- MCP Apps and other evolving extensions are isolated behind narrow adapters.

### Local data and security

- The default data plane is local and does not implicitly upload artifacts, screenshots, DOM content, source evidence, or intent.
- The UI discloses the evidence included before an envelope leaves the machine.
- The local service binds to loopback by default.
- Sessions use unguessable, scoped capabilities rather than unauthenticated broad local access.
- Host and Origin validation protect the local server from browser-based rebinding and cross-origin abuse.
- Rendered artifacts run under a restrictive sandbox and content-security policy appropriate to the selected mode.
- File access uses canonical path confinement and treats symlinks explicitly.
- Asset, request, response, and body sizes are bounded.
- Remote network access from reviewed artifacts is explicit and observable rather than silently included in a local-first claim.
- The repository publishes SECURITY.md with disclosure process, threat model, and supported versions. Telemetry defaults to off. Dependencies are audited. SBOMs, reproducible builds, attestations, and fuzz testing are deferred past Personal Proof.
- Security behavior is tested with intentionally malicious artifacts before the Proof Product is considered complete.

### Persistence and recovery

- Sessions, artifacts, revisions, envelopes, lifecycle events, and verification outcomes are persisted locally.
- Persistence supports idempotent replay and reconstruction of current state.
- Process, browser, or connection interruption does not silently consume or discard intent.
- Corrupt or incompatible state fails visibly and preserves recoverable source data.

### Distribution and openness

- The envelope schema, local runtime, browser UI, MCP tools, target-resolution benchmark, and initial adapters form a permissively licensed open-source core.
- Production use of the core does not depend on a proprietary general-purpose canvas license.
- V0 releases ship as an npm package plus MCP configuration and thin Skill in one installable plugin, published via npm, GitHub, and the MCP Registry. Node is required.
- Signed binaries, platform matrices, and binary launchers are deferred until a native runtime is justified.
- Potential commercial services may provide hosted collaboration, managed sharing, organizational policy, analytics, identity, and supported enterprise integrations.
- The local direction loop is not functionally crippled to create a paid tier.

### Product quality and completion

- UI/UX superiority is evaluated across invocation, artifact readiness, pointer feedback, mode clarity, relational expression, visible uncertainty, delivery-state clarity, agent acknowledgement, verification navigation, and failure recovery.
- User-visible latency is measured at product boundaries rather than inferred from implementation language.
- Personal Proof includes Artifact Mode, React/Vite Application Mode, selection plus relations plus experimental previews, the versioned envelope, MCP baseline delivery, browser fallback, durable Draft and Next-Pass lifecycle, honest steering labels, resolution with abstention, restart recovery, and baseline comparison evidence.
- The builder uses the product repeatedly on real corrections and records time to accepted correction, clarification turns, and failure modes before generalizing its value.
- Broad user-value claims, five independent Builder-Reviewers, and the Certified Experience matrix are deferred past Personal Proof.
- A technical-breakthrough claim is not required for release or product success.

## Testing Decisions

### Primary seam

- The primary test is one black-box Visual Direction Loop exercised through the public MCP entry tool and browser UI against a controlled web artifact.
- The test opens the artifact, performs visible target selection, creates and delivers intent, introduces a resulting artifact revision, re-resolves the targets, and completes or rejects the intent through human verification controls.
- Assertions observe only public outcomes: visible UI state, emitted Visual Intent Envelope, MCP results, persisted lifecycle state after restart, resolution status, and verification outcome.
- The primary seam must not depend on private component state, internal database layout, implementation-specific event ordering, or CSS selectors owned only by the test.
- This is a new seam because the repository is currently documentation-only and contains no existing product test harness.

### Contract seams kept below the primary seam

- Schema conformance tests validate supported envelope versions, required semantics, extension preservation, invalid inputs, and migrations.
- MCP adapter contract tests validate Baseline Compatibility, structured results, idempotency, capability negotiation, browser fallback, and honest degradation when optional features are absent.
- Artifact adapter contract tests exercise both saved HTML and React/Vite Application Mode through the same artifact, revision, grounding, and provenance interface.
- Persistence contract tests restart the process at every lifecycle boundary and assert externally visible recovery without inspecting storage representation.
- Security boundary tests exercise local URLs, origins, capability scopes, canonical paths, symlinks, asset limits, sandbox restrictions, and outbound-evidence disclosure.

### Target-resolution benchmark

- Fixtures include unique elements, repeated siblings, nested components, text ranges, responsive layouts, generated class names, and targets with and without Source Provenance.
- Mutations include sibling reorder, wrapper insertion, unrelated text edits, class changes, target movement, component replacement, responsive reflow, target deletion, and deliberately ambiguous duplication.
- Measure exact resolution, recovered resolution, correct ambiguity, correct stale/deleted detection, confidently wrong resolution, and resolution latency.
- A good resolver test rewards abstention when evidence cannot distinguish candidates; it does not force every case into a match.
- Earlier targets of at least 95% correct resolution and under 1% confidently wrong remain local regression signals during Personal Proof, not release gates or marketing requirements.

### Interaction and accessibility tests

- Exercise Explore, Select, and Direct mode transitions through user-visible controls and keyboard behavior.
- Verify that application controls work in Explore mode and cannot be accidentally activated through Select or Direct interactions.
- Verify element, text-range, region, and multi-target selection under scroll, zoom, responsive reflow, and overlapping layers.
- Verify the reorder, align, and match-size Intent Previews are reversible and leave authoritative source unchanged.
- Verify each Intent Preview produces implementation-neutral relational semantics rather than only fixed pixel coordinates.
- Test keyboard navigation, focus restoration, screen-reader labels, reduced motion, contrast, target indication, error messaging, and mode escape behavior.
- Include visual regression coverage for the product-owned review chrome, while keeping behavioral assertions independent of incidental pixel differences.

### Delivery and verification tests

- Exercise Draft, Steering, Next-Pass, and Review Interruption behavior through hosts with different declared capabilities.
- Verify the UI distinguishes locally queued, host-accepted, agent-acknowledged, source-modified, and human-verified states.
- Verify repeated delivery and reconnect operations are idempotent.
- Verify unsupported steering never masquerades as active-turn steering and retains the intent safely.
- Verify an acknowledgement cannot create Verified Intent.
- Verify approval, rejection, another pass, supersession, and obsolescence retain the original and resulting revisions.
- Verify ambiguous, stale, and deleted targets remain visible and require explicit human disposition.

### Reliability and performance tests

- Interrupt the local runtime, browser, MCP connection, file watcher, and host connection at meaningful lifecycle boundaries, then verify no acknowledged user intent is lost or silently duplicated.
- Test large DOMs, many simultaneous targets, large local assets, rapid consecutive saves, and repeated revision changes.
- Measure invocation-to-ready, pointer-to-feedback, save-to-refresh, submit-to-host-acceptance, revision-to-resolution, server startup, idle memory, and recovery time.
- Compare representative end-to-end correction tasks with the recorded screenshot-and-chat baseline, including envelope bytes versus chat baseline as a token-efficiency signal.
- Performance measurements use reproducible fixtures, platform metadata, warm/cold distinctions, and percentile distributions rather than isolated best-case samples.

### Compatibility tests

- Validate ordinary MCP tool delivery on pi via pi-mcp-adapter. Design baseline delivery to work on other conforming hosts such as codex, claude code, and opencode.
- Test the embedded MCP App only where the host declares and implements the necessary capability. Expect browser fallback as the primary V0 experience on pi.
- Test the local browser fallback as a first-class experience rather than an emergency path.
- Defer the second-host gate and published host-and-version matrix past Personal Proof.

### Human evaluation

- The builder repeatedly uses the product to review and improve its own interface and records baseline comparisons.
- Five independent Builder-Reviewers on their own small applications are deferred past Personal Proof.
- Observe time to accepted correction, clarification turns, targeting failures, rejected revisions, setup and recovery friction, and voluntary repeat use.
- Preference and qualitative feedback inform UI judgment, but behavioral evidence supports any generalized user-value claim.
- Interactions that do not reduce explanation effort, correction time, or outcome clarity are removed, simplified, or deferred.

### Prior art

- There are no existing implementation tests in this greenfield repository to reuse.
- Competitive behavior provides benchmark cases rather than test code: Lavish for local HTML review, MarkLayer for lifecycle, Lens for framework context, `annotate-mcp` for re-anchoring and missing targets, Figma Code Connect for source provenance, and integrated agent products for interaction polish.
- MCP conformance suites and official MCP App examples should be used at protocol boundaries where applicable, while the product's primary black-box seam remains authoritative for the complete experience.

## Out of Scope

- Blank-canvas planning as a primary workflow.
- A general-purpose infinite canvas, whiteboard, or design editor.
- A mandatory tldraw, Excalidraw, or other canvas SDK dependency.
- Unrestricted freehand drawing, arbitrary shape creation, and general diagram editing.
- Direct visual mutation of application source or the live DOM as the authoritative implementation.
- Automatic redesign, autonomous design recommendations, or generative design systems.
- Mermaid-specific editing.
- Documents, slides, PDFs, images, video, native desktop UI, or mobile application artifacts in V0. These remain future adapter candidates for the artifact-neutral envelope.
- Multiple deeply instrumented frontend frameworks in V0.
- Guaranteed Source Provenance for arbitrary browser applications.
- Authenticated production websites and arbitrary cross-origin private applications.
- Cloud artifact hosting, public sharing, multiplayer review, team workspaces, accounts, organizations, permissions, analytics, and billing.
- Enterprise identity, policy management, and managed integrations.
- A proprietary artifact format.
- Mandatory MCP Tasks, subscriptions, or active-turn steering.
- A guarantee that every MCP host provides the same embedded or steering experience.
- Replacing the user's source control, project storage, agent host, or development environment.
- Requiring end users to install Rust or a compiler toolchain. Node is required in V0.
- Marketing the product as a new standard or technical breakthrough before independent evidence exists.
- A published Certified Experience matrix, multi-host certification, SBOMs, reproducible builds, attestations, fuzz testing, and signed binaries in V0.
- Optimizing synthetic benchmarks that do not affect the user-visible Visual Direction Loop.

## Further Notes

- Product priority is, in order: demonstrate product and engineering prowess, earn open-source adoption, preserve a credible path to monetization, and explore technical breakthrough potential.
- Superior UI/UX and capability are sufficient reasons to build the product. Research thresholds are engineering signals, not mandatory public claims.
- The most important early comparison is not feature count. It is whether a Builder-Reviewer chooses this workflow over screenshot-and-chat for a visually grounded correction.
- The recommended build order is: record the baseline; prove the smallest TypeScript loop; add React/Vite Application Mode; build the mutation benchmark; add the three experimental Intent Previews; add durable delivery and host adapters; validate on pi; then dogfood against the baseline. A Rust runtime returns only if measurements demand it.
- The Visual Intent Envelope should be published as experimental and versioned early enough for independent adapters, while avoiding the language of standardization until multiple implementations exist.
- The full local direction loop should remain permissively open. Future monetization should attach to services around the core rather than weaken privacy, provenance, reliability, or verification.
- The central strategic risk is building an attractive annotation tool with MCP attached. Relational Intent, revision identity, confidence-bearing target resolution, durable delivery semantics, and human verification must therefore exist in the first coherent slice rather than being deferred as platform work.
- The long-term north star remains an artifact-neutral envelope with per-type resolvers. A CLI fallback for non-MCP agents remains a documented principle but is not a V0 deliverable. A pixel and semantic diff engine is deferred; V0 keeps revision-aware comparison with explicit resolution status.
