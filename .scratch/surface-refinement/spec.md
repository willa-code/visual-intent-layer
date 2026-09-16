# Surface refinement: one rail, two tiles, honest delivery

Status: ready-for-agent

Amends `.scratch/review-surface/spec.md` where the two disagree, and follows the
four amendments recorded in `design.md` on 2026-09-16, the terms resolved in
`CONTEXT.md`, and ADR-0018. The domain model, envelope contract, resolution
semantics and security posture there remain in force.

## Problem Statement

Dogfooding 0.3.0-next.1 with a Builder-Reviewer produced a vocabulary and
composition problem rather than a styling one, and independent review of the
first draft of this spec found that the draft repeated two of the faults it was
written to fix.

- Five word-labelled tools in a window-level bar present two different questions
  — "what am I pointing at?" and "what am I doing?" — as equals. Three fail
  silently in the case a newcomer tries first. `Pointer` is the absence of a
  mode presented as a peer of three real ones. `Arrange` does nothing until two
  targets are already selected: driving it that way produced no Annotation and no
  card, and the Verification Run harness recorded the path as unreachable
  (`select-region-1789559725815.aria.txt` precedes
  `05-arrange-with-no-selection.png`, whose drive timed out waiting for a card
  that never opened; the run record's `unreachable[0]` is that timeout). `Text`
  shows no hover feedback at all and ignores a click, so nothing indicates it is
  armed.
- The bar holds identity, revision, two surface states, five tools, the full
  agent sentence, a selection count and an attention badge at once, and the agent
  sentence overflows its fixed 48px height whenever it is present — the box does
  not grow, its child does not fit.
- The delivery control offers three intents with two behaviours and one false
  claim. `Draft` creates a batch and moves Annotations to `delivered` while the
  toast says nothing was sent. `Steering` is offered although no host ever
  declares the capability, and `deliveryPlan`'s strategy is never branched on
  anywhere — the strategy is computed, returned and ignored, so "deliver now" and
  "queue locally" are one code path with different prose.
- Sending empties the queue, so the Builder-Reviewer loses sight of what they
  asked for until they change to a second surface state called Verify. Nothing
  tells them what the agent has done with it, and nothing lets them amend it.
- The artifact-changed notice cannot be dismissed. `changed` compares the file
  against `session.revision`, which is written once when the session is minted
  and never updated, so it is true forever after any file change and reloading
  the artifact only re-points the frame.
- The anchored card carries four strings of instruction — the `What should
  change?` label, the field's placeholder, `Add an image by picking a file,
  pasting, or dropping it here.`, and `Enter queues this Annotation.
  Cmd/Ctrl+Enter queues and sends. Escape never discards your writing.` — plus
  three different icon drawing systems, one of them a platform emoji.

## Solution

One rail, one island with two tiles, and a delivery vocabulary that describes what
actually happens.

The Review Surface becomes a sidecar to the artifact. A single full-height rail
holds the artifact's identity, the agent's position and every Annotation the
Builder-Reviewer has made — unsent and sent alike, in one list with the state
pill carrying the difference, so nothing leaves the view when it is sent.
Actionable Annotations come first and closed ones sit behind one toggle. A small
island over the artifact holds two icon-only tiles: point at things, and box an
area. **Operating the artifact is the unarmed resting state, not a third tile.**
Pointing is a gesture rather than a mode switch: clicking targets a thing the
artifact owns, and dragging across words targets exactly those words.

There is one surface state. Verify stops being a place: an Annotation is verified
where it sits, with its verdict controls on its own row once it has been
delivered, and the before/after comparison set from the revision that Annotation
was written against. After the agent changes the artifact, the loop closes on
this surface: the revision is re-resolved against each Annotation's target and
the result is judged in place, without the Builder-Reviewer prompting anyone.
Relational Intent is **not** expressed by this iteration — see the deferred list
below, and the amendment that stopped the contract promising it.

Delivery stops pretending. Only the dead parts of the capability machinery are
deleted — the delivery plan and the steering flag — while ADR-0008's negotiation
seam survives for the two capabilities it deferred. The intent an agent receives
follows from which Annotation the Builder-Reviewer acted on: sending a queue is
Next-Pass Intent, amending something already sent is Steering Intent, and asking
an agent to stop is Review Interruption. Steering and interruption are a
published convention — an agent reads new direction at its next Check-In — and
ADR-0018 records why that is so rather than a capability to detect. The surface
states which delivery channel applies and when the agent last checked, so a
convention that is not being honoured is visible rather than assumed.

The theme belongs to the operator, follows the platform until they choose, and is
never sampled from the artifact.

## User stories

### Pointing

1. As a Builder-Reviewer, I want to point at a thing by clicking it, so that I do not have to arm a tool first.
2. As a Builder-Reviewer, I want to point at exact words by dragging across them, so that a note can land on one phrase inside a paragraph.
3. As a Builder-Reviewer, I want to bound an area by dragging a box, so that I can point at a patch that is not one thing — two cards, a heading and its subtitle, a column of padding.
4. As a Builder-Reviewer, I want an area to tell me what it encloses, so that it still means something when the layout moves.
5. As a Builder-Reviewer, I want operating the artifact to be where I already am, so that nothing is armed when I arrive and nothing has to be switched off.
6. As a Builder-Reviewer, I want to know which mode I am in without reading a label, so that the tile, the cursor and the hover outline agree before I commit.
7. As a Builder-Reviewer, I want a drawn area to look different from a thing the artifact owns, so that I can tell what I marked from what was already there.
8. As a Builder-Reviewer, I want to express that two things should align, be ordered, be spaced, or match, so that I can direct a relationship without describing pixels. *(Not satisfied by this iteration — see the deferred list.)*

### The rail

9. As a Builder-Reviewer, I want the artifact to have the whole window apart from the rail, so that reviewing is the primary activity.
10. As a Builder-Reviewer, I want the artifact's identity and revision beside my Annotations, so that knowing an Annotation was written before this revision is meaningful at the moment I read it.
11. As a Builder-Reviewer, I want every Annotation I have made in one list, so that sending one does not make it disappear.
12. As a Builder-Reviewer, I want what needs a decision to come first, so that a long session does not bury the work.
13. As a Builder-Reviewer, I want to reorder what I am about to send, so that the agent receives my intent in the order I meant.
14. As a Builder-Reviewer, I want an Annotation's state stated on its own row, so that I can tell written from sent from acknowledged from verified at a glance.
15. As a Builder-Reviewer, I want each Annotation verified where it sits, so that I do not have to change state to judge a result.
16. As a Builder-Reviewer, I want to compare a revision against the one that Annotation was written for, so that "before the change" means something when my Annotations were written at different times.

### Delivery and the agent

17. As a Builder-Reviewer, I want one action to send what I have composed, so that I do not choose a delivery intent I cannot predict.
18. As a Builder-Reviewer, I want to be told whether the agent is holding the call right now, so that I know whether sending is urgent or will wait.
19. As a Builder-Reviewer, I want to know when the agent last checked in, so that "it will see this later" is a fact rather than a hope.
20. As a Builder-Reviewer, I want an agent to be able to read new direction without holding a call, so that work I direct while it is busy is not stranded.
21. As a Builder-Reviewer, I want to amend something I already sent, so that I can redirect work in flight without writing a second unrelated Annotation.
22. As a Builder-Reviewer, I want amending to feel like editing rather than filing a new request, so that a typo correction does not become a chain.
23. As a Builder-Reviewer, I want an amendment to supersede what it replaces rather than rewrite it, so that the record of what the agent was told survives.
24. As a Builder-Reviewer, I want to ask the agent to stop from the same surface, so that stopping does not mean going back to the harness.
25. As a Builder-Reviewer, I want a request that nothing will read to say so, so that I am not told something was stopped when nothing was.

### The artifact under review

26. As a Builder-Reviewer, I want to be told when the artifact changed, so that I know I am looking at an older revision.
27. As a Builder-Reviewer, I want reloading to be my decision and to actually settle the revision, so that the notice clears when I have acted on it.
28. As a Builder-Reviewer, I want the artifact never to be swapped under an open Annotation card, so that what I am annotating does not move.

### Craft

29. As a Builder-Reviewer, I want the chrome's theme to be mine and remembered, so that the surface matches the machine I work on rather than the artifact I am judging.
30. As a Builder-Reviewer, I want dark mode to be the same design in different values, so that it is a counterpart rather than a second product.
31. As a Builder-Reviewer, I want one icon set drawn to one weight, so that the surface reads as one product rather than an assembly.
32. As a Builder-Reviewer, I want the card to say only what I need while writing, so that composing a note is not reading an instruction manual.

## Testing decisions

Carried forward from `.scratch/review-surface/spec.md`, and stated here because
this iteration deletes more than it adds:

- **Survives, and is extended:** envelope idempotency and duplicate delivery;
  acknowledgement never counting as verification; the browser loop driving the
  real surface end to end; the gallery's scripted token and screenshot pass.
- **Survives, and must be re-cut:** every seam that asserts the deleted
  vocabulary — the browser loop's tool and state-switch clicks, the contract
  test's three-intent loop, and the capability test.
- **Retired deliberately:** host-capability degradation. There is nothing to
  degrade, because the delivery plan never branched on capability. ADR-0018
  records what replaced it. This is a retirement, not an omission.
- **Added:** that a delivered Annotation cannot be edited in place; that an
  interruption is never carried in an envelope; that reloading does not break
  annotated-route authorisation.

## Deferred out of this iteration

Recorded so nothing here is lost silently. Each carries what would unblock it.

- **Relational Intent in the surface** (issue 18, `Status: needs-triage`). Nothing
  in the dogfood asked for it, the `Arrange` tool that carried it was
  undiscoverable, and this iteration's purpose is a focused surface. The envelope
  keeps its support for relationships and `CONTEXT.md` keeps the term, so the
  capability can return with a designed gesture rather than an inherited one.
  `design.md` §5/§6/§7 no longer promise relation guides, handles, sentences or a
  gesture. **Consequence: this iteration does not demonstrate the non-parity
  differentiator the previous spec named.**
- **Conflict between an amendment and work in flight.** If an agent has already
  implemented something and the Builder-Reviewer amends it anyway, nothing detects
  or reports the conflict. Raised by independent review, recorded in issue 20's
  comment, and honestly unknowable until someone hits it.
- **Latency and acknowledgement guarantees.** No commitment about how quickly an
  agent sees a request, beyond stating which channel applies.
- **Long-session information architecture.** Issue 19 orders actionable
  Annotations first and hides closed ones behind one toggle; a fuller model for a
  week-long session is not in this iteration.
- **Touch and zoom behaviour.** Unmeasured. The mode island and the drag threshold
  both need it before either can be called done on a tablet.
- **Measurable targeting error rates.** Nothing instruments how often a target is
  the wrong one, so "targeting works" stays an assertion.
- **Rail resizing.** The width is fixed and measured in issue 13.

## Non-goals

- Sampling, deriving or inverting chrome colours from the artifact.
- A push channel, subscription or wake mechanism. The Check-In convention is the
  only steering mechanism in this iteration.
- A third mode tile for operating the artifact.
- An interruption carried in a Visual Intent Envelope.
- Expressing Relational Intent. No relation is built and none is promised.
- A filter affordance in the rail: one toggle for closed Annotations, no facets,
  no search, no saved views.
- Editing a delivered Annotation in place.
- Auto-reloading the artifact.
- A resizable rail.
- Anything in `design.md` §10, including a style-value editor, a freehand
  palette, decorative colour, a platform form widget as a primary control, or
  icon-only controls for consequential actions.
- Auto-selecting a resolution candidate.

## Open questions

- Whether the Check-In convention is honoured in practice by a real agent driving
  the shipped tool descriptions. Issue 13 answers it with a Verification Run
  rather than an argument. If it is not honoured, issues 08 and 09 are two honest
  requests that always wait, and the surface will say so.
- Whether the rail's head can carry identity, agent position, the Stop action and
  the overflow menu legibly at the fixed width. Measured in issue 13, not assumed.
- Whether the two-tile island's drag threshold stays predictable on artifacts with
  their own drag interactions. Exercised in issue 13 with false activations
  recorded.
- Whether deferring Relational Intent was right. It is the largest capability this
  iteration removes and the previous spec's stated differentiator; the deferral is
  recorded in issue 18 and in `design.md` §11 so it can be reversed deliberately
  rather than rediscovered.