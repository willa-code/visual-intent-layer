# Closing the loop: changing your mind, and saying what a revision answered

Status: needs-triage

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
