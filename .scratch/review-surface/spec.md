# Review Surface: annotations, fidelity, and craft

Status: ready-for-agent

Supersedes the interaction and presentation portions of
`.scratch/visual-intent-layer/spec.md`. The domain model, envelope contract,
delivery lifecycle, resolution semantics, security posture, and distribution
decisions there remain in force except where this document amends them.

## Problem Statement

A Builder-Reviewer who opens the Visual Intent Layer's Review Surface finds a
product that does not work and does not look like a product.

The agent hands them a URL which they must copy into a browser themselves. Once
there, the artifact renders stripped of its styling: local images and stylesheets
resolve to nothing, and the fonts, stylesheets and images that agent-generated
HTML normally loads from a CDN are blocked outright. Nothing in the surface
responds — hover does not highlight, clicking a tool does nothing, nothing can be
selected and nothing can be sent — because the surface's own JavaScript never
executes; a module in the served asset graph returns 404 and the whole module
graph fails to load. What remains is a single column of form fields — mode
buttons, an evidence card, a six-by-fifteen relation builder, one shared
textarea, a delivery selector, a disclosure, a submit button and five verdict
buttons — rendered on an undesigned default dark canvas.

The consequence is that the Builder-Reviewer cannot complete the Visual
Direction Loop at all, and that every judgment made about this interface so far,
including its own dogfood and preview verdicts, was made against a surface whose
JavaScript never ran.

## Solution

Turn the Review Surface into a product the Builder-Reviewer chooses to open.

Opening one session opens the browser by itself. The artifact renders faithfully
enough to be reviewed as designed, and the Builder-Reviewer can operate it
normally. Working over it, they select one target, several targets, a text range
or a drawn region, and **annotate** each in a card that opens next to the thing
they clicked rather than in a distant form. Each Annotation is a durable local
object: it accumulates in a queue, can be sent while the agent is still working,
and is verified on its own later. Relations such as alignment, order, spacing,
containment, equivalence and comparative size are expressed by manipulating the
targets directly and are shown back as one plain sentence.

The surface has two states and no more. **Review** is where annotations are
composed and queued. **Verify** is where the resulting artifact revision is
compared against the annotations and each one is individually approved, rejected,
retried, superseded or marked obsolete. The surface always states truthfully
whether an agent is waiting, whether the artifact has moved on since an
annotation was written, and how confident it is that it found the same target —
and it abstains rather than guessing.

The surface is built on a stated design contract with a live token and component
gallery, so that its visual language is a decision rather than an accident.

## User Stories

### Opening and readiness

1. As a Builder-Reviewer, I want the review surface to open in my browser when a session starts, so that I never have to copy a URL out of an agent's output.
2. As a Builder-Reviewer, I want the URL printed as well as opened, so that I can recover it when the browser opens the wrong place or I am on another machine.
3. As a Builder-Reviewer, I want a way to suppress automatic opening, so that headless, remote and scripted use does not launch a browser window.
4. As a Builder-Reviewer, I want an already-open tab for the same artifact revision to be reused rather than duplicated, so that I do not accumulate tabs during a single review.
5. As a Builder-Reviewer, I want the artifact to become usable as fast as possible, so that visual review does not interrupt my flow.

### Artifact fidelity

6. As a Builder-Reviewer, I want a saved HTML artifact's own local stylesheets, images, fonts and scripts to load, so that I review the thing that was actually built rather than a stripped skeleton.
7. As a Builder-Reviewer, I want the artifact's declared remote stylesheets, fonts and images to load, so that an artifact that depends on a CDN renders the way its author intended.
8. As a Builder-Reviewer, I want to be told when the artifact will contact a remote origin, before it does, so that I can decline rather than learn about it afterwards.
9. As a Builder-Reviewer, I want the artifact's own scripts to run, so that interactive states, animations and client-rendered content behave as they do in production.
10. As a Builder-Reviewer, I want an artifact that fetches data at runtime to fail visibly and locally rather than silently reaching the network, so that a local-first claim stays true.
11. As a Builder-Reviewer, I want a running local application to be reviewed through the same surface as saved HTML, so that I do not have to learn two products.
12. As a Builder-Reviewer, I want a running local application's own DOM to be selectable, so that Application Mode is as capable as Artifact Mode.
13. As a Builder-Reviewer, I want to review an artifact whose surface has scrolled, reflowed or animated into the state I care about, and have that state captured as evidence, so that I am directing the layout I was actually looking at.

### The surface itself

14. As a Builder-Reviewer, I want the artifact to occupy the majority of the surface, so that reviewing is the primary activity and chrome is secondary.
15. As a Builder-Reviewer, I want the surface to have exactly two states, Review and Verify, so that I am never unsure which activity I am in.
16. As a Builder-Reviewer, I want a single visible switch between exercising the artifact and reviewing it, so that accidental clicks cannot activate application controls while I am selecting.
17. As a Builder-Reviewer, I want native application controls to remain operable without switching state, so that a form or a disclosure does not need a special mode merely to be operable.
18. As a Builder-Reviewer, I want the tool row to be visible only where tools are meaningful, so that Verify is not cluttered with selection tools.
19. As a Builder-Reviewer, I want to see which artifact and which revision I am reviewing at all times, so that I never mistake a stale view for a current one.
20. As a Builder-Reviewer, I want rare or dangerous controls kept out of the primary surface, so that the common path stays uncluttered.

### Selecting

21. As a Builder-Reviewer, I want hovered targets to respond immediately with a clear outline, so that pointing feels precise and trustworthy.
22. As a Builder-Reviewer, I want to select a single visible element, so that I can direct the agent without describing a location in prose.
23. As a Builder-Reviewer, I want to select an exact text range, so that my direction attaches to the words I mean rather than to a broad container.
24. As a Builder-Reviewer, I want to draw a region with the pointer, so that I can direct something that is not a single element — a group, a gap, an area, a piece of imagery.
25. As a Builder-Reviewer, I want to select several targets in one annotation, so that I can express one change across them.
26. As a Builder-Reviewer, I want my current selection to stay visibly marked while I write, so that I do not lose the target of my thought.
27. As a Builder-Reviewer, I want to remove the last target or clear the selection without losing my note, so that correcting a mis-click is cheap.
28. As a Builder-Reviewer, I want selection to work under scroll, at any zoom, and with overlapping layers, so that I can review a realistic page rather than a simple one.
29. As a Builder-Reviewer, I want a region selection to record the revision and scroll position it was drawn at, so that it cannot be applied to a layout I never saw.
30. As a Builder-Reviewer, I want unambiguous, non-technical labels for selected targets, so that I can tell what the agent received without reading selectors.

### Annotating

31. As a Builder-Reviewer, I want a note editor that opens next to the target I selected, so that my writing stays attached to the thing I am thinking about.
32. As a Builder-Reviewer, I want to write independent notes on several targets, so that one annotation does not force a single shared explanation.
33. As a Builder-Reviewer, I want to attach a reference image to an annotation, so that I can show a desired appearance instead of describing it.
34. As a Builder-Reviewer, I want my unsent note to survive a reload, a crash, or a browser restart, so that a failure never costs me my thinking.
35. As a Builder-Reviewer, I want the surface to never discard unsent text, including on Escape, so that a keypress cannot destroy my work.
36. As a Builder-Reviewer, I want to be told when a note could not be restored because its target disappeared, and to still have the text, so that a lost target is not a lost thought.
37. As a Builder-Reviewer, I want to delete an annotation before sending, so that I can abandon a direction without a trace.
38. As a Builder-Reviewer, I want to reorder how annotations will be presented to the agent, so that I can express priority or sequence where it matters.
39. As a Builder-Reviewer, I want to express that two or more targets should align, so that I do not have to describe CSS or coordinates.
40. As a Builder-Reviewer, I want to express order among targets, so that the agent knows what should precede or follow what.
41. As a Builder-Reviewer, I want to express spacing between targets, so that intended rhythm is communicated without arbitrary pixel instructions.
42. As a Builder-Reviewer, I want to express containment, so that an item is understood to belong inside a particular visible group.
43. As a Builder-Reviewer, I want to express that two targets should share a visible property, so that equivalence does not need to be spelled out.
44. As a Builder-Reviewer, I want to request that one target match another's width or height, so that comparative intent is directly expressible.
45. As a Builder-Reviewer, I want to create a relation by manipulating the targets themselves, so that expressing a relationship is an act on the artifact rather than a form to fill in.
46. As a Builder-Reviewer, I want a relation shown back to me as one plain sentence, so that I can confirm the agent will receive what I meant.
47. As a Builder-Reviewer, I want a relation to describe a desired relationship rather than a pixel displacement, so that the agent can implement it responsively.
48. As a Builder-Reviewer, I want a proposed manipulation to be reversible and to leave the artifact's source untouched, so that experimenting is safe.
49. As a Builder-Reviewer, I want to preview a relation before it is recorded, so that I can correct my own intent first.

### Queueing and sending

50. As a Builder-Reviewer, I want annotations to accumulate in a queue rather than each one sending immediately, so that I can review several things before interrupting the agent.
51. As a Builder-Reviewer, I want to send the queue while the agent is still working, so that I do not wait for it to finish before correcting it.
52. As a Builder-Reviewer, I want to hold an annotation as a Draft Intent with no agent-side effect, so that composing does not change anything.
53. As a Builder-Reviewer, I want to keep an annotation as Next-Pass Intent, so that additive direction waits for a clean turn.
54. As a Builder-Reviewer, I want to request Steering Intent only where the host can honestly deliver it, so that I am not told an active command was cancelled when it was not.
55. As a Builder-Reviewer, I want each annotation's delivery state shown separately, so that a batch does not hide the state of one item.
56. As a Builder-Reviewer, I want repeated delivery to be idempotent, so that a retry cannot silently duplicate my direction.
57. As a Builder-Reviewer, I want my queue to survive a process restart, so that a crash cannot consume my intent.

### The agent's state

58. As a Builder-Reviewer, I want to know whether my agent is waiting for me right now, so that I know whether sending is urgent.
59. As a Builder-Reviewer, I want to know when my agent has stepped away and my annotations are queued durably instead, so that I am never misled into thinking it is listening.
60. As a Builder-Reviewer, I want agent activity shown as a live state in the surface, so that transport state is never confused with progress.
61. As a Builder-Reviewer, I want agent acknowledgement kept distinct from implementation and from verification, so that I do not mistake acceptance for completion.

### Revising and resolving

62. As a Builder-Reviewer, I want a new artifact revision announced rather than silently loaded, so that I know the thing I was reviewing changed.
63. As a Builder-Reviewer, I want to know whether an annotation was written against the revision currently on screen, so that I never verify against a revision it was not written for.
64. As a Builder-Reviewer, I want my original targets re-resolved in the new revision, so that I can review the same intended subject after surrounding changes.
65. As a Builder-Reviewer, I want each target's resolution reported in a small, non-overlapping vocabulary, so that I can interpret the comparison without learning a taxonomy.
66. As a Builder-Reviewer, I want to be shown candidate targets when a resolution is ambiguous, so that I can choose rather than accept a guess.
67. As a Builder-Reviewer, I want the product to abstain rather than guess, so that confidence is earned and not implied.
68. As a Builder-Reviewer, I want to be told when a target is gone rather than matched approximately, so that a missing element is not disguised as success.
69. As a Builder-Reviewer, I want the resolution vocabulary to distinguish finding my target from knowing its source, so that a DOM match is never presented as an exact source location.

### Verifying

70. As a Builder-Reviewer, I want to compare the artifact before and after the change, so that I can judge the result without relying on memory or a diff tool.
71. As a Builder-Reviewer, I want each annotation's target marked in both the before and after views, so that I can see what changed where I asked.
72. As a Builder-Reviewer, I want to decide each annotation separately, so that one bad result does not force a verdict on the good ones.
73. As a Builder-Reviewer, I want to approve an annotation whose result is satisfactory, so that it becomes Verified Intent.
74. As a Builder-Reviewer, I want to reject an annotation and request another pass with its context intact, so that dissatisfaction is actionable.
75. As a Builder-Reviewer, I want to supersede outdated direction, so that a newer decision replaces an older one without erasing history.
76. As a Builder-Reviewer, I want to mark an annotation obsolete when the requirement disappears, so that deletion is not misrepresented as success.
77. As a Builder-Reviewer, I want approval blocked while a target is unresolved with no match, so that I cannot approve work whose subject cannot be found.
78. As a Builder-Reviewer, I want ambiguous targets to require my explicit choice, so that nothing resolves itself on my behalf.
79. As a Builder-Reviewer, I want to move between the comparison and the list without losing my place, so that verifying several annotations stays quick.
80. As a Builder-Reviewer, I want verification history retained across restarts, so that the record of what I accepted survives a failure.

### Evidence and privacy

81. As a Builder-Reviewer, I want a single place that shows everything leaving my machine before it leaves, so that I can make an informed decision.
82. As a Builder-Reviewer, I want to see which evidence identifies each target, so that I can judge whether the agent has enough context.
83. As a Builder-Reviewer, I want Rendered Grounding and Source Provenance labelled distinctly, so that a DOM match is never mistaken for an exact source location.
84. As a Builder-Reviewer, I want the artifact's outbound network behaviour disclosed, so that fidelity does not quietly cost me privacy.
85. As a Builder-Reviewer, I want a screenshot never to be captured and sent without my explicit opt-in for that annotation, so that images of my work do not leave implicitly.
86. As a Builder-Reviewer, I want the local service bound to loopback with scoped capabilities, so that reviewing is not an open door on my machine.

### Accessibility and craft

87. As a Builder-Reviewer, I want to drive the surface by keyboard, so that I am not forced to the pointer for every action.
88. As a Builder-Reviewer, I want Escape to undo exactly one level of where I am, so that the surface is predictable.
89. As a Builder-Reviewer, I want focus to be able to live in the artifact and in the chrome without being trapped by either, so that native controls stay operable.
90. As a Builder-Reviewer, I want a visible focus indicator on the artifact's own targets, so that I can see what keyboard and pointer targeting agree on.
91. As a Builder-Reviewer, I want the surface to meet WCAG 2.2 AA, so that reviewing is not harder for me than the artifact under review.
92. As a Builder-Reviewer, I want reduced motion respected, so that a state change does not make me motion-sick.
93. As a Builder-Reviewer, I want a genuinely designed dark mode rather than an inverted or default canvas, so that the surface is legible in either appearance.
94. As a Builder-Reviewer, I want every state to carry a non-colour cue, so that meaning does not depend on hue.
95. As a Builder-Reviewer, I want visible text rather than icon-only controls for consequential actions, so that I do not have to guess.

### Design system

96. As a maintainer, I want a normative design contract, so that the surface's visual and interaction language is decided once rather than invented per screen.
97. As a maintainer, I want a live token and component gallery, so that drift is visible immediately rather than discovered months later.
98. As a maintainer, I want the gallery driven by a scripted visual pass, so that token regressions fail loudly.
99. As a maintainer, I want the design contract to be amendable with a recorded amendment, so that changing it is deliberate.
100. As a maintainer, I want the design contract to defer to the platform's accessibility floor and the product's privacy rules, so that visual preference never wins over either.

### Agent-facing contract

101. As an agent, I want one clearly described entry tool, so that I can open visual direction when the user's intent would be lossy in prose.
102. As an agent, I want to receive structured Relational Intent, so that I do not have to infer a relationship from prose.
103. As an agent, I want each Annotation identified, so that I can implement one, report on one, and be verified on one.
104. As an agent, I want a batch of annotations in one delivery, so that one interruption covers several corrections.
105. As an agent, I want to be told when the artifact moved on since an annotation was written, so that I do not act on direction written against an older layout.
106. As an agent, I want unresolved targets with candidates rather than guesses, so that I can choose or ask rather than confidently modify the wrong thing.
107. As an agent, I want to acknowledge without claiming completion, so that implementation status and human acceptance stay distinct.
108. As an agent, I want to wait for the human when my host can hold the call, so that the review feels like a live loop rather than a queue dump.
109. As an agent, I want to hand off cleanly when my host cannot wait, so that the workflow never depends on a capability I lack.
110. As an agent, I want a thin optional Skill, so that I invoke the loop proactively without duplicating tool contracts.

### Reliability and maintenance

111. As a maintainer, I want a browser-driven test of the whole loop, so that a surface which cannot load its own scripts or render its artifact fails CI rather than shipping.
112. As a maintainer, I want the served asset graph asserted reachable, so that the specific defect that produced this rewrite cannot recur silently.
113. As a maintainer, I want the artifact interaction layer to stay dependency-free, so that what runs inside someone else's document stays small and auditable.
114. As a maintainer, I want the shell chrome to use a real component layer, so that focus management, anchored cards and overlays are not hand-rolled repeatedly.
115. As a maintainer, I want existing local state to migrate where the mapping is unambiguous, so that a redesign does not discard a Builder-Reviewer's recorded intent.
116. As a maintainer, I want state that cannot be migrated to fail visibly while preserving the original, so that recovery is always possible.
117. As a maintainer, I want the resolution benchmark's vocabulary updated with the model, so that measurement and meaning do not drift apart.
118. As an open-source adopter, I want the complete local loop still permissively licensed, so that the redesign does not change the openness posture.
119. As an open-source adopter, I want installation to stay a single npm install with Node only, so that trying the product does not require a toolchain.
120. As a Builder-Reviewer, I want no style values to be written by this product, so that the artifact's appearance stays the agent's and the source's business rather than mine to dictate in CSS.

## Implementation Decisions

### Product boundary

- The **Annotation** becomes the human-facing unit of work. It is a durable local object with its own identity, target, note, attachments, relations, delivery state and resolution.
- The **Visual Intent Envelope** is demoted to the portable wire format and the delivery batch. One envelope carries one or more Annotations.
- Verification is per Annotation. A batch verdict is no longer the model.
- The product continues to own the Visual Direction Loop, resolution, delivery lifecycle and verification. MCP remains transport.
- The product never writes style values. No typography, colour, spacing-value, border, shadow or content editors are built. This is a deliberate non-parity with integrated design-mode products and is recorded as a decision rather than an omission.

### Surface architecture

- The Review Surface is a product-owned framed shell around the artifact. An in-page overlay injected into the artifact is rejected for now: it requires a browser extension, weakens the review-state boundary, and contradicts the sandbox decision.
- Host-embedded MCP App presentation is deferred until a host actually supports it. The local browser remains the complete experience, consistent with Baseline Compatibility.
- Two states only: **Review** and **Verify**. The former three-mode model (Explore / Select / Direct) is retired. Direct manipulation is an act available inside Review, not a separate state.
- The Review state presents a tool row: Pointer, Element, Text, Region, Arrange. The Verify state presents comparison and decisions instead.
- Rare and consequential controls live in an overflow menu; state that requires attention lives behind a badge-triggered drawer that is hidden while it has nothing to report.
- The drawer hosts, at minimum: what-leaves-your-machine disclosure, unresolved and ambiguous annotations, and revision change.

### Artifact fidelity

- Saved HTML is served with a base reference injected and relative and root-relative URLs rewritten, so the artifact's own local assets resolve.
- The artifact's per-session content policy permits its declared remote stylesheet, font and image origins while continuing to block runtime data fetches. A local-first claim is preserved by disclosure rather than by blanket denial.
- Remote-origin allowance is disclosed before it takes effect and recorded in the security documentation as an amendment to the local data plane decision.
- Application Mode proxies the local development server through the review service's own origin, so the running application's DOM is selectable rather than cross-origin and opaque.
- Proxy scope is restricted to loopback development origins. Authenticated production applications remain out of scope.
- Region selections record the artifact revision and the scroll position they were drawn at as evidence.

### Opening

- A session opens the default browser itself, on the machine where the service runs, for both the operator command and the agent-facing entry tool.
- Automatic opening is suppressible by flag and by environment variable, and the review URL is always printed.
- Reopening an already-open session for the same artifact revision reuses the existing tab where the platform allows it.
- No browser is launched when no interactive session exists.

### Selection and the artifact interaction layer

- The artifact interaction layer remains dependency-free vanilla TypeScript. It executes inside the artifact document, so it must be small, auditable, and loadable as a single self-contained file rather than through a module graph.
- Selection supports element, exact text range, drawn region and multi-target sets.
- Native application controls remain operable without leaving Review. Custom non-native controls may opt out of targeting explicitly.
- Hover, target marking, marquee and relation guides are drawn in the artifact's own document so they track layout, scroll and reflow.
- The artifact never receives a focus trap.

### Annotation model

- An Annotation is created by selecting targets, is drafted in place next to its target, and enters the queue when queued.
- Attachments are content-addressed by their own bytes rather than by a client-supplied path or name.
- Draft text is persisted as it is typed and is never discarded — not by reload, not by crash, not by Escape, and not by the disappearance of its target.
- A note whose target disappeared is retained visibly rather than dropped.
- Annotations are individually deletable and reorderable before sending.

### Resolution model

The five-outcome vocabulary described in the current glossary is replaced. `exact`, `recovered`, `ambiguous`, `stale` and `deleted` were two overlapping lists that disagreed with each other, and `stale` describes the annotation rather than the target.

Resolution stores two facts and derives the labels humans read:

```
Target resolution   { match: 'exact' | 'recovered' | 'unresolved', candidates: Candidate[] }
Annotation          { revisionRelation: 'current' | 'advanced' }
```

- `exact` means the target was located on evidence that could not plausibly describe another element.
- `recovered` means exactly one target was located on weaker evidence.
- `unresolved` means no single target could be chosen. `candidates` is populated and is never auto-selected.
- `advanced` means the artifact has moved on since the annotation was written. It is a property of the annotation, not of a target.
- Derived labels: Matched, Recovered, Ambiguous (unresolved with candidates), Deleted (unresolved without candidates, which is always the case when the annotation had a target when written), and Stale (annotation-level).
- Provenance confidence remains a separate axis — exact source span, inferred, or unavailable — and never reuses the word "exact" for target resolution in the same view.
- The resolution benchmark keeps measuring correct exact resolution, correct recovered resolution, correct ambiguity, correct abstention and confidently-wrong resolution, with its vocabulary aligned to the model above.

### Relational intent

- Relations are created by direct manipulation on the artifact: reordering, alignment, equal spacing, containment, shared property, and comparative size.
- The relation picker with a type dropdown and an operator dropdown is removed.
- The operator vocabulary is reduced to the relations that have a real gesture: order (before, after), alignment (left, centre, right, top, middle), spacing (equal gap), containment (member of group), equivalence (shared property) and size (same width, same height). Preserved rhythm and shared behaviour retire, and `inside` merges into containment.
- A relation is shown back as one plain sentence and stored as an implementation-neutral relationship, never as a pixel displacement.
- Previews remain reversible and never mutate the artifact's source.

### Delivery and the agent's state

- Draft Intent, Steering Intent and Next-Pass Intent are unchanged as domain concepts. Their presentation moves from a selector into the per-annotation and per-queue surfaces.
- Whether an agent is waiting is **host-determined and always labelled truthfully**. Where the host can hold the call, the surface says the agent is waiting. Where it cannot, the surface says the agent has stepped away and the annotations are queued durably. The product must never require the agent to be waiting.
- Agent position is a live state in the surface: opened, waiting, stepped away, acknowledged, changed the artifact. Delivery status and implementation status remain distinct.
- Idempotent delivery with stable identifiers is preserved.

### Verification model

- Verify presents the artifact with the pre-change and post-change revisions toggleable in place, with each annotation's target marked in both.
- Decisions are per Annotation: approve, reject, another pass, supersede, obsolete.
- Approval is blocked while a target is unresolved without candidates.
- Ambiguous targets require an explicit choice and never resolve themselves.
- Verification history is retained and survives restart.

### Persistence and migration

- Annotations, their drafts, their attachments, their delivery state and their verification outcomes are persisted locally and reconstructible after an unclean stop.
- Existing persisted envelopes are migrated on read where the mapping is unambiguous — one envelope becomes one Annotation per target, carrying the envelope's shared written direction — and are left untouched and reported where it is not.
- State that cannot be read fails visibly with the original bytes preserved rather than being discarded.

### MCP and host contract

- The entry tool opens or resumes a session and may wait for the human where the host allows it, returning the batch when the human sends.
- Annotations carry stable identities through delivery, so an agent can report and be verified per Annotation.
- Acknowledgement, artifact change and human verification remain separate lifecycle events, and acknowledgement still cannot produce Verified Intent.
- The model-visible tool surface stays small; interface mechanics remain application-only.
- The optional Skill is updated to describe invocation, the two states, host-dependent waiting, and that acknowledgement is not completion.

### Design system and craft

- A normative design contract at the repository root states visual and interaction language, token architecture, accessibility floor, and how it is amended. Platform accessibility requirements, privacy rules and consent rules outrank any visual preference in it.
- Primitive tokens (colour, type, spacing, radius, elevation, motion) and semantic roles are separated. Components consume semantic roles, never raw values.
- The visual direction uses a warm-neutral luminous base with one saturated accent reserved for selection and the single primary action. Soft semantic surfaces are reserved for state and never used decoratively.
- Dark mode is designed rather than inherited from the user agent's default canvas.
- A dev-only token and component gallery is served and is driven by a scripted visual pass, so token and state drift fails loudly. It is not part of the product's normal navigation.
- WCAG 2.2 AA is the floor. Every state carries text plus at least one non-colour cue. Reduced motion is respected.

### Keyboard and focus

- A keyboard model covers: toggling Review, selecting each tool, reaching the queue and the composer, and reaching Verify decisions.
- Escape unwinds exactly one level and finally returns focus to the chrome. It never discards unsent text.
- The chrome may trap focus in its own layers; the artifact may not.
- Selected targets carry a visible focus indicator of their own.

### Stack and build

- Two runtimes, deliberately. The shell chrome is built with a component layer and a real bundle step, because anchored cards, drawers, dialogs, focus trapping, escape unwinding and roving tabindex are expensive and bad to hand-roll. The artifact interaction layer stays dependency-free and self-contained.
- The shell chrome uses a styling layer with design tokens; the artifact layer uses none.
- The remaining TypeScript (command-line operator, local service, MCP server, provenance adapter, resolver, persistence) stays as it is, compiled directly.
- The one build script that currently copies the surface by hand is replaced by a real build for the shell plus a self-contained artifact layer.
- Installation remains a single npm install requiring only Node. No additional toolchain is required of an adopter.

### Security amendments

- The local data plane and no-implicit-upload promise are preserved, but the security documentation must record: the artifact may now load its declared remote origins; and local development servers may now be reverse-proxied through the review service's origin.
- Loopback binding, scoped capabilities, host and origin validation, canonical path confinement, bounded sizes and the malicious-artifact fixtures are unchanged.
- Screenshot evidence is never captured implicitly. If it is ever offered, it is explicit and per-annotation.

### Decisions not taken

- In-page overlay injected into the artifact.
- Host-embedded MCP App presentation.
- A freehand pen, highlighter or shape palette.
- Style-value editors of any kind.
- Passive layout-issue detection, deferred but designed-for: the badge drawer is the intended home.
- Shareable read-only links and standalone export.
- In-surface conversation with the agent.
- Voice input.
- Screenshot evidence enabled by default.

## Testing Decisions

### What makes a good test here

A good test asserts only externally observable outcomes: what the artifact renders, what a human can see and do in the served surface, what the agent actually receives, what survives a restart, and what a resolution reports. It must not assert private component state, internal storage layout, implementation-specific event ordering, or DOM structure that only the test relies on. The surface is addressed through accessible roles, labels and visible text rather than test-only hooks, so that a test which passes also means the surface is operable by a human using assistive technology.

The purpose of a good test here is narrower and sharper than usual: this rewrite exists because the surface passed its tests while being unable to run its own code. A test that cannot fail when the product does not load is worse than no test.

### Seams

**One primary seam, and it is a real browser.** The Visual Direction Loop is driven end to end against the locally running service in a real browser engine: the service is started on an ephemeral port, the review URL is loaded, the human path is performed through the DOM the product actually serves, and assertions are made only on public outcomes — the artifact as rendered, the annotations the agent receives, the surface's own state labels, the state after a restart, and the reported resolution.

This replaces the existing primary seam rather than sitting beside it. The existing loop test is re-cut onto the browser path. The reason is specific: the current primary seam builds its payload by importing the surface's own composition module from Node and never executes the surface's scripts, which is exactly why a broken module graph, a blocking content policy, a mis-rewritten asset URL, a cross-origin frame and an overlay coordinate bug were all invisible to it.

**The served asset graph is asserted as a precondition inside that seam**, not as a separate seam: every module reachable from the served shell must load before the human path can be driven at all. This is the single cheapest guard against the specific defect that produced this rewrite.

**Everything else stays below the primary seam** and mostly already exists: envelope schema conformance, MCP adapter contract, artifact adapter contract, persistence restart at lifecycle boundaries, security boundary, resolution unit tests and the mutation benchmark. These are existing seams, not new ones, and they are updated rather than added.

**A new seam is not proposed for the artifact fidelity work.** Base rewriting, content policy and proxying are asserted through the primary seam, because the only claim that matters is that the artifact renders and is selectable in a browser.

### Modules to be tested at the below-seam level

- **Envelope schema validation** — updated for the batch-of-annotations shape and the new resolution record; existing conformance tests extended rather than replaced.
- **Resolution** — updated vocabulary; existing unit tests and the mutation benchmark carry the exactness, recovery, ambiguity and abstention expectations.
- **Persistence** — restart at each lifecycle boundary, now including drafts, attachments and per-annotation verification.
- **Delivery lifecycle** — idempotency, duplicate delivery, acknowledgement versus verification, host-capability degradation.
- **Security boundary** — extended for the reverse proxy scope, the remote-origin policy, and the guarantee that no screenshot is captured implicitly.
- **MCP adapter contract** — updated for the batch, per-annotation identity, and honest degradation when a host cannot wait.

### Prior art

- The existing black-box loop test is the shape to preserve: open, act, deliver, change the artifact, re-resolve, verify, restart.
- The evidence that a browser-driven surface test is the right seam comes from the closest comparable product, whose surface is served as a single self-contained file and whose own test boots the served artifact bundle and drives a real click — the assertion that would have caught this repo's defect.
- Existing security fixture tests for malicious artifacts are the prior art for the fidelity and proxying assertions.
- The mutation benchmark is the prior art for measuring resolution rather than asserting it on a single case.

### Human evaluation

The interaction verdicts recorded for the previous surface — including its dogfood record and its three Intent Preview keep-or-kill judgments — are invalid, because they were recorded against a surface whose scripts did not run. They must be re-recorded after this work, not carried forward.

## Out of Scope

- A general-purpose canvas, whiteboard or infinite-canvas editor.
- Any canvas SDK as a runtime dependency.
- Freehand drawing, highlighter, shape and arrow palettes.
- Writing style values into the artifact or its source: no typography, colour, spacing-value, border, shadow or content editing.
- Direct mutation of the artifact's source or live DOM as the authoritative implementation.
- Automatic redesign, generative design suggestions, or design-system synthesis.
- Host-embedded MCP App presentation.
- In-page overlay injection via browser extension.
- Shareable read-only links, hosted sharing, standalone export and image export.
- In-surface conversation with the agent.
- Voice input.
- Screenshot capture as a default or implicit evidence class.
- Passive layout-issue detection (designed-for, not built here).
- Layout warning inboxes, issue lifecycle and severity triage.
- Authenticated production applications and arbitrary cross-origin private applications.
- Documents, slides, PDFs, images, video, native desktop and mobile artifacts.
- Additional instrumented frontend frameworks beyond the existing one.
- Multiplayer, teams, accounts, organization policy, analytics and billing.
- Windows-specific configuration paths and interactive harness selection.
- A published Certified Experience matrix and multi-host certification.
- SBOMs, reproducible builds, attestations, fuzz testing and signed binaries.
- Replacing the user's source control, project storage, agent host or development environment.
- Marketing claims of a new standard or a technical breakthrough.

## Further Notes

### Risks

The recorded central strategic risk is becoming an attractive annotation tool with MCP attached, and this spec deliberately adds annotation as a first-class object, which is exactly that shape. It is not that product only while all four of the following stay true: relational intent is the input method rather than prose, revision identity and confidence are the visible spine of the surface, human verification is the completion condition, and the product never writes style values. If any of them stops being true, the differentiation has been traded for parity.

The second risk is that adopting a component layer and a bundle step is mistaken for the redesign. The stack is a consequence of an inventory of primitives — anchored cards, drawers, dialogs, listboxes, focus trapping, roving tabindex — not a preference. If the stack changes, the inventory does not.

The third risk is that fidelity work weakens the local-first claim. The mitigation is disclosure and a recorded security amendment, not silence.

### Consequences for existing artifacts

- `CONTEXT.md` gains **Annotation**, **Review**, **Verify**, **Review Surface** and **Annotation Queue**; **Target Resolution** and **Provenance Confidence** are rewritten; `annotation payload` and `annotation workflow` are removed from the existing avoid-lists as they now name the product's own concept; **Visual Editor** is added as an avoid-term for **Annotation**.
- The existing V0 spec is amended where it names the retired three-mode model, the five resolution outcomes, and the Intent Previews as separate experiments.
- Two records decision are needed: review surface architecture (including fidelity, proxy and auto-open), and durable annotations with the revised resolution model. The resolution reduction is recorded in the latter rather than as a quiet refactor, because it is schema-affecting and surprising to a future reader.
- The security documentation is amended.
- The README is rewritten for automatic opening, the two states, and the annotation model.

### Working order

The work is one combined change rather than a hotfix followed by a redesign. Within it, the sequence that keeps feedback short is: the browser-driven seam and the asset graph guard first, so it fails before it passes; then artifact fidelity and proxying; then the annotation and resolution state model; then the surface states, tokens and gallery; then relations as direct manipulation; then agent activity, attachments, draft safety and the drawer; then the documentation set.

### Relationship to prior art

The competitive benchmarks remain as recorded: the closest comparable local review product for the local-HTML loop and for the shape of its chrome; a commercial review-lifecycle product for lifecycle; a framework-context product for provenance context; a re-anchoring product for honest missing targets; and the integrated design-mode products for interaction polish. The one parity decision this spec declines on purpose is style-value editing, which those integrated products offer and this product must not.