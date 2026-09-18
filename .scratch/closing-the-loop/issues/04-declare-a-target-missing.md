# 04: Declare a target missing

**What to build:** On an anchor the product could not locate, and only there, one
action declares it missing. The declaration is stored on the Annotation with the
revision it was made against, reads in its own words, clears that anchor's approval
blocker, and travels in the next envelope so the agent is told.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The declaration is offered only where the resolution found zero candidates; an ambiguous anchor with candidates offers re-pointing instead
- [ ] The act is stored per target with the result revision, and a later resolution run cannot silently overwrite it
- [ ] The row states the declaration in its own words, distinct from the derived deleted label
- [ ] Declaring missing clears that anchor's approval blocker; a declaration made against a different revision does not
- [ ] The declaration is carried in the delivered envelope so the agent is told the target is gone
- [ ] `CONTEXT.md` defines the act and keeps it distinct from Target Resolution's derived vocabulary
- [ ] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
The stored and derived claims never share a word.