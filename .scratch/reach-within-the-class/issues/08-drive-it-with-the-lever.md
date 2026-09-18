# 08: Drive it with the Lever

**What to build:** The verification skill can drive a fixture carrying an open shadow root,
a nested shadow root, a closed shadow root and a same-origin frame, read the stored boundary
evidence back from state, and its feature map describes the surface as it now is. A
Verification Run is recorded.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] A fixture exists carrying an open shadow root, a shadow root inside a shadow root, a closed shadow root and a same-origin frame
- [ ] The Lever points at a shadow-rooted element and at a frame element, and reads the stored grounding and boundary evidence back from `state`
- [ ] The Lever drives the unrendered-row case and confirms the row's state word, and confirms the product never moves the artifact
- [ ] The Lever drives the bound being reached and reads the recorded truncation fact back
- [ ] Coverage is recorded only for behaviour a drive actually reached
- [ ] The feature map no longer describes traversal as stopping at the artifact document, and names the refusals it does make
- [ ] A Verification Run is recorded per the maintainer skill, or the untested paths are named with their preconditions

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md`. The previous iteration's
lesson carried forward: a drive the harness cannot perform must be named with its
preconditions rather than recorded as covered.
