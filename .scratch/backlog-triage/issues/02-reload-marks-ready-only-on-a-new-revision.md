# 02: Reload marks a Pass ready only on a new revision

**What to build:** `/reload` marks Passes ready only when the revision actually moved,
matching what `/adopted` already does.

`/reload` calls `markPassesReady` unconditionally (`src/service/http.ts:465-466`) while
`/adopted` guards the same call on the revision changing (`:262-263`), and
`markPassesReady` flips every open or in-flight Pass with no revision check
(`src/annotation/store.ts:711-719`). The multi-page notice's "Back to the reviewed
document" drives this route, so following a link off the document and coming back can
report that it is the Builder-Reviewer's turn while the agent is still working.

**Status:** done

- [x] `/reload` calls `markPassesReady` only when the adopted revision differs from the one the session held
- [x] A reload with an unchanged revision leaves an open Pass open, asserted through the service
- [x] A reload onto a genuinely new revision still marks the Pass ready
- [x] The guard reads the same way as the one in `/adopted`

## Comments

Landed 2026-09-18. `/reload` now mirrors `/adopted`: `markPassesReady` runs only when `(session.adoptedRevision ?? session.revision) !== current` (`src/service/http.ts`).

The test *marks a Pass ready only when a reload actually brings a new revision* sends an Annotation, reloads with the Artifact unchanged and asserts the Pass is not `ready`, then changes the file and reloads through the surface and asserts it is `ready`. Driven live as well: Verification Run `.visual-intent-verify/runs/2026-09-18_06-28-32-backlog-triage-repairs` read `in-flight` back after the no-change reload and `ready` with the new `toRevision` after the real one.
