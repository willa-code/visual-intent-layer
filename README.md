# Visual Intent Layer

A local-first **Visual Direction Loop**: point at visible targets in an
agent-produced interface, deliver a versioned **Visual Intent Envelope** over MCP,
and verify the result by hand. No prose location descriptions, no lost context.

## Install

Requires Node 20+. No Rust toolchain, no hosted account.

```sh
npm install -g visual-intent-layer
visual-intent setup            # register in this project
visual-intent setup --global   # register for every project on this machine
```

`setup` looks for each harness in scope and registers the server with each one
natively. A harness counts as present when any of these is true, and the report
names which one matched:

| Harness     | Configuration location (env override)                                          | Command                            | Extra                                          |
| ----------- | ------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------- |
| pi          | `$PI_CODING_AGENT_DIR`, else `~/.pi/agent` or `~/.pi`; project `.pi/`          | `pi`                               | —                                              |
| Codex       | `$CODEX_HOME`, else `~/.codex`; project `.codex/config.toml`                   | `codex`                            | `/etc/codex`; `~/.codex/packages/standalone/releases/*/bin/codex` |
| Claude Code | `$CLAUDE_CONFIG_DIR`, else `~/.claude`; plus `~/.claude.json`                  | `claude`                           | —                                              |
| opencode    | `($XDG_CONFIG_HOME or ~/.config)/opencode`; project `opencode.json(c)`         | `opencode`, `opencode2`            | —                                              |

A command only counts when a real executable file resolves, so a directory or a
non-executable file with a harness's name is ignored. Writes land in the same
locations detection checks, so an override that detection honours is also where
setup writes and where status looks. Without a harness filter,
every detected in-scope harness is configured. Every run prints its own package
version, the detected harnesses, each known-but-absent harness with the evidence
that was checked, and an explicit line when nothing was detected — so a
pi-only result is never ambiguous between a detection result and a fallback.
When nothing is detected, project scope still writes the shared `.mcp.json` so
pi and Claude Code keep working by default, and the report says so.

| Harness     | Project scope                              | Global scope                                                       |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------ |
| pi          | `.mcp.json` (shared) + Skill               | `~/.config/mcp/mcp.json` + Skill                                   |
| Claude Code | `.mcp.json` (shared; first-use approval)   | `claude mcp add-json … --scope user` (or the printed manual command) |
| Codex       | `.codex/config.toml` (trusted projects)    | `codex mcp add …` when the binary exists, else `~/.codex/config.toml` |
| opencode    | `opencode.json`                            | `~/.config/opencode/opencode.json`                                 |

Every write merges the server entry and preserves existing servers. Setup never
overwrites another server's configuration and refuses a file holding invalid JSON
or TOML (naming the harness and path) instead of touching it. An existing server
entry is compared against the entry setup would write: a matching entry is
reported as current and left byte-identical, and a differing entry is reported as
outdated — naming the fields that differ — and repaired on re-run, so an entry
left by an older release or copied from a snippet heals without hand-editing.
`.mcp.json` is a single write that serves pi and Claude Code together; Claude
Code requires first-use approval for project-scoped servers, and the report says
so. Claude Code's state file is never hand-edited: setup delegates to Claude's
own writer command, or prints the exact command when the binary is absent.
opencode files containing hand-written comments are never rewritten; setup
prints the exact entry to paste.

### Transport

Setup registers whichever transport will actually work on this machine. When
`visual-intent` resolves on `PATH` the entry is `command: "visual-intent"` with
args `["mcp"]`; otherwise it is the packaged
`npx -y --package visual-intent-layer@<version> visual-intent-mcp` form, so a
machine with no global install still gets a server that spawns. The chosen
transport is printed on every run.

### Setup flags

- `--global` — user-global scope instead of the current project.
- `--harness <name>` — restrict the matrix to named harnesses (`pi`, `codex`,
  `claude-code`, `opencode`); repeatable.
- `--status` — read-only: report each harness's registration state, location,
  transport, and detection evidence without writing anything.
- `--print-only` — show every planned write without touching disk.
- `--no-skill` — skip the pi Skill install.

### Packaged snippet

On a machine without a global install, paste the packaged `mcp.json` snippet
(shipped with the package) into your harness's config. It uses the same
`npx -y --package visual-intent-layer@<version> visual-intent-mcp` transport that
setup selects automatically when no `visual-intent` binary is on `PATH`.

### Pre-release channel

Pre-release builds publish to the `next` dist-tag:

```sh
npm install -g visual-intent-layer@next
```

`latest` only moves when a validated pre-release is promoted to a stable
version, so `npm install visual-intent-layer` always gets a release that was
dogfooded on `next` first.

### Stays manual

- Harnesses beyond the four above (Cursor, VS Code, Windsurf, Zed, Gemini CLI):
  their paths and entry schemas are recorded in the background research, and the
  packaged snippet is the documented path until a spec adds writers.
- Zed settings-file edits (`context_servers`), IDE marketplace listings, and
  one-click or deep-link installs.
- OAuth, tokens, and any credential-bearing setup step.
- Windows-specific config paths. Setup does accept Windows command shims when
  looking for a harness command.
- Interactive harness selection: setup is deterministic and scriptable, and
  `--harness` is the override.

Setup support means the server is reachable with **Baseline Compatibility**, not
that a harness carries a **Certified Experience**. No host certification claims
are made here.

pi users: MCP is provided via `pi-mcp-adapter`, which reads the standard MCP
files above. The local browser carries the complete V0 experience; no embedded
UI is required. Alternatively, add this package to pi's `packages` setting —
its `pi.skills` manifest exposes the Skill automatically.

> Maintainer: releases go out via the Publish workflow (npm trusted publishing),
> with the process in the `/maintenance` skill. Pre-releases
> (`gh release create vX.Y.Z-next.N --prerelease`) publish to `next`; stable
> releases publish to `latest`. Bump the version and the pinned version in
> `mcp.json` together — `node scripts/check-bins.js` fails CI otherwise — then
> push to `main` and `gh release create vX.Y.Z --generate-notes`. Verify with a
> clean-machine `npm install -g visual-intent-layer@latest` and the ticket 16
> checklist.

## Use

Ask your agent to open visual review, or start it yourself:

```sh
visual-intent open --html ./checkout.html     # prints a review URL
visual-intent open --app http://localhost:5173
visual-intent serve --port 3742               # local service only
```

In the review surface:

The `visual-intent` command is a local operator for the human (serve/open) plus
the MCP stdio entry point for agent hosts. It is not an agent-facing CLI
fallback; that remains a documented principle, not a V0 deliverable.

1. **Explore** the artifact normally, then enter **Select** (press `2`).
2. Click elements, select exact text, `Alt`-drag a region, `Shift`-click for
   multi-target sets. Grounding evidence shows before anything is sent.
3. Relate targets (align, order, spacing, containment, equivalence, sizing),
   write direction, pick delivery timing, and submit.
4. After the agent saves, the new revision resolves each target as exact,
   recovered, ambiguous, stale, or deleted. Only you can approve, reject,
   request another pass, supersede, or mark the intent obsolete.

## Envelope schema

The portable contract is `schema/envelope-v0.1.schema.json` (experimental,
versioned). TypeScript types are generated from it (`npm run build:types`).
Canvas-, host-, browser-, and framework-specific records travel as optional
extensions, never required semantics.

## Develop

```sh
npm install
npm test            # full suite
npm run typecheck
npm run benchmark   # target-resolution mutation benchmark
npm run instrument  # latency / reliability / token-efficiency signals
npm run eval:invocation
```

The primary test seam is `tests/loop.test.ts`: one black-box Visual Direction
Loop through the public MCP entry tool, HTTP API, and browser UI logic against
a controlled artifact.

## Layout

- `src/envelope/` — versioned schema, generated types, validation, fixtures
- `src/artifact/` — stable identity, content-addressed BLAKE3 revisions
- `src/resolution/` — confidence-bearing target resolution
- `src/lifecycle/` — durable delivery lifecycle, human verification
- `src/mcp/` — MCP server, entry tool, delivery tools, stdio transport
- `src/service/` — loopback HTTP service, sessions, security boundary
- `src/ui/` — product-owned review overlay, selection, composer, previews
- `src/adapters/` — React/Vite Source Provenance adapter
- `src/host/` — capability negotiation and honest degradation
- `src/benchmark/` — mutation benchmark matrix
- `src/eval/` — invocation policy eval
- `src/instrumentation/` — product-boundary measurements
- `skills/` — thin optional Skill for agents (pi-loadable via the `pi.skills` manifest)
- `fixtures/` — controlled artifacts, including malicious security fixtures

## License

Apache-2.0. The complete local loop is permissively open; see `SECURITY.md`
for the threat model and disclosure process.
