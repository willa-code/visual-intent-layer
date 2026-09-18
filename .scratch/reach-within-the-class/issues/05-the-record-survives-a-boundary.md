# 05: The record survives a boundary

**What to build:** A Target reached through a frame stores the artifact's own address plus
the ordered chain of documents reached through, each with its own address and scroll, so it
can be re-found after a revision and its unresolved reason is true. The envelope gains this
as a versioned addition: every existing field keeps its shape, older records still read, and
the same shape is left able to carry the backlog's **Declared state beyond the address**
item later rather than a second expansion.

**Blocked by:** 01

**Status:** done

- [x] Runtime State Evidence keeps the artifact's own address in its existing field, and gains the ordered chain of documents reached through, each with its own address and scroll
- [x] A Target reached through a frame re-resolves to the same node after a revision, with its anchors qualified by the boundary rather than matching a lookalike in the artifact document
- [x] An unresolved Target reached through a frame states the true cause: the application's address moved, a named frame navigated, or nothing moved and the node is gone
- [x] The envelope version is bumped for the addition; an envelope written before the bump still validates and migrates with unchanged behaviour
- [x] A new ADR records the decision, and `CONTEXT.md` and `design.md` are amended so Runtime State Evidence names the chain
- [x] No second evidence expansion is introduced, so the declared state beyond the address has one place to land
- [x] Covered by schema, migration and resolution tests

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**.
Folding the frame into the single address string was the minimalist's dissent and is
refused: the derived state label compares that string to the address on screen, so a
composite would report a state change for every frame Target even when nothing moved.

2026-09-18 — status `ready-for-agent` → `done`, every box ticked. `Runtime State
Evidence` keeps `address` and gains `documents`: an ordered chain of the frames the
Target was reached through, each with its composed frame path, its own address
relative to the artifact base, and its scroll. The envelope minor version moves to
`0.4` (`schema/envelope-v0.4.schema.json`, regenerated types), `0.3` and `0.2`
still validate and read as `0.4`, and ADR-0030 records the decision. Folding the
frame into the one address string was refused as the spec decided: the derived
state label compares that string, so a composite would fire for every frame Target.
`runtimeStateMoved` now compares the recorded chain against the viewed chain by
frame path, and `frameStateChange` lets an unresolved Target say that a named frame
navigated rather than that nothing moved. Proven by `src/envelope/envelope.test.ts`,
`src/resolution/model.test.ts`, `src/resolution/resolve.test.ts` and the browser
loop's frame drive, which reads the stored `documents[0].path` and `address` back.
