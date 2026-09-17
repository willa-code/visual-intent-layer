# 04: Spacing and containment

**What to build:** Equal spacing across three or more targets and containment of one target inside another are expressible by the same drag gesture, recorded implementation-neutrally.

**Blocked by:** 03

**Status:** done

- [x] `spacing` (`equal-gap`) is expressible by dragging a selected target so the set reads as evenly spaced, and the sentence names every member it spans
- [x] `containment` (`member-of`) is expressible by dragging a selected target inside another member, and a drawn Area can be the container
- [x] Both are stored on the Annotation with no pixel field and travel as the desired relationship rather than a displacement
- [x] Neither drag changes the artifact's source or authoritative DOM
- [x] Each relation is visible as one sentence in the card before release

## Comments

Done 2026-09-17. `Alt` declares equal spacing across three or more targets; dropping a selected target inside another records containment, and `boxOfTarget` lets a drawn Area be the container. Driven live in `tests/browser-loop.test.ts`.
