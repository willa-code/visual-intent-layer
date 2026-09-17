# 14: Prove the design language with a gallery and a scripted pass

**What to build:** A dev-only route renders every token and every component in every state it can reach, light and dark. A scripted screenshot pass captures it and fails on difference, so a drifting token or an undocumented new state fails loudly instead of being found later.

**Blocked by:** 03 (Give the surface a product-owned shell and a design language)

**Status:** done

- [x] The gallery renders every token and every component in the design contract's component inventory, in every reachable state, in light and dark
- [x] A scripted pass captures the gallery and fails on difference
- [x] The pass runs in CI
- [x] The gallery is not part of the product's navigation

## Comments

Deferred confirmation: the screenshot pass uses a documented pixel tolerance to absorb cross-platform font rendering, while exact token drift is pinned separately by a platform-independent token snapshot. The gallery renders the colour, semantic, type, spacing, metric, radius, elevation and motion tokens and the shell's component inventory; `OverlayMark`, `Marquee` and `RelationGuide` are shown as static representations from the artifact layer, and `StatusDot` is deliberately absent because the design contract forbids a status dot standing in for a sentence.

Superseded: the pixel tolerance does not absorb cross-platform font rendering, so one screenshot baseline could never gate more than one platform. On the CI runner the gallery lays out 1100x5240 (light) and 1100x5241 (dark) against the 1100x5121 recorded on macOS, and the pass reported 100.00% for what was a size mismatch. A screenshot is now pinned per rendering platform as `gallery-<theme>-<platform>.png` and recorded with `UPDATE_GALLERY=1` on that platform; the exact token baseline stays platform-independent and unchanged, and the tolerance still absorbs glyph rasterisation within a platform.
