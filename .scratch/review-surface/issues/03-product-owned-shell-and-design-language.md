# 03: Give the surface a product-owned shell and a design language

**What to build:** The Review Surface stops being a stack of form fields on an unthemed canvas. It has a top bar carrying artifact identity and revision, a switch between the two states Review and Verify, a tool row, an overflow menu and a right-hand panel; it has designed light and dark token surfaces; it has a full keyboard and focus model; and a dev-only gallery route renders the token layer. The hand-copied-asset build is replaced, so the shell chrome is bundled and the artifact interaction layer ships as one self-contained file.

**Blocked by:** 01 (Render the artifact faithfully, verified in a browser)

**Status:** done

- [x] The surface presents a top bar, the two states Review and Verify, a tool row and a right-hand panel, and reads as designed at every size it claims to support
- [x] The artifact occupies the majority of the surface
- [x] Light and dark are both designed, and every state carries text plus at least one non-colour cue
- [x] A keyboard model toggles Review, selects each tool, reaches the panel, and unwinds exactly one level per Escape without discarding anything
- [x] The chrome may trap focus in its own layers and the artifact never does
- [x] A dev-only gallery route renders the token layer and is not reachable from product navigation
- [x] The shell chrome is built, and the artifact interaction layer loads as a single self-contained file

## Comments

Deferred confirmation: keyboard model and focus behaviour are implemented and the DOM is asserted in the loop test; full WCAG 2.2 AA audit is not automated.
