# 06: Reduce the resolution model and show it

**What to build:** When the artifact changes, each Annotation's target is located again and reported as matched exactly, recovered on weaker evidence, or unresolved with its candidates; separately, the Annotation is marked as written before the revision now on screen. The surface shows Matched, Recovered, Ambiguous, Deleted and Stale derived from those facts, and never presents a guess as a match. The mutation benchmark measures the same vocabulary.

**Blocked by:** 04 (One Annotation, end to end)

**Status:** done

- [x] A target resolution stores whether the target matched exactly, was recovered on weaker evidence, or is unresolved, together with its candidates
- [x] An unresolved target with candidates is shown as ambiguous, and its candidates are never auto-selected
- [x] An unresolved target with no candidates is shown as deleted, and states that approval is blocked
- [x] Whether an Annotation was written before the revision now on screen is an Annotation-level fact, shown as such and never as a target outcome
- [x] Provenance confidence is labelled on its own axis and never shares the word "exact" with target resolution in the same view
- [x] The mutation benchmark measures exact resolution, recovered resolution, correct ambiguity, correct abstention and confidently-wrong resolution using the stored model