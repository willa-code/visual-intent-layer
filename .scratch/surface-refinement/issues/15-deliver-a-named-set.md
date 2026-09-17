# 15: Deliver a named set with a named intent

**What to build:** Delivery takes a set of Annotation ids and an intent, rather than only sending whatever happens to be queued. Amending one Annotation and asking an agent to stop are both deliveries of something other than the whole queue, and neither can be expressed through a path that throws when the queue is empty and always sends everything in it. The existing queue send becomes one caller of this path, so there is one place where a batch is built, stamped and awaited.

**Blocked by:** 07 (the delivery vocabulary)

**Status:** done

- [x] A delivery path takes an explicit set of Annotation ids and an explicit intent, and builds and stamps one batch for them
- [x] Sending the queue is implemented as one caller of this path, not as a parallel implementation
- [x] The path refuses an empty set with a stated reason, and cannot mark an Annotation delivered when its intent is `draft`
- [x] Idempotency is preserved: the same set and intent produce one batch, not two
- [x] A waiter held on the session is resolved by any delivery, so an amendment or an interruption also releases a held call
- [x] The intent is not inferred from the annotations, and a caller that does not name one is a compile error rather than a default
- [ ] Driven live: three deliveries — a queue send, a one-Annotation amendment, and a stop — each produce exactly one batch with the intent the caller named
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Added after independent review: `sendQueue` sends the whole queue and throws when it is empty, so it could not serve the amend or stop tickets, and neither ticket named how its delivery actually happens.

Resolved 2026-09-17: done. Sending and amending go through one delivery path taking an explicit set and intent; `.scratch/check-in-cursor` later proved the delivery order.

Deferred confirmation: the `Driven live` box is parked with the iteration's Verification Run.
