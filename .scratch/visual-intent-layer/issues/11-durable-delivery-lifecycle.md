# 11: Make Draft and Next-Pass Intent durable and idempotent

**What to build:** Intent the Builder-Reviewer has not sent yet survives crashes and restarts, delivery timing stays honest per host, and disruptive stopping is never accidental.

**Blocked by:** 04 (Submit written direction and deliver the envelope), 05 (Observe revisions, re-resolve targets, verify by hand)

**Status:** ready-for-agent

- [ ] Draft Intent saves locally with no agent-side effect; Next-Pass Intent waits in a durable queue for a later turn
- [ ] Killing and restarting the process at any lifecycle boundary loses no acknowledged intent and duplicates none
- [ ] Steering is offered only where the host exposes it and is labelled as next-safe-boundary, never instant cancellation
- [ ] Review Interruption is an explicit disruptive action shown only where it can be represented honestly
