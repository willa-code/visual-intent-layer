# 06: A lost target is repaired by pointing

**What to build:** An Annotation whose target could not be matched can be **re-pointed**: the Builder-Reviewer points at the right thing and that Annotation now carries that target, instead of a new draft being composed. The approval block clears without the Builder-Reviewer confirming a candidate they believe is wrong.

Today approval is refused until a candidate is chosen, and the only way to mark a target gone is for the product to find zero candidates. So a Builder-Reviewer who believes all candidates are wrong must confirm one to record a verdict — the surface asserts a state the domain does not have.

**Blocked by:** 05 — Uncertainty moves onto the artifact

**Status:** done

- [x] The action is offered only on an Annotation whose target could not be matched
- [x] Choosing it puts the surface into a state where the next selection re-points that Annotation rather than composing a new Annotation. Today every selection composes a new one, so this is a change in the selection path
- [x] The Annotation carries the new target, the old target is gone, and the row's unresolved state clears
- [x] Approval is then permitted, and no candidate was chosen to reach that state
- [x] Escape leaves the re-point state without changing the Annotation
- [x] Composing a new Annotation is unchanged when no re-point is in progress
- [x] The action is reachable and named programmatically, and states what it will do
- [x] A test drives a lost target, re-points it, and records an approval, asserting that no candidate was ever chosen

## Comments
