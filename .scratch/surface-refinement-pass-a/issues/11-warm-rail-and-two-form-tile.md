# 11: The warm rail and the two-form tile

**What to build:** The rail's material is the warm `canvas` primitive, so the tool and the artifact are visibly different substances rather than one plane separated by a hairline. Every mode-tile glyph ships a filled and an outlined form, so which tile is armed is legible without relying on colour.

Today `canvas` has no rendered consumer at all: the body sets it, the workspace covers the whole viewport, the stage is fully covered by the artifact frame, and the rail takes `surface`. The only chrome material a Builder-Reviewer ever sees is pure white, seamed to a white artifact by a 1px line.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The rail renders the warm `canvas` primitive as its material, and raised content surfaces inside it render `surface`
- [x] The rail is never `surface`, and the artifact is served on its own white, never derived from or sampled by chrome
- [x] `canvas` and `surface` each have a rendered consumer, and no colour token in the palette is left without one
- [x] The armed mode tile renders the filled form of its glyph and the unarmed tile the outlined form, both drawn to one stroke weight, one viewBox and one size scale
- [x] An armed tile is distinguishable from an unarmed tile without relying on colour, and passes a non-text contrast check at the documented floor
- [x] Dark mode holds the same hierarchy in the dark primitives, so it remains a counterpart rather than a second design
- [x] The gallery renders the rail material, both tile forms and the whole icon set, in light and dark
- [x] The token and screenshot baselines are regenerated in deliberate steps, and the reviewed diff is recorded in this ticket

## Comments
