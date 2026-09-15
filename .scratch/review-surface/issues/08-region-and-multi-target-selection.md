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
