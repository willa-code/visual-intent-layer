# Reach within the class: shadow roots, same-origin frames and rendered rows

Status: needs-triage

Scope accepted; the design and the tickets are not written. This file exists because the
shipped artifact class is wider than the traversal that addresses it, and the gap is
inside the class rather than beyond it.

## Why it exists

The product's contract is one loop for a locally served web application, and its
research already settled what that class contains. `.scratch/target-evidence/research.md`
records that elements, text ranges, **open shadow roots, same-origin frames and
currently-rendered rows** are addressable, and that closed shadow roots, cross-origin
frame interiors, unrendered virtualized rows and canvas internals are hard limits of a
product that does not own the browser.

The build addresses only the first two. `src/ui/artifact/grounding.ts` enumerates and
searches through `ownerDocument.querySelectorAll('body *')` (lines 200 and 235) and never
descends a shadow root or crosses a frame boundary. So an artifact built from a
shadow-DOM component library, or one that embeds a same-origin frame, is inside the
shipped class and not pointable — silently, because nothing states the refusal.

## What it will build

- **Shadow roots.** Traversal through the composed tree, with grounding evidence and a
  Target's anchors strong enough to re-find the same node after a revision.
- **Same-origin frames.** Traversal into a frame's document, with coordinates mapped to
  the reviewed viewport, the address recorded relative to the artifact's own base, and
  candidate marks, Area boundaries and the capture crop positioned correctly for a target
  inside a frame.
- **Virtualized rows.** Either scroll-then-resolve, or a stated refusal: unrendered rows
  have no DOM, and the product must not imply it can point at one.
- **A stated refusal with a reason** for closed shadow roots, cross-origin frame
  interiors and unrendered rows, where today silence reads as "nothing there".
- **Resolution through a boundary.** The resolver's anchors must survive a shadow
  boundary and a frame boundary, so a revision can re-find what was pointed at.

## Open before tickets can be written

- Whether virtualized lists are handled by scrolling the artifact under review or refused
  honestly. Scrolling is not source mutation, but the reload rule in `design.md` §5 and
  the reviewed-revision rule both constrain what may move without being asked.
- The traversal bound: how deep and how many nodes may be visited before the product must
  abstain rather than guess.
- Whether a drawn Area must also enclose shadow-DOM elements and frame interiors.
- How Runtime State Evidence composes when the target lives in a frame with its own
  address.
- Whether the same-origin-frame case is the same work as the proxied-application case
  that `target-evidence` already serves, since both put a document inside the reviewed
  frame.

## Out of scope

- Closed shadow roots, cross-origin frame interiors and canvas/WebGL internals: hard
  limits, refused with a reason rather than promised.
- Canvas-object applications, per-app bridges, Electron/Tauri shells, design files and
  mobile or native targets: outside the stated boundary, with tldraw recorded as the one
  cheap exception pending its own 30-minute experiment.
- Proof and measurement, which remain parked.
