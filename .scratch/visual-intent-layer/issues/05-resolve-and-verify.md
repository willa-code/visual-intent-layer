# 05: Observe revisions, re-resolve targets, verify by hand

**What to build:** Saving the artifact produces a new content-addressed revision, original targets re-resolve with explicit confidence, and only the Builder-Reviewer can close the loop.

**Blocked by:** 04 (Submit written direction and deliver the envelope)

**Status:** ready-for-agent

- [ ] Saving the artifact produces a new content-addressed revision that the review surface observes and reloads
- [ ] Original targets re-resolve against the new revision as exact, recovered, ambiguous, stale, or deleted, never silently picking an uncertain target
- [ ] The Builder-Reviewer compares requested intent with the resulting revision and can approve, reject, request another pass, supersede, or mark obsolete
- [ ] Agent acknowledgement or source modification alone never completes the intent; verification history survives restart

## Comments

Implemented (implemented in 8b70d52): BLAKE3 content-addressed revisions (src/artifact/revision.ts), revision polling + banner, POST /api/intents/:id/resolutions re-resolves every target as exact/recovered/ambiguous/stale/deleted (src/resolution/resolve.ts, never silently picks uncertain targets), human-only verify approve/reject/another-pass/supersede/obsolete with deleted/ambiguous blocking approval; history survives restart (tests/loop.test.ts).
