# 06: Cross into a same-origin frame

**What to build:** Point at an element inside a same-origin frame of a proxied application.
Its target mark, hover, candidate marks, drawn-Area boundary and capture crop all land
correctly in the reviewed viewport, and the Target re-finds itself after a revision. A frame
that our own policy never loaded reads as policy-blocked, distinct from a target that cannot
be found, and a cross-origin frame interior is refused with its own reason.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] An element inside a same-origin frame can be pointed at and marked, and the mark is drawn at its true position in the reviewed viewport
- [ ] Candidate marks for a frame Target are positioned by the same mapping, so a candidate is never marked at a light-DOM coordinate
- [ ] The capture crop for a frame Target covers the Target rather than the frame's own coordinate rectangle
- [ ] After a revision, the frame Target re-resolves to the same node
- [ ] A frame that never loaded because of the artifact's content policy reads as policy-blocked with that cause
- [ ] A cross-origin frame interior is refused with its own reason and never reads as an absent target
- [ ] A saved-HTML artifact, which cannot nest a frame, is unaffected
- [ ] Covered by the browser loop against a fixture with a same-origin frame

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
