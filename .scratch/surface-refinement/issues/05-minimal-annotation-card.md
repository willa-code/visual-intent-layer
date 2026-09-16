# 05: The anchored card says only what is needed while writing

**What to build:** The card that opens beside a target is reduced to what a Builder-Reviewer needs in the moment, as `design.md` §6 requires after the third amendment: a target line made of a kind icon plus what was pointed at, the note field, the relation sentence when one exists, and one action row. The `What should change?` label becomes the field's placeholder. The instruction paragraph, the paste-and-drop sentence and the remove-the-last-target control are removed. `Queue` stays a worded primary action; attaching a reference image and deleting the Annotation are icon buttons from the one icon set.

**Blocked by:** 02 (one icon set)

**Status:** ready-for-agent

- [ ] The target line shows a kind icon plus what was pointed at, and never the bare kind word — a boxed area reads as its contents, not as "region"
- [ ] The `What should change?` label is gone and the phrase appears only as the field's placeholder
- [ ] The `Enter queues this Annotation. Cmd/Ctrl+Enter queues and sends. Escape never discards your writing.` paragraph is gone from the card
- [ ] Remove-the-last-target is gone from the card, and dropping the last selection remains reachable by `Escape`
- [ ] The paste-and-drop sentence appears only while the Annotation has no note and no attachment
- [ ] `Queue` is the only worded action; attach and delete are icon buttons with accessible names, and the delete button's accessible name states what it deletes
- [ ] No emoji and no letter-glyph button remains in the card
- [ ] `Escape` still never discards unsent writing, and `Enter` and `Cmd/Ctrl+Enter` still do what `design.md` §7 says they do
- [ ] The card is clamped to the viewport, does not cover the target it belongs to, and cannot overlap the mode island
- [ ] Driven live: the card's content is read back from the accessibility tree and contains no instruction copy
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

The delete button is icon-only by a recorded judgement in `design.md` §6, added with the third amendment: deleting an unsent Annotation is not consequential in the sense §6 and §10 mean, because nothing has left the machine, nothing in the artifact changed, and the Annotation can be composed again. If a later iteration adds an undo, keep the judgement; if it makes deletion irreversible in a way this one is not, revisit it.
