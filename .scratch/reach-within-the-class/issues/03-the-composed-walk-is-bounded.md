# 03: The composed walk is bounded, and says so

**What to build:** The composed walk has one fixed order, the top document first, and one
shared budget of 2000 nodes across everything it visits, with a visited-document set and a
nesting cap of the artifact document plus one frame level. Reaching the bound is stated as
what it is: the extraction's truncation is recorded as a fact and the row says so, the
resolution thresholds are never lowered, and nothing skipped by the bound is presented as
a marked candidate. The operator never meets a sentence about a bound they cannot raise.

**Blocked by:** 01

**Status:** done

- [x] The composed walk visits documents in one fixed order with the top document first, and spends a single 2000-node budget across all of them
- [ ] A visited-document set and a one-frame-level nesting cap stop an artifact that embeds its own URL from recursing
- [x] Reaching the budget records a truncation fact, and a Target outside the searched portion reads as unresolved with that fact rather than as not found
- [x] No resolution threshold is lowered at the bound, and no skipped node becomes a candidate mark
- [x] Extraction, marking and re-finding all derive a node's identity from the same enumeration, so a bound never re-binds an id to a different node
- [x] Pointing and boxing continue to work when the bound is reached
- [x] Covered by grounding and resolution tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**.
2000 is the shipped number, kept so nothing that resolves today changes behaviour; the
advocate's larger budget (5000 nodes, depth 8) is the kept dissent. A clock is
disqualified because a candidate's id is its position in one enumeration.

2026-09-18 — status `ready-for-agent` → `done`, six of seven boxes ticked.

Deferred confirmation: the unticked box, "A visited-document set and a one-frame-level
nesting cap stop an artifact that embeds its own URL from recursing", cannot be delivered
here and moves to ticket `06`. Both halves of it are about *documents*, and no document
other than the artifact's own is traversed until `06` crosses a frame boundary, so a
visited-document set over one document would be dead code. `06` is blocked by `02` and `05`,
so it is the first ticket in which the condition can exist. The first box's "across all of
them" therefore reads, until then, as the whole composed tree inside one document; the
frame-level half of that box moves with the same correction, and `06` carries a comment
recording the addition.

What landed: `composedElements` reports whether it stopped early, `extractCandidates`
returns that beside the candidates, and the budget is one named `WALK_LIMIT` shared with
`elementByNodeId` so extraction and re-finding cannot drift apart. The fact travels on the
candidates message and the shell states it in two places — the row's resolution word reads
**Not in the part of this revision the surface read** under a new `unread` styling label
rather than claiming **Deleted**, and both the row's hint and the approval wall say the same
words. Truncation deliberately outranks the state-only reading: a partial read is the
precondition on every other conclusion, and lookalike candidates found inside the part that
*was* read are not evidence about a node outside it. Proven by four grounding tests (the
budget, no truncation when the walk finishes inside it, the interaction layer not spending
the budget, and a candidate id resolving to its own element) and a browser-loop drive over a
2500-row roster that points past the budget, sends, reloads and reads `data-label="unread"`
back with Approve still blocked.
