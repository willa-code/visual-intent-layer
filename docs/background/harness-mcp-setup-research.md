# Harness MCP Setup: Config Discovery and Multi-Harness Install Patterns

Research snapshot: 2026-09-15. Sources are official product documentation, first-party source-code repositories, and this repo's own source files.

> **Historical, superseded 2026-09-18 by ADR-0031.** The `visual-intent setup` command
> this document was written to specify is deleted, with the Harness Registry. Sections
> 1–9's per-Harness survey of where each Harness keeps its MCP configuration is still
> useful reference material for a human registering the server by hand. Sections 7, 10
> and 11 analyse and recommend a command that no longer exists: read them as history,
> not as pending work.
>
> **Corrected 2026-09-18 (later).** The README no longer names this survey: the product
> manual moved to `docs/guide.md`, whose Documentation section lists `docs/background/`.
> The survey sections above are unchanged.

## Executive conclusion

Our `visual-intent setup` writes project `.mcp.json` or global `~/.config/mcp/mcp.json` (`src/cli-setup.ts`), but of the eight harnesses surveyed only Claude Code reads a project-root `.mcp.json` natively ([Claude quickstart](https://code.claude.com/docs/en/mcp-quickstart)), and none of them read `~/.config/mcp/mcp.json` according to their own docs. OpenAI Codex CLI — the reported failure — uses TOML `config.toml` files and ignores `.mcp.json` for host configuration ([ChatGPT Learn: MCP](https://learn.chatgpt.com/docs/mcp)). The fix is to extend `setup` to write each harness's native file (exact paths below), keeping the current merge-not-overwrite behavior, and leave Zed settings-file edits plus IDE marketplace listings as documented manual steps.

## 1. OpenAI Codex CLI ignores `.mcp.json`; it uses `config.toml`

Codex stores MCP configuration in `~/.codex/config.toml` globally and `.codex/config.toml` for project scope (trusted projects only), in TOML format under `[mcp_servers.<name>]` tables; a stdio server uses `command`, optional `args`, `env`, and `env_vars`. It does not pick up `.mcp.json` or `~/.config/mcp/mcp.json` as host config ([ChatGPT Learn: MCP](https://learn.chatgpt.com/docs/mcp), [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)). `.mcp.json` appears on that page only for plugin-provided servers, a different mechanism.

Codex ships a `codex mcp add` CLI (e.g. `codex mcp add playwright npx "@playwright/mcp@latest"`) as an alternative to hand-editing `~/.codex/config.toml` ([Playwright MCP README, Codex section](https://github.com/microsoft/playwright-mcp/blob/main/README.md)).

## 2. Claude Code natively reads `.mcp.json` — our current output works here

Claude Code has three scopes across two files: `local` (default, `~/.claude.json` under the project entry), `project` (`.mcp.json` in project root, shared via version control), and `user` (`~/.claude.json` top-level `mcpServers`); all use the same JSON entry format ([Claude quickstart](https://code.claude.com/docs/en/mcp-quickstart), [Claude MCP reference](https://docs.anthropic.com/en/docs/claude-code/mcp)).

A Claude stdio entry uses `command` + `args` (+ `env`); an HTTP entry needs `"type": "http"` (or `"sse"`/`"ws"`) plus `url`. An entry with a `url` but no `type` is misread as stdio and skipped with an explicit error. Project `.mcp.json` servers require interactive approval on first use ([Claude quickstart](https://code.claude.com/docs/en/mcp-quickstart), [Claude MCP reference](https://docs.anthropic.com/en/docs/claude-code/mcp)).

`claude mcp add` / `claude mcp add-json` (with `--scope local|project|user`) is the supported writer; `claude mcp add-json` takes the object *inside* a foreign `mcpServers` block, which is how Claude ingests setup snippets written for other clients ([Claude MCP reference](https://docs.anthropic.com/en/docs/claude-code/mcp), [GitHub MCP server: Install in Claude](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md)).

Note the scope naming drift: the GitHub MCP install guide warns that `local` was called `project` and `user` was called `global` in older Claude Code versions ([Install in Claude](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md)); the current quickstart uses `local`/`project`/`user`. Pin version-conditional wording in our docs.

## 3. Cursor uses `.cursor/mcp.json` + `~/.cursor/mcp.json`; one-click and deep links

Cursor reads project `.cursor/mcp.json` and global `~/.cursor/mcp.json` (JSON); the two files are merged with project taking priority on name conflicts. A stdio entry uses `command`/`args`/`env` (plus `type: "stdio"` per the reference); remote entries use `url`. It does not read bare `.mcp.json` ([Cursor MCP help](https://cursor.com/help/customization/mcp), [Cursor MCP reference](https://cursor.com/docs/mcp)).

Cursor's primary install surface is one-click: Marketplace entries with "Add to Cursor" from Customize, plus `cursor.com/en/install-mcp?name=…&config=…` deep links (as published by Playwright) ([Cursor MCP help](https://cursor.com/help/customization/mcp), [Playwright MCP README, Cursor section](https://github.com/microsoft/playwright-mcp/blob/main/README.md)).

## 4. VS Code uses `.vscode/mcp.json` + user profile; Agent Host reads `.mcp.json`

VS Code reads workspace `.vscode/mcp.json` and a user-profile `mcp.json` (opened via the `MCP: Open User Configuration` command), in JSON format under a `"servers"` key; a stdio entry is `{command, args}`, an HTTP entry is `{type: "http", url}`. It does not read a bare project `.mcp.json` for the desktop host ([VS Code: Add and manage MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)).

VS Code also offers gallery install (Extensions view → `@mcp`, Install / Install in Workspace), a guided `MCP: Add Server` flow, `code --add-mcp '<json>'` on the CLI, and automatic discovery of other apps' configs via `chat.mcp.discovery.enabled`. Sessions on Agent Host do not read `.vscode/mcp.json` directly; VS Code forwards the config, and for portable config the Agent Host natively reads a workspace `.mcp.json` or user `~/.copilot/mcp-config.json` file ([VS Code: Add and manage MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)).

Schema warning: current VS Code docs show a `"servers"` key in `mcp.json`, while older ecosystem snippets (and other harnesses) use `"mcpServers"` ([VS Code docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)). Writing VS Code config must use `"servers"`, not our current `"mcpServers"` shape.

## 5. Windsurf, Zed, and Gemini CLI each own a different file

Windsurf (Cascade) reads the single global JSON file `~/.codeium/windsurf/mcp_config.json` with `mcpServers` entries (`command`/`args`/`env` for stdio, `serverUrl`/`url` for remote); install is via the MCP Marketplace or `windsurf://windsurf-mcp-registry?serverName=…` deep links. The docs describe no project-scoped file ([Windsurf: Cascade MCP Integration](https://docs.windsurf.com/windsurf/cascade/mcp)).

Zed keeps MCP servers in its JSON settings file under `context_servers` — `{command, args, env}` for local, `{url, headers}` for remote — edited via Settings → AI → MCP Servers (`zed: open settings file`), plus one-click install of MCP server extensions. There is no `.mcp.json` pickup ([Zed: MCP in Zed](https://zed.dev/docs/assistant/model-context-protocol)).

Gemini CLI reads `mcpServers` from `settings.json` at user scope (`~/.gemini/settings.json`) and project scope (`<project>/.gemini/settings.json`); stdio uses `command`/`args`/`env`/`cwd`, remote uses `url` (SSE) or `httpUrl` (Streamable HTTP). It does not read `.mcp.json` ([Gemini CLI settings](https://geminicli.com/docs/cli/settings/), [Gemini MCP servers reference](https://geminicli.com/docs/tools/mcp-server/), [Gemini MCP setup tutorial](https://geminicli.com/docs/cli/tutorials/mcp-setup/)).

## 6. pi: settings files are documented; the `pi-mcp-adapter` claim is unverified

pi documents JSON settings at global `~/.pi/agent/settings.json` and project `.pi/settings.json` (recursive merge, project wins, trust-gated), plus a `pi.skills` package manifest — but no native MCP-server config file or `mcpServers` key appears in the fetched pi docs ([pi Settings](https://pi.dev/docs/latest/settings)).

This repo's README says "MCP is provided via `pi-mcp-adapter`, which reads the standard MCP files above." The adapter's source could not be verified: both `github.com/badlogic/pi-mcp-adapter` and the `marlowe633/pi-mcp-adapter` mirror returned HTTP 404 at fetch time. Treat as unverified: keep the pi Skill install, verify the adapter claim against a live pi install before promising pi users that `setup` output is sufficient.

## 7. Current `visual-intent setup` output matches almost no harness

`setup` writes `join(homeDir, '.config', 'mcp', 'mcp.json')` with `--global`, else `join(projectDir, '.mcp.json')`; it deep-merges a `{mcpServers: {visual-intent-layer: {command: 'visual-intent', args: ['mcp']}}}` entry, refuses on invalid JSON, and copies the Skill to `~/.pi/agent/skills/visual-intent/SKILL.md`. None of the eight harnesses' docs list `~/.config/mcp/mcp.json` as a read path; only Claude Code reads project `.mcp.json`. This confirms the user's Codex report.

The packaged `mcp.json` snippet ships an `npx -y --package visual-intent-layer@0.1.1 visual-intent-mcp` command with a `${HOME}`-style data-dir env, while the live `setup` writer emits `command: 'visual-intent', args: ['mcp']` (assumes the npm global bin on PATH). These differ; per-harness docs (Claude, Cursor, Gemini) show env-var expansion is supported but syntax varies (`${VAR}` / `${VAR:-default}` / `${env:NAME}` / `$VAR`), so the npx form is a portability risk to handle per harness.

## 8. Popular servers: manual snippets dominate; CLIs and one-click where the harness allows

The dominant pattern is manual per-harness snippets. Playwright's README publishes separate blocks for Amp, Claude Code (`claude mcp add`), Claude Desktop, Cline, Codex (`codex mcp add` + `~/.codex/config.toml` TOML), Copilot CLI (`~/.copilot/mcp-config.json`), Cursor (deep link + manual), Factory, Gemini CLI, Goose, Grok, and others — all from one standard `{mcpServers: {playwright: {command: npx, args: [...]}}}` core ([Playwright MCP README](https://github.com/microsoft/playwright-mcp/blob/main/README.md)).

GitHub's MCP server ships per-surface install guides: Claude Code via `claude mcp add-json` (HTTP) or `claude mcp add … --` (Docker stdio) with `--scope local|project|user`; Claude Desktop via hand-edited `claude_desktop_config.json` (`~/Library/Application Support/Claude/…` on macOS); Xcode's Claude Agent via its own `.claude.json` path ([GitHub MCP server: Install in Claude](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md)).

The MCP reference servers teach the portable core: a Claude Desktop `mcpServers` JSON block with `command`/`args`/`env` (`npx` for TypeScript servers, `uvx` for Python), and point to the MCP Registry as the server directory rather than an installer ([modelcontextprotocol/servers README](https://github.com/modelcontextprotocol/servers/blob/main/README.md)).

One-click/deep-link install exists only where the harness built it: Cursor Marketplace + `cursor.com/en/install-mcp` links, VS Code `@mcp` gallery, Windsurf marketplace + `windsurf://` links, Zed extensions — while Claude Code and Codex cover the same need with `mcp add` CLIs. No surveyed server installs into all harnesses with one mechanism.

## 9. No unified config-file standard; convergence is partial

No unified cross-harness config file standard was found in the fetched primary sources. The MCP specification URL for client configuration returned HTTP 404, and every harness doc above defines its own path and (for Codex/Zed) its own format. Partial convergence exists and is worth tracking: VS Code's Agent Host natively reads workspace `.mcp.json` ([VS Code docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)); VS Code can auto-discover other apps' MCP configs (`chat.mcp.discovery.enabled`); Claude Code imports from Claude Desktop (`claude mcp add-from-claude-desktop`) and accepts foreign `mcpServers` blocks with documented repairs ([Claude MCP reference](https://docs.anthropic.com/en/docs/claude-code/mcp)).

## 10. Recommendation for `visual-intent setup`

- **Write directly:** Codex (`~/.codex/config.toml` global, `.codex/config.toml` project; TOML `[mcp_servers.visual-intent-layer]` with `command = "visual-intent"`, `args = ["mcp"]`), Claude project `.mcp.json` (already works; optionally also offer `claude mcp add-json --scope user`), Cursor (`.cursor/mcp.json` project, `~/.cursor/mcp.json` global), VS Code (`.vscode/mcp.json` project with the `"servers"` key; global via `code --add-mcp` or instruct `MCP: Open User Configuration`), Gemini CLI (`.gemini/settings.json` project `mcpServers` merge, `~/.gemini/settings.json` global), Windsurf (`~/.codeium/windsurf/mcp_config.json` merge, global only).
- **Behavior:** merge-never-overwrite per file; refuse on invalid JSON; detect installed harnesses from their configuration files and commands and only write (or offer `--print-only`) for those found; keep one `--global` vs project matrix per harness, since scopes differ (Codex TOML layering, Claude scopes, Cursor merge rule).
- **Stay manual:** Zed settings-file edits (hand users the exact `context_servers` JSON), pi `packages` setting, IDE marketplace listings, OAuth/token steps. Prefer shelling out to `claude mcp add` / `codex mcp add` where available so flag/format drift is the harness's problem, not ours.
- **Note:** prefer the `visual-intent` bin entry over the `npx -y --package …` snippet for locally-installed users (matches current writer), but keep the npx form as the documented fallback for machines without a global install.

## Open questions

- `pi-mcp-adapter` source and which files it actually reads (both candidate GitHub URLs 404'd); needs a live-pi verification run.
- Copilot CLI `~/.copilot/mcp-config.json` full schema beyond the Playwright snippet and the VS Code Agent Host mention.
- Whether Windsurf supports any project-scoped MCP file (docs describe only the global file).
- Gemini CLI system-level scope and settings precedence order details.
- Zed project-scoped settings (`.zed/settings.json`) interaction with `context_servers`.
- A specific SEP/standards proposal for unified MCP config discovery (spec URL 404'd; registry confirmed only as a directory).
- Individual install docs for Context7, Figma, Sentry, Notion (listed as examples on the Codex page but not individually fetched); the survey leans on Playwright + GitHub + reference servers + harness galleries.

## 11. Detection evidence and environment overrides (addendum, 2026-09-16)

Section 7's "detect installed harnesses by configuration file and command" was too
coarse: hand-rolled `~/.codex`, `~/.claude`, and `~/.config/opencode` checks miss
a harness configured under a non-default configuration home, and an unverified
`PATH` walk accepts a directory or a non-executable file as a command. ADR-0014
and `.scratch/harness-detection/spec.md` replace it with a union of signals,
grounded in two first-party implementations read at implementation time.

Sources:

- [herdr `src/integration/registry.rs`](https://github.com/herdrdev/herdr): `command_available` walks `PATH` and verifies an executable file; `command_path_candidates` adds Windows `.exe`/`.cmd`/`.bat`/`.ps1` candidates; per-target command aliases (`kilo`/`kilo-code`, `cursor-agent`, four qoder names); `codex_standalone_binary_available` probes `~/.codex/packages/standalone/releases/*/bin/codex` for an install that is not on `PATH`; `hermes_install_layout_available` probes app-relative binaries.
- [vercel-labs/skills `src/agents.ts`](https://github.com/vercel-labs/skills): one descriptor per agent with a `detectInstalled` closure; configuration-directory detection only (no `PATH` check); `$CODEX_HOME || ~/.codex` plus `/etc/codex`; `$CLAUDE_CONFIG_DIR || ~/.claude`; `xdg-basedir` for opencode specifically "to match OpenCode/Amp/Goose behavior on all platforms"; `~/.pi/agent` for pi; `/Applications/*.app` probes for GUI harnesses.

Neither source alone is sufficient: herdr misses a harness that is installed but
off `PATH`, and skills misses one that is on `PATH` but never configured.

Per-harness detection evidence now in `src/harness-registry.ts`:

| Harness | Configuration (env override) | Project-local | Command | Extra |
| --- | --- | --- | --- | --- |
| pi | `$PI_CODING_AGENT_DIR`, else `~/.pi/agent`, `~/.pi` | `.pi/` | `pi` | — |
| Codex | `$CODEX_HOME`, else `~/.codex` | `.codex/config.toml` | `codex` | `/etc/codex`; `~/.codex/packages/standalone/releases/*/bin/codex` |
| Claude Code | `$CLAUDE_CONFIG_DIR`, else `~/.claude`; plus `~/.claude.json` | — | `claude` | — |
| opencode | `($XDG_CONFIG_HOME \|\| ~/.config)/opencode` | `opencode.json(c)` | `opencode`, `opencode2` | — |

`~` is expanded in an override value. A command counts only when it resolves to
an executable file (symlinks followed), so a directory or a non-executable file
with a harness's name is not presence. Absolute system locations such as
`/etc/codex` are checked directly and cannot be isolated by a test fixture; tests
assert their effect conditionally on the host.

Detection results are also now reported to the user (detected, absent with the
checked evidence, and an explicit line when nothing was detected), and
registration is content-verified against the entry setup would write rather than
trusted because the server key exists. Both are recorded in
[ADR-0014](../../docs/adr/0014-union-harness-detection-and-content-verified-registration.md).
