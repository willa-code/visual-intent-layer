# 08: Fall back to words the glossary permits

Status: done

**What to build:** `describeTarget` (`src/ui/app.ts:2102-2107`) reads
`target.label ?? grounding.accessibleName ?? grounding.semanticRole ?? target.kind`, so
a target with none of the first three shows the Builder-Reviewer the raw wire kind. Two
kinds reach that last step, and one of them is a vocabulary violation rather than a
terse label:

- `region` — and `CONTEXT.md:117` lists _Region_ under _Avoid_ for **Area**. The card
  shows the human the exact word our own glossary forbids for that concept.
- `text-range` — `src/ui/artifact/grounding.ts` never sets `accessibleName` for a text
  range and only sometimes sets `semanticRole`, so a range with no role falls through too.

`element` never reaches the fallback: `labelOf` (`src/ui/artifact/layer.ts:164-167`)
always seeds a label with the tag name.

- [x] Give the fallback human words for all three kinds, using the glossary's own
      vocabulary rather than inventing a new one — **Area**'s definition is "a visible
      target the Builder-Reviewer bounded themselves".
- [x] Cover both reachable kinds with a test, not just the one the audit happened to name.
- [x] Keep `design.md`'s `AnnotationCard` row true: it currently describes the fallback
      order without saying what the last resort reads as.

**Why its own ticket:** the install change touches nothing in `src/ui/`, and this is a
surface-vocabulary repair found by the same audit that produced `ground-in-code`. It
should not wait for `standard-mcp-distribution` to land, and it should not be half-fixed
inside it.

## Comments

Landed. The mapping moved into `src/ui/target-label.ts` rather than staying inline in
`app.ts`, because `describeTarget` is not exported and the shell is otherwise covered
only by the browser loop; a two-line pure module gives the fallback a seam a node test
can reach without exporting 2,000 lines of shell. `describeTarget` now reads
`targetKindLabel(target.kind)` as its last resort.

The three labels use the glossary's own words rather than new ones — `CONTEXT.md`'s
**Target** entry is "an element the artifact owns, an exact word range, or an Area the
Builder-Reviewer bounded" — so the card says "an element the artifact owns", "an exact
word range" or "an area you bounded". The test asserts what the fix is actually for:
that `region` never appears, including the possibility of it appearing capitalised.

`design.md`'s `AnnotationCard` row now names what the last resort reads as, so the
contract and the code agree about the fallback instead of only about its order.

Verified: typecheck and 341 tests across 30 files.
