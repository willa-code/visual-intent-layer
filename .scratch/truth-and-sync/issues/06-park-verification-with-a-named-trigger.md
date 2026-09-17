# 06: Park verification with a named trigger

**What to build:** Every ticket and template that is waiting on a human or on a
verification pass says so, and names what unblocks it, instead of sitting in a triage
state that reads as active work.

**Status:** done

**Blocked by:** 01

- [x] The trigger is named exactly once and is the same everywhere: the Verification Run of the first feature spec after this one, `.scratch/several-targets-and-relations/`, plus maintainer time for the parts only a human can do
- [x] `visual-intent-layer/01` (record the screenshot-and-chat baseline) is `deferred`, triggered by that run and by maintainer time
- [x] `visual-intent-layer/16` (validate the core loop on pi), `visual-intent-layer/17` (dogfood against the baseline), `review-surface/17` (re-record dogfood and preview verdicts), `multi-harness-setup/06` (live verification on four harnesses) and `harness-detection/07` (live detection on a multi-harness machine) are `deferred` with the same trigger
- [x] `surface-refinement/13` (a Verification Run over the whole loop) is `deferred` with the same trigger
- [x] `.scratch/visual-intent-layer/baseline.md` states the deferral and the trigger where it currently says `awaiting-human`
- [x] `.scratch/visual-intent-layer/dogfood.md` states the deferral and the trigger, and its preview-verdict table is marked as superseded by `several-targets-and-relations` rather than left as an unanswerable question
- [x] No acceptance box is ticked by this ticket, and no verification is performed
- [x] A deferred ticket is not a claim that the behaviour is verified: each keeps its `## Comments` disclosure of what is undriven

## Comments

The maintainer decision this records: verifying work can be paused and deferred, and
the next spec's Verification Run performs an overall verification. That is consistent
with the maintenance skill, which says dogfooding is what closes `ready-for-human`
verification tickets, and with ADR-0017, which keeps a run distinct from Verified
Intent.

`review-surface/17` and `visual-intent-layer/17` both ask for preview verdicts, and the
preview table in `dogfood.md` names drag-to-reorder, align and match-size. Those three
previews never reached the surface: the `preview` object existed only in
`schema/envelope-v0.1.schema.json:110`, and `0.2` and `0.3` do not carry it. So the
table cannot be filled as written; it is superseded by the relation gesture's own
reversible preview, which `several-targets-and-relations` owns.

Done 2026-09-17. `visual-intent-layer/01`, `visual-intent-layer/16`, `visual-intent-layer/17`, `review-surface/17`, `multi-harness-setup/06`, `harness-detection/07` and `surface-refinement/13` are `deferred`, each with the same `Trigger:` line naming the Verification Run of `.scratch/several-targets-and-relations/` plus maintainer time. `.scratch/visual-intent-layer/baseline.md` and `dogfood.md` state the deferral and the trigger, and `dogfood.md`'s preview table is marked superseded. No acceptance box was ticked and no verification was performed.
