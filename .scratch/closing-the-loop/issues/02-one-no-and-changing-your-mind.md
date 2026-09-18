# 02: One "no", and changing your mind about a judged note

**What to build:** The verdict vocabulary has one "no": `Reject` retires into
**Not Fixed**, with **Obsolete** as the abandonment. A judged note can be reopened
in a single act, and if its Pass was closed that act reopens the Pass. A Pass may
be closed with members still undecided, and those read **never decided**. A closed
Pass freezes and records close and reopen as history events.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `VerificationVerdict` no longer carries `reject`; stored `rejected` records migrate to `not-fixed`
- [x] Reopening a verdict returns the Annotation to the undecided state without re-delivering it
- [x] Reopening a verdict on a closed Pass reopens the Pass as a consequence; no separate Reopen control exists
- [x] Marking Not Fixed delivers nothing by itself, and the row offers adding to the note or re-annotating as the natural next acts
- [x] Closing a Pass with undecided members is allowed, and those members read "never decided" rather than "to decide"
- [x] A closed Pass refuses later resolution writes: its outcome and result revision stop changing
- [x] Opening and closing a Pass are recorded as history events rather than one overwritten timestamp
- [x] `CONTEXT.md` presents Not Fixed as the single "no" and no longer treats Reject as a distinct verdict
- [x] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Not Fixed keeps ADR-0019's meaning that it asks for no new delivery; the three
next acts are another Pass, adding to the note, or re-annotating.

Done 2026-09-18. `Reject` retires and stored `rejected` states and `reject` verdicts
read as Not Fixed. A decided row keeps its verdict controls with the recorded
decision marked, so choosing another changes it in one act; the store reopens the
verdict and the Pass it closed first, and `POST /api/annotations/:id/reopen` exposes
the inverse on its own. A Pass carries `history` (`opened`/`closed`/`reopened`),
closing is allowed with undecided members that then read "never decided", and a
closed Pass refuses later resolution writes so its counts and result revision
freeze. Two corrections the ticket's own acceptance exposed: a decided row is no
longer hidden behind the closed toggle (only Replaced and obsolete are), because
hiding it hid the act of changing it; and `Amend` now stays on a Not Fixed row,
because adding to the note is the sharper attempt Not Fixed asked for, which meant
loosening `amend`'s guard from `isVerification` to a new `isAmendable`. ADR-0025
records the decision, ADR-0019 carries an amendment, and `design.md` §6 and §11 are
amended. Driven by six new store tests and the Lever's verdict drive, which now
re-decides a row and then amends it. The darwin gallery baselines were regenerated
for the new recorded-state panel; the linux pair must be taken from CI's
`gallery-actual` by the established path.