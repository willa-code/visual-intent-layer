# 02: One "no", and changing your mind about a judged note

**What to build:** The verdict vocabulary has one "no": `Reject` retires into
**Not Fixed**, with **Obsolete** as the abandonment. A judged note can be reopened
in a single act, and if its Pass was closed that act reopens the Pass. A Pass may
be closed with members still undecided, and those read **never decided**. A closed
Pass freezes and records close and reopen as history events.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `VerificationVerdict` no longer carries `reject`; stored `rejected` records migrate to `not-fixed`
- [ ] Reopening a verdict returns the Annotation to the undecided state without re-delivering it
- [ ] Reopening a verdict on a closed Pass reopens the Pass as a consequence; no separate Reopen control exists
- [ ] Marking Not Fixed delivers nothing by itself, and the row offers adding to the note or re-annotating as the natural next acts
- [ ] Closing a Pass with undecided members is allowed, and those members read "never decided" rather than "to decide"
- [ ] A closed Pass refuses later resolution writes: its outcome and result revision stop changing
- [ ] Opening and closing a Pass are recorded as history events rather than one overwritten timestamp
- [ ] `CONTEXT.md` presents Not Fixed as the single "no" and no longer treats Reject as a distinct verdict
- [ ] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Not Fixed keeps ADR-0019's meaning that it asks for no new delivery; the three
next acts are another Pass, adding to the note, or re-annotating.