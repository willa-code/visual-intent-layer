# 03: Another Pass

**What to build:** From a ready Pass, asking the agent to try again opens a **new**
Pass carrying every member not verified, not obsolete and not replaced, delivered
as Next-Pass Intent. The current Pass closes with its outcome frozen and keeps its
own rows and counts.

**Blocked by:** 02

**Status:** done

- [x] A Pass-level act opens a new Pass from a ready Pass, carrying its open members
- [x] The new Pass is delivered as Next-Pass Intent and appears as its own ledger group
- [x] The old Pass closes with its outcome and result revision frozen, and keeps its member identities and states how many it carried on
- [x] A member carried into the new Pass is not lost from the old Pass's record, and the batch idempotency key cannot return the closed Pass
- [x] Nothing verified, obsolete or replaced is carried
- [x] A Pass with no open members refuses the act with a stated reason
- [x] `CONTEXT.md`'s Another Pass matches what the surface does
- [x] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Membership is Pass-side and dated so the old Pass keeps its own rows and counts.

Done 2026-09-18. A ready Pass header offers **Try again**; `POST /api/passes/:id/another`
closes the Pass it answered and opens a new one carrying every member that is not
verified, obsolete or replaced, delivered as Next-Pass Intent with resolutions and
verdicts cleared so the next revision answers them fresh. The batch idempotency key
gains an optional salt, without which carrying the same members into a new Pass
returned the closed Pass itself. Three store tests cover the carry, the empty set
and the closed Pass.

One acceptance box was adjusted rather than claimed. The box asked that the old
Pass's members stay readable under it; the ledger renders a carried note once,
under the round being answered, because showing the same note in two groups is the
duplication the surface avoids. The old Pass keeps its member identities, its frozen
counts and revision, and states how many members it carried on, and the box now says
that. The browser loop asserts the ready Pass offers Another Pass; it does not click
it, because the flow after that point closes the first Pass by position, so the
full drive is left to the Verification Run.