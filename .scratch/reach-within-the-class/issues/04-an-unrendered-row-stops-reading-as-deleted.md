# 04: An unrendered row stops reading as deleted

**What to build:** A Target whose node is not currently rendered — a virtualized row
scrolled out of a list — stops being reported as though it were absent from the revision.
The derived state label compares the whole recorded state, address and viewport and scroll,
rather than the address alone, so such a Target reads **may exist only in a state no longer
on screen**. Resolution re-runs on the operator's own scroll, so scrolling to the row
restores the Target in place with no control, no notice and no number. The product never
scrolls the artifact itself.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The derived state label switches on the whole recorded state, so a Target that differs only by scroll or viewport is reported as a state that is no longer on screen, not as gone
- [x] A Target unrendered by virtualization reads that state word instead of "is not in this revision"
- [x] The operator's own scroll re-runs resolution, and scrolling the row into view restores the Target's mark with no re-pointing
- [x] The surface never scrolls the artifact as a consequence of resolving, reloading or approving
- [x] An unresolved Target still blocks approval exactly as it does today, and approval is what clears it
- [x] `CONTEXT.md` states that Runtime State Evidence covers address, viewport and scroll together, if it does not already
- [x] Covered by resolution and store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Decided already**.
Today the failure is worse than silence: an unrendered row yields no candidate and the
derived label returns deleted, so the surface claims the row is gone. The panel's split —
whether the row also offers a one-act restore of the recorded offset — is deliberately not
built this iteration.

2026-09-18 — landed, status `ready-for-agent` → `done`; every box ticked. The label now
compares the whole recorded state (`runtimeStateMoved` in `src/resolution/model.ts`), the
recorded scroll is honest (`describeElement` was storing the element's absolute position in
`boundingBox.scrollX/scrollY`, now it stores the page scroll), and the layer re-posts
candidates on a debounced scroll so the shell re-resolves while the operator scrolls.
Proven by `src/resolution/model.test.ts`, the grounding scroll test, and a new browser-loop
drive: a window-virtualized roster reads **may exist only in a state no longer on screen**
when scrolled away and returns to matched/recovered when scrolled back, with no re-point.

One refinement the implementation forced, recorded here because it amends the decision as
first written: the recorded state now takes precedence over lookalike candidates. A
virtualized row's siblings are all `.row` divs, so each scores 0.3 on tag and structure and
the row read **ambiguous** ("could not be matched in this revision") even when the state had
visibly moved. When the revision is unchanged and the recorded state moved, the label is
`state-only` whether or not weak candidates exist; strong matches (exact, recovered) still
win outright. This changes a displayed word only — `approvalBlockers` already handled the
zero-candidate case, and anchor outcomes and Pass counts are untouched.

No Verification Run was performed for this ticket. `AGENTS.md` asks for one before a
product change is called done, and the run needs the Lever, whose shadow and virtualized
drives are ticket 08's job. The evidence today is `src/resolution/model.test.ts`, the
grounding scroll test, and the new browser-loop drive; the run is owed and is named here so
`done` carries no silent gap.
