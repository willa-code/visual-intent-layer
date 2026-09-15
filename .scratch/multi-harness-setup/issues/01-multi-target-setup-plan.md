# 01: Multi-target setup plan

**What to build:** The setup command plans a per-harness list of config targets instead of a single file, so later tickets can add harnesses without reshaping the core again. From the Builder-Reviewer's perspective nothing changes yet: project and global setup produce byte-identical output, all flags keep their meaning, and the full suite stays green. Detection of installed harnesses, the harness filter flag, and the injectable command runner for future CLI delegation all land here behind the unchanged behavior.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Plan step returns an ordered per-harness target list covering writes, delegations, skips, and refusals; apply step executes it and reports what changed
- [x] Harness detection treats a harness as present when its binary resolves or its config file or directory exists
- [x] Repeatable harness filter flag restricts the matrix; without it all detected in-scope harnesses are planned
- [x] Command runner is injectable so tests never invoke real harness binaries
- [x] Existing setup behavior is byte-identical: shared project file, shared global file, Skill install, merge-never-overwrite, refuse-on-invalid, preview writes nothing, missing Skill fails loudly

## Comments

- `planSetup` now returns an ordered target matrix (`file`/`exec`/`skill`) with per-target `harnesses`, disposition, and content; `applySetup` executes it and returns per-target outcomes (`wrote`/`skipped`/`delegated`/`manual`/`refused`).
- Detection: binary on `PATH` or the harness's config file/dir existing. Filter is repeatable `--harness`; the injectable `runCommand` keeps tests off real binaries.
- Content identity: pi project/global shared files and the Skill install produce the same bytes as before. One deliberate change from the old unconditional behavior: when *no* harness is detected, global scope now writes nothing (the spec narrows the keep-working-by-default fallback to project scope). Project scope still writes `.mcp.json` so pi and Claude Code work on an empty machine.
- Shared project `.mcp.json` is a single target labelled `pi, claude-code` when both are in scope (one write, one entry).
- 44 setup tests cover detection, filter, merge, idempotency, invalid refusal, preview, and Skill failure. Full suite: 163 passing; typecheck clean.

### Review follow-up

Code review flagged that gating the Skill on `harnesses.includes('pi')` added an unstated condition and weakened the missing-Skill loud failure. Reconciled: the Skill is controlled by `--no-skill` alone unless an explicit `--harness` filter excludes pi (story 11's "don't touch tools I never installed"). So an unfiltered `setup` still installs the Skill and still fails loudly if the Skill source is missing, byte-identical to before; global scope with no harness detected now plans the Skill only (the spec deliberately drops the global shared-file fallback).
