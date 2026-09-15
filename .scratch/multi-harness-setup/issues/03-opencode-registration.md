# 03: opencode registration end to end

**What to build:** The Builder-Reviewer runs setup and opencode lists the server in project and user-global scopes using opencode's native entry shape. Existing entries are preserved on merge, preview shows the planned JSON, and config files containing hand-written comments are never rewritten — instead setup prints the exact snippet to paste. The report states per target what was written, skipped, or refused.

**Blocked by:** 01 (Multi-target setup plan).

**Status:** done

- [x] Project and user-global scopes merge the native local-server entry with the command expressed as a single array and the server enabled
- [x] Existing entries in both files are preserved; already-registered server is reported and left untouched
- [x] Files containing comments are never rewritten; the exact paste-snippet is printed with manual instructions
- [x] Preview mode prints the planned entries without writing
- [x] Merge, idempotency, invalid-file refusal, comment-refusal, and preview cases are tested

## Comments

- Native entry confirmed against opencode's own schema (`https://opencode.ai/config.json`, `McpLocalConfig`): `mcp.<name> = { type: "local", command: [...], enabled: true }`. `opencode mcp add` writes the same shape, and `opencode mcp list` read our project/global files (it listed the server; spawning failed only because the globally installed `visual-intent` bin is stale outside this repo).
- Paths: project `opencode.json` (or an existing `opencode.jsonc`), global `~/.config/opencode/opencode.json` (or an existing `.jsonc`).
- Comment refusal uses a small string-aware JSONC scanner, so a `https://` URL inside `$schema` is not mistaken for a comment. Commented files are left byte-identical and the exact `mcp` snippet plus instructions are printed. Invalid JSON and a non-object `mcp` field are refused.
