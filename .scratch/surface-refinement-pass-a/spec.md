# Pass A — the honest surface

Status: ready-for-agent

Amends `design.md` in five recorded amendments on 2026-09-16, the last of which
covers this iteration, and follows the terms now in `CONTEXT.md`. ADR-0019
records the Pass decision, ADR-0012 the requirement that a human completes
intent, and ADR-0010 the rule that the product exposes ambiguity rather than
promoting an inferred location to fact.

Pass B is named in Out of Scope and is not specified here.

## Problem Statement

A Builder-Reviewer opens the Review Surface, points at something, writes one
short note, and is answered by a wall of prose. The rail explains the delivery
convention four times on one screen. A chip on every row says the same thing
about the revision. A count labelled "Needs you" is silently adding up three
unrelated facts. A notice covers the mode island the moment it arrives. The card
they are typing in carries a sentence telling them how to attach a file. And when
a target cannot be re-found, they are shown five near-identical labels each
badged "55% evidence", with their own Approve button locked until they pick one —
so a Builder-Reviewer who believes all five are wrong has to confirm one of them
to proceed.

None of that is a vocabulary problem, and none of it is taste. The surface is
like this because it has no **Pass**: no object that means "this set of notes,
and the revision that answers them". `DeliveryBatch` carries an identity, an
idempotency key, a host, a delivery intent, a member list and a timestamp and no
state at all, while the browser client's snapshot type declares a `status` the
server has never sent. With no Pass the surface cannot say whose turn it is, so
it restates the convention in prose, prints a default state as news, sums three
claims into one number, and cannot tell a Builder-Reviewer whether a new revision
answered anything.

Two defects are worse than noise because they are untrue. An Annotation composed
after a reload is stamped with the pre-reload revision while being labelled
"written against this revision" — so the Builder-Reviewer's own note misrepresents
what it is about, and the agent is handed the wrong revision. And only one
artifact snapshot is ever stored, so the comparison control can only ever show
the revision the session was opened at, whatever its label claims.

## Solution

Give the surface the object it is missing, then delete everything that existed
only to explain its absence.

**A Pass is the unit of review.** It has a state — open, in flight, ready, closed
— its member Annotations, and the revision range it spans, and only the
Builder-Reviewer closes it. A new revision moves the open Pass to ready and never
closes one. The rail becomes a ledger of Passes rather than a flat list of notes.

**One status line answers "whose turn is it?"** At most eight words, at the head
of the rail: `Your turn · 3 notes to send`, `Agent's turn · Pass 2 in flight`,
`Your turn · Pass 2 ready`. That line replaces the agent paragraph, the footer
paragraph, the toast that repeated them, and the heading that restated the badge.
When the agent last checked is one disclosure away instead of a second sentence.

**Uncertainty moves onto the artifact and off the screen.** Where Target
Resolution cannot match a target, the candidates are marked on the artifact
itself and the row says so in words. There is no ranked list and no number. The
Builder-Reviewer points at the right target to re-point the Annotation — which
clears the approval block without asserting something false — and that is the
whole repair path in this iteration.

**The vocabulary stops needing a glossary.** The earlier Annotation is *Replaced*
and names what replaced it; the per-note verdict that wants another attempt is
*Not Fixed*; asking for another attempt at a whole Pass is *Another Pass*.

**Notices and guidance move out of the way.** A notice appears at the rail's top
edge, one at a time, never over the stage, the island or an open card, and only
when a row cannot already say it. Guidance becomes a coachmark: two lines at
most, anchored to the control it explains, triggered by the first real use of
that control, dismissed once, remembered per device, clearable from the overflow.

**The rail is warm and the artifact is white.** The chrome takes the `canvas`
primitive as its material, so the tool and the work are visibly different
substances rather than one plane separated by a hairline. The artifact is served
on its own white and never samples or derives the surface's colour.

**And the surface stops saying things that are not true.** A note is stamped with
the revision the Builder-Reviewer was actually looking at. A snapshot is kept for
every adopted revision, so the comparison control can serve the revision it
names. The count that needs a decision counts only that. A chip stating a note was
written before the current revision appears only when it is.

## User Stories

### Whose turn it is

1. As a Builder-Reviewer, I want one sentence telling me whose turn it is, so that I do not have to assemble that answer out of four paragraphs.
2. As a Builder-Reviewer, I want that sentence to be at most eight words, so that reading it costs one glance.
3. As a Builder-Reviewer, I want to know whether a Pass is open, in flight or ready, so that I know whether to write, to wait, or to judge.
4. As a Builder-Reviewer, I want to know how many notes are waiting to be sent, so that I know whether I have finished.
5. As a Builder-Reviewer, I want to know when the agent last checked in, so that "it will see this later" is a fact rather than a hope — and I want that one disclosure away rather than in a second paragraph.
6. As a Builder-Reviewer, I want the Stop action beside that sentence, so that stopping acts on the agent where I am already reading about it.
7. As a Builder-Reviewer, I want the sentence never to say the agent is working when it has stepped away, so that a convention the agent is not honouring is visible rather than assumed.

### The Pass

8. As a Builder-Reviewer, I want my notes grouped by the Pass they belong to, so that I can tell which round of work a note was part of.
9. As a Builder-Reviewer, I want a Pass header that states its state and how many of its notes still need me, so that I can judge a round without reading every row.
10. As a Builder-Reviewer, I want sending to open a Pass rather than emit a loose batch, so that the next revision has something to be an answer to.
11. As a Builder-Reviewer, I want a new revision to move the open Pass to ready rather than closed, so that nothing is closed on my behalf.
12. As a Builder-Reviewer, I want only me to be able to close a Pass, so that the record of what I asked for stays mine.
13. As a Builder-Reviewer, I want the surface never to claim that a revision addressed something, so that I am not told more than anything actually reports.
14. As a Builder-Reviewer, I want a session with several Passes to stay legible, so that a long session does not become a scroll.

### Uncertainty on the artifact

15. As a Builder-Reviewer, I want a target we could not match to be marked on the artifact, so that I can see where the doubt is instead of reading a list.
16. As a Builder-Reviewer, I want never to be shown a ranked list of candidates with a figure beside each, so that I am not asked to choose between labels I cannot tell apart.
17. As a Builder-Reviewer, I want to re-point an Annotation by pointing at the right thing, so that repairing a lost target uses the gesture this surface is good at.
18. As a Builder-Reviewer, I want re-pointing to clear the approval block, so that I am never forced to confirm a target I believe is wrong in order to record my verdict.
19. As a Builder-Reviewer, I want a match described as matched, recovered or unresolved in words, so that I know how much to trust it.
20. As a Builder-Reviewer, I want a deleted target to say that approval is blocked rather than to vanish, so that I know why I cannot decide.
21. As a Builder-Reviewer, I want no percentage, score or confidence figure anywhere in chrome, so that I am not shown a number I cannot check.

### Composing

22. As a Builder-Reviewer, I want the card to carry no instruction copy, so that composing a note is writing rather than reading a manual.
23. As a Builder-Reviewer, I want the placeholder to be the question, so that the one prompt I need is in the field I am typing in.
24. As a Builder-Reviewer, I want an Area's target line to carry the drawn-boundary glyph, so that I can tell a drawn area from a thing the artifact owns without reading a kind word.
25. As a Builder-Reviewer, I want the attach control to explain itself through its accessible name, so that no sentence has to sit in the card permanently.
26. As a Builder-Reviewer, I want to keep writing while the agent is working, so that a long turn does not block me.
27. As a Builder-Reviewer, I want to compose while another Pass is in flight, so that I am not held behind an acknowledgement.
28. As a Builder-Reviewer, I want the artifact never to swap under an open card or an open draft, so that what I am annotating does not move.

### Deciding

29. As a Builder-Reviewer, I want Approve and Reject visible on the row, so that the one binary question is answerable at a glance.
30. As a Builder-Reviewer, I want Not Fixed and obsolete behind one overflow on that row, so that two ways of declining to accept do not compete with the pair that decides.
31. As a Builder-Reviewer, I want a blocked verdict to state its reason, so that a refusal is never silent.
32. As a Builder-Reviewer, I want acknowledgement never to read as verification, so that an agent's receipt is not mistaken for my decision.
33. As a Builder-Reviewer, I want each note judged where it sits, so that deciding never means changing state.
34. As a Builder-Reviewer, I want a verdict to be recorded against the revision I actually reviewed, so that my decision is not silently attached to a later revision.

### Replacement

35. As a Builder-Reviewer, I want to Replace a delivered note, so that I can correct work in flight without writing an unrelated second note.
36. As a Builder-Reviewer, I want the earlier note to read Replaced and to name what replaced it, so that nothing I asked for disappears.
37. As a Builder-Reviewer, I want that word to be plain English, so that "Replaced" does not have to be explained to me.
38. As a Builder-Reviewer, I want Enter to deliver a Replacement, so that correcting something does not require the mouse.
39. As a Builder-Reviewer, I want a Replacement delivered as Steering Intent, so that I do not have to choose a delivery intent I cannot predict.

### Notices

40. As a Builder-Reviewer, I want a notice at the rail's top edge, so that it never covers the artifact or the mode island.
41. As a Builder-Reviewer, I want one notice at a time, so that notices do not stack into a wall.
42. As a Builder-Reviewer, I want a notice only when the row cannot already say it, so that a Queued pill is not echoed by a toast.
43. As a Builder-Reviewer, I want a notice that carries an action to wait for me, so that it does not vanish before I can use it.
44. As a Builder-Reviewer, I want the mode island reachable at all times, so that nothing temporary can hide the control that governs the pointer.

### Guidance

45. As a Builder-Reviewer, I want guidance triggered by the first time I use a control, so that it explains what I am doing rather than what I might do.
46. As a Builder-Reviewer, I want at most one coachmark at a time, so that learning does not become a wall.
47. As a Builder-Reviewer, I want a coachmark of two lines at most, so that I can read it while doing the thing.
48. As a Builder-Reviewer, I want one worded dismissal per coachmark, so that I know what dismissing actually means.
49. As a Builder-Reviewer, I want my dismissal remembered for this machine rather than this file, so that opening a new artifact does not teach me again.
50. As a Builder-Reviewer, I want to clear all guidance from the overflow menu, so that I can bring it back or put it away.
51. As a Builder-Reviewer, I want no guidance at launch, so that opening the surface is not a slideshow.
52. As a Builder-Reviewer, I want guidance anchored to the control it explains, so that I can tell a hint from the interface.
53. As a Builder-Reviewer, I want a dismissed coachmark to remove no capability, so that skipping a hint never costs me a feature.

### Material and theme

54. As a Builder-Reviewer, I want the rail's material to be warm, so that the tool and the work are visibly different substances.
55. As a Builder-Reviewer, I want the artifact served on its own white, so that judging it is not coloured by the tool that judges it.
56. As a Builder-Reviewer, I want dark mode to be the same design in different values, so that it is a counterpart rather than a second product.
57. As a Builder-Reviewer, I want the theme to be mine and remembered, so that the surface matches my machine.

### Icons and words

58. As a Builder-Reviewer, I want one icon set drawn to one weight, so that the surface reads as one product rather than an assembly.
59. As a Builder-Reviewer, I want each mode tile to have a filled and an outlined form, so that which tile is armed is visible without relying on colour alone.
60. As a Builder-Reviewer, I want Annotation states to keep their words, so that ten states are not asked of ten glyphs.
61. As a Builder-Reviewer, I want a repeated per-row action word to become an unambiguous icon, so that the same verb is not spelled out on every row.
62. As a Builder-Reviewer, I want no emoji anywhere in chrome, so that glyphs take the semantic colour and render the same everywhere.

### Honesty

63. As a Builder-Reviewer, I want a chip saying a note was written before this revision to appear only when that is true, so that a chip present on every row stops reading as noise.
64. As a Builder-Reviewer, I want the count that needs a decision to count only notes needing a decision, so that one badge states one claim.
65. As a Builder-Reviewer, I want the comparison control to serve the revision it names, so that "Before (947b935c)" shows 947b935c.
66. As a Builder-Reviewer, I want a note I write to be stamped with the revision I was looking at, so that my own note does not misrepresent what it is about.
67. As a Builder-Reviewer, I want the agent to be told the revision I actually annotated, so that it is not asked to change a revision I never saw.
68. As a Builder-Reviewer, I want reloading to remain my decision, so that the artifact is never replaced under me.

### Accessibility and keyboard

69. As a Builder-Reviewer, I want every icon-only control to carry an accessible name stating what it does, so that the surface is usable without seeing it.
70. As a Builder-Reviewer, I want a coachmark reachable and dismissible from the keyboard, so that guidance is not pointer-only.
71. As a Builder-Reviewer, I want Escape to unwind exactly one level, in a stated order, so that I can back out of what I opened without losing writing.
72. As a Builder-Reviewer, I want keys scoped to the editor that holds focus, so that Enter in one field does not act on another.
73. As a Builder-Reviewer, I want the mode island to stay pointer-reachable while focus is in a field, so that typing never strands me in a mode.
74. As a Builder-Reviewer, I want a Pass becoming ready to be announced where that changes the meaning of the surface, so that I am told rather than shown.
75. As a Builder-Reviewer, I want the gallery to render every component and state in both themes, so that drift is caught by a script rather than by me.

## Implementation Decisions

**Delivery intent follows from which act the Builder-Reviewer took.** Sending an open Pass is delivered as Next-Pass Intent, and a Replacement is delivered as Steering Intent. Neither is a choice offered to the Builder-Reviewer, and no intent selector exists. Asking for Another Pass is also Next-Pass Intent, and is Pass B: Pass A sends new notes and Replaces delivered ones.

**A Pass is a stored object with a lifecycle.** It carries an identity, the revision range it spans, its member Annotations, a state, and anchor-level outcome counts. The shape, which is decision-rich enough to record precisely:

```
Pass {
  passId, artifactId,
  fromRevision,                 // the revision its Annotations were written against
  toRevision,                   // the revision that answers it, once one has landed
  annotationIds: string[],
  state: 'open' | 'in-flight' | 'ready' | 'closed',
  outcome: { answered, untouched, gone },
  openedAt, closedAt?
}
```

`outcome` is anchor-level only, derived from Target Resolution: *answered* means
the anchor survived with changed evidence, *untouched* means it survived
unchanged, *gone* means it did not survive. It never means the agent fixed
anything, because nothing reports that. Pass state and closure are new
server-side capability; `DeliveryBatch` becomes a Pass and its delivery metadata
becomes an attribute of the Pass rather than the object itself.

**The vocabulary rename is a wide refactor, not a vertical slice.** One shared
union carries the state names, so the rename breaks the store, the migration map,
the rendered labels, the icon mapping, the gallery and the tests in one edit. It
is sequenced expand → migrate → contract: first accept both the old and the new
name, then write only the new one, then remove the old. The published envelope
schema keeps its `supersedes` field and the annotation-level field is renamed with
a read path that accepts the old name, because a wire name is a compatibility
surface rather than a word a Builder-Reviewer reads.

**The status line is derived, never stored.** It is computed from the open Pass's
state, the number of Annotations in it that have not been sent, and the agent
position report. It replaces the separate agent sentence, the send footer
paragraph and the duplicated count. Whether the agent is holding a call is stated
in it, because the delivery channel is a fact about this moment.

**The attention count is split into its three claims.** A note needing a decision,
a note written before the current revision, and a non-empty queue are three
different facts. Only the first is a count on the attention trigger; the other two
are stated where they belong — on the row, and on the send action.

**Candidate marks replace the chooser.** The overlay gains a candidate mark that
renders on the artifact for every candidate of an unresolved target, with a
numeral, and the row states that the target could not be matched in words. The
chooser component and its evidence pill are deleted. `RepointAction` re-points an
existing Annotation from the next selection; today every selection creates a new
draft, so this is an interface change in the selection path and not a new control.
Re-pointing writes the target and re-resolves, which clears the approval block.
Nothing in this iteration adds a Query the Builder-Reviewer can use to assert a
target is gone; that act is Pass B.

**The comparison control moves and the fact stays.** The before/after control is
placed in the stage's own top-edge chrome rather than at its lower-left corner,
where it competed with the mode island, the notice lane and the coachmark anchor.
The row states which revision its result came from. Storage gains a snapshot per
adopted revision, so the control can serve the revision it names; today exactly
one snapshot is written, at open, and it is skipped if the key exists.

**An Annotation is stamped with the revision actually being viewed.** Creation
stamps the session's adopted revision rather than the revision the session was
minted at, and the reload path updates the adopted revision only. This is a
one-line correction with wide consequences: it is what makes the
"written before this revision" chip mean anything, and it is what stops the agent
being handed the wrong revision.

**Notices become a rail-scoped region.** One notice at a time, at the rail's top
edge, never over the stage, the mode island or an open card. A notice is emitted
only where the row cannot show the outcome itself; the queued and delivered
confirmations are removed, because the row's own state pill carries them. A notice
carrying an action does not auto-dismiss.

**Guidance becomes pull-triggered coachmarks.** A coachmark is anchored to the
control it explains, is at most two lines, appears one at a time, and is triggered
by the first real use of that control rather than at launch. Each carries one
worded dismissal. Dismissal is remembered per device under a single namespaced
key rather than per artifact, which is what the current hint gets wrong: it
re-teaches on every new file. The overflow menu gains one entry that clears all
guidance. Being an anchored overlay rather than a paragraph of chrome, a coachmark
must be visually distinguishable from the interface it sits on.

**The rail takes `canvas`, and the token gains a consumer.** The rail's material
becomes the warm `canvas` primitive; raised content surfaces inside it stay
`surface`; the stage keeps `surface.sunken`. This is a token-role assignment, and
`design.md` §3 now requires that no component leaves `canvas` or `surface` without
a consumer.

**The icon set gains a filled variant.** Every mode-tile glyph ships a filled and
an outlined form, and the armed tile states itself by fill as well as by border
and cursor. The set otherwise keeps one stroke weight, one viewBox, one size
scale and `currentColor`. No emoji in chrome. Every icon-only control carries an
accessible name supplied by its caller.

**Annotation states keep their words.** Ten states are not asked of ten glyphs.
The icon work lands on the target line and on the repeated per-row action, where
the meaning is unambiguous and the redundancy is real.

**Nothing is listed that is not built.** The deferred `RelationGuide` family is
removed from the contract, and the code stops rendering a relation sentence that
no surface path can create. A component entry for something unreachable is a
promise the product cannot keep.

## Testing Decisions

A good test here drives the real surface and asserts what a Builder-Reviewer could
observe. It does not assert a component's internals, a class name, or the shape of
a store record. Where a fact is stored, the test reads it back through the surface
or the API rather than by importing the store.

**Three seams, all existing, no new ones.**

**`tests/browser-loop.test.ts` — the primary and highest seam.** It already drives
store → HTTP → shell → artifact layer end to end in a real browser, and it is
where every behaviour in this iteration is asserted: the status line for each of
open, in flight and ready; sending opening a Pass; a reload moving the Pass to
ready and closing nothing; a notice never covering the island; candidate marks
rendered on the artifact with no list and no figure; re-pointing clearing an
approval block; the coachmark appearing on first use and not at launch, dismissed
and not shown again for a second artifact; the renamed states read back off a
rendered row; and a note composed after a reload being stamped with the adopted
revision. Prior art is the existing send, amend, resolution and reload drives in
the same file.

**`tests/gallery-snapshot.test.ts` — the visual contract.** `design.md` §9 already
requires a scripted screenshot and token pass that fails on drift, and it already
runs. It is the only seam that can assert two of this iteration's decisions: the
rail's material moving to `canvas`, and the mode tiles gaining filled and outlined
forms. Prior art is the existing token baseline and gallery capture.

**`src/annotation/migrate.test.ts` — backward compatibility.** The rename is a wide
refactor, and this is the seam that proves the expand and contract steps keep
already-stored data loadable, in both axes the migration already handles: a legacy
status and a legacy verdict. It is also where the annotation-level `supersedes`
read path is proven against a record that still carries the old name. Prior art is
the existing legacy migration cases in the same file.

**Re-cut in the same change.** Every seam that asserts the deleted vocabulary: the
contract test's verdict loop, the browser loop's row assertions, the gallery's
state matrix, and the token baseline. `design.md` §9's gallery must render the new
components and states, so the screenshot baseline is regenerated deliberately and
the diff reviewed rather than accepted.

## Out of Scope

Pass B, which is named here so nothing is lost silently:

- **Revision comparison.** A real before/after diff at anchor level, and the
  Pass-outcome reporting derived from it. Pass A stores a snapshot per adopted
  revision and moves the control; it does not compare them or report what a
  revision answered.
- **Per-item accept and reopen.** A verdict has no inverse today — `verified` is
  terminal, `amend` refuses a judged Annotation, and there is no reopen path.
  Making a decision reversible is Pass B, together with the rule for what happens
  when a Builder-Reviewer changes their mind about an accepted note.
- **Declared Missing.** A Builder-Reviewer asserting that a target no longer
  exists is a new domain act, a new stored state and a new verb, and it must stay
  distinct from the `deleted` resolution the product derives from zero candidates.
  Pass A repairs a lost target by re-pointing only.

Also out of scope:

- **Relational Intent.** No relation is built and none is promised.
- **A push channel, subscription or wake mechanism.** The Check-In convention
  remains the only steering mechanism, and whether a real agent honours it is
  settled by a Verification Run rather than by this iteration.
- **A progress indicator, percentage or completion estimate for agent work.**
  Nothing reports progress; only a held call and a check-in timestamp exist.
- **Editing a delivered Annotation in place.** A Replacement closes it and states
  what replaced it.
- **Deleting a delivered Annotation, undoing a send, or reassigning a candidate
  after a verdict.**
- **A revision history, a second reviewer, or a lock or version check between two
  browser sessions.** Last-write-wins stays for now.
- **Multi-target composition from the surface.** One selection still composes one
  Annotation.
- **An `unreachable` artifact frame, a session expiry, and a real end-session
  call.**
- **Anything in `design.md` §10**, including a style-value editor, a ranked
  candidate list, a numeric confidence, decorative colour, or a platform form
  widget as a primary control.
- **Adding a design-system or component-library dependency.** The open-source
  review concluded that the valuable sources here are documentation and
  implementation patterns to imitate, not packages to adopt; the surface keeps
  its no-runtime-dependency posture for chrome.

## Further Notes

**Where the decisions came from.** The iteration follows three research documents
in `.scratch/surface-refinement/reviews/`: `uiux-research.md` (copy density,
first-run guidance, notice placement, comparison toggles, confidence display and
dense action rows, with sources), `oss-design-sources.md` (the open-source source
layer, with licence and maintenance state, and a verdict per source), and
`iteration-lifecycle-research.md` (how published products structure the iterative
review loop). Each carries a disclosure of what could not be verified. Two
findings changed the direction: reviewer-side regeneration is only a published
pattern when the reviewer is also the author, so a request-changes handoff is the
defensible shape here; and a numeric confidence that is not calibrated raises
automation bias rather than reducing it.

**The evidence for the lifecycle.** `.scratch/surface-refinement/reviews/lifecycle-trace.md`
traces every state, trigger, race and absent capability against the code with
`file:line` citations. Its findings are the basis for the three honesty defects
this iteration fixes, and its "what does not exist" section is the basis for Out
of Scope. It also records what it could not settle, including whether the
re-resolution candidate pool can ever fire the source-provenance anchor — it
cannot, because candidate extraction omits the source fields — which is part of
why the candidate list was unreadable and is recorded here so Pass B does not
inherit the assumption.

**Ordering.** `to-tickets` should sequence the vocabulary rename first as an
expand → migrate → contract wide refactor, then the Pass object as the one
genuinely vertical slice through store, HTTP, envelope, UI and tests, then one
grouped ticket for the deletions the contract already forbids. The previous
iteration produced twenty issues including several one-line deletions, and
independent review found fault with that ticketing; grouping the deletions is the
correction.

**What a Verification Run must prove.** One execution that launches the real
product and drives a mapped behaviour the way a Builder-Reviewer would, reporting
what it drove and what it could not reach honestly. It should cover: composing and
sending a Pass; the status line at each state; a reload moving a Pass to ready; a
candidate marked on the artifact and repaired by re-pointing; a coachmark on first
use and absent on a second artifact; a notice at the rail's top edge that does not
cover the island; and a note composed after a reload carrying the adopted
revision. Accessibility snapshots and stored-state read-backs are evidence; a
driven verdict path is Mechanical Verification and never Verified Intent.
