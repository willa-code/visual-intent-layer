# Harness detection, registration fidelity, and status

Status: ready-for-agent

## Problem Statement

As a Builder-Reviewer, I install the package on a machine that has pi, Codex, Claude Code, and opencode, and run setup — and it reports and configures pi only. Harness Detection is a handful of inline conditionals inside `cli-setup.ts`, so it misses Harnesses that other tools find: a Harness whose configuration lives outside our hardcoded `~/.codex`, `~/.claude`, or `~/.config/opencode` paths because `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, or `XDG_CONFIG_HOME` is set; a Harness installed on a machine where it has never been launched and therefore has no configuration directory yet; a Harness whose command is present but is a Windows shim or a non-executable file. Worse, when detection returns nothing, setup silently narrows to pi and writes the shared `.mcp.json`, so "nothing was detected" and "only pi is installed" print identically and the Builder-Reviewer cannot tell a default from a result.

The same distrust runs the other way. An existing Harness Registration is reported as registered the moment our server's key exists, whatever its command and arguments are, so an entry left behind by an older release or pasted from the packaged snippet survives every re-run while the server stays unreachable. And because setup never prints its own version, a report about a machine behaving differently cannot be dated to the release that produced it.

## Solution

From the Builder-Reviewer's perspective, setup looks harder at the machine and then tells the truth about what it found. A Harness is present when its own configuration location exists — honouring that Harness's documented config-home environment override — or when its own command resolves on `PATH` under our executable check, or when one of that Harness's known extra locations exists. The report names every detected Harness, every known-but-absent Harness with the evidence that was checked, and states plainly when nothing was detected and the shared default is being written. Setup prints its own version on every run.

Registration becomes content-verified: an entry that matches what the installed product would write is current and left alone; an entry that differs is outdated, names the differing fields, and is repaired on re-run. A read-only `--status` mode reports per-Harness state without touching disk. When `visual-intent` does not resolve on `PATH`, setup writes the packaged `npx` transport instead of an entry every Harness will fail to spawn, and says which transport it chose. Merge-never-overwrite, refuse-on-invalid-config, the harness filter, preview mode, and the pi Skill install keep working exactly as before.

## User Stories

1. As a Builder-Reviewer, I want setup to detect a Harness from its own configuration location, so that a Harness that is installed and configured is found even when its command is not on `PATH`.
2. As a Builder-Reviewer, I want setup to honour each Harness's documented configuration-home environment override, so that a non-default `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, or `PI_CODING_AGENT_DIR` is detected instead of missed.
3. As a Builder-Reviewer, I want setup to detect a Harness from its command on `PATH`, so that a Harness installed but never launched is still found.
4. As a Builder-Reviewer, I want the `PATH` check to verify an executable and to accept platform command shims and known command aliases, so that a Windows shim or a non-executable file of the same name is classified correctly.
5. As a Builder-Reviewer, I want project-local Harness configuration to keep counting as presence, so that a Harness set up only inside this project is detected.
6. As a Builder-Reviewer, I want setup to check each Harness's known extra locations, so that installations outside the home directory are found.
7. As a Builder-Reviewer, I want the report to name every detected Harness, so that I can see what setup acted on.
8. As a Builder-Reviewer, I want the report to name every known-but-absent Harness with the evidence that was checked, so that a missing Harness is diagnosable without reading our source.
9. As a Builder-Reviewer, I want an explicit statement when nothing was detected and the shared default is written, so that "pi only" is never ambiguous between a result and a fallback.
10. As a Builder-Reviewer, I want setup to print its own package version, so that any behaviour report can be dated to the release that produced it.
11. As a Builder-Reviewer, I want a Harness Registration whose entry matches what the installed product would write to be left untouched, so that re-running is safe and idempotent.
12. As a Builder-Reviewer, I want a Registration that differs from the current entry to be reported as outdated with the differing fields, so that I can see why a Harness is not working.
13. As a Builder-Reviewer, I want an outdated Registration to be repaired on re-run, so that a stale entry left by an older release or a copied snippet heals without hand-editing.
14. As a Builder-Reviewer, I want a read-only status mode that reports per-Harness state, location, transport, and detection evidence, so that I can inspect the machine without changing it.
15. As a Builder-Reviewer, I want setup to write the packaged `npx` transport when `visual-intent` does not resolve on `PATH`, so that registration succeeds on a machine with no global install.
16. As a Builder-Reviewer, I want the report to say which transport was written, so that I understand what the Harness will run.
17. As a Builder-Reviewer, I want preview mode to show detection results, the chosen transport, and each planned Registration state, so that I can review everything before any write.
18. As a Builder-Reviewer, I want the harness filter, merge-never-overwrite, refuse-on-invalid-config, and the pi Skill install to keep their current meaning, so that nothing I already learned changes.

## Implementation Decisions

- Harness knowledge moves into a registry of per-harness descriptors: canonical name, command aliases, configuration-home environment variable, global and project configuration locations, extra presence locations, native entry shape, and the word used in reports. `cli-setup.ts` consumes descriptors instead of holding inline conditionals. No new runtime dependency is added: XDG resolution and the executable check are implemented in-repo.
- Harness Detection is the union of: a configuration location existing, a command resolving, a project-local configuration path existing, and that Harness's extra locations. Each Harness contributes evidence, so the report can name what was checked rather than only what was found.
- Descriptor values: pi detects on `PI_CODING_AGENT_DIR` else `~/.pi/agent` or `~/.pi`, project `.pi/`, command `pi`. Codex detects on `CODEX_HOME` else `~/.codex`, `/etc/codex`, project `.codex/config.toml`, `~/.codex/packages/standalone/releases/*/bin/codex`, command `codex`. Claude Code detects on `CLAUDE_CONFIG_DIR` else `~/.claude`, plus `~/.claude.json`, command `claude`. opencode detects on `($XDG_CONFIG_HOME or ~/.config)/opencode`, project `opencode.json` or `opencode.jsonc`, commands `opencode` and `opencode2`.
- The command check walks `PATH` with per-platform command candidates (Windows `.exe`, `.cmd`, `.bat`, `.ps1`), requires an executable file on Unix, and resolves symlinks before matching a Harness command name.
- Detection returns evidence per Harness rather than a boolean list, so both the plan and the report carry the checked locations and the reason a Harness was skipped.
- Registration states replace the current presence-or-absence model: current (entry matches what we would write), outdated (entry differs; the report names the differing fields), absent (write), manual (comment-bearing file, or a Harness whose writer command is missing), refused (invalid configuration). Outdated repairs on apply; current is skipped without touching the file.
- Comparison happens in each Harness's native format: deep comparison of the server entry inside `mcpServers` for shared JSON files, comparison of the command and arguments recorded in the Codex `mcp_servers` table, and deep comparison of the entry under `mcp` for opencode. Codex comparison extends the existing header detection to read the table's fields; no TOML dependency is added. Claude Code user scope compares the entry in its state file and still delegates writes to its own command.
- Transport selection is part of planning: when `visual-intent` resolves through the same command check, entries use `command: "visual-intent"` with args `["mcp"]`; otherwise entries use the packaged `npx -y --package visual-intent-layer@<version> visual-intent-mcp` form, with the version read from the running package. The plan and report state which transport was chosen.
- `setup` prints the running package version on every run, before the plan or result.
- A read-only status mode reports, per Harness, the Registration state, the location or command it applies to, the chosen transport, and the detection evidence. It never writes, and it honours the harness filter.
- The Skill install stays pi-scoped and behaviour-identical, controlled by the Skill flag. Scope semantics, merge-not-overwrite, refuse-on-invalid, preview behaviour, and the harness filter are unchanged.
- Setup support remains Baseline Compatibility: registering a Harness means the server is reachable there, not that the Harness carries a Certified Experience.

## Testing Decisions

- A good test asserts externally visible behaviour — what the report says, what files hold afterwards, what a delegation receives — never internal helper order or intermediate shapes.
- The existing setup suite is the prior art and the seam: temp home and project directories, an injectable `PATH`, an injectable command runner, plan/apply separation, merge-preserves-existing, refuse-on-invalid, preview writes nothing, missing Skill source fails loudly.
- Detection tests run per Harness over temp directories and fake `PATH` directories, asserting the reported evidence: default location, environment-override location, project-local location, extra location, command present, command present as a non-executable file (must not count), command present as an alias, and fully absent.
- Registration tests run per native format and assert the four states plus repair: matching entry leaves the file byte-identical, differing entry reports the differing fields and rewrites to the intended entry, absent entry writes, comment-bearing opencode file is reported as manual with the snippet and left byte-identical, invalid configuration refuses by name and path.
- Transport tests assert the `npx` form's exact content when `visual-intent` is absent from the fake `PATH`, and the binary form when it is present.
- Status tests assert that no file changes on disk and that state, location, transport, and evidence all appear.
- Report tests assert the version line, the detected list, the absent list with evidence, and the explicit no-harness default line.
- No test invokes a real Harness binary, and no test reads or writes the developer's real home directory.

## Out of Scope

- Cursor, VS Code, Windsurf, Zed, Gemini CLI, and any Harness beyond the four in scope: their paths and schemas stay recorded in the background research for a later spec.
- An interactive Harness selection prompt when several Harnesses are detected: setup stays deterministic and scriptable, with the harness filter as the override.
- Detecting that setup is itself running inside a Harness to choose defaults.
- GUI application-bundle detection (for example `/Applications/...` probes): those Harnesses cannot be registered by configuration file, so detecting them would only produce a manual step.
- Windows-specific configuration paths; Windows command-shim candidates are in scope, configuration locations are not.
- Preserving comments when merging opencode JSONC files: report-as-manual with the exact snippet stays the specified behaviour.
- Network version checks, update notices, and pre-release channel selection.
- Marketplace listings, deep links, and one-click galleries.
- OAuth, tokens, and any credential-bearing setup step.
- Changes to the Skill contents or the envelope schema.
- A published host certification matrix.

## Further Notes

- The detection design is grounded in two first-party implementations read at implementation time: herdr's `src/integration/registry.rs` (command aliases, executable-bit verification, Windows command candidates, symlink resolution, install-layout probes) and the skills ecosystem's `src/agents.ts` (one descriptor per Harness, configuration-directory detection, `CODEX_HOME`/`CLAUDE_CONFIG_DIR`/`XDG_CONFIG_HOME` overrides, `/etc/codex`). Re-verify against those primary sources and each Harness's own documentation if behaviour looks off, since Harness docs drift.
- The background research note on Harness MCP setup already records the per-Harness configuration paths and entry schemas; it should gain the detection evidence and environment overrides as part of the documentation ticket, so the spec does not duplicate that record.
- The version line closes the loop on the report that started this work: any future "setup configured the wrong Harness" report can state the release that produced it, which separates a stale installation from a detection gap.