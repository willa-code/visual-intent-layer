# 02: Make the rules checkable

**What to build:** A script and a CI step that fail when a record contradicts itself,
because prose alone already drifted once and the drift was only found by reading every
file by hand.

**Status:** done

**Blocked by:** 01

- [x] `scripts/check-records.js` reads every `spec.md` and every file under an `issues/` directory in the real `.scratch/` tree
- [x] It fails when a file carries no `Status:` line, or a status outside the vocabulary ticket 01 writes
- [x] It fails when a `done` issue has an unticked box and no `Deferred confirmation:` comment
- [x] It fails when a `deferred` file names no trigger
- [x] It fails when an issue file is not named `NN-<slug>.md` under an `issues/` directory, so the numbering convention is enforced rather than assumed
- [x] A fixture tree proves each failure mode, so the check does not depend on the live tree staying wrong
- [x] CI runs it beside the other gates, before the browser tests
- [x] It reports the file and the reason rather than a count, so the failing record is the output
- [x] It leaves ADRs, `docs/background/` and the prose inside specs untouched: it checks records, not arguments

## Comments

Prior art is `scripts/check-bins.js`, which already fails on a disagreement between
`package.json` and `mcp.json`. The equivalent disagreement here is between a file's
status and its own acceptance boxes — the thing that produced the nineteen stale
`surface-refinement` tickets and the three `done`-with-a-gap tickets.

Done 2026-09-17. `scripts/check-records.js` reads every `spec.md` and every issue under an `issues/` directory, and fails on an unknown or missing status, on a `done` issue with an unticked box and no `Deferred confirmation:` comment, on a `deferred` file with no `Trigger:` line or date, and on an issue filename that is not `NN-<slug>.md`. `tests/check-records.test.ts` proves each failure mode against `tests/fixtures/records/`, and CI runs it after typecheck and before the browser tests. It reports the file and the reason, and never reads ADRs, `docs/background/` or spec prose.
