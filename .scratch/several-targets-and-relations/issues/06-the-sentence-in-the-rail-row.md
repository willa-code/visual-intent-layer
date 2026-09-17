# 06: The sentence in the rail row

**What to build:** The same sentence the card shows is shown in the rail row for that Annotation, from one implementation, so a stored relation reads the same wherever it appears.

**Blocked by:** 03

**Status:** done

- [x] A recorded relation is shown in the rail row as the same sentence the card shows, from the same formatter
- [x] The row sentence survives a reload and is absent on an Annotation with no relation
- [x] The rail row's summary carries the relations it needs to render the sentence, without a second formatter
- [x] No pixel value appears in the row sentence

## Comments

Done 2026-09-17. `AnnotationSummary` carries `relationships`, and the rail row renders the same sentence as the card from the one formatter in `src/annotation/relations.ts`. The row sentence is asserted live and after a reload.
