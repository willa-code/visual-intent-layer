# 02: Rename the vocabulary and migrate stored data

**What to build:** A Builder-Reviewer reads **Not Fixed** where they read "Another pass requested" and **Replaced** where they read "Superseded" — on the row, in the pill, in the gallery, and everywhere a state is labelled. A session opened against Annotations that were stored under the old names still loads, renders correctly, and is rewritten in the new vocabulary on read. Nothing is lost.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every rendered Annotation state label uses the new vocabulary: Draft, Queued, Delivered to host, Re-resolved, Acknowledged by agent, Verified by you, Rejected, Not Fixed, Replaced, Obsolete
- [x] A stored Annotation carrying the old state value for Replaced loads, renders as Replaced, and is rewritten with the new value on the next write, with no field lost
- [x] A stored Annotation carrying the old state value for Not Fixed behaves the same way
- [x] A legacy envelope status is still mapped on read, and a test proves it by starting from the legacy value rather than from the new one
- [x] The link between an Annotation and the one it replaced reads and writes under the new name, and a record still carrying the old name loads
- [x] The published envelope schema's `supersedes` field is unchanged, and a test asserts the wire name is still `supersedes`
- [x] The armed-mode glyph mapping resolves for both renamed states, and the gallery's state matrix renders all ten
- [x] A session opened against a state file written before this change is readable after it, proven by a migration test in both axes the migration already handles

## Comments
