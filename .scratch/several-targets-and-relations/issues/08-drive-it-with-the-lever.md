# 08: Drive it with the Lever

**What to build:** The verification skill can build a set and express every relation with the Lever, reads the stored relationship back, and the relational-intent feature file stops saying "deferred".

**Blocked by:** 04, 05

**Status:** done

- [x] The Lever regains `select --add`, which extends the set the way the modifier does, and no longer records coverage for a modifier nothing reads
- [x] The Lever gains a `relate` drive that selects two or more targets, drags an already-selected one, and reads `relationships` back from `state`
- [x] The drive asserts the recorded `operator` and that the stored relationship carries no pixel field
- [x] `.agents/skills/verify-visual-intent-layer/references/features/relational-intent.md` no longer says "deferred": it states that no relation is promised nowhere, and its sub-features name the live gesture
- [x] The feature file records the keyboard route as stated-absent, per the contract amendment
- [x] Coverage is recorded only for behaviour the drive actually reached

## Comments

Done 2026-09-17. `select --add` holds Shift or toggles a member, and `relate` selects, drags an already-selected target, reads `relationships` back and exits 4 when nothing is recorded. `browser-host.mjs` gained modifiers for the box drag. `relational-intent.md`, the feature index, `annotate-and-send.md` and `SKILL.md` no longer say deferred. Covered by `tests/lever-contract.test.ts`, including a refusal case.
