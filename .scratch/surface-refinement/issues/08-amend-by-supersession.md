# 08: Amending something sent supersedes it

**What to build:** A Builder-Reviewer can amend an Annotation they have already sent and that has not been verified. Amending supersedes the original — which keeps its note, its targets and its history as the record of what the agent was told — links the successor, and delivers the successor with Steering Intent through the named delivery path from issue 15. The original is never rewritten in place, and `PATCH` is guarded so a delivered Annotation cannot be edited through it. Because a trivial correction should not spawn a chain the agent has to read, the amendment is presented as editing a working copy with a compact view of what changed, the chain collapses into one row, and only the effective successor plus its lineage is delivered.

**Blocked by:** 06 (the row it is offered on), 15 (delivery by a named set)

**Status:** ready-for-agent

- [ ] An `Amend` action is offered on an Annotation that has been delivered and is not yet verified, and nowhere else
- [ ] Amending creates a new Annotation, marks the original `superseded`, and records the successor on the original
- [ ] The original's note, targets, relationships, attachments and history are unchanged by an amendment
- [ ] Only the effective successor is delivered, and it carries what it replaced; superseded ancestors are not delivered as separate instructions
- [ ] The chain reads as one row, and the row shows what replaced what without requiring the history to be opened
- [ ] The amendment is delivered with Steering Intent through the named delivery path, not by sending the whole queue
- [ ] `PATCH` on an Annotation that is neither draft nor queued is refused, and the refusal states why
- [ ] History for an in-place note change no longer records an event named `drafted`
- [ ] Driven live: a sent Annotation is amended, the stored state shows `superseded` with a successor, the successor carries the new note, and its batch intent is `steering`
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review, which accepted immutability as the storage rule but argued it was an expensive default interaction: making every delivered correction a new Annotation produces noisy chains and inflates what the agent has to read. The working-copy presentation leaves the storage rule intact — the record of what the agent was told still survives — while the interaction stays cheap.
