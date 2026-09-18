# 04: Declare a target missing

**What to build:** On an anchor the product could not locate, and only there, one
action declares it missing. The declaration is stored on the Annotation with the
revision it was made against, reads in its own words, clears that anchor's approval
blocker, and travels in the next envelope so the agent is told.

**Blocked by:** 01

**Status:** done

- [x] The declaration is offered only where the resolution found zero candidates; an ambiguous anchor with candidates offers re-pointing instead
- [x] The act is stored per target with the result revision, and a later resolution run cannot silently overwrite it
- [x] The row states the declaration in its own words, distinct from the derived deleted label
- [x] Declaring missing clears that anchor's approval blocker; a declaration made against a different revision does not
- [x] The declaration is carried in the delivered envelope so the agent is told the target is gone
- [x] `CONTEXT.md` defines the act and keeps it distinct from Target Resolution's derived vocabulary
- [x] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
The stored and derived claims never share a word.

Done 2026-09-18. `AnnotationStore.declareMissing` records the act in a
`declaredMissing` list on the Annotation, stamped with `resolvedRevision` and a
`declared-missing` history event, and refuses a target that still has candidates.
`approvalBlockers` consults `declaredMissingNow`, so only a declaration matching
the revision under review clears the wall. The envelope's target definition gains
an optional `declaredMissing` object — an additive change to `0.3` — and
`buildBatchEnvelope` merges it, so the agent is told. The row renders the
Builder-Reviewer's words through `resolutionItem`'s `declared` flag and gains a
`Declare missing` action beside Re-point. ADR-0027 records the decision, with
`CONTEXT.md` gaining **Declared Missing** and `design.md` §6 and §11 amended.
Covered by four store tests and a browser-loop drive that declares a state-only
target, reads its words back and asserts the approval wall clears.