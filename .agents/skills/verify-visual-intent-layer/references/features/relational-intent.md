# Relational Intent by direct manipulation

Relational Intent is expressed by a gesture over a set. `Shift` extends a
selection into a set of up to eight targets, and dragging a target that is
already in the set moves a ghost and infers one relation — ordering, alignment,
equal spacing, containment, shared property or comparative size — shown back as
one plain sentence before it is recorded. The drag never mutates the artifact,
and the stored relation is implementation-neutral: it names the desired
relationship and carries no pixel value.

Geometry infers containment, ordering and alignment. The three families a move
cannot express are declared with a key held through the drag: `Alt` for equal
spacing, which needs three or more targets, `Ctrl`/`Cmd` for a shared visible
property, and `Shift` for comparative size, whose dominant axis chooses width or
height. A drag that begins anywhere other than an already-selected target
behaves as the artifact does, so text selection is unaffected. When geometry
infers nothing, nothing is recorded and the surface says so in words.

**There is no keyboard route to Relational Intent, and this file states that
rather than implying one.** No target of any kind is reachable by keyboard
today, so a relation-only route would be the product's only keyboard targeting
and would misstate the surface. The route reopens when keyboard targeting
exists.

## Sub-features

- `relation-ordering` expresses before/after by dragging a selected target past another.
- `relation-alignment` expresses left/centre/right/top/middle alignment by dragging a selected target into line.
- `relation-spacing` expresses equal spacing across three or more targets, with `Alt` held.
- `relation-containment` expresses containment by dropping a selected target inside another, including a drawn Area.
- `relation-equivalence` expresses a shared visible property, with `Ctrl`/`Cmd` held.
- `relation-comparative-size` expresses same width or same height, with `Shift` held.
- `relation-sentence` shows the current relation as one readable sentence, in the card and the rail row, from one formatter.
- `relation-stored` stores the relation on the Annotation and on the delivered envelope, with no pixel field.

## How to get to it (user POV)

- `Shift`-click or `Shift`-box two or more targets, so they are selected on one Annotation.
- Drag one of those selected targets toward another; read the sentence the card shows before releasing.
- For spacing, shared property or comparative size, hold `Alt`, `Ctrl`/`Cmd` or `Shift` through the drag.

## Driving it with the Lever

- Build the set: `… lever.mjs select --tool point --target "<css>"`, then `… lever.mjs select --tool point --target "<css>" --add`. `state` shows one draft Annotation carrying both targets.
- Express a relation: `… lever.mjs relate --to "<css>" [--from "<css>"] [--dx <n>] [--dy <n>] [--modifier Alt|Control|Shift] [--expect <operator>]`. With `--from`, it selects `--from`, adds `--to` with `Shift`, and drags the already-selected `--to`. Without `--from`, it drags `--to` in the set a previous `select --add` built. It reads `relationships` back from `state`. Exit `0` only when a relation was recorded, the expected `operator` is present, and the stored relationship carries no pixel field; a drag that records nothing exits `4`.
- `Alt` spacing needs three or more targets, so build the set first and call `relate --to` without `--from`.

## Gotchas

- Relational Intent is a gesture, not a mode. There is no `Arrange` tile and no relation picker; a third tile or an operator list is an anti-pattern.
- Only containment, ordering and alignment are inferred. Spacing, shared property and comparative size need the held key named above; a drag that infers nothing records nothing and says so.
- `Shift` is the set modifier on click and box, and the comparative-size key during a relation drag. A `Shift`-click toggles a member of the set; a `Shift`-drag on an already-selected target declares a size.
- The envelope still accepts `relationships`, so a hand-built or legacy envelope can carry a relation the surface would not infer. That is not coverage.
- A relation is kept only while every target it names is still in the Annotation. Removing a member from the set, or re-pointing an Annotation, removes any relation that named it, and the surface says so in words rather than dropping it silently. Should a relation describe a target that is gone by any other route, the row states that too.
- The stored relation never carries a pixel field. A drive that finds one has found a defect.
- A relation drag survives another part of the surface taking focus. The rail focuses its note textarea whenever it re-renders the card, and that happens asynchronously after a selection; it must not cancel a drag that is still under the pointer. Only the page itself losing focus cancels the drag.
