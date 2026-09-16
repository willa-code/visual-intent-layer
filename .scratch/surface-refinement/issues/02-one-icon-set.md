# 02: One icon set, drawn to one weight

**What to build:** A single inline SVG icon module is the only source of chrome iconography. Every icon is one set drawn to one stroke weight, sized from one metric, and takes its colour from the semantic role in force. The attach-reference-image control stops using the `🖼` platform emoji, and the mixed `⌫` / `×` / emoji trio in the annotation card is replaced. Emoji never appear in chrome again, because they render differently on every platform and cannot take a token colour. Each icon carries an accessible name supplied by its caller.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One module exports every chrome icon, and no chrome control draws its own glyph inline or as text
- [ ] All icons in the set share one stroke weight, one viewbox and one size scale drawn from a metric token
- [ ] No chrome surface renders an emoji character anywhere
- [ ] Every icon-only control carries an accessible name, and the name states what the control does
- [ ] Icons take `currentColor`, so a semantic role's ink applies without a per-icon override
- [ ] The design gallery in `design.md` §9 renders the whole set in light and dark, and the scripted pass covers it
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments
