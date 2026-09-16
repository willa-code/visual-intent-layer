# 08: The comparison control serves the revision it names

**What to build:** The before/after control sits in the stage's own top-edge chrome and serves the revision it names. A snapshot is kept for every adopted revision, not only the one the session was opened at. The row states which revision its result came from.

Today exactly one snapshot is ever written, at open, and a write is skipped if the key exists — so the control can only ever serve the revision the session was opened at, whatever its label claims.

**Blocked by:** 07 — A note carries the revision it was actually written against

**Status:** done

- [x] Every adopted revision has a stored snapshot, and reloading does not discard the previous one
- [x] Selecting Before on a row serves the bytes of the revision that row was written against, and the label names that revision
- [x] Selecting After serves the bytes of the revision the result came from
- [x] The control is positioned in the stage's top-edge chrome and never overlaps the mode island, the notice lane or an anchored card
- [x] The control is present only while the selected row has a result from a different revision to compare, and absent otherwise
- [x] The control takes effect immediately, with no save or submit step, and its two states name themselves rather than being neutral
- [x] The row states which revision its result came from, because that fact belongs to the row while the control belongs to the artifact
- [x] A test reloads once, then asserts that both revisions are served and that both labels match the bytes served

## Comments

Landed. Every adopted revision gets a stored snapshot: the document route saves under the computed revision it served, and adopting a revision saves it before the Pass moves to ready. The `Before` control requests the named revision's snapshot.

Honest limit: `After` serves the live artifact document, which is the result revision while the file has not moved again. Serving an arbitrary past "after" revision from its snapshot is Pass B work.
