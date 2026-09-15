# 01: Harness registry and union detection

**What to build:** Harness knowledge moves out of inline conditionals in `cli-setup.ts` into a registry of per-harness descriptors, and Harness Detection becomes the union of that Harness's configuration locations, its own command on `PATH`, its project-local configuration, and its extra locations. From the Builder-Reviewer's perspective nothing changes yet: the same four Harnesses are configured with the same bytes, all flags keep their meaning, and the suite stays green — but a Harness configured under a non-default configuration home, installed but never launched, or present as a platform command shim is now found.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A registry holds one descriptor per Harness: canonical name, command aliases, configuration-home environment variable, global and project configuration locations, extra presence locations, and report label
- [x] Detection is the union of configuration location, command on `PATH`, project-local configuration, and extra locations, and returns per-Harness evidence naming what was checked
- [x] Configuration-home environment overrides are honoured: `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `PI_CODING_AGENT_DIR`
- [x] The command check walks `PATH` with Windows command candidates, requires an executable file on Unix, and resolves symlinks before matching a command name
- [x] Codex detects `/etc/codex` and a standalone release binary under `~/.codex/packages/standalone/releases/*/bin/`
- [x] opencode resolves its configuration home from `XDG_CONFIG_HOME` with a `~/.config` fallback on every platform, and accepts the `opencode2` command alias
- [x] No new runtime dependency is added
- [x] Existing configuration output is byte-identical and the full suite passes

## Comments

Grounding: herdr `src/integration/registry.rs` (`command_available`, `command_path_candidates`, `executable_file_exists`, `codex_standalone_binary_available`) and the skills ecosystem `src/agents.ts` (`detectInstalled`, `codexHome`, `claudeHome`, `xdgConfig`). A non-executable file sharing a Harness command's name must not count as present.
### Implementation notes

`src/harness-registry.ts` holds `HARNESS_DESCRIPTORS` (one entry per harness:
command names, config-home env vars, global/project/extra paths) and
`detectHarnessPresence`, which returns per-harness `{harness, present, evidence}`
so a report can name what was checked. `resolveCommand` walks `PATH` with
Windows candidates and requires an executable file (symlinks followed, since
`statSync` follows them). `src/cli-setup.ts` re-exports `detectHarnesses`,
`HARNESSES`, and `Harness` so the existing seam is unchanged.

15 tests in `src/harness-registry.test.ts` cover default locations, every
environment override, tilde expansion, project-local paths, the Codex standalone
release probe, command/alias resolution, the non-executable-file and
directory negatives, and evidence for an absent harness. `/etc/codex` is an
absolute system path that a fixture cannot isolate, so the empty-machine test
asserts its effect conditionally on the host.

### Code-review follow-up

Both axes flagged that the registry owned configuration locations but only
detection consumed them: the writers hardcoded `~/.codex`, `~/.config`, and
`~/.pi/agent`, so a harness detected under `CODEX_HOME`, `XDG_CONFIG_HOME`, or
`PI_CODING_AGENT_DIR` would have been written somewhere else. The registry now
exports `codexHome`, `opencodeConfigDir`, `piAgentDir`, `xdgConfigHome`, and
`claudeUserStatePath`, and `planCodex`, `planOpencode`, and `planSkill` derive
their paths from the same resolvers detection uses. Claude detection keeps
`~/.claude.json` as evidence even when `CLAUDE_CONFIG_DIR` is set, which is what
the spec asked for and what the earlier override branch dropped.

Also removed from the descriptor: the unused `harness` and `label` fields, and
the triplicated evidence mapping (now `pathsToEvidence`). `absentEvidence`
became `describeCheckedEvidence`, since it returns prose. Four new tests assert
that a write lands under the overridden home (Codex, opencode, Skill) and that
detection and the write path agree in one run.

Deferred, recorded rather than fixed: `cli-setup.ts` now carries planning, three
native-format parsers, and three renderers, which the standards axis called
Divergent Change. Splitting parsers and renderers into their own modules is a
mechanical follow-up; it was not worth doing in the same change as the
correctness fixes above.
