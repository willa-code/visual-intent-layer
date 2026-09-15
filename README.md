# Visual Intent Layer

A local-first **Visual Direction Loop**: open a review surface on an
agent-produced interface, point at visible targets, compose **Annotations**, and
verify the result by hand. No prose location descriptions, no lost context.

The **Annotation** is the unit of work. A Builder-Reviewer selects one or more
visible targets, drafts a note in a card anchored to the target, attaches
references, expresses a relationship by manipulating the targets, and queues the
result. Sending delivers one **Visual Intent Envelope** carrying each Annotation
with its own identity. Each Annotation is verified on its own.

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

### Transport

Setup registers whichever transport will actually work on this machine. When
`visual-intent` resolves on `PATH` the entry is `command: "visual-intent"` with
args `["mcp"]`; otherwise it is the packaged
`npx -y --package visual-intent-layer@<version> visual-intent-mcp` form.

### Setup flags

- `--global` — user-global scope instead of the current project.
- `--harness <name>` — restrict the matrix to named harnesses; repeatable.
- `--status` — read-only: report registration state, location, transport, evidence.
- `--print-only` — show every planned write without touching disk.
- `--no-skill` — skip the pi Skill install.

## Use

Start a session yourself, or let the agent open one:

```sh
visual-intent open --html ./checkout.html     # opens the browser, prints the URL
visual-intent open --app http://localhost:5173
visual-intent serve --port 3742               # local service only
```

Starting a session **launches the default browser on this machine** and prints
the review URL as well, so the loop is a product experience rather than a
URL to copy. Automatic opening is suppressed with `--no-open` or
`VISUAL_INTENT_NO_OPEN=1` for headless, remote and scripted use; the URL is
still printed. Reopening the same artifact revision reuses the open session and
its URL, so a review does not accumulate tabs.

### The two states

The Review Surface has exactly two states.

**Review** is where the artifact is exercised normally and Annotations are
composed. The tool row is Pointer, Element, Text, Region, Arrange. Selecting a
target opens an Annotation card next to it; typing and pressing Enter queues the
Annotation; `Cmd/Ctrl+Enter` queues and sends the whole queue.

**Verify** is where a resulting revision is compared against the Annotations
written for it. The pre-change and post-change revisions are toggleable in place,
each Annotation's target is marked in both, and each Annotation is decided
separately: approve, reject with another pass, supersede, or mark obsolete.

Escape unwinds exactly one level — close the card, then clear the selection,
then leave Verify — and never discards unsent writing.

### The Annotation model

- An Annotation is durable and individually identified: targets, note,
  references, optional Relational Intent, delivery state and resolution.
- Unsent text survives a surface reload, a service restart and a browser
  restart. Nothing discards a note silently.
- Several targets can be gathered into one Annotation; a region records the
  revision and scroll position it was drawn at.
- Reference images are added by picker, paste or drop, are content-addressed by
  their own bytes, and are refused visibly (and unread) when disallowed or
  oversized.
- Relational Intent is expressed by manipulating the selected targets —
  ordering, alignment, equal spacing, containment, shared property and
  comparative size — shown back as one plain sentence and stored
  implementation-neutral, with no pixel fields. The relation type and operator
  pickers no longer exist.
- The product never writes style values into the artifact or its source.

### Resolution, honesty and the agent

When the artifact changes, each target is located again and reported as
**Matched**, **Recovered**, **Ambiguous** (with its candidates, never
auto-selected) or **Deleted**. Whether an Annotation was written before the
revision now on screen is a separate, Annotation-level fact shown as such.
Provenance Confidence — exact source span, inferred, or unavailable — is a
separate axis and never shares the word "exact" with target resolution.

The surface states the agent's position in a sentence. Where the host can hold
the call the agent is **awaiting you** and sending is urgent; where it cannot,
the surface says the agent has **stepped away** and the Annotations are queued
durably. Agent acknowledgement is never presented as implementation or as
verification, and the workflow never requires the agent to be waiting.

A single drawer, hidden while it has nothing to report and badge-counted when it
does, carries what needs a decision: everything that will leave the machine, any
unresolved or ambiguous Annotation, and the fact that the artifact has moved on.
Rare actions — end session, reload artifact, copy artifact path, copy evidence —
live in the overflow menu.

## Envelope schema

The portable contract is `schema/envelope-v0.2.schema.json` (experimental,
versioned). One envelope carries one or more Annotations, each with its own
identity, targets, note, relationships, references and attachments. TypeScript
types are generated from it (`npm run build:types`).

## Security and privacy

Reviewing is local-first. The service binds to loopback only, requires an
unguessable per-session capability, and confines file access to the artifact
directory. A saved HTML artifact keeps its own relative and root-relative assets
and may load the remote stylesheet, font and image origins it declares — and
those origins are disclosed in the surface *before* the artifact contacts them.
Runtime data requests stay blocked by the artifact's content policy. A running
local development server may be reverse-proxied through the review service's own
origin so its DOM is selectable; only loopback development origins are proxied
and authenticated production applications are refused.

See `SECURITY.md` for the full policy.

## Develop

```sh
npm install
npm test            # full suite, including the browser-driven primary seam
npm run typecheck
npm run build       # compile the service and bundle the shell + artifact layer
npm run benchmark   # target-resolution mutation benchmark
npm run instrument  # latency / reliability / token-efficiency signals
npm run eval:invocation
```

The primary test seam is `tests/browser-loop.test.ts`: the Visual Direction
Loop is driven end to end in a real browser engine against the locally running
service — the served asset graph must load, the artifact must render with its
styles, and a human path (select, annotate, queue, send, re-resolve, verify,
restart) is performed through the DOM the product actually serves. A surface
that cannot load its own scripts fails CI rather than shipping.

The design gallery is at `/gallery` on a running service. It is not part of the
product's navigation. `tests/gallery-snapshot.test.ts` pins every design token
exactly and fails on a screenshot difference, so a drifting token or an
undocumented new state fails loudly.

## Layout

- `design.md` — normative Review Surface design contract (tokens, roles, states)
- `schema/` — versioned Visual Intent Envelope contracts
- `src/annotation/` — the Annotation model, durable store, attachments, migration
- `src/artifact/` — identity, content-addressed revisions, fidelity rewriting, snapshots
- `src/resolution/` — target resolution and its reduced vocabulary
- `src/mcp/` — MCP server, entry tool, stdio transport
- `src/service/` — loopback HTTP service, sessions, security boundary, browser opening
- `src/ui/` — product-owned shell, artifact interaction layer, design gallery
- `src/adapters/` — React/Vite Source Provenance adapter
- `src/host/` — capability negotiation and honest degradation
- `src/benchmark/` — mutation benchmark matrix
- `src/instrumentation/` — product-boundary measurements
- `skills/` — thin optional Skill for agents

## License

Apache-2.0. The complete local loop is permissively open; see `SECURITY.md`
for the threat model and disclosure process.