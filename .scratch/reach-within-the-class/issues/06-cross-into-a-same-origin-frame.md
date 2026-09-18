# 06: Cross into a same-origin frame

**What to build:** Point at an element inside a same-origin frame of a proxied application.
Its target mark, hover, candidate marks, drawn-Area boundary and capture crop all land
correctly in the reviewed viewport, and the Target re-finds itself after a revision. A frame
that our own policy never loaded reads as policy-blocked, distinct from a target that cannot
be found, and a cross-origin frame interior is refused with its own reason.

**Blocked by:** 02, 05

**Status:** done

- [x] An element inside a same-origin frame can be pointed at and marked, and the mark is drawn at its true position in the reviewed viewport
- [x] Candidate marks for a frame Target are positioned by the same mapping, so a candidate is never marked at a light-DOM coordinate
- [x] The capture crop for a frame Target covers the Target rather than the frame's own coordinate rectangle
- [x] After a revision, the frame Target re-resolves to the same node
- [x] A frame that never loaded because of the artifact's content policy reads as policy-blocked with that cause
- [x] A cross-origin frame interior is refused with its own reason and never reads as an absent target
- [x] A saved-HTML artifact, which cannot nest a frame, is unaffected
- [x] Covered by the browser loop against a fixture with a same-origin frame

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md`. The same-origin-frame case
is reachable only in a proxied application, whose content policy permits a same-origin
frame; a saved-HTML artifact blocks every frame by policy, and relaxing that is a security
decision that stays out of scope.

2026-09-18 — this ticket also owns the frame-level half of ticket `03`'s bound. Ticket `03`
is `done` for the composed tree inside one document and names the unticked box it moved
here: a visited-document set and a one-frame-level nesting cap, so an artifact that embeds
its own URL cannot recurse. `03` could not deliver it because it traverses no document but
the artifact's own, and this ticket is the first that crosses a boundary. Add them when
traversal enters the frame, and keep `03`'s rule with them: the budget stays one shared
`WALK_LIMIT` visited top document first, and stopping early is recorded and stated rather
than passed off as a search that found nothing.

2026-09-18 — status `ready-for-agent` → `done`, every box ticked, together with the
frame-level half of `03`'s bound. Traversal is a composed walk into one same-origin
frame level with a visited-document set and one shared budget; a Target inside a
frame stores a `>>`-qualified selector and a `documents` chain; coordinates are
mapped to the reviewed viewport by `rectInReviewedViewport`, so marks, candidate
marks, ghost boxes and drawn Areas land where the element actually is. The artifact
layer attaches its pointer listeners to each same-origin frame document (`syncFrame
Documents`, re-run on the frame's `load`), and cross-realm `instanceof` is avoided
with `elementOf` so an element from the framed document is addressed correctly. A
saved-HTML artifact's frames are policy-blocked and read with that cause; a frame
whose document cannot be reached reads `cross-origin-frame` through
`boundaryRefusal`, proven at the unit seam. The browser loop proves the rest:
pointing inside `iframe#widget` marks at the true position, stores the frame path and
address, and re-resolves to the same node after a reload. The capture crop is the
artifact frame as it always was, so a frame Target is inside it rather than clipped
to the frame's own coordinate rectangle.
