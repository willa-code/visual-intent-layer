# Multi-harness MCP setup: pi, Codex, Claude Code, opencode

Status: ready-for-agent

## Problem Statement

As a Builder-Reviewer, I install the package and run the setup command, but my agent harness never sees the MCP server. The setup command only writes a project `.mcp.json` file or a user-global shared config, and most harnesses read neither: Codex ignores the project file entirely, opencode keeps MCP servers in its own config file, and only Claude Code and pi pick the current output up. Each harness documents its own config path and schema, so the Builder-Reviewer must discover every path by hand and translate the server entry into each native format. What should be one install step becomes a per-harness configuration hunt.

## Solution

From the Builder-Reviewer's perspective, the setup command learns the four harnesses in scope and registers the server with each one natively. Running setup in a project (or with the global flag) detects which of pi, Codex, Claude Code, and opencode are present, writes or delegates each harness's own configuration, merges without overwriting anything already there, and reports exactly what changed. A preview mode shows every planned write without touching disk. Behavior the Builder-Reviewer already relies on — merge-never-overwrite, refusing to touch invalid config, and the pi Skill install — keeps working exactly as before.

## User Stories

1. As a Builder-Reviewer, I want setup to register the server with pi's project config, so that pi picks it up immediately in this project.
2. As a Builder-Reviewer, I want setup with the global flag to register the server with pi's user-global config, so that every project on this machine sees it.
3. As a Builder-Reviewer, I want setup to keep installing the pi Skill alongside MCP registration, so that pi agents discover the Visual Direction Loop without extra steps.
4. As a Builder-Reviewer, I want setup to register the server with Codex's user-global TOML config, so that Codex sessions see the server without hand-editing TOML.
5. As a Builder-Reviewer, I want setup to register the server with Codex's project config, so that a trusted project carries the server for every collaborator session.
6. As a Builder-Reviewer, I want setup to prefer Codex's own `mcp add` command when the Codex binary is present, so that flag and format drift stays Codex's problem rather than ours.
7. As a Builder-Reviewer, I want setup to register the server with Claude Code's project config, so that Claude Code sessions in this project offer the server (with its normal first-use approval).
8. As a Builder-Reviewer, I want setup with the global flag to register the server with Claude Code's user scope via its own `mcp add-json` command, so that no hand-editing of Claude's state file is needed.
9. As a Builder-Reviewer, I want setup to register the server with opencode's project config using opencode's native entry shape, so that opencode sessions in this project list the server.
10. As a Builder-Reviewer, I want setup with the global flag to register the server with opencode's user-global config, so that all my opencode projects see it.
11. As a Builder-Reviewer, I want setup to only touch harnesses actually present on the machine, so that running it does not scatter config files for tools I never installed.
12. As a Builder-Reviewer, I want a harness filter flag, so that I can register exactly one harness when I do not want the detected set.
13. As a Builder-Reviewer, I want preview mode to show every planned harness write, so that I can review paths and contents before anything changes.
14. As a Builder-Reviewer, I want every file write to merge the server entry while preserving existing entries, so that setup never destroys another server's configuration.
15. As a Builder-Reviewer, I want setup to refuse files holding invalid config and say so loudly, so that a broken file is surfaced instead of silently overwritten.
16. As a Builder-Reviewer, I want setup to leave a harness config untouched when our server is already registered there, so that re-running setup is safe and idempotent.
17. As a Builder-Reviewer, I want setup to print a clear per-harness report of what was written, delegated, skipped, or refused, so that I know the resulting state without inspecting files.
18. As a Builder-Reviewer, I want project-scope registration to keep working when no harness is detected, so that a bare `.mcp.json` still serves pi and Claude Code by default.
19. As a Builder-Reviewer, I want opencode config files containing comments to be left untouched with a printed snippet instead, so that setup never destroys hand-written comments while still showing me the exact entry to paste.
20. As a Builder-Reviewer, I want the Codex project write to land in the project config directory, so that trusted-project collaborators inherit the server through version control.
21. As a Builder-Reviewer, I want setup to keep failing loudly when the Skill source is missing from the install, so that a broken package surfaces instead of half-configuring my machine.
22. As a Builder-Reviewer, I want the existing flags for global scope, Skill skipping, and preview to keep their meaning across all harnesses, so that nothing I already learned changes.

## Implementation Decisions

- The setup module grows from a single config target to a per-harness target matrix. Project scope writes the shared project JSON file (which serves pi and Claude Code with one write), the Codex project TOML file, and the opencode project JSON file. Global scope writes the pi shared global file, the Codex user-global TOML file, and the opencode user-global file, and delegates Claude Code user scope to Claude's own CLI rather than hand-editing its state file.
- Harness detection runs first: a harness counts as present when its binary resolves on PATH or its config file or directory already exists. Only detected harnesses are written. When nothing is detected, project scope still writes the shared project JSON file so pi and Claude Code keep working by default.
- A repeatable harness filter flag restricts the matrix to named harnesses; without it, all detected in-scope harnesses are configured. The global, Skill-skipping, and preview flags keep their current meaning and apply across the matrix.
- Where a harness ships a supported writer CLI (Codex's `mcp add` for user-global scope, Claude's `mcp add-json` for user scope), setup shells out to it when the binary is present and falls back to direct file writes otherwise. Exact flag shapes are verified against each CLI's own help at implementation time; the file-write fallback is the guaranteed path and the CLI delegation is the preferred path.
- The Codex TOML write appends the server table when the table header is absent and reports already-present without touching the file when it exists; no TOML dependency is added. TOML parsing beyond header detection is out of scope.
- The opencode entry uses opencode's native shape: the server lives under the config's `mcp` object with local type, the command expressed as a single array of command plus arguments, and enabled set. opencode files that contain comments are never rewritten; setup prints the exact snippet and instructs a manual paste.
- The merge-never-overwrite and refuse-on-invalid-config behavior already used for the shared JSON files extends unchanged to every new file target, with per-file error messages naming the harness and path.
- The plan step returns the full ordered list of planned writes, delegations, skips, and refusals; the apply step executes them and returns what changed. Preview mode runs planning only and prints. The Skill install stays pi-scoped and behavior-identical, controlled by the existing Skill flag.
- The only new test seam is an injectable command runner for harness CLI delegation, so tests never invoke real harness binaries. All file behavior stays on the existing plan/apply seam.
- Setup support is not host certification: registering a harness means the server is reachable there with Baseline Compatibility, not that the host carries a Certified Experience. No certification claims are added for the new harnesses.

## Testing Decisions

- A good test asserts externally visible behavior — files written with expected merged contents, delegations invoked with expected arguments, refusals raised with naming the harness — never implementation details such as helper call order or intermediate data shapes.
- The setup test suite is the prior art and the seam: temp home and project directories, plan/apply separation, merge-preserves-existing, refuse-on-invalid, print-only writes nothing, missing Skill fails loudly. Every new harness target gets the same treatment: merge case, already-present idempotency case, invalid-file refusal case, and preview case.
- Harness CLI delegation is tested through the injected command runner with a fake, asserting the command and scope arguments; the fallback to file writes is tested by simulating an absent binary. No test shells out to real `codex` or `claude` binaries.
- Fixture coverage includes a Codex TOML file with and without the server table, an opencode file with comments (asserting untouched plus printed snippet), and a multi-harness detection matrix over temp directories.
- Live per-harness verification stays human: a checklist mirroring the existing pi validation notes, confirming each harness lists the server after setup on a real machine.

## Out of Scope

- Cursor, VS Code, Windsurf, Zed, Gemini CLI, and any other harness: the background research already records their paths and schemas for a later spec; no writers are added here.
- Marketplace listings, deep-link installs, and one-click galleries.
- Zed settings-file edits beyond documenting the manual snippet.
- OAuth, tokens, and any credential-bearing setup steps.
- Preserving comments when merging opencode JSONC files: refuse-and-print-snippet is the specified behavior.
- Windows-specific config paths.
- A PATH-independent transport switch: the `visual-intent` binary entry stays the default and the packaged `npx` snippet stays the documented fallback.
- Changes to the Skill contents or the envelope schema.
- A published host certification matrix; see the implementation decision on certification.

## Further Notes

- The per-harness paths, schemas, and gotchas in the implementation decisions come from the cited background research notes on harness MCP setup; the implementer should re-verify each path against the linked primary source if behavior looks off, since harness docs drift.
- Known drift risks already recorded: Claude's scope naming changed across versions (older `project`/`global` versus current `local`/`project`/`user`); Codex project config applies to trusted projects only; a plugin-packaging `.mcp.json` is not Codex host discovery.
- The VS Code `"servers"` versus `"mcpServers"` schema split matters for the follow-up harness spec, not this one.
- The pi adapter's read paths were verified against a live install of the adapter's own README and config source: the current project and global outputs are correct for pi and stay unchanged.
- Superseded in part: the detection decision above (binary on `PATH` or config file present) is replaced by ADR-0014 and the follow-up spec in `.scratch/harness-detection/`, which union configuration-home-aware locations, project-local paths, executable-checked commands with aliases, and per-Harness extra locations, and which makes Registration content-verified rather than presence-checked. The paths, schemas, and merge behaviour recorded here still stand.
