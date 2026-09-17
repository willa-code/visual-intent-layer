# 03: Bring every spec status up to date

**What to build:** Each `.scratch/*/spec.md` says what actually happened to the
iteration it describes.

**Status:** done

**Blocked by:** 01

- [x] `target-evidence/spec.md` is `done`
- [x] `surface-refinement-pass-a/spec.md` is `done`
- [x] `surface-refinement/spec.md` is `done`
- [x] `review-surface/spec.md` is `superseded in part by .scratch/surface-refinement/spec.md` and `.scratch/surface-refinement-pass-a/spec.md`
- [x] `verification-skill/spec.md` is `done`
- [x] `harness-detection/spec.md` is `done`
- [x] `multi-harness-setup/spec.md` is `done`
- [x] `visual-intent-layer/spec.md` keeps its `superseded in part` status and names every spec that amended it
- [x] `truth-and-sync/spec.md` is `done` when this iteration lands
- [x] Each change records why in the spec it changes, so the status is not an edit without a reason

## Comments

Seven of the eight specs said `ready-for-agent` at the time this iteration was written.
Whether a spec is `done` while one of its tickets is `deferred` is settled by ticket 06:
a parked verification does not reopen an iteration whose behaviour shipped.

Done 2026-09-17. Every spec status now states what happened: `target-evidence`, `surface-refinement-pass-a`, `surface-refinement`, `verification-skill`, `harness-detection` and `multi-harness-setup` are `done`; `review-surface` is `superseded in part` by `surface-refinement` and `surface-refinement-pass-a`; `visual-intent-layer` names every spec that amended it; `truth-and-sync` is `done`. Each spec records the reason in an appended `## Comments` entry.
