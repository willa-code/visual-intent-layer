# 16: Re-cut the test seams

**What to build:** The gallery's screenshot and token baselines are regenerated once, after the UI tickets have settled, by whoever lands last. Every ticket re-cuts the tests it breaks as part of its own change, so this ticket owns only what no single ticket can: the baselines, and the cross-cutting sweep that proves the suite is coherent as a whole.

**Blocked by:** 01–12, 14, 15, 19, 20

**Status:** done

- [x] `tests/browser-loop.test.ts` no longer clicks an `Element tool` button or a `Verify` button, and drives the mode island and the one-list rail instead
- [x] The browser loop drives a full round trip through the new vocabulary and reads the result back from stored state
- [x] `tests/lever-contract.test.ts` no longer asserts that all three intents deliver: a `draft` intent creates no batch
- [x] `tests/host/capabilities.test.ts` asserts the surviving declaration path for `embeddedUI` and `subscriptions`, and no longer imports `deliveryPlan`
- [x] A test asserts that a delivered Annotation cannot be edited in place, and that `PATCH` refuses it with a stated reason
- [x] A test asserts that an interruption is never carried in an envelope, and that the envelope still refuses zero Annotations
- [x] A test asserts that reloading does not break annotated-route authorisation, and that before and after do not resolve to the same revision
- [x] The gallery renders no component that no longer exists, and covers every component and state `design.md` §6 lists
- [x] The gallery's screenshot and token baselines are regenerated once, at the end, and the pass fails on drift rather than regenerating silently — including when the baseline file is absent, which today writes rather than fails
- [x] The suite passes from a clean checkout with no baseline files present

## Comments

Added after independent review. The review named the exact seams — `tests/browser-loop.test.ts` clicking the deleted tool and the deleted state switch, `tests/lever-contract.test.ts` looping all three intents, `tests/host/capabilities.test.ts` importing what issue 07 deletes — and that no ticket owned any of them. One of the review's claims was checked and rejected: it said the gallery pass regenerates missing baselines so drift passes, but the baseline is only auto-written when the file is absent or `UPDATE_GALLERY=1`; with the file present, drift fails. The residual risk is that nobody owns regenerating it, which this ticket closes.

Resolved 2026-09-17: done. `tests/browser-loop.test.ts`, `tests/lever-contract.test.ts`, the capability test and the gallery baselines were re-cut in `14a73a1`; `surface-refinement-pass-a` re-cut them again in `2f03186`.
