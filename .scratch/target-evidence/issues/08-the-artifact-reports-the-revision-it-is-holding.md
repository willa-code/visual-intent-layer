# 08: The artifact reports the revision it is holding

**What to build:** An Annotation is stamped with the Adopted Revision — the
revision the surface actually has before the Builder-Reviewer — and never with the
revision a source currently offers.

**Status:** done

- [x] The artifact reports the revision it has loaded when a session's document is served
- [x] The surface records that report as the Adopted Revision, and records each revision it advances to
- [x] A new Annotation is stamped with the Adopted Revision at the moment it is written
- [x] An advance the artifact has applied but the surface has not adopted is not stamped onto a new Annotation
- [x] Where the artifact's reported revision and the source's current revision disagree, the disagreement is stated rather than smoothed, and the Annotation keeps the artifact's report
- [x] A saved HTML artifact and a running application both follow this rule, so the fix is not conditional on artifact kind
- [x] The fact is read back through the surface or the API, not by asserting a store field

## Comments

Pass A already stamps an Annotation with the revision being viewed for saved HTML,
where the revision is derived from the file's own bytes
(`src/service/http.ts:398-399`). What is missing is the running-application case,
where the revision cannot be derived from files at all: `fetchAppRevision` hashes
the dev server's root HTML response, which does not change when a component is
edited, so the surface's notion of "the artifact changed" never fires.

The research is explicit that no server-side mechanism can answer this: a
server-side revision says the server changed, not that the browser applied it. The
only way to record what the human was actually looking at is for the page to
report it, and for the Annotation to store that report. This ticket is that rule,
and it is worth doing before the mechanism that feeds it (ticket 09) because it is
a correctness fix under every mechanism.

`CONTEXT.md` now carries **Adopted Revision** as the term for this, and
`_Avoid_: Current revision, latest revision, server revision, head`.
