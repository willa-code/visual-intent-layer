# 07: A drawn Area encloses across boundaries

**What to build:** Draw a rectangle over content inside an open shadow root or a same-origin
frame and the Area counts what it encloses, with frame boxes mapped into the reviewed
viewport before the containment test. Where the product cannot look in — a closed shadow
root, or a frame that never loaded — the Area keeps the rectangle and states that one hole,
with the true cause.

**Blocked by:** 01, 06

**Status:** ready-for-agent

- [ ] An Area drawn over a shadow-rooted element or a frame interior reports what it encloses instead of reporting an area enclosing nothing the artifact owns
- [ ] Frame content is tested in the reviewed viewport's coordinates, so an Area never silently encloses content nowhere near the rectangle
- [ ] An Area overlapping a region the product cannot read keeps its rectangle and states the hole with the true cause, distinct from policy-blocked and from a target that cannot be found
- [ ] The Area still carries Rendered Grounding and can never carry Source Provenance
- [ ] The stored Area identifies the boundary its content lives in, so it re-finds the same interior after a revision
- [ ] The existing set cap and the "and N more" disclosure still hold, and unreadable regions are not counted as enclosed
- [ ] Covered by grounding tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**. The
Area is the Builder-Reviewer's own rectangle and the only target that can never carry Source
Provenance, so the geometry is the whole claim — which is why it encloses across boundaries
rather than refusing them.
