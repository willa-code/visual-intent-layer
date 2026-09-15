# 03: Content-verified registration

**What to build:** An existing Harness Registration is compared against the entry the installed product would write instead of being trusted because the server key exists. A matching entry is current and left untouched; a differing entry is outdated, the report names the differing fields, and apply repairs it; an absent entry is written; that is the whole state model, in every native format.

**Blocked by:** 01 (Harness registry and union detection).

**Status:** done

- [x] Registration states are current, outdated, absent, manual, and refused, and each is reported per Harness and location
- [x] A current Registration leaves the file byte-identical and reports as skipped
- [x] An outdated Registration names the differing fields and is rewritten to the intended entry on apply
- [x] Comparison is native per format: deep comparison inside `mcpServers`, command and arguments read from the Codex `mcp_servers` table, deep comparison under `mcp` for opencode, and the user-scope entry in Claude Code's state file
- [x] Codex comparison adds no TOML dependency
- [x] Comment-bearing opencode files stay manual with the exact snippet and are never rewritten
- [x] Invalid configuration still refuses by Harness and path, and is never repaired
- [x] Merge-never-overwrite and refuse-on-invalid tests keep passing unchanged

## Comments

An entry left by an older release, or pasted from the packaged snippet, is the motivating case: today it reports as registered while the server stays unreachable.
### Implementation notes

File targets now use `write | repair | current | manual | refuse` and exec
targets `delegate | current | manual`; `SetupAction` gained `repaired`. The
shared JSON files compare the server entry with a structural `equalEntries`,
Codex compares the `command`/`args` values read out of its `mcp_servers` table
(no TOML dependency), opencode compares its `mcp.<name>` entry, and Claude user
scope compares the entry in `~/.claude.json` before delegating. `parseMcpConfig`
is shared by `mergeMcpConfig`, the shared-file plan, and the Claude read, and it
now also rejects a non-object root and an array `mcpServers`.

Repair rewrites only what differs: the Codex repair replaces the `command` and
`args` lines inside the existing table and leaves comments and other lines in
place. Tests cover an outdated shared entry (naming `command`), an extra
unexpected field, idempotency after repair, an outdated opencode entry, an
outdated Codex table with a preserved comment, and an outdated Claude user entry
repaired by delegation. `already-present` is gone from the domain and code;
matching entries report as `current`.
