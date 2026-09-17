# 06: Live verification on all four harnesses

**What to build:** A human confirms on real machines that running setup makes pi, Codex, Claude Code, and opencode each list the server, in both project and global scopes where the spec defines them. This is the end-to-end proof that file-level tests cannot give, mirroring the existing pi validation checklist. The ticket stays open until each harness is evidenced or its failure is recorded as a follow-up.

**Blocked by:** 02 (Codex registration), 03 (opencode registration), 04 (Claude Code registration).

**Status:** deferred

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [ ] pi lists the server after project and global setup on a real machine
- [ ] Codex lists the server after project and global setup on a real machine
- [ ] Claude Code lists the server after project and global setup on a real machine
- [ ] opencode lists the server after project and global setup on a real machine

## Comments

Requires the actual harness applications installed; not runnable in automated tests. Record per-harness evidence or file follow-ups for failures.

## Comments

Automated-possible evidence recorded 2026-09-15 with sandboxed `HOME` (temp dirs), real harness binaries, and the built `dist/cli.js`. Ticket left `ready-for-human` for the interactive confirmations below.

- **Codex, global — evidenced.** `setup --global` delegated to `codex mcp add visual-intent-layer -- visual-intent mcp`; `codex mcp list` then printed `visual-intent-layer  visual-intent  mcp  enabled  Unsupported`.
- **Codex, project — follow-up.** `.codex/config.toml` is written and re-runs skip, but `codex mcp list` in the untrusted temp project printed "No MCP servers configured yet". This matches the recorded drift risk (project config applies to trusted projects only). A human should trust the project and confirm.
- **opencode, project + global — evidenced (config pickup).** `opencode mcp list` listed `visual-intent-layer` from both project `opencode.json` and global `~/.config/opencode/opencode.json`. The status showed `failed` only because the machine's globally installed `visual-intent` bin is stale (`ENOEXEC`), not because of the config; fix with a clean reinstall before the interactive pass.
- **pi — follow-up (human).** pi exposes no non-interactive MCP list; file-level output matches the documented `pi-mcp-adapter` read paths and `docs/pi-validation.md`. Confirm in a live pi session.
- **Claude Code — follow-up (human).** The binary is not installed on this machine. Delegation and the absent-binary manual fallback were exercised with a fake `claude` on `PATH`; the real listing still needs a machine with Claude Code installed.

Deferred 2026-09-17: the interactive per-harness confirmations are parked until the next spec's Verification Run plus maintainer time. The automated-possible evidence recorded 2026-09-15 above stands; no box is ticked by the deferral.
