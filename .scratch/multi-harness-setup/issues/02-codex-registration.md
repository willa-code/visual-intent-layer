# 02: Codex registration end to end

**What to build:** The Builder-Reviewer runs setup and Codex picks up the server with no hand-edited TOML. User-global and project scopes each land in Codex's native config file; where the Codex binary is present, setup delegates global scope to Codex's own writer command and otherwise writes the file directly. Preview shows the planned TOML, re-running is a no-op when the server is already registered, and the report states per target what was written, delegated, or skipped.

**Blocked by:** 01 (Multi-target setup plan).

**Status:** done

- [x] Global scope registers the server in the user-global TOML config, preferring Codex's own writer command when the binary exists and falling back to direct file append
- [x] Project scope appends the server table to the project TOML config when the table header is absent
- [x] Existing server table is reported already-present and the file is left untouched
- [x] Preview mode prints the planned TOML without writing
- [x] Merge, idempotency, invalid-file refusal, and delegation-with-fake-runner cases are tested; no test invokes a real Codex binary

## Comments

- Verified the native shape against the installed CLI: `codex mcp add visual-intent-layer -- visual-intent mcp` wrote `[mcp_servers.visual-intent-layer]` with `command = "visual-intent"` / `args = ["mcp"]` to `~/.codex/config.toml`, and `codex mcp list` then showed the server `enabled`.
- Global scope delegates when the `codex` binary resolves; otherwise appends the table directly. Project scope always appends to `.codex/config.toml` (trusted projects only; `codex mcp add` has no project scope). An existing table is reported already-present and never delegated or rewritten. `mcp_servers = …` as a value is refused.
- Live sandbox run (temp HOME): delegation reported `codex: delegated …`, project fallback wrote the TOML, and a re-run reported `skipped`.
