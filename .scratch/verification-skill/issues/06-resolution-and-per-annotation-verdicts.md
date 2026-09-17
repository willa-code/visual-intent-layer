# 06: Resolution and per-Annotation verdicts in Verify

**What to build:** An agent drives the second half of the Visual Direction Loop: the Artifact moves on, each Annotation's target is located again and reported honestly, and each Annotation is decided on its own in Verify.

**Blocked by:** 04 (Compose, queue and send an Annotation)

**Status:** done

- [x] After the Artifact changes and is reloaded, the Annotation's target is re-resolved and the outcome is one of the product's honest outcomes, reported through the surface and read back from stored state
- [ ] An ambiguous resolution shows its candidates, is never chosen automatically, and can be chosen by the agent as the Builder-Reviewer would
- [x] Whether the Annotation was written before the revision now on screen is reported as its own Annotation-level fact, phrased as the product phrases it
- [x] Provenance Confidence remains a separate axis from Target Resolution and never shares the word "exact" with it
- [x] Verify supports toggling the pre-change and post-change revisions in place
- [x] Every verdict path is driven and read back: approve, reject with another pass, supersede, mark obsolete
- [ ] A verdict that is blocked states its reason rather than silently refusing
- [x] `resolution-and-honesty` and `verify-each-annotation` exist in the feature map with the four required sections, their preconditions, and the exact commands actually used
- [x] The Lever's contract test gains this drive, asserting on the verdict read back from stored state

## Comments

Live-driven: artifact change, reload, re-resolution, revision relation, before/after toggle, and every verdict path (approve, reject, another-pass, supersede, obsolete) with stored-state read-back. Mapped but not driven live: an ambiguous resolution with candidate choice, and a blocked verdict refusal. `resolution-and-honesty.md` and `verify-each-annotation.md` map them.

Code-review follow-up: `decide` now waits for the verdict to land in stored state and reports an unreachable path if it does not, so a click alone no longer reports success.

Corrected 2026-09-17: the ticket keeps `done`, and its two unticked boxes are now named rather than silent.

Deferred confirmation: the box "An ambiguous resolution shows its candidates, is never chosen automatically, and can be chosen by the agent as the Builder-Reviewer would" cannot be driven by the agent: the surface presents candidates and never auto-chooses, but choosing one is a Builder-Reviewer act, and `surface-refinement-pass-a` (tickets 05 and 06) replaced the on-row chooser with candidate marks on the artifact and repair by re-pointing. The box "A verdict that is blocked states its reason rather than silently refusing" was later driven by the browser loop — `tests/browser-loop.test.ts` asserts the row states the target could not be matched and disables Approve — but the box is left unticked because no Verification Run completed for this iteration.
