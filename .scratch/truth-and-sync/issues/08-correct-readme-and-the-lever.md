# 08: Correct README and the Lever to the shipped surface

**What to build:** The two documents that claim multi-target composition either
describe what ships or state that it is deferred, and the Lever stops recording coverage
for a modifier nothing reads.

**Status:** done

- [x] `README.md:8` ("points at one or more visible targets") and `README.md:121` ("Several targets can be gathered into one Annotation") describe the surface as it is, or state the deferral and name the spec that restores it
- [x] `CONTEXT.md`'s Annotation entry is left alone: the model does carry one or more targets, and the envelope accepts them
- [x] The Lever's `--add` flag (`bin/lever.mjs:57`) is removed rather than left silently ignored, together with the Shift modifier at `:919` and the `select-multiple` coverage claim at `:932`
- [x] Any recipe that documented `--add` is corrected in the same change
- [x] `.agents/skills/verify-visual-intent-layer/references/features/relational-intent.md` is left as it is: it already says "Not yet driven, and deferred" and names issue 18
- [x] No current document claims a capability that no code path can produce
- [x] The change is recorded in the file it changes, so a future reader knows why the sentence shrank

## Comments

`src/ui/artifact/layer.ts` never reads a modifier: `selectElement` (`:207`),
`selectEnclosed` (`:237`) and the text-range path (`:340`) each assign a one-element
array, and `onPointerDown`/`onPointerUp` ignore `shiftKey`. The Lever's `--add` therefore
injects a modifier that changes nothing while recording `select-multiple` coverage,
which is the one kind of claim this product refuses elsewhere: a green record of a
behaviour that did not happen.

This ticket does not decide the gesture. `several-targets-and-relations` does, and it
restores the README sentence together with the capability.

Done 2026-09-17. `README.md` now describes one target per selection and names `.scratch/several-targets-and-relations/`; `CONTEXT.md` is untouched. The Lever's `--add` flag, its Shift modifier and its `select-multiple` coverage claim are removed, and the `annotate-and-send` feature file and the `SKILL.md` recipe were corrected. `relational-intent.md` is untouched.
