# 04: Claude Code registration end to end

**What to build:** The Builder-Reviewer runs setup and Claude Code is covered in both scopes: project scope through the shared project file that now explicitly serves pi and Claude Code together, and user scope through Claude's own writer command so its state file is never hand-edited. When the Claude binary is absent, setup prints the exact manual snippet instead. The report reminds the Builder-Reviewer that project-scope servers need first-use approval in Claude Code.

**Blocked by:** 01 (Multi-target setup plan).

**Status:** done

- [x] Project scope writes the shared project file serving pi and Claude Code with one entry
- [x] Global scope delegates to Claude's own writer command at user scope when the binary exists, verified against the CLI's own help
- [x] Absent binary falls back to a printed manual snippet with instructions; Claude's state file is never hand-edited
- [x] Report includes the first-use approval note for project scope
- [x] Delegation-with-fake-runner, fallback, idempotency, and preview cases are tested; no test invokes a real Claude binary

## Comments

- Project scope is the shared `.mcp.json` write (readers `pi, claude-code`), with a report note that Claude Code needs first-use approval for project-scoped servers.
- Global scope delegates to `claude mcp add-json visual-intent-layer '{"command":"visual-intent","args":["mcp"]}' --scope user` when `claude` resolves; otherwise prints that exact command as a manual snippet. Claude's `~/.claude.json` is only read (to detect an existing user-scope entry) and never written.
- Verified against Claude Code's MCP reference (add-json takes the object inside `mcpServers`, `--scope local|project|user`) and exercised end to end with a fake `claude` on `PATH` plus the absent-binary fallback.
