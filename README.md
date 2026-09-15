# Visual Intent Layer

A local-first **Visual Direction Loop**: point at visible targets in an
agent-produced interface, deliver a versioned **Visual Intent Envelope** over MCP,
and verify the result by hand. No prose location descriptions, no lost context.

## Install

Requires Node 20+. No Rust toolchain, no hosted account.

```sh
npm install -g visual-intent-layer
visual-intent setup --global     # MCP registration for every project + Skill install
```

`setup` merges the server entry into `~/.config/mcp/mcp.json` (or the current
project's `.mcp.json` without `--global`) and copies the Skill to
`~/.pi/agent/skills/visual-intent/`. It never overwrites existing servers and
refuses to touch invalid JSON. Use `--print-only` to preview, `--no-skill` to
skip the Skill. The raw snippet also ships as `mcp.json` in the package.

pi users: MCP is provided via `pi-mcp-adapter`, which reads the standard MCP
files above. The local browser carries the complete V0 experience; no embedded
UI is required. Alternatively, add this package to pi's `packages` setting —
its `pi.skills` manifest exposes the Skill automatically.

> Maintainer: the package is not published yet. Publish checklist: `npm login`,
> `npm publish --access public` (name `visual-intent-layer` verified available),
> then `npm install -g visual-intent-layer` from a clean machine and run the
> ticket 16 checklist.

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
