# 07: A note carries the revision it was actually written against

**What to build:** An Annotation composed after a reload is stamped with the revision the Builder-Reviewer was looking at, so its chip stops claiming a relationship to a revision it was never written against. The agent is told the revision actually annotated.

Today creation stamps the revision the session was minted at, and only the adopted revision moves on reload. So a note written while looking at the new revision is stamped with the old one, and a brand-new note can immediately render as written before the revision on screen. That is why a chip saying the same thing on every row reads as noise: it is not measuring anything.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Composing after a reload stamps the adopted revision, not the revision the session was opened at
- [x] A note stamped with an older revision renders as written before this revision; a note stamped with the current revision does not. A test asserts both
- [x] A newly composed note is never immediately labelled as written before the revision on screen
- [x] The envelope handed to the agent names the revision the Annotation was written against
- [x] A row whose revision relation is current carries no chip that is present on every row saying the same thing
- [x] Reloading still updates the adopted revision only, and never rewrites an existing Annotation's stamp
- [x] A test composes an Annotation after a reload and reads the stored revision back through the API

## Comments
