# 05: Equivalence and comparative size

**What to build:** A shared visible property and a comparative size are expressible by the same drag gesture, so the operator vocabulary ADR-0016 reduced to the relations with a real gesture is complete.

**Blocked by:** 03

**Status:** done

- [x] `equivalence` (`shared-property`) is expressible, and the sentence names the visible property that should match
- [x] `comparative-size` (`same-width`, `same-height`) is expressible, and the sentence names which dimension should match
- [x] Both are stored on the Annotation with no pixel field and travel as the desired relationship rather than a displacement
- [x] Neither drag changes the artifact's source or authoritative DOM
- [x] Each relation is visible as one sentence in the card before release

## Comments

Done 2026-09-17. `Ctrl`/`Cmd` declares a shared visible property and `Shift` declares comparative size, whose dominant axis chooses width or height. Driven live in `tests/browser-loop.test.ts`.
