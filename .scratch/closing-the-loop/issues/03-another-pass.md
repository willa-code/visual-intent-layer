# 03: Another Pass

**What to build:** From a ready Pass, asking the agent to try again opens a **new**
Pass carrying every member not verified, not obsolete and not replaced, delivered
as Next-Pass Intent. The current Pass closes with its outcome frozen and keeps its
own rows and counts.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Pass-level act opens a new Pass from a ready Pass, carrying its open members
- [ ] The new Pass is delivered as Next-Pass Intent and appears as its own ledger group
- [ ] The old Pass closes with its outcome and result revision frozen, and its members stay readable under it
- [ ] A member carried into the new Pass is not lost from the old Pass's record, and the batch idempotency key cannot return the closed Pass
- [ ] Nothing verified, obsolete or replaced is carried
- [ ] A Pass with no open members refuses the act with a stated reason
- [ ] `CONTEXT.md`'s Another Pass matches what the surface does
- [ ] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Membership is Pass-side and dated so the old Pass keeps its own rows and counts.