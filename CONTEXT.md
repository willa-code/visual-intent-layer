# Visual Review

This context describes a product for people who inspect and direct visible work produced with agents. It assumes the agent is already available and connected; its purpose is to make the human-to-agent direction loop precise, fast, and trustworthy.

## Language

**Builder-Reviewer**:
A technically comfortable person who uses an agent to produce or modify a visible artifact and personally reviews the result. A Builder-Reviewer may understand software concepts and integrations without writing the underlying code.
_Avoid_: Developer, non-technical user, reviewer, vibe coder

**Visual Direction Loop**:
The cycle in which a Builder-Reviewer visually expresses intent about an artifact, an agent performs or revises the work, and the Builder-Reviewer verifies the result. The cycle may begin with agent-produced work or with a human-selected transformation.
_Avoid_: Feedback loop, annotation workflow, review pipeline, agent setup

**Visual Intent Layer**:
A product layer that converts what a Builder-Reviewer points to, selects, arranges, or demonstrates on a visible artifact into contextual instructions an agent can act on. It exists to preserve intent that would be lossy or slow to express using words alone.
_Avoid_: HTML annotator, visual editor, MCP transport

**Visual Intent Envelope**:
A portable representation of visually grounded human intent. It identifies the artifact and visible target, preserves spatial and semantic evidence, expresses the desired transformation and constraints, and communicates uncertainty when the target cannot be identified safely.
_Avoid_: Prompt, annotation payload, DOM selector

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
A reversible visual proposal showing the transformation a Builder-Reviewer means before it is delivered to an agent. Moving or resizing an Intent Preview expresses a desired visible relationship; it does not directly mutate authoritative source.
_Avoid_: Direct edit, WYSIWYG change, canvas object

**Baseline Compatibility**:
The ability of any conforming MCP host to invoke the product's ordinary tools and receive a Visual Intent Envelope, without requiring embedded UI or live steering support.
_Avoid_: Full compatibility, universal experience

**Certified Experience**:
A host-and-version combination on which the complete supported interaction and delivery behavior has been tested and published. Certification describes verified behavior rather than restricting which agents may connect.
_Avoid_: Supported agents, exclusive integration

**Draft Intent**:
A Visual Intent Envelope saved locally but not yet delivered to an agent.
_Avoid_: Unsent prompt, pending feedback

**Steering Intent**:
A Visual Intent Envelope offered to amend or redirect an agent's active work at the next boundary supported by its host.
_Avoid_: Instant interruption, live edit

**Next-Pass Intent**:
A Visual Intent Envelope deliberately held for a new agent turn after active work finishes.
_Avoid_: Steering, deferred annotation

**Review Interruption**:
A deliberate request to stop active work and return control to the Builder-Reviewer before beginning another direction cycle.
_Avoid_: Cancel, pause

**Source Provenance**:
Evidence connecting a visible target to the editable source component or span that produced it.
_Avoid_: CSS selector, DOM path, source guess

**Rendered Grounding**:
Evidence identifying a target within the visible artifact without claiming knowledge of the editable source that produced it.
_Avoid_: Source provenance, exact source, weak provenance

**Provenance Confidence**:
The product's explicit assessment of whether source evidence is exact, recovered, ambiguous, unavailable, or stale. Uncertainty must remain visible to both the Builder-Reviewer and agent.
_Avoid_: Best guess, likely file

**Target Resolution**:
The act of locating the same intended target in another artifact revision. A resolution must communicate whether it is exact, recovered, ambiguous, stale, or deleted rather than silently choosing an uncertain target.
_Avoid_: Selector match, reattachment

**Relational Intent**:
Intent expressed through a relationship among targets, such as alignment, ordering, spacing, containment, or equivalence.
_Avoid_: Multiple annotations, grouped feedback

**Verified Intent**:
A delivered intention whose resulting artifact revision has been reviewed and accepted by a Builder-Reviewer.
_Avoid_: Resolved comment, completed task

**Proof Product**:
A usable public product whose first purpose is to demonstrate strong product judgment and engineering execution, whose second purpose is to earn open-source adoption, and whose later possibilities include monetization and original research.
_Avoid_: Demo, portfolio piece, breakthrough product
