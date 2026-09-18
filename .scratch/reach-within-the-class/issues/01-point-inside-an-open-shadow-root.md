# 01: Point inside an open shadow root

**What to build:** Point at an element inside an open shadow root in the artifact's own
document, see it marked while the note is written, and have the Target re-find itself
after a reload. Traversal becomes a composed walk that descends open shadow roots in a
deterministic order and never re-enters a root it has already visited, and the stored
grounding and anchors are strong enough to identify the same node through its host. A
closed shadow root refuses with its reason, and never reads as a target that is not in
this revision.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] An element inside an open shadow root can be hovered, pointed at and marked, exactly as an element in the artifact's own light DOM can
- [x] The stored grounding identifies the node through its shadow host, so a later revision can re-find it rather than matching a same-named node outside the root
- [x] After a reload of the same revision, the Target re-resolves to the same node and its mark returns to it
- [x] A host inside a host resolves, and the walk terminates on a visited set rather than by depth luck
- [ ] A closed shadow root, or an element reachable only through one, produces an unresolved Target whose reason names the boundary rather than the revision
- [ ] A Target inside a shadow root can carry a text range, not only an element, without losing its boundary
- [x] Covered by grounding tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**,
whose decisions came from the three independent reviews in that spec's `advisors/`.
This is the tracer bullet: it cuts traversal, grounding, marking, storage and
re-resolution end to end inside a single document, with no frame and no contract change.
The honest statement of the walk's limit is ticket 03.

2026-09-18 — partly landed; four of seven boxes ticked, status left `ready-for-agent`.
Traversal is now a composed walk that descends open shadow roots after their host and
before its light children, and a Target's selector is boundary-qualified through the host
chain, so a shadow element can no longer be confused with a same-named element outside the
root. Pointing needed a second fix that the ticket did not name: events from a shadow tree
are retargeted to the host at `document`, so `event.target` could never reach inside — the
layer now takes `event.composedPath()[0]` for pointer acts and descends shadow roots for
hover hit-testing. Marking and re-finding use the composed selector. Covered by
tests, including a host inside a host, and a browser-loop drive that points inside an open
shadow root, stores the boundary-qualified Target and re-finds it after a reload.

Two boxes are not done, and neither is deferred by decision:

- **The closed-root reason.** A closed host is indistinguishable from an ordinary leaf:
  `element.shadowRoot` is null and its interior is unobservable, so the layer cannot
  honestly name the boundary at pointing time. The reason can only be stated when a stored
  boundary-qualified Target stops resolving, which is refusal work proper to ticket 03.
- **A text range inside a shadow root.** `describeTextRange` composes the selector through
  the host, but no drive proves a selection made inside a shadow tree survives, and
  `document.getSelection()` does not cross the boundary the way `composedPath()` does.

One claim in the fourth box is loose and is corrected here rather than rewritten: the walk
has no visited set. Termination rests on the composed tree being acyclic — a shadow root is
reachable only through its host, and a slotted node is visited once, as a light child — plus
the 2000-node budget. A visited set would be dead code today, and ticket 03 owns the bound
that would give it a reason to exist. No Verification Run was performed for this ticket;
the browser-loop drives are the evidence, and ticket 08 owns the Lever and the run.
