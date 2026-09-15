# 15: Migrate existing local state and align the benchmark vocabulary

**What to build:** A Builder-Reviewer who already recorded intent in this product does not lose it: an existing envelope becomes one Annotation per target, carrying the direction that was shared across them, wherever that mapping is unambiguous. State that cannot be mapped is left untouched and reported rather than discarded.

**Blocked by:** 06 (Reduce the resolution model and show it)

**Status:** done

- [x] An existing persisted envelope is readable as Annotations after the change, one per target, each carrying the envelope's shared written direction
- [x] State whose mapping is ambiguous is left unmodified and reported to the Builder-Reviewer
- [x] Unreadable state fails visibly with the original bytes preserved
- [x] The resolution benchmark's vocabulary matches the stored model