# 07: A drawn Area encloses across boundaries

**What to build:** Draw a rectangle over content inside an open shadow root or a same-origin
frame and the Area counts what it encloses, with frame boxes mapped into the reviewed
viewport before the containment test. Where the product cannot look in — a closed shadow
root, or a frame that never loaded — the Area keeps the rectangle and states that one hole,
with the true cause.

**Blocked by:** 01, 06

**Status:** done

- [x] An Area drawn over a shadow-rooted element or a frame interior reports what it encloses instead of reporting an area enclosing nothing the artifact owns
- [x] Frame content is tested in the reviewed viewport's coordinates, so an Area never silently encloses content nowhere near the rectangle
- [x] An Area overlapping a region the product cannot read keeps its rectangle and states the hole with the true cause, distinct from policy-blocked and from a target that cannot be found
- [x] The Area still carries Rendered Grounding and can never carry Source Provenance
- [x] The stored Area identifies the boundary its content lives in, so it re-finds the same interior after a revision
- [x] The existing set cap and the "and N more" disclosure still hold, and unreadable regions are not counted as enclosed
- [x] Covered by grounding tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**. The
Area is the Builder-Reviewer's own rectangle and the only target that can never carry Source
Provenance, so the geometry is the whole claim — which is why it encloses across boundaries
rather than refusing them.

2026-09-18 — status `ready-for-agent` → `done`, every box ticked. `enclosedElements`
walks the composed tree and tests mapped rectangles, so an Area drawn over a
shadow-rooted control or a frame interior names what it encloses, and its stored
selectors are boundary-qualified. `unreadableHoles` keeps the rectangle and names
the one hole with its true cause: a frame the artifact's content policy blocks in
saved HTML, a cross-origin frame, or an unloaded frame. The browser loop drives both
halves — an Area over a same-origin frame encloses the framed control, and an Area
over a policy-blocked saved-HTML frame reads **a frame the artifact's content policy
blocks**. The only mapped-but-undriven case is a closed shadow root overlapped by an
Area, which is indistinguishable from an ordinary leaf at drawing time.
