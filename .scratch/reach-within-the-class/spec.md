# Reach within the class: shadow roots, same-origin frames and rendered rows

Status: done

Scope accepted, and every question that gated the tickets is decided (see **Decided
already**). This file exists because the shipped artifact class is wider than the
traversal that addresses it, and the gap is inside the class rather than beyond it.

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

## Findings from the decision pass

Three independent reviews — a minimalist interaction designer, a sceptical user
advocate and a precision and trust engineer — each read `VISION.md` and the sources
above; their POVs are kept in `advisors/`. Two findings about the shipped product
changed the shape of the work and were not in the original scope statement:

- **A saved-HTML artifact cannot nest a frame at all.** Its content policy sets
  `frame-src 'none'` (`src/artifact/fidelity.ts:224`, promised in `SECURITY.md:61`), so
  the same-origin-frame case is reachable only in a proxied application, whose policy
  permits `frame-src 'self'` (`fidelity.ts:243`). A frame inside saved HTML is not
  silently unaddressable; it was never loaded, and that is a different cause with a
  different sentence. Opening saved HTML to frames would be a security decision, not a
  traversal ticket.
- **A nested frame gets a second, orphaned artifact layer today.** `serveAppProxy`
  injects the layer into every `text/html` response it proxies
  (`src/service/http.ts:1317-1324`), and the nested instance posts to `window.parent`
  (`src/ui/artifact/layer.ts:29,57`) while the shell accepts a layer message only from
  the artifact frame's own window (`src/ui/app.ts:1022`). Nothing relays. The frame
  therefore grows a phantom overlay whose selections reach nothing — worse than silence,
  and it must be fixed before traversal crosses the boundary.

## Decided already

Decided 2026-09-18 from this spec's own Open list, with the three independent reviews
in `advisors/`. Where the panel split, the default is named and the dissent is kept.

- **An unrendered row is refused, and the product never scrolls the artifact.** No
  reviewer accepted a programmatic scroll: it moves the state the Annotation was written
  against, which `design.md` §5's reload rule and the anti-pattern at `design.md:456`
  forbid. The refusal must also stop lying: an unrendered row currently derives `deleted`
  and reads "*X* is not in this revision" (`src/ui/app.ts:2067`) because `state-only` is
  keyed on the address alone (`src/resolution/model.ts:30-33`), although Runtime State
  Evidence already includes viewport and scroll (`CONTEXT.md:127-128`). The label widens
  to the recorded state as a whole. The operator's own scroll already fires a
  capture-phase listener (`layer.ts:854`), so resolution re-runs when they scroll to the
  row — no control, no notice, no number. The panel's only split was whether the row also
  offers a one-act restore of the recorded offset; it is not built this iteration.
- **The traversal bound is deterministic and composed.** One fixed order, the top
  document first, 2000 nodes spent across the whole composed tree — the shipped number
  (`src/ui/artifact/grounding.ts:199`), kept so nothing that resolves today changes
  behaviour — with a visited-document set and a nesting cap of the artifact document plus
  one frame level. A clock is disqualified: a candidate's id is its position in one
  enumeration (`grounding.ts:208,235`), so a bound that varies by machine re-binds
  `node-N` to a different node. Reaching the bound never lowers the resolution thresholds
  (`src/resolution/resolve.ts:42-46`) and never becomes a marked candidate; the
  truncation is recorded as a fact and the row states it. The advocate's larger budget
  (5000 nodes, depth 8) is the kept dissent.
- **A drawn Area encloses exactly what is geometrically inside it, across boundaries.**
  The Area is the Builder-Reviewer's own rectangle and the only target that can never
  carry Source Provenance (`CONTEXT.md:115-116`), so the geometry is the whole claim.
  Frame boxes are mapped into the reviewed viewport before the containment test
  (`layer.ts:288` tests raw client rects today). Where the product cannot look in — a
  closed shadow root, or a frame that never loaded — the Area keeps the rectangle and
  states that one hole, with the true cause: a saved-HTML frame is policy-blocked, not
  unreadable.
- **Runtime State Evidence gains the frame path, in a versioned contract change.**
  `runtimeState.address` keeps its narrow meaning — the artifact's own address relative
  to its base (`schema/envelope-v0.3.schema.json:258-260`) — and the evidence gains the
  ordered chain of documents reached through, each with its own address and scroll.
  Folding the frame into that one string was the minimalist's dissent and was refused:
  `deriveResolutionLabel` compares it to the address on screen
  (`src/resolution/model.ts:30-33`), so a composite fires **May exist only in a state no
  longer on screen** for every frame Target even when nothing moved. The same shape is
  where the backlog's unowned **Declared state beyond the address** item should later
  land rather than a third expansion (`.scratch/backlog.md`).
- **One layer, one document.** Injecting the layer into a nested frame document stops,
  because a second overlay under a dead message path is a defect, not a boundary. This
  prefactor lands before frame traversal.
- **The saved-HTML frame case is refused with its own reason.** A frame that our own
  policy never loaded reads as policy-blocked, never as a target that cannot be found.
  Relaxing `frame-src 'none'` for saved HTML is out of scope and would need its own
  security decision.

## Open before tickets can be written

The list below is the record of what was open; every item is answered above.

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

## Comments

2026-09-18 — status `needs-triage` → `ready-for-agent`. Every item in *Open before
tickets can be written* is answered in **Decided already**; the Open list is kept as the
record of what was open, unchanged. The three independent reviews behind the decisions
are in `advisors/`, and the two findings that changed the plan — the saved-HTML frame
policy and the orphaned nested layer — are recorded above. The canvas class and the
unrun tldraw experiment in `.scratch/backlog.md` are untouched by this decision pass.

2026-09-18 — tickets published. `issues/01` to `issues/08`, numbered in dependency order.
The frontier — tickets whose blockers are all done — is `01`, `02` and `04`. Ticket `04`
was filed with no blockers rather than the `01` edge first proposed, because the derived
state label and the re-resolve on the operator's own scroll do not depend on shadow
traversal.

2026-09-18 — first implementation pass. `04` is `done` with every box ticked. `01` and `02`
are partly landed and left `ready-for-agent`, each naming its remaining boxes in its own
Comments. `03`, `05`, `06`, `07` and `08` are untouched. The recorded scroll in Rendered
Grounding was fixed on the way through: it stored the element's absolute position, not the
page scroll, which ticket `04`'s comparison depends on.

2026-09-18 — second implementation pass. `01`, `03`, `05`, `06` and `07` are `done`;
`08` is partly landed and names its three remaining drives with their preconditions.
Traversal is now a composed walk over open shadow roots and one same-origin frame
level with a visited-document set, one shared 2000-node budget and boundary-qualified
selectors, and Runtime State Evidence gains the ordered `documents` chain in a
versioned envelope bump to `0.4`. A closed shadow root, a cross-origin frame and a
policy-blocked frame are stated with their own causes in the row, the hint and the
approval wall, and an Area keeps its rectangle while naming the one hole it could not
read. The Verification Run is
`.visual-intent-verify/runs/2026-09-18_04-30-07-reach` (outcome `clean`).

2026-09-18 — third implementation pass, and the class is closed. `08` is `done`:
the Lever gained a `scroll` command and a frame-path selector, a loopback
application fixture makes the same-origin frame drivable, and four clean
Verification Runs cover the shadow roots, the frame interior, the unrendered row
and the walk bound. The truncation fact is now recorded on the resolution
(`TargetResolutionRecord.truncated`), so `state` reads it back rather than only the
row stating it. All eight tickets are `done`.
