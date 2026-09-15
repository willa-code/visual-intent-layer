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

`setup` detects which harnesses are present and registers the server with each
one natively. A harness counts as present when its binary resolves on `PATH` or
its config file or directory already exists, so setup never scatters config for
a harness you have not installed. Without a harness filter, every detected
in-scope harness is configured; when nothing is detected, project scope still
writes the shared `.mcp.json` so pi and Claude Code keep working by default.

| Harness     | Project scope                              | Global scope                                                       |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------ |
| pi          | `.mcp.json` (shared) + Skill               | `~/.config/mcp/mcp.json` + Skill                                   |
| Claude Code | `.mcp.json` (shared; first-use approval)   | `claude mcp add-json … --scope user` (or the printed manual command) |
| Codex       | `.codex/config.toml` (trusted projects)    | `codex mcp add …` when the binary exists, else `~/.codex/config.toml` |
| opencode    | `opencode.json`                            | `~/.config/opencode/opencode.json`                                 |

Every write merges the server entry and preserves existing servers. Setup never
overwrites another server's configuration, refuses a file holding invalid JSON
or TOML (naming the harness and path) instead of touching it, and reports an
already-registered server without rewriting the file. `.mcp.json` is a single
write that serves pi and Claude Code together; Claude Code requires first-use
approval for project-scoped servers, and the report says so. Claude Code's state
file is never hand-edited: setup delegates to Claude's own writer command, or
prints the exact command when the binary is absent. opencode files containing
hand-written comments are never rewritten; setup prints the exact entry to paste.

### Setup flags

- `--global` — user-global scope instead of the current project.
- `--harness <name>` — restrict the matrix to named harnesses (`pi`, `codex`,
  `claude-code`, `opencode`); repeatable.
- `--print-only` — show every planned write without touching disk.
- `--no-skill` — skip the pi Skill install.

### Packaged snippet

On a machine without a global install, paste the packaged `mcp.json` snippet
(shipped with the package) into your harness's config. It uses the
`npx -y --package visual-intent-layer@<version> visual-intent-mcp` form so no
binary needs to be on `PATH`.

### Stays manual

- Zed settings-file edits (`context_servers`), IDE marketplace listings, and
  one-click or deep-link installs.
- OAuth, tokens, and any credential-bearing setup step.
- Windows-specific config paths.

Setup support means the server is reachable with **Baseline Compatibility**, not
that a harness carries a **Certified Experience**. No host certification claims
are made here.

pi users: MCP is provided via `pi-mcp-adapter`, which reads the standard MCP
files above. The local browser carries the complete V0 experience; no embedded
UI is required. Alternatively, add this package to pi's `packages` setting —
its `pi.skills` manifest exposes the Skill automatically.

> Maintainer: releases go out via the Publish workflow (npm trusted publishing).
> Bump the version, push to `main`, then `gh release create vX.Y.Z --generate-notes` —
> publishing to npm happens automatically. Verify with a clean-machine
> `npm install -g visual-intent-layer` and the ticket 16 checklist.

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
