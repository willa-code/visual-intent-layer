# 05: Take back an unread send, and re-point after a verdict

**What to build:** Until the agent has collected a delivery, the row's existing
remove action returns the note to the queue and marks the Pass withdrawn; the row
shows when the agent read it. Once it has been collected, a Replacement is the only
act. Reassigning a target after a verdict requires reopening the verdict first.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Pass records when the agent collected it (a held call, `check_in` or `get_intent_status`), and the row shows that moment
- [ ] While uncollected, removing a delivered note returns it to the queue and marks the Pass withdrawn, with the withdrawal in history
- [ ] Once collected, the remove action is absent and a Replacement is offered; a delivered note is never deleted at the store level
- [ ] Reassigning a candidate or target is offered only on an undecided note, or after its verdict has been reopened
- [ ] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Collection, not acknowledgement, is the boundary, because acknowledgement is
optional and an agent can read a delivery without it.