# 05: Take back an unread send, and re-point after a verdict

**What to build:** Until the agent has collected a delivery, the row's existing
remove action returns the note to the queue and marks the Pass withdrawn; the row
shows when the agent read it. Once it has been collected, a Replacement is the only
act. Reassigning a target after a verdict requires reopening the verdict first.

**Blocked by:** 02

**Status:** done

- [x] A Pass records when the agent collected it (a held call, `check_in` or `get_intent_status`), and the row shows that moment
- [x] While uncollected, removing a delivered note returns it to the queue and marks the Pass withdrawn, with the withdrawal in history
- [x] Once collected, the remove action is absent and a Replacement is offered; a delivered note is never deleted at the store level
- [x] Reassigning a candidate or target is offered only on an undecided note, or after its verdict has been reopened
- [x] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Collection, not acknowledgement, is the boundary, because acknowledgement is
optional and an agent can read a delivery without it.

Done 2026-09-18. `Pass` carries `collectedAt`, stamped by `AnnotationStore.collectPass`
wherever the agent reads a delivery: a held call returning the envelope, `check_in`,
`get_intent_status` and `acknowledge_intent`. `withdrawPass` returns the members to
the queue, clears their `passId`, records a `dequeued` event, and sets the Pass
`withdrawn` with a `withdrawn` event; it refuses a collected Pass or a judged
member. `repoint` now refuses a decided Annotation, and the surface offers
`Undo decision` on a decided row so re-pointing is reachable again. The row shows
`The agent read this …` once collected, and an icon-only **Take back this send**
while it is not. `CONTEXT.md` gains **Take Back** and the collection rule on
**Pass**; `design.md` §6 and §11 are amended; ADR-0028 records the decision.

One product gap surfaced while driving it: the shell's status poll refreshed only
the agent position, so a collection performed out of band never reached the ledger
and the take-back control lingered. `AnnotationStore` now counts its own revisions
and the session status reports one, so the shell re-reads the ledger when it
changes. Covered by four store tests, an MCP test that a status read collects the
Pass, and a browser-loop drive that offers Take back before the agent reads and
withholds it after.

**Verification Run, 2026-09-18.** Run
`.visual-intent-verify/runs/2026-09-18_00-58-35-closing-the-loop-2` found a second
defect while driving the take-back live: after a take-back, re-sending the same
note returned the **withdrawn** Pass by its batch idempotency key, so the note
stayed `queued` and never re-delivered. `markDelivered` now salts its key past a
withdrawn Pass — `batchIdempotencyKey(annotations, passId|sequence)` — and a store
test covers the re-send. The run drove `withdraw-pass` to `withdrawn` with the note
back in `queued`, then a new `in-flight` Pass on the re-send.