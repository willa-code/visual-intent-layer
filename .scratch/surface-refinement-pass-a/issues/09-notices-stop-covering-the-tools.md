# 09: Notices stop covering the tools

**What to build:** A notice appears at the **rail's top edge**, one at a time, and never over the stage, the mode island or an open card. A notice is emitted only where a row cannot already show the outcome, and a notice carrying an action does not auto-dismiss.

Today a notice is positioned directly over the mode island — the same centre line, above it in stacking order — which hides the control that governs the pointer at the exact moment the Builder-Reviewer has just acted.

**Blocked by:** 02 — Rename the vocabulary and migrate stored data

**Status:** done

- [x] The notice is positioned within the rail's top edge and cannot overlap the artifact, the mode island or an anchored card at any viewport size
- [x] At most one notice is present at a time; a second replaces the first rather than stacking
- [x] Queueing an Annotation and delivering a queue produce no notice, because the row's own state already says so
- [x] A notice carrying an action does not auto-dismiss; a notice with no action may dismiss itself
- [x] A notice is announced to assistive technology and is never the only carrier of its information
- [x] The mode island is pointer-reachable and unobstructed while a notice is present
- [x] A test drives a queue, a send and a failing action, and asserts which of them produce a notice and which do not

## Comments
