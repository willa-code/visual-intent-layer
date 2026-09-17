# 01: Restore the set

**What to build:** A Builder-Reviewer points at several visible targets into one Annotation, sees the whole set marked while the note is written, and removes one member without starting again.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Shift-clicking a target adds it to the current Annotation's set, and shift-clicking a target already in the set removes it; a plain click replaces the set
- [x] `Escape` clears the set, on the existing unwinding level
- [x] Shift while drawing an Area adds that Area as one member of the set
- [x] Every member of the set is visibly marked on the artifact, and the anchored card names what is in the set rather than only its first member
- [x] A set that would exceed eight targets is refused with a stated reason and the existing set is left intact; nothing is silently truncated
- [x] All members live on one Annotation: the stored Annotation carries the full set, and the full set survives a reload
- [x] A drag that begins on an already-selected target still does nothing beyond ticket 03; this ticket composes the set only

## Comments

Done 2026-09-17. `selectElement`, `selectEnclosed` and the text-range path accept an additive step and cap the set at eight, the anchored card names the set, and `markBySelectors` clears the layer set so identity is never stale. Driven in `tests/browser-loop.test.ts` (shift adds, shift removes, cap refuses in words, a plain click replaces).
