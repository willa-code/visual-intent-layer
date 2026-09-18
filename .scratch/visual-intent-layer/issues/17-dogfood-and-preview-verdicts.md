# 17: Dogfood against the baseline and judge the previews

**What to build:** Real corrections measured against the ticket 01 baseline decide whether the loop earns repeat use and which previews survive.

**Blocked by:** 01 (Record the screenshot-and-chat baseline), 09 (Build the target-resolution mutation benchmark), 10 (Try the three experimental Intent Previews), 14 (Teach the loop with a thin Skill and invocation eval), 15 (Instrument latency, reliability, and token-efficiency), 16 (Validate the core loop on pi)

**Status:** superseded

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [ ] Representative corrections on real work record time to accepted correction, clarification turns, targeting failures, rejected revisions, and setup friction against the ticket 01 baseline
- [ ] Each of the three Intent Previews receives a documented keep-or-kill verdict against selection plus text
- [ ] Voluntary repeat use during dogfood is observed and written down as the early UI judgment
- [ ] Personal Proof completion (spec boundary items 1-10 as revised) is checked off or explicitly deferred with reasons

## Comments

Agent work in 8b70d52: comparison template + preview verdict table at .scratch/visual-intent-layer/dogfood.md; preview interactionEvidence recorded on envelopes; benchmark/eval/instrumentation signals in place. Real corrections, repeat-use observation, and keep-or-kill verdicts need the builder. Moved to ready-for-human.

Superseded: the recorded dogfood and Intent Preview verdicts were produced against a Review Surface whose JavaScript never executed, so they cannot be carried forward, and the preview verdicts are structurally obsolete now that previews are the relation input. Both must be re-recorded (ADR-0016).

See `.scratch/review-surface/spec.md`.

Deferred 2026-09-17: dogfooding against the baseline and the preview verdicts are parked until the next spec's Verification Run plus maintainer time. The preview table in `.scratch/visual-intent-layer/dogfood.md` is superseded rather than unanswerable: the `preview` object left the wire at `schema/envelope-v0.2.schema.json`, and the reversible preview folded into the relation gesture owned by `.scratch/several-targets-and-relations/`.

2026-09-18 — status `deferred` → `superseded`, on a maintainer decision that the live pending items should be settled rather than left in triage. All four boxes have a later owner. Re-recording the corrections against a baseline, and observing voluntary repeat use, are `.scratch/review-surface/issues/17` (which explicitly discards the old dogfood record and re-records it fresh) together with `.scratch/visual-intent-layer/issues/01` (the baseline those corrections are measured against). The preview verdicts are structurally obsolete, as the deferral above already says. The fourth box, Personal Proof completion for this spec's boundary items 1-10, cannot outlive the spec it belongs to: `visual-intent-layer/spec.md` is `superseded in part`, and Artifact Mode, the vocabulary those boundary items are written in, was deleted by ADR-0020. Nothing here stands on its own, so the whole ticket is superseded rather than partly absorbed.
