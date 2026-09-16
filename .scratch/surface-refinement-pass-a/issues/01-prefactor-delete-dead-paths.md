# 01: Prefactor — delete the dead paths the contract no longer promises

**What to build:** The row and the card stop drawing a relation sentence that no surface path can create, the relation operator vocabulary leaves the codebase, and the delivery intent union loses its `draft` member, which delivering already refuses. Nothing a Builder-Reviewer can reach changes except that a sentence they could never act on is gone. This lands first so the tickets that follow edit a smaller surface.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] No rendered Annotation row or anchored card draws a relation sentence
- [x] No relation operator vocabulary remains in the codebase, and the relation add and remove paths that no caller reaches are gone
- [x] The delivery intent union has exactly three members: Next-Pass Intent, Steering Intent and Review Interruption. Delivering with any other intent is refused with the same message it is refused with today
- [x] A Builder-Reviewer-visible surface renders identically apart from the removal of the relation sentence; no interaction path is gained or lost
- [x] Every test that asserted the removed vocabulary is re-cut in this change, and the suite is green when it lands

## Comments
