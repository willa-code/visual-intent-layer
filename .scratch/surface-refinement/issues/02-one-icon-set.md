# 02: One icon set, drawn to one weight

**What to build:** A single inline SVG icon module is the only source of chrome iconography. Every icon is one set drawn to one stroke weight, sized from one metric, and takes its colour from the semantic role in force. The attach-reference-image control stops using the `🖼` platform emoji, and the mixed `⌫` / `×` / emoji trio in the annotation card is replaced. Emoji never appear in chrome again, because they render differently on every platform and cannot take a token colour. Each icon carries an accessible name supplied by its caller.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] One module exports every chrome icon, and no chrome control draws its own glyph inline or as text
- [x] All icons in the set share one stroke weight, one viewbox and one size scale drawn from a metric token
- [x] No chrome surface renders an emoji character anywhere
- [x] Every icon-only control carries an accessible name, and the name states what the control does
- [x] Icons take `currentColor`, so a semantic role's ink applies without a per-icon override
- [x] The design gallery in `design.md` §9 renders the whole set in light and dark, and the scripted pass covers it
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Resolved 2026-09-17: done. `src/ui/icons.ts` is the one icon module and every chrome control draws from it; `14a73a1` removed the emoji and the mixed `/`-glyph buttons. `surface-refinement-pass-a` added the filled tile form without adding a second set.
