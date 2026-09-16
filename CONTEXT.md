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
The Review Surface state in which Annotations are composed, queued, and sent. The artifact is operated normally or pointed at inside this state; those are modes within Review, not separate states.
_Avoid_: Annotate mode, edit mode, direct mode, design mode

**Verify**:
The act, on one Annotation, of comparing a resulting artifact revision against what that Annotation asked for and accepting it, rejecting it, requesting another pass, superseding it, or marking it obsolete. It is a state of an Annotation, not a place in the Review Surface: an Annotation is verified where it sits.
_Avoid_: Approval screen, review mode, diff view, verify mode

**Visual Intent Layer**:
A product layer that converts what a Builder-Reviewer points to, selects, arranges, or demonstrates on a visible artifact into contextual instructions an agent can act on. It exists to preserve intent that would be lossy or slow to express using words alone.
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

**Supersession**:
The relationship in which a later Annotation replaces an earlier one that was already delivered. What the agent was told stays a record, and the replacement states what replaced it.
_Avoid_: Edit, update, revision

**Artifact**:
Visible work that a Builder-Reviewer can direct and verify. Different artifact types may provide different levels of targeting fidelity while participating in the same Visual Direction Loop.
_Avoid_: HTML file, canvas, document

**Artifact Mode**:
A Visual Direction Loop in which the visible artifact is itself, or maps directly to, the editable source of truth. Generated or saved HTML is the initial example.
_Avoid_: Simple mode, static page mode

**Application Mode**:
A Visual Direction Loop over a running browser application whose visible output is produced by components, data, state, routing, and build tooling. Application Mode requires evidence connecting rendered targets to their editable source.
_Avoid_: HTML mode, website mode, arbitrary app support

**Intent Preview**:
A reversible visual proposal showing the transformation a Builder-Reviewer means before it is delivered to an agent. An Intent Preview is how Relational Intent is expressed in the Review state — by manipulating targets directly — rather than a separate mode, and it never mutates authoritative source.
_Avoid_: Direct edit, WYSIWYG change, canvas object

**Baseline Compatibility**:
The ability of any conforming MCP host to invoke the product's ordinary tools and receive a Visual Intent Envelope, without requiring embedded UI or live steering support.
_Avoid_: Full compatibility, universal experience

**Certified Experience**:
A host-and-version combination on which the complete supported interaction and delivery behavior has been tested and published. Certification describes verified behavior rather than restricting which agents may connect.
_Avoid_: Supported agents, exclusive integration

**Harness**:
A CLI agent host whose own native configuration determines whether the product's server is reachable, such as pi, Codex, Claude Code, or opencode.
_Avoid_: Agent host, host, client, integration target

**Harness Detection**:
The determination, before any write, of which Harnesses are present on a machine, from their own configuration locations and their own commands.
_Avoid_: Discovery, scan, auto-detect

**Harness Registration**:
The product's server entry present in a Harness's own native configuration, at a named scope on a specific machine. A Registration is current when its entry matches the entry the installed product would write, and outdated when it differs.
_Avoid_: Install, integration, connection, already-present

**Draft Intent**:
A Visual Intent Envelope saved locally but not yet delivered to an agent. It is the state of a stored Envelope rather than an act a Builder-Reviewer performs.
_Avoid_: Unsent prompt, pending feedback

**Check-In**:
The point between an agent's own steps at which it reads new direction. Steering Intent and Review Interruption are seen at a Check-In and never mid-step, so both ask rather than take effect.
_Avoid_: Poll, subscription, wake

**Steering Intent**:
A Visual Intent Envelope that amends or redirects work an agent has already begun, seen at the agent's next Check-In rather than mid-step. It is produced by amending a delivered Annotation, which it supersedes; it is not a choice made when sending a queue.
_Avoid_: Instant interruption, live edit, host capability

**Next-Pass Intent**:
A Visual Intent Envelope deliberately held for a new agent turn after active work finishes.
_Avoid_: Steering, deferred annotation

**Review Interruption**:
A deliberate request to stop active work and return control to the Builder-Reviewer before beginning another direction cycle. Like Steering Intent it is seen at the agent's next Check-In, so it asks for a stop rather than performing one. It names no target and is therefore not an Annotation, and it is not carried by a Visual Intent Envelope.
_Avoid_: Cancel, pause, kill

**Area**:
A visible target the Builder-Reviewer bounded themselves rather than one the artifact owns. An Area carries Rendered Grounding and can never carry Source Provenance; every other kind of target may.
_Avoid_: Region, marquee, lasso, box, zone, drawn target

**Source Provenance**:
Evidence connecting a visible target to the editable source component or span that produced it.
_Avoid_: CSS selector, DOM path, source guess

**Rendered Grounding**:
Evidence identifying a target within the visible artifact without claiming knowledge of the editable source that produced it.
_Avoid_: Source provenance, exact source, weak provenance

**Provenance Confidence**:
The product's explicit assessment of source evidence as an exact source span, inferred, or unavailable. This axis is separate from Target Resolution and never shares the word "exact" with it. Uncertainty must remain visible to both the Builder-Reviewer and the agent.
_Avoid_: Best guess, likely file

**Target Resolution**:
The act of locating the same intended target in another artifact revision. A resolution reports whether the target was matched exactly, recovered on weaker evidence, or left unresolved, and never chooses an uncertain target: an unresolved target carries its candidates, and one without candidates is deleted. Whether an Annotation was written against the revision being compared is a separate, Annotation-level fact.
_Avoid_: Selector match, reattachment, best guess

**Relational Intent**:
Intent expressed through a relationship among targets, such as alignment, ordering, spacing, containment, or equivalence.
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
