# 05: The record survives a boundary

**What to build:** A Target reached through a frame stores the artifact's own address plus
the ordered chain of documents reached through, each with its own address and scroll, so it
can be re-found after a revision and its unresolved reason is true. The envelope gains this
as a versioned addition: every existing field keeps its shape, older records still read, and
the same shape is left able to carry the backlog's **Declared state beyond the address**
item later rather than a second expansion.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Runtime State Evidence keeps the artifact's own address in its existing field, and gains the ordered chain of documents reached through, each with its own address and scroll
- [ ] A Target reached through a frame re-resolves to the same node after a revision, with its anchors qualified by the boundary rather than matching a lookalike in the artifact document
- [ ] An unresolved Target reached through a frame states the true cause: the application's address moved, a named frame navigated, or nothing moved and the node is gone
- [ ] The envelope version is bumped for the addition; an envelope written before the bump still validates and migrates with unchanged behaviour
- [ ] A new ADR records the decision, and `CONTEXT.md` and `design.md` are amended so Runtime State Evidence names the chain
- [ ] No second evidence expansion is introduced, so the declared state beyond the address has one place to land
- [ ] Covered by schema, migration and resolution tests

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**.
Folding the frame into the single address string was the minimalist's dissent and is
refused: the derived state label compares that string to the address on screen, so a
composite would report a state change for every frame Target even when nothing moved.
