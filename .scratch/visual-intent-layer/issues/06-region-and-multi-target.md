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

Corrected 2026-09-17: the ticket keeps `done`, and its "Multiple targets can be selected as one set" box was true when ticked and is not true of the current surface. Multi-target composition shipped in `0f2a16f` and was removed in `14a73a1`, which replaced every selection path in `src/ui/artifact/layer.ts` (`:207`, `:237`, `:340`) with a one-element assignment. `.scratch/several-targets-and-relations/` owns restoring the set; see `.scratch/truth-and-sync/issues/05-mark-the-regressed-and-superseded-capabilities.md`. The argument and the ticks above are left as they were.
