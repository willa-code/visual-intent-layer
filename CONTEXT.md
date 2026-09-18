# Visual Review

This context describes a product for people who inspect and direct visible work produced with agents. It assumes the agent is already available and connected; its purpose is to make the human-to-agent direction loop precise, fast, and trustworthy.

## Language

**Builder-Reviewer**:
A technically comfortable person who uses an agent to produce or modify a visible artifact and personally reviews the result. A Builder-Reviewer may understand software concepts and integrations without writing the underlying code.
_Avoid_: Developer, non-technical user, reviewer, vibe coder

**Visual Direction Loop**:
The cycle in which a Builder-Reviewer visually expresses intent about an artifact, an agent performs or revises the work, and the Builder-Reviewer verifies the result. The cycle may begin with agent-produced work or with a human-selected transformation.
_Avoid_: Feedback loop, review pipeline, agent setup

**Review Surface**:
The independent browser surface in which a Builder-Reviewer inspects an Artifact, composes Annotations, and verifies a resulting revision. It is the complete local experience and never depends on a Harness embedding it.
_Avoid_: Review UI, viewer, inspector, design mode

**Review**:
The Review Surface's single state, in which Annotations are composed, queued, and sent. The artifact is operated normally or pointed at within it; pointing and boxing are modes, not separate states.
_Avoid_: Annotate mode, edit mode, direct mode, design mode

**Verify**:
The act, on one Annotation, of comparing a resulting artifact revision against what that Annotation asked for and accepting it, marking it Not Fixed, or marking it obsolete. It is a state of an Annotation, not a place in the Review Surface: an Annotation is verified where it sits, and changing a decision is one act rather than a journey back to an undecided state. A Replacement, not a verdict, is what closes a delivered Annotation.
_Avoid_: Approval screen, review mode, diff view, verify mode

**Visual Intent Layer**:
A product layer that converts what a Builder-Reviewer points to or selects on a visible artifact into contextual instructions an agent can act on. It exists to preserve intent that would be lossy or slow to express using words alone. The envelope retains support for relations among targets, and the surface expresses them by dragging a target that is already in the selection.
_Avoid_: HTML annotator, visual editor, MCP transport

**Visual Intent Envelope**:
A portable representation of visually grounded human intent, and the delivery batch that carries one or more Annotations. It identifies the artifact and visible target, preserves spatial and semantic evidence, expresses the desired transformation and constraints, and communicates uncertainty when the target cannot be identified safely.
_Avoid_: Prompt, DOM selector

**Annotation**:
A durable, individually verifiable unit of visually grounded direction: one or more visible targets, a written note, optional references, and optional Relational Intent. An Annotation is composed in the Review Surface and verified on its own.
_Avoid_: Comment, mark, note, task, visual edit, item

**Annotation Queue**:
The ordered set of Annotations a Builder-Reviewer has composed but not yet sent. Their order is the order the agent receives them in.
_Avoid_: Cart, basket, backlog, inbox

**Pass**:
One delivery of Annotations and the artifact revision that answers it. A Pass has a state (in flight, ready, closed, or taken back) and a set of member Annotations, and only the Builder-Reviewer closes it. Closing it is a record: its outcome and its decisions freeze, and a Builder-Reviewer changing a decision on one of its Annotations reopens it. A Pass the agent has not collected may be taken back instead.
_Avoid_: Round, batch, iteration, cycle, review cycle

**Replacement**:
The relationship in which a later Annotation replaces an earlier one that was already delivered. The earlier Annotation is Replaced and states what replaced it, and what the agent was told stays a record.
_Avoid_: Supersession, superseded, successor, follow-up, edit, update, revision

**Not Fixed**:
The single verdict that the revision under review does not satisfy an Annotation and another attempt is wanted. It judges one Annotation and asks for no new delivery; what follows is the Builder-Reviewer adding to the note, re-annotating, or asking for Another Pass. It is the surface's only "no": the retired word **Rejected** reads as Not Fixed.
_Avoid_: Another pass, request changes, retry, failed, rejected

**Another Pass**:
The act of asking the agent to attempt the open Annotations of the current Pass again, carrying those Annotations rather than new direction. It is delivered as Next-Pass Intent and opens a new Pass; the Pass it answered closes with its outcome and result revision frozen.
_Avoid_: Regenerate, rerun, retry, request changes, continue

**Take Back**:
The Builder-Reviewer's act of cancelling a delivery the agent has not yet collected, returning its Annotations to the queue. It is offered only while no member of the Pass has been read; once the agent has collected the delivery, a Replacement is the act that changes it, and a delivered Annotation is never deleted.
_Avoid_: Undo, recall, retract, delete, unsend

**Artifact**:
Visible work that a Builder-Reviewer can direct and verify, whatever produces it. Every Artifact participates in the same Visual Direction Loop; artifact types differ only in how much evidence their targets can carry and in how their revision is identified, never in the loop they participate in.
_Avoid_: HTML file, canvas, document, mode, artifact mode, application mode

**Intent Preview**:
A reversible visual proposal showing the transformation a Builder-Reviewer means before it is delivered to an agent. It never mutates authoritative source. Relational Intent is expressed this way: a drag on an already-selected target moves a ghost and states one sentence before anything is recorded, and that ghost plus sentence is the Intent Preview rather than a separate capability.
_Avoid_: Direct edit, WYSIWYG change, canvas object

**Baseline Compatibility**:
The ability of any conforming MCP host to invoke the product's ordinary tools and receive a Visual Intent Envelope, without requiring embedded UI or live steering support.
_Avoid_: Full compatibility, universal experience

**Certified Experience**:
A host-and-version combination on which the complete supported interaction and delivery behavior has been tested and published. Certification describes verified behavior rather than restricting which agents may connect. No combination is certified yet.
_Avoid_: Supported agents, exclusive integration

**Harness**:
A CLI agent host whose own native configuration determines whether the product's server is reachable, such as pi, Codex, Claude Code, or opencode.
_Avoid_: Agent host, host, client, integration target

**Draft Intent**:
A Visual Intent Envelope saved locally but not yet delivered to an agent. It is the state of a stored Envelope rather than an act a Builder-Reviewer performs.
_Avoid_: Unsent prompt, pending feedback

**Check-In**:
The point between an agent's own steps at which it reads new direction. Steering Intent and Review Interruption are seen at a Check-In and never mid-step, so both ask rather than take effect.
_Avoid_: Poll, subscription, wake

**Steering Intent**:
A Visual Intent Envelope that amends or redirects work an agent has already begun, seen at the agent's next Check-In rather than mid-step. It is produced by Replacing a delivered Annotation; it is not a choice made when sending a queue.
_Avoid_: Instant interruption, live edit, host capability

**Next-Pass Intent**:
A Visual Intent Envelope deliberately held for a new agent turn after active work finishes.
_Avoid_: Steering, deferred annotation

**Review Interruption**:
A deliberate request to stop active work and return control to the Builder-Reviewer before beginning another direction cycle. Like Steering Intent it is seen at the agent's next Check-In, so it asks for a stop rather than performing one. It names no target and is therefore not an Annotation, and it is not carried by a Visual Intent Envelope.
_Avoid_: Cancel, pause, kill

**Target**:
The visible thing an Annotation is about: an element the artifact owns, an exact word range, or an Area the Builder-Reviewer bounded. A Target carries Rendered Grounding and Runtime State Evidence, may carry a Captured View, and carries Source Provenance only when an instrumented artifact supplied it.
_Avoid_: Selection, node, element, item

**Area**:
A visible target the Builder-Reviewer bounded themselves rather than one the artifact owns. An Area carries Rendered Grounding and can never carry Source Provenance; every other kind of target may.
_Avoid_: Region, marquee, lasso, box, zone, drawn target

**Source Provenance**:
Evidence connecting a visible target to the editable source component or span that produced it.
_Avoid_: CSS selector, DOM path, source guess

**Rendered Grounding**:
Evidence identifying a target within the visible artifact without claiming knowledge of the editable source that produced it.
_Avoid_: Source provenance, exact source, weak provenance

**Runtime State Evidence**:
Evidence recording the state the artifact was in when a Target was pointed at: its address relative to the artifact's own base, plus the viewport and scroll position Rendered Grounding already carries, plus the ordered chain of documents the Target was reached through when it lives inside a frame — each entry naming the frame, its own address relative to the same base, and its scroll. It records what the Builder-Reviewer was looking at, and never claims anything about the editable source. An unresolved Target whose recorded state — address, viewport, scroll or a frame's address or scroll — differs from the state now on screen while its revision has not changed is reported with the derived words **May exist only in a state no longer on screen**, and that reading wins over lookalike candidates; the label is derived at read time and never stored.
_Avoid_: Snapshot, session state, page state, context

**Captured View**:
A browser-composited image of the artifact as the Builder-Reviewer actually saw it. It records the visual fact itself; an image assembled by re-rendering DOM and style data is not a Captured View and must never be named as one.
_Avoid_: Render, reconstruction, thumbnail, snapshot

**Adopted Revision**:
The artifact revision the Review Surface is actually showing, as reported by the artifact itself rather than derived from what a source currently offers. An Annotation is stamped with the Adopted Revision it was written against, and a source's current revision is never substituted for it.
_Avoid_: Current revision, latest revision, server revision, head

**Provenance Confidence**:
The product's explicit assessment of source evidence as exact, inferred, or unavailable. Exact is claimed only where an instrumented artifact supplied a source location; it is never inferred from framework internals, and an artifact with no instrumentation reads as unavailable rather than as a weaker kind of exact. This axis is separate from Target Resolution and never shares the word "exact" with it. Uncertainty must remain visible to both the Builder-Reviewer and the agent.
_Avoid_: Best guess, likely file

**Target Resolution**:
The act of locating the same intended target in another artifact revision. A resolution reports whether the target was matched exactly, recovered on weaker evidence, or left unresolved, and never chooses an uncertain target: an unresolved target carries its candidates, and one without candidates is deleted. Whether an Annotation was written against the revision being compared is a separate, Annotation-level fact.
_Avoid_: Selector match, reattachment, best guess

**Declared Missing**:
The Builder-Reviewer's own act asserting that a target no longer exists, offered only where Target Resolution found no candidate for it and stamped with the result revision it was made against. It is stored on the Annotation, reads in the Builder-Reviewer's own words, clears that target's approval blocker, and travels in the next envelope so the agent is told. It never shares a word with the derived vocabulary the product uses when it simply could not find a target.
_Avoid_: Deleted, removed, gone, auto-resolved

**Relational Intent**:
Intent expressed through a relationship among targets, such as alignment, ordering, spacing, containment, or equivalence. It is expressed by manipulating targets directly: a modifier extends a selection into a set, and a drag beginning on a target already in that set infers one relation, shown as one sentence before it is recorded.
_Avoid_: Multiple annotations, grouped feedback

**Verified Intent**:
A delivered intention whose resulting artifact revision has been reviewed and accepted by a Builder-Reviewer.
_Avoid_: Resolved comment, completed task

**Verification Run**:
One execution that launches the real product, drives a mapped behaviour the way a Builder-Reviewer would, captures evidence, and cleans up. It reports the behaviour it drove, the behaviour it could not reach and its outcome honestly rather than passing or failing.
_Avoid_: Test run, automated review, CI job

**Mechanical Verification**:
The evidence a Verification Run produces that the mechanism behaved as specified: a recording of the action and its resulting state, screenshots, accessibility snapshots and read-backs of what the product stored. It is never Verified Intent — a driven approval proves the verdict path works, and only a Builder-Reviewer completes an Annotation.
_Avoid_: Verification, approval, passing test

**Proof Product**:
A usable public product whose first purpose is to demonstrate strong product judgment and engineering execution, whose second purpose is to earn open-source adoption, and whose later possibilities include monetization and original research.
_Avoid_: Demo, portfolio piece, breakthrough product
