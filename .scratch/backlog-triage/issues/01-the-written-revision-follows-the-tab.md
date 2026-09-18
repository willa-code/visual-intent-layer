# 01: The written revision follows the tab

**What to build:** A tab reports, and stamps an Annotation with, the revision it is
actually showing — not the last revision any tab on that session reported.

`adoptedRevision` is one field on the shared session (`src/service/sessions.ts:14`), and
the poll copies it into whatever tab is looking (`src/ui/app.ts:1720-1721`). So tab A can
render revision 1's bytes while its rail reads "Revision under review: 2", its rows flip
their `revisionRelation` (`src/ui/app.ts:619`), and `createDraft` stamps the next
Annotation with revision 2 from `session.adoptedRevision` (`src/service/http.ts:338`)
although the target evidence came from revision 1. `design.md` §5 makes the written
revision part of what an Annotation means, so the record is false.

**Status:** done

- [x] The poll no longer copies the session's `adoptedRevision` into the tab
- [x] The tab states the revision it is showing when it composes, and the stored Annotation carries that revision
- [x] A tab that has not reloaded keeps reporting the revision it holds while another tab reloads
- [x] Two tabs on one session are driven in `tests/browser-loop.test.ts`, asserting the second tab's Annotation is stored against the revision it showed
- [x] No new control, notice or word reaches the surface

## Comments

Landed 2026-09-18. `pollStatus` no longer assigns the session's `adoptedRevision`, and the composing tab sends the revision it is showing (`appliedRevision`), which `POST /api/sessions/:id/annotations` uses in place of the session's field (`src/service/http.ts`); a request that omits it keeps the old fallback.

The test *keeps a tab reporting the revision it is showing when a second tab adopts a newer one* opens two pages on one review URL, reloads the second onto a new revision, waits a full poll interval, and asserts the first tab's chip still reads its own revision and that the Annotation it then composes is stored with that revision. It was checked against the defect: restoring the poll assignment makes it fail on the chip assertion, so it is not a vacuous test.

The Lever cannot drive this path — it owns exactly one page — and the run records that as an unreachable path with its precondition rather than counting it as covered.
