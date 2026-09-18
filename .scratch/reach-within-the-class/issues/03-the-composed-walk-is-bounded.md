# 03: The composed walk is bounded, and says so

**What to build:** The composed walk has one fixed order, the top document first, and one
shared budget of 2000 nodes across everything it visits, with a visited-document set and a
nesting cap of the artifact document plus one frame level. Reaching the bound is stated as
what it is: the extraction's truncation is recorded as a fact and the row says so, the
resolution thresholds are never lowered, and nothing skipped by the bound is presented as
a marked candidate. The operator never meets a sentence about a bound they cannot raise.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The composed walk visits documents in one fixed order with the top document first, and spends a single 2000-node budget across all of them
- [ ] A visited-document set and a one-frame-level nesting cap stop an artifact that embeds its own URL from recursing
- [ ] Reaching the budget records a truncation fact, and a Target outside the searched portion reads as unresolved with that fact rather than as not found
- [ ] No resolution threshold is lowered at the bound, and no skipped node becomes a candidate mark
- [ ] Extraction, marking and re-finding all derive a node's identity from the same enumeration, so a bound never re-binds an id to a different node
- [ ] Pointing and boxing continue to work when the bound is reached
- [ ] Covered by grounding and resolution tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**.
2000 is the shipped number, kept so nothing that resolves today changes behaviour; the
advocate's larger budget (5000 nodes, depth 8) is the kept dissent. A clock is
disqualified because a candidate's id is its position in one enumeration.
