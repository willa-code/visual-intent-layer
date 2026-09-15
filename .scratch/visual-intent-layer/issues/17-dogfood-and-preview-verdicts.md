# 17: Dogfood against the baseline and judge the previews

**What to build:** Real corrections measured against the ticket 01 baseline decide whether the loop earns repeat use and which previews survive.

**Blocked by:** 01 (Record the screenshot-and-chat baseline), 09 (Build the target-resolution mutation benchmark), 10 (Try the three experimental Intent Previews), 14 (Teach the loop with a thin Skill and invocation eval), 15 (Instrument latency, reliability, and token-efficiency), 16 (Validate the core loop on pi)

**Status:** ready-for-human

- [ ] Representative corrections on real work record time to accepted correction, clarification turns, targeting failures, rejected revisions, and setup friction against the ticket 01 baseline
- [ ] Each of the three Intent Previews receives a documented keep-or-kill verdict against selection plus text
- [ ] Voluntary repeat use during dogfood is observed and written down as the early UI judgment
- [ ] Personal Proof completion (spec boundary items 1-10 as revised) is checked off or explicitly deferred with reasons

## Comments

Agent work in 8b70d52: comparison template + preview verdict table at .scratch/visual-intent-layer/dogfood.md; preview interactionEvidence recorded on envelopes; benchmark/eval/instrumentation signals in place. Real corrections, repeat-use observation, and keep-or-kill verdicts need the builder. Moved to ready-for-human.
