# 04: Pointing gestures, and a drawn area that resolves to what is inside it

**What to build:** In point mode, clicking targets a thing the artifact owns and dragging across words targets exactly those words — the gesture decides, so there is no `Text` tool to arm and no silent no-op when the wrong one is armed. In box mode, dragging bounds an Area. A drawn Area is marked with a dashed, static boundary, visually distinct from the solid outline that means the artifact owns the target. An Area then reports the elements it encloses, so it is resolvable in a later revision rather than being geometry alone, and the rectangle is kept as evidence rather than presented as the target itself. A drag below the minimum size produces nothing and says so.

**Blocked by:** 03 (the mode island)

**Status:** done

- [x] In point mode, a click produces a target for the element under the pointer, and hovering outlines what a click would take
- [x] In point mode, dragging across a text range produces a text-range target, captured from the artifact's own selection rather than re-derived
- [ ] A drag that begins on an already-selected target is a relation drag (issue 18) and not a text selection; a drag that begins anywhere else behaves as the artifact does
- [x] In box mode, a drag produces an Area target with the geometry of the drawn boundary, and the boundary is dashed and static
- [x] An Area reports the elements it encloses, and the card names them rather than the bare kind word
- [x] An Area that encloses nothing recognisable states that, and never presents its rectangle as a target the artifact owns
- [x] Colour is not the only difference between a drawn target and one the artifact owns, and no perpetual animation is introduced by the boundary
- [x] A box drag below the minimum size produces no Annotation and a stated reason
- [x] Pointing a target never issues a synthetic click: a control inside the artifact is not activated by being targeted
- [ ] Driven live: element, text-range and Area targets are each produced and read back from stored state, and an Area's enclosed elements are visible in the read-back
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review, which argued that an Area with geometry alone is often neither resolvable nor actionable after a responsive reflow, and that naming what it encloses is a stronger target than the rectangle. That produces targets the artifact owns, which is not a contradiction of `CONTEXT.md`'s Area: the Area remains the gesture, and the enclosed targets are Rendered Grounding that may still carry no Source Provenance.

Resolved 2026-09-17: done. `src/ui/artifact/layer.ts` produces element, text-range and region targets, and a drawn region reports what it encloses.

Deferred confirmation: the `Driven live` box is parked with the iteration's Verification Run. The box for a relation drag beginning on an already-selected target belongs to `.scratch/several-targets-and-relations/`, where Relational Intent is restored.
