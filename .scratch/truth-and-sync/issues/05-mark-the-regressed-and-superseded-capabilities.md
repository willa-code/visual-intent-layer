# 05: Mark the regressed and superseded capabilities

**What to build:** The tickets whose capabilities shipped and then changed are marked
with what happened, so a ticked box never stands for a capability the surface cannot
produce.

**Status:** done

**Blocked by:** 01

- [x] `review-surface/08` keeps `done` and gains a `## Comments` entry recording that multi-target selection was removed in `14a73a1` and naming `several-targets-and-relations` as the spec that restores it
- [x] `visual-intent-layer/06` gains the same Comment, because its "Multiple targets can be selected as one set" box was true when it was ticked and is not true of the current surface
- [x] `verification-skill/05` becomes `deferred`, with `several-targets-and-relations` as its trigger, and its unticked "each relation kind" box is named in a `Deferred confirmation:`
- [x] `verification-skill/06` resolves its two unticked boxes: each is either driven or named in a `Deferred confirmation:`, so the ticket's `done` stops contradicting its own boxes
- [x] `visual-intent-layer/10` gains a Comment recording that the `preview` object left the wire when `schema/envelope-v0.2.schema.json` was cut, that no preview code exists in `src/ui`, and that the reversible preview folded into the relation gesture
- [x] `review-surface/17` and `visual-intent-layer/17`, both of which judge preview verdicts, are handled by ticket 06 rather than given a verdict here
- [x] Nothing above is rewritten: the ticks, the box text and the surrounding argument stay as they were

## Comments

The removal of multi-target left no decision record. `design.md` §11 amendment 1
replaced §5's composition and amendment 3 replaced §7's bindings, and neither names the
set gesture; `0f2a16f` had `targets = additive ? [...targets.filter((entry) => entry.element !== element), target] : [target]`
and `14a73a1` replaced it with a one-element assignment in every path
(`src/ui/artifact/layer.ts:207,237,340`). ADR-0016 and `CONTEXT.md` still describe an
Annotation as carrying one or more targets, so the removal is a regression rather than a
recorded deferral — which is why the record is corrected here and the capability is
restored in `several-targets-and-relations`.

Done 2026-09-17. `review-surface/08` and `visual-intent-layer/06` keep `done` and gained a Comment naming `14a73a1` and `.scratch/several-targets-and-relations/`; `verification-skill/05` is `deferred` with its relation-kind box in a `Deferred confirmation:`; `verification-skill/06` names its two unticked boxes in a `Deferred confirmation:`; `visual-intent-layer/10` gained a Comment about the `preview` object leaving the wire. No tick, box text or surrounding argument was rewritten.
