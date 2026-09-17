# 03: The mode island: two tiles, no words

**What to build:** The five word-labelled tool buttons are replaced by two icon-only tiles in a small island pinned to the stage's lower edge: point at things (a pointer with a box, the DevTools picker glyph, deliberately not a plain arrow) and box an area (a dashed rectangle). Operating the artifact is the **unarmed** state rather than a third tile — neither tile lit is the resting state, and arming an armed tile again returns to it. Arming changes the pointer cursor over the artifact. Keyboard: `P`, `B`, and `V` to return to operating. The island is never hidden. Tooltips carry the sentence; nothing is permanently printed, apart from one first-run hint that never returns.

**Blocked by:** 02 (one icon set)

**Status:** done

- [x] Exactly two mode tiles exist: point and box. Operating the artifact is the unarmed state, not a tile, and no `Pointer`, `Text`, `Region` or `Arrange` control remains
- [x] Arming is by pointer and by `P` / `B`; `V` and `Escape` return to operating the artifact; arming an armed tile returns to operating
- [x] An armed tile is visibly distinct without relying on colour alone, and the resting state is visibly the resting state — no tile lit
- [x] The island is the only chrome over the artifact, sits at the stage's lower edge, and is never hidden — including while an anchored card is open, which is positioned so the two cannot overlap
- [x] Arming a tile changes the cursor over the artifact, and returning to operating restores the artifact's own cursor
- [x] Each tile is at least 24×24 in every state, including at rest, and carries an accessible name and a tooltip sentence
- [x] Single-key shortcuts are ignored while focus is in a text field or contenteditable region, and the island stays pointer-reachable so focus in a field never strands the operator in a mode
- [x] `Arrange` no longer exists as a mode. The `arrange` member of `LayerTool` and the code path it selects are removed here; the relational capability it carried moves to issue 18
- [x] One first-run hint per artifact explains the two tiles and the gestures, appears once, and never returns
- [ ] Driven live: both tiles arm and disarm, the armed state is visible in the accessibility tree, no tile can be armed into doing nothing, and the island receives pointer events over the live iframe
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review: the island previously carried three tiles, with "operate" as one of them. That contradicted `design.md` §10, which forbids presenting the resting state as a peer of the modes, and it contradicted the conclusion recorded in `docs/background/mode-and-toolbar-research.md`. The review also caught that "the island hides while an anchored card is open" and "the mode stays reachable by pointer while focus is in a field" cannot both hold when every text field lives in the card.

Resolved 2026-09-17: done. `14a73a1` replaced the five word-labelled tools with the two-tile island; `src/ui/app.ts` arms point and box, `V` and `Escape` return to operating, and `surface-refinement-pass-a` ticket 11 added the filled armed form. `Arrange` was deleted and its relation vocabulary removed by Pass A ticket 01.

Deferred confirmation: the `Driven live` box is left unticked because the iteration's Verification Run is parked with `.scratch/truth-and-sync/issues/06-park-verification-with-a-named-trigger.md`; the browser loop does drive arming and disarming.
