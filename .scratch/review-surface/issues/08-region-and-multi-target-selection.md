# 08: Region and multi-target selection

**What to build:** The Region tool draws a marked area for something that is not a single element, and several targets can be gathered into one Annotation. A drawn region records the revision and scroll position it was drawn at, so it cannot be applied to a layout the Builder-Reviewer never saw. Selection stays correct under scroll, zoom, reflow and overlapping layers.

**Blocked by:** 04 (One Annotation, end to end)

**Status:** done

- [x] A region can be drawn with the Region tool and produces an Annotation whose target is an area
- [x] Several targets can be selected into one Annotation and stay visibly marked while the note is written
- [x] A drawn region carries the artifact revision and the scroll position it was drawn at
- [x] Selection stays correct under scroll, zoom, responsive reflow and overlapping layers
- [x] A region below the minimum practical size produces no Annotation

## Comments

Deferred confirmation: selection redraws on scroll/resize and under overlapping layers; zoom and responsive-reflow correctness is reasoned from the fixed-overlay redraw path rather than asserted.

Corrected 2026-09-17: the ticket keeps `done`, and the box "Several targets can be selected into one Annotation and stay visibly marked while the note is written" no longer describes the shipped surface. Multi-target composition shipped in `0f2a16f` (`selectElement(element, event.shiftKey)` with `targets = additive ? [...targets.filter((entry) => entry.element !== element), target] : [target]`) and was removed in `14a73a1`, which replaced every selection path in `src/ui/artifact/layer.ts` (`:207`, `:237`, `:340`) with a one-element assignment with no amendment recording it. `.scratch/several-targets-and-relations/` owns restoring the set, and README and the Lever were corrected in this iteration under `.scratch/truth-and-sync/issues/08-correct-readme-and-the-lever.md`. The ticked box is historical evidence of what was true when ticked and is not rewritten.
