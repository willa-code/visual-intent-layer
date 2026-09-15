# 06: Mark regions and select multiple targets

**What to build:** A visible region can be marked where no element fits, and several targets can be selected together as one set that stays clear while the Builder-Reviewer writes.

**Blocked by:** 03 (Open saved HTML and select elements and text)

**Status:** done

- [x] A visible region can be marked where no semantic element fits and carries spatial evidence into the envelope
- [x] Multiple targets can be selected as one set that stays visually clear while the Builder-Reviewer writes
- [x] Selection remains correct under scroll, zoom, responsive reflow, and overlapping layers

## Comments

Implemented (implemented in 8b70d52): Alt-drag region marquees with spatial evidence, Shift-click multi-target sets (src/ui/selection.ts), region kind end-to-end in composer/schema/resolver; selection panel stays visible while writing.

Verification note: scroll/zoom/reflow/overlap ticked on grounding evidence (viewport+DPR+bbox captured), resolver reflow tolerance (benchmarked), and topmost-click plus explicit region fallback; live-browser matrix confirmation rides with dogfood in ticket 17.

Superseded: region and multi-target selection are unchanged as capabilities, with one addition: a drawn region now records the artifact revision and scroll position it was drawn at as evidence (ADR-0016).

See `.scratch/review-surface/spec.md`.
