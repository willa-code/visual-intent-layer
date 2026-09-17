# 03: The gesture spine — drag a selected target, see the sentence, record ordering and alignment

**What to build:** Dragging a target that is already in the set moves a ghost and infers one relation, shown back as one plain sentence in the card before release; releasing records it on the Annotation, and ordering and alignment are the first two relations expressible.

**Blocked by:** 01, 02

**Status:** done

- [x] Dragging a target that is already in the set moves a ghost and infers one relation, shown as one sentence in the card before release
- [x] The ghost is drawn in the artifact document by the artifact layer; the sentence is rendered by the shell from a message the layer sends
- [x] Releasing records the relation on the Annotation with no pixel field anywhere; the artifact's source and authoritative DOM are never changed by the drag
- [x] Abandoning the drag before release (Escape, or releasing outside) records nothing and leaves no ghost
- [x] When the drag geometry infers no relation, nothing is recorded and the surface says so in words instead of staying silent
- [x] `ordering` (`before`, `after`) and `alignment` (`align-left`, `align-center`, `align-right`, `align-top`, `align-middle`) are each expressible
- [x] The relation sentence comes from one formatter, used by the card in this ticket and by the rail row in 06
- [x] A second relation drag on the same set replaces the inferred relation for that pairing rather than accumulating duplicates

## Comments

Done 2026-09-17. The artifact layer draws the ghost and posts `relation-preview`/`relation`; the shell renders one sentence from `src/annotation/relations.ts`, used by the card now and the rail row in 06. Geometry infers ordering and alignment; an inference that is empty records nothing and says so. Driven live for ordering and alignment, plus Escape cancel, release away, and replacement of the same pairing.
