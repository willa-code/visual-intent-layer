# 01: Write the status and deferral rule into the tracker docs

**What to build:** `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`
state one closed status vocabulary and what each status obliges, so a maintainer can
tell an open ticket from a shipped one without reading the code.

**Status:** done

- [x] The tracker documents name the closed vocabulary: `needs-triage`, `ready-for-agent`, `ready-for-human`, `deferred`, `done`, `superseded`, `superseded in part`, `wontfix`
- [x] `done` is defined as every acceptance box ticked, or a `Deferred confirmation:` comment naming each unticked box and why it cannot be driven
- [x] `deferred` requires a named trigger — the thing that unblocks it — and a date
- [x] `superseded in part` is defined for a spec a later spec amended, which is the state `review-surface` and `visual-intent-layer` are in
- [x] A correction is an appended `## Comments` entry plus a status change; a box and the text around it are never rewritten
- [x] `triage-labels.md` and `issue-tracker.md` carry the same vocabulary, so the two documents cannot disagree
- [x] No existing file is changed by this ticket; it writes the rule the rest of the iteration applies

## Comments

Three conventions coexist today. `target-evidence/10` is `done` with an unticked box;
`review-surface/08` is `done` with every box ticked and a `Deferred confirmation:`
comment; `verification-skill/05` is `done` with an unticked box and a comment saying
"Not driven live". `docs/agents/issue-tracker.md` currently only says `done` means
"every acceptance checkbox ticked", which two of those three files contradict.

Done 2026-09-17. `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` now carry the same closed vocabulary, the `done` rule, the `deferred` trigger-plus-date rule, the `superseded in part` definition and the append-only correction rule. No other file was changed by the rule itself; `scripts/check-records.js` enforces all of it.
