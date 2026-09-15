# 07: Verify each Annotation

**What to build:** Verify shows the artifact with the revision before and the revision after the change toggleable in place, each Annotation's target marked in both and its decision controls beside it. Each Annotation is approved, rejected, sent for another pass, superseded or marked obsolete on its own. Approval is refused while its target cannot be found at all, and an ambiguous target requires an explicit choice.

**Blocked by:** 06 (Reduce the resolution model and show it)

**Status:** done

- [x] Verify shows the pre-change and post-change revisions toggleable in place, with each Annotation's target marked in both
- [x] Each Annotation is decided separately and its decision is recorded against it
- [x] Approval is refused while a target is unresolved with no candidates, and the surface gives the reason
- [x] An ambiguous target requires an explicit choice from its candidates before it can be decided
- [x] Agent acknowledgement cannot produce verification
- [x] Verification history survives a restart