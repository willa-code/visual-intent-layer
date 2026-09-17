# 01: Runtime State Evidence on every Target

**What to build:** A Target records the address the artifact was showing when it
was pointed at, and the surface states honestly when a Target that cannot be
found is being looked for in a different state than the one it was pointed in.

**Status:** done

- [x] The envelope's `target` gains one field carrying the address, and the schema moves to `0.3` with a read path for `0.2`
- [x] The field is optional, and a Target pointed at an artifact with no address records none rather than an empty string
- [x] The address is recorded relative to the artifact's own base, so it is not a fact about the review proxy
- [x] An element Target, a text-range Target and a drawn Area all record it
- [x] A `0.2` envelope without the field loads and resolves unchanged
- [x] The generated types are rebuilt from the schema, never hand-edited
- [x] When a Target is unresolved and the artifact revision has not changed since the Annotation was written, the row says the Target may exist only in a state no longer on screen
- [x] That state is derived at read time and is never stored, and it appears as words with no percentage or score
- [x] A Target that is unresolved *without* a state difference still reads as Deleted, so the new label never replaces the old one

## Comments

Viewport, device pixel ratio and scroll position are already recorded by every
grounding builder (`src/ui/artifact/grounding.ts:29-91`) and by `regionEvidence`
for a drawn Area, so this ticket adds exactly one fact rather than a second copy
of existing evidence.

The envelope takes a minor bump because `target` is `additionalProperties: false`
in `schema/envelope-v0.2.schema.json`. The schema already declares minor additions
backward compatible, and ADR-0020 keeps the wire's `saved-html` and
`react-vite-app` enum values untouched.

Deriving "may exist only in that state" rather than storing it follows ADR-0016:
Ambiguous, Deleted and Stale are display labels derived from stored facts, and
this label is one more.
