# Closing the loop: changing your mind, and saying what a revision answered

Status: ready-for-agent

Scope accepted; the design and the tickets are not written. This file exists because
each item below is either promised by a normative document today or named as Pass B by
the iteration that deferred it, and neither should sit unowned.

## Why it exists

`surface-refinement-pass-a/spec.md` named these in its Out of Scope, so this spec is the
debt that iteration recorded:

- **Revision comparison.** Pass A stores a snapshot per adopted revision and moves the
  control; it does not compare anchors or report what a revision answered.
- **Per-item accept and reopen.** `amend` refuses a judged Annotation
  (`src/annotation/store.ts:189`) and `verified` is terminal, so a verdict has no
  inverse.
- **Declared Missing.** A Builder-Reviewer asserting a target no longer exists is a new
  domain act, new stored state and a new verb, and must stay distinct from the `deleted`
  resolution the product derives from zero candidates.
- **Reassign a candidate after a verdict**, and **undo a send or delete a delivered
  Annotation**.

Three of those are more than debt, because the contract already states them.
`design.md:231` says the Builder-Reviewer "points at the right target to re-point the
Annotation, or declares it missing", `:386` lists "approximating a missing target rather
than showing it as missing" as an anti-pattern, and `:414` repeats it. `CONTEXT.md`
defines **Another Pass** as an act, while the store offers only `closePass`
(`store.ts:468`) and `another-pass` survives as a legacy verdict alias
(`migrate.ts:152,198`; `store.ts:612,638`). `design.md` §6 lists
`ArtifactFrame | loading, ready, unreachable, policy-blocked, changed`, and the
`unreachable` state exists only as a string in the gallery's hint text
(`src/ui/gallery.ts:310`).

The half that does ship is the Pass outcome: `answered`, `untouched` and `gone` are
derived from Target Resolution (`store.ts:499-513`) and rendered in the Pass header
(`components.ts:514`). `design.md` §5's composition diagram and §6's `OverlayMark` also
promise pass-outcome marks on the artifact, which do not exist.

## What it will build

- **Declared Missing**, as an act distinct from the derived `deleted`, with a stated
  effect on approval.
- **Another Pass**: asking the agent to attempt the open Annotations of the current Pass
  again, delivered as Next-Pass Intent, as the Pass-level act ADR-0019 describes.
- **Per-item accept and reopen**: an inverse for a verdict, and the rule for changing
  your mind about an accepted note.
- **Anchor-level revision comparison**: what a revision answered, per anchor, rather than
  a swap between two renders.
- **Pass-outcome marks** on the artifact — or an amendment to `design.md` §5 and §6 that
  removes them, because the Pass header already states the counts.
- **`ArtifactFrame.unreachable`**: the frame's honest failure state, with its triggers
  named.
- **Reassign a candidate after a verdict**, **undo a send**, and **delete a delivered
  Annotation**.
- **Session expiry**, so a session that is never ended does not authorize forever. The
  revocation itself lands in `.scratch/truth-and-sync/issues/09`; expiry is the other
  half.

## Decided already

Decided 2026-09-18, from this spec's own Open list. Each decision was reviewed
independently by three lenses — a minimalist interaction designer, a sceptical
user advocate and a precision engineer — whose POVs are kept in
`.scratch/closing-the-loop/advisors/`.

- **Declared Missing is an act, not a label.** It is stored per target on the
  Annotation with the revision it was made against, offered only where Target
  Resolution found zero candidates, reads in its own words, clears that anchor's
  approval blocker, and travels in the next envelope so the agent is told.
- **A verdict is a judgment, never a fact.** Changing one never moves the Pass
  outcome counts. There is one "no": `Reject` collapses into **Not Fixed**, and
  **Obsolete** stays the abandonment. Marking Not Fixed delivers nothing by
  itself; from it the Builder-Reviewer adds to the note, re-annotates, or asks for
  another Pass, in that order of likelihood.
- **Changing a verdict is one act, and closing is structural.** A changed verdict
  reopens its closed Pass as a consequence, with no separate Reopen control.
  Closing a Pass with undecided members is allowed and those members read **never
  decided**. A closed Pass refuses later resolution writes, and close and reopen
  are history events rather than one overwritten timestamp.
- **Another Pass is a new Pass.** It carries every member not `verified`, not
  `obsolete` and not `replaced`; the current Pass closes with its outcome frozen.
  Membership is Pass-side and dated, so the old Pass keeps its own rows and counts
  and the batch idempotency key cannot hand back a closed Pass.
- **The outcome words describe the evidence, not the request.**
  `answered / untouched / gone` become **changed / same / not found**. Each anchor
  keeps its resolution word and gains the comparison; a target that only moved
  reads `same`; `not found` covers what the row separately names as ambiguous,
  deleted or declared missing. Amends ADR-0019's wording and `design.md` §5/§6.
- **Withdraw is bounded by collection, not acknowledgement.** Until the agent has
  collected a delivery, the row's existing remove action returns the members to
  the queue and the Pass is marked withdrawn; after that a Replacement is the only
  act. Reassigning a target after a verdict requires reopening the verdict first.
- **A dead session is a surface state, not a frame state.** Session ended or
  expired is a whole-surface terminal state with one action — open this artifact
  again over the same stored notes — never `ArtifactFrame.unreachable`, which is
  the artifact fetch failure alone, with its trigger named.
- **Nothing derived is drawn on the artifact.** Amend `design.md` §5 and §6 to
  remove the pass-outcome marks and state the rule: every mark on the artifact is
  something the Builder-Reviewer can act on (target, candidate, relation ghost).
- **Expiry is idle time, and it announces itself.** A session expires after seven
  days without a human act, never renewed by the background status poll, refused
  exactly like an ended session, with the refusal naming its cause. When it
  happens while the surface is open, the surface says so rather than failing
  silently.

## Open before tickets can be written

- Declared Missing's representation: a stored act on the Annotation, or a Builder-Reviewer
  query that records a resolution — and how either stays distinct from derived `deleted`.
- Whether reopening a verdict reverses the Pass outcome counts, and whether closing a
  Pass freezes its members.
- Whether Another Pass re-delivers the same Pass or opens a new one carrying its
  Annotations.
- Where the anchor-level comparison is shown, and what it says when a target moved
  without being answered.
- Whether undo-a-send reverses at the store level or is expressed as a Replacement, given
  that `design.md` §10 forbids editing a delivered Annotation in place.
- The `unreachable` frame's triggers: an upstream failure, an ended session, or an
  expired capability.

## Out of scope

- Relational Intent and multi-target composition: `.scratch/several-targets-and-relations/`.
- Shadow roots, same-origin frames and virtualized rows:
  `.scratch/reach-within-the-class/`.
- Redaction before send, a second reviewer and concurrency, and Windows and Linux depth:
  triggered later.
- Proof and measurement, which remain parked.

## Comments

2026-09-18 — status `needs-triage` → `ready-for-agent`. Every item in *Open before
tickets can be written* is answered in **Decided already** above; the Open list is
kept as the record of what was open. The three independent reviews behind the
decisions are in `.scratch/closing-the-loop/advisors/`. Two consequences worth
naming: the Pass outcome vocabulary is amended away from `answered` because the
product cannot know a note was satisfied, and `Reject` retires in favour of
`Not Fixed`, which `CONTEXT.md` already defines and which no longer auto-delivers.
