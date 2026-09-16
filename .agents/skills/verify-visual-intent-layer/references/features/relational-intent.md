# Relational Intent by direct manipulation

A Builder-Reviewer expresses a relationship among selected targets by manipulating them directly — dragging one target toward another — rather than picking a relation from a menu or describing it in prose. The surface reads the current relation set back as one plain sentence and stores it without pixel values.

## Sub-features

- `relation-ordering` expresses before/after by dragging a target past another.
- `relation-alignment` expresses left/centre/right/top/middle alignment by dragging a target into line.
- `relation-spacing` expresses equal spacing across three or more targets.
- `relation-containment` expresses containment by dragging a target inside another.
- `relation-equivalence` expresses a shared visible property.
- `relation-comparative-size` expresses same width or same height.
- `relation-sentence` shows the current relation set as one readable sentence.
- `relation-stored` stores the relation on the Annotation and on the delivered envelope without pixel fields.

## How to get to it (user POV)

- Select two or more targets with the Element tool.
- Choose the `Arrange` tool and drag a selected target toward another.
- Read the sentence the card shows while dragging and after the manipulation.

## Driving it with the Lever

Preconditions:

- A run is healthy and the Artifact is on screen in Review.
- At least two targets can be selected without the anchored card covering the second (see Gotchas).

- **Select the targets.** Choose the Element tool, click the first target, then Shift-click the second. Run `… lever.mjs select --tool element --target ".checkout-submit"` then `… lever.mjs select --tool element --target ".gallery-note" --add`. `state` shows one Annotation with two targets.
- **Arrange.** Choose the Arrange tool and drag. Run `… lever.mjs relate --operator after --from ".checkout-submit" --to ".gallery-note"`. Exit `0` and `state` showing a `relationships` entry on the Annotation, read back from stored state with `type`, `operator` and `targetIds`.
- **Read the sentence.** The relation sentence appears on the card and on the queued item. Run `… lever.mjs screenshot --name relation`. The screenshot shows the sentence; `state` shows the stored relation.
- **Prove the manipulation, not a picker.** The recorded relation comes from the drag gesture; there is no relation picker in the surface to drive.
- **Send and read the envelope.** Queue and send. Run `… lever.mjs queue`, `… lever.mjs send`. `state` still carries the relation on the delivered Annotation, and the relation names target ids rather than pixel values.
- **Proof.** Run `… lever.mjs record --name relation` and `… lever.mjs state`. The recording shows the drag and the resulting state; the state shows the relation.

## Gotchas

- The relation type is inferred from the drag geometry: a long horizontal drag past a neighbour reads as ordering; a small drag into line reads as alignment; a drag whose centre lands inside another target reads as containment. Choose the start and end points to produce the intended relation, and assert the recorded `operator`, not the one you asked for.
- Modifier keys select the relation family: Alt for equal spacing, Meta/Ctrl for a shared property, Shift for comparative size.
- The anchored card covers the first target's right side. Select the lower target first so the second, upper target stays clear.
- `relate` selects its own two targets. Do not rely on a selection left by a previous command after a send, which clears it.
- A relation needs at least two selected targets. One target falls through to no relation and the command reports an unreachable path.