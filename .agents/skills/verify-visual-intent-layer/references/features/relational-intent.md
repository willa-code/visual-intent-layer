# Relational Intent by direct manipulation

**Not yet driven, and deferred.** Relational Intent is out of this iteration by
maintainer decision: `design.md` §11 and issue 18 record why, the surface
expresses no relation, and the `Arrange` tool no longer exists. The envelope
keeps its support for relationships and `CONTEXT.md` keeps the term, so the
capability can return with a designed gesture. Nothing below is runnable against
this build; there is no `relate` drive until issue 18 lands.

The deferred gesture: dragging a target that is already selected moves a ghost
and infers one relation — alignment, ordering, spacing, containment, equivalence
or comparative size — shown back as one plain sentence before it is recorded,
and never mutates the artifact. A drag that begins anywhere else behaves as the
artifact does, so text selection is unaffected. Nothing about this is pixel
displacement: the stored relationship is implementation-neutral and the agent
chooses how to achieve it.

## Sub-features

- `relation-ordering` expresses before/after by dragging a selected target past another.
- `relation-alignment` expresses left/centre/right/top/middle alignment by dragging a selected target into line.
- `relation-spacing` expresses equal spacing across three or more targets.
- `relation-containment` expresses containment by dragging a selected target inside another.
- `relation-equivalence` expresses a shared visible property.
- `relation-comparative-size` expresses same width or same height.
- `relation-sentence` shows the current relation set as one readable sentence.
- `relation-stored` stores the relation on the Annotation and on the delivered envelope without pixel fields.

## How to get to it (user POV, once built)

- Point at two or more targets, so they are selected on one Annotation.
- Drag one of those selected targets toward another; read the sentence the card
  shows before releasing.

## Driving it with the Lever

Not available. There is no `relate` command against this build — the `arrange`
mode was removed with the five-word tool row, and issue 18 owns the replacement
gesture. When issue 18 lands, the drive should select two targets, drag the
already-selected one, and read `relationships` back from `state`, asserting the
recorded `operator` and that it carries no pixel fields.

## Gotchas

- Relational Intent is not built, not merely undiscovered: do not report the
  absence of a relation as an unreachable path, and do not count this file as
  coverage.
- The `Arrange` tool and the old five-button tool row described in earlier
  revisions of this file are gone; only the gesture in issue 18 is live design.
- The envelope still accepts `relationships`, so a hand-built or legacy envelope
  can carry a relation even though the surface cannot produce one.
