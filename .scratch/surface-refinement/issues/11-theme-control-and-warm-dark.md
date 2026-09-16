# 11: The theme is the operator's, and dark is a counterpart

**What to build:** The chrome's theme is chosen by the Builder-Reviewer — a persisted auto, light or dark choice, defaulting to the platform preference — and is never sampled from, derived from or inverted against the artifact. The dark primitives become the warm counterpart `design.md` §3 proposes, drawn from the same family as the light primitives and holding the same luminance steps, replacing the cool set that made dark mode read as a second product. Elevation tints lose their purple cast.

**Blocked by:** 01 (the rail head and overflow menu it mounts into), 02 (the design gallery and its baselines)

**Status:** ready-for-agent

- [ ] A theme control offers auto, light and dark, and the choice survives a surface reload
- [ ] With auto selected the surface follows the platform preference, and an explicit choice overrides it
- [ ] No chrome colour is read from, sampled from or derived from the artifact or its pixels
- [ ] The dark primitives are the warm set proposed in `design.md` §3, and the light primitives are unchanged
- [ ] Every semantic surface/ink pair passes the documented contrast floor in both themes, and the pair is checked on its own surface
- [ ] Elevation shadows are warm neutral and carry no colour cast
- [ ] The design gallery renders every token in both themes and the scripted pass covers both
- [ ] The token baseline in `tests/__screenshots__` is regenerated with the change, and the gallery pass fails on token drift rather than passing vacuously
- [ ] `design.md` §3 states final values rather than proposals, once the gallery pass has settled them
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments
