# Visual Intent Layer

A local-first **Visual Direction Loop**: open a review surface on an
agent-produced interface, point at visible targets, compose **Annotations**, and
verify the result by hand. No prose location descriptions, no lost context.

The **Annotation** is the unit of work. A Builder-Reviewer points at a visible
target, drafts a note in a card anchored to it, attaches reference images, and
queues the result. Sending delivers one **Visual Intent Envelope** carrying each
Annotation with its own identity. Each Annotation is verified on its own.

The Annotation and the envelope carry one or more targets; the surface composes
one target per selection today, until `.scratch/several-targets-and-relations/`
restores the set gesture.

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

### One rail, two tiles

The Review Surface has one chrome region and one state. The **rail** on the
right holds the artifact's identity, its revision, the agent's position and
every Annotation — unsent and sent alike, in one list with the state pill
carrying the difference, so nothing leaves the view when it is sent. An
Annotation that needs a decision comes first; closed ones stay behind one
toggle. Verdicts are decided where the Annotation sits: approve, reject with
another pass, or mark obsolete. Amending one that was already sent supersedes
it and delivers the amendment; it is never rewritten in place.

A small **island** over the artifact holds two icon-only tiles: point at things,
and box an area. Operating the artifact is the unarmed resting state rather than
a third tile. Pointing is a gesture: clicking targets a thing the artifact owns,
and dragging across words targets exactly those words. `P`, `B` and `V` arm and
disarm them.

Type and press Enter in the Annotation card to queue it; `Cmd/Ctrl+Enter` sends
the whole queue. Escape unwinds exactly one level — close the card, then clear
the selection, then return to operating the artifact — and never discards unsent
writing.

### The Annotation model

- An Annotation is durable and individually identified: targets, note,
  references, delivery state and resolution. The envelope keeps its support for
  relationships, but this iteration's surface expresses no relation.
- Unsent text survives a surface reload, a service restart and a browser
  restart. Nothing discards a note silently.
- One selection composes one Annotation today; a drawn Area records the
  revision and scroll position it was drawn at and reports the elements it
  encloses. Gathering several targets into one Annotation is deferred to
  `.scratch/several-targets-and-relations/`, and the Annotation and the envelope
  still carry a target set.
- Every Target carries Runtime State Evidence: the address the artifact was
  showing when it was pointed at, recorded relative to the artifact's own base
  so it means the same thing whether the artifact is served directly or through
  the review proxy.
- A Target may carry a Captured View: a browser-composited image of the artifact
  as it was seen, taken by an explicit permissioned capture in the tab that
  shows it and never substituted by a re-render. It is content-addressed like a
  reference image and left undisclosed to no one: the drawer says it will leave
  the machine before the queue is sent.
- Reference images are added by picker, paste or drop, are content-addressed by
  their own bytes, and are refused visibly (and unread) when disallowed or
  larger than 5MB. Only image types are accepted.
- Relational Intent stays in the domain model and the envelope keeps its support
  for relationships, but this iteration's surface expresses no relation. The
  capability is deferred deliberately, not removed.
- The product never writes style values into the artifact or its source.

### Resolution, honesty and the agent

When the artifact changes, each target is located again and reported as
**Matched**, **Recovered**, **Ambiguous** (with its candidates, never
auto-selected) or **Deleted**. A target that cannot be found while the
annotation's revision is still the one on screen, and that was pointed at a
different address than the one now showing, is reported as possibly existing
only in a state no longer on screen — the product states that possibility and
never asserts it. Whether an Annotation was written before the revision now on
screen is a separate, Annotation-level fact shown as such. Provenance
Confidence — exact source span, inferred, or unavailable — is a separate axis
and never shares the word "exact" with target resolution; `exact` is claimed
only where an instrumented artifact stamped a source location, per Target.

Every Annotation is stamped with the **Adopted Revision**: the revision the
artifact reported it was holding, not the revision a source currently offers.
Where the artifact's report and the source's offer disagree, the surface states
the disagreement and the Annotation keeps the artifact's report.

The surface states the agent's position in a sentence, whether a tool call is
currently held or direction will be read at the agent's next Check-In, and when
the agent last checked in. Where the host can hold the call the agent is
**awaiting you** and sending is urgent; where it cannot, the surface says the
agent has **stepped away** and the Annotations are queued durably. Agent
acknowledgement is never presented as implementation or as verification, and the
workflow never requires the agent to be waiting.

### Check-In is a convention, not a capability

Steering and interruption are seen at a **Check-In**: the point between an
agent's own steps where it reads new direction. There is no push channel and no
wake mechanism, because a server cannot put anything into an agent's running
turn. The product publishes the convention instead of detecting a host
capability it cannot rely on, and records every MCP call for a session so "last
checked in" is a fact the surface states rather than an assumption.

An agent that was not holding a call can retrieve what arrived with the
`check_in` tool: newly delivered Annotations with their intent, amendments that
superseded something, a pending stop request, and the current state of what it
was given before. Sending the queue is **Next-Pass Intent**, amending something
already sent is **Steering Intent**, and asking an agent to stop is **Review
Interruption** — a request, never a claim that work stopped. The envelope's
`review-interruption` value is reserved and never emitted: an interruption names
no target, so it cannot be one.

The nearest canvas-agent prior art refuses check-in outright and schedules later
requests instead; polling through the MCP Tasks extension is the one push-free
pattern the specification sanctions. Both are recorded in the shipped skill.

A single drawer, hidden while it has nothing to report and badge-counted when it
does, carries what needs a decision: everything that will leave the machine, any
unresolved or ambiguous Annotation, and the fact that the artifact has moved on.
The overflow menu holds the rare actions — reload artifact, copy artifact path,
copy evidence for the queue, open the disclosure, end session, and choose the
chrome theme — and never a frequent one.

### Agent tools (MCP)

The model-visible tool surface is deliberately small:

| Tool                  | What it does                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open_visual_review`  | Opens the loop for a saved HTML file or a running localhost app, may declare `capabilities: { embeddedUI, subscriptions }`, and holds the call for the human. |
| `check_in`            | Reads new direction between the agent's own steps, without an `envelopeId`: deliveries with their intent, amendments, a pending stop request, and current state. |
| `get_intent_status`   | Reads one delivered batch by `envelopeId`, including each target's resolution.                                                                             |
| `acknowledge_intent`  | Confirms receipt of a batch or one Annotation. Never implementation and never verification.                                                                |

`embeddedUI` and `subscriptions` are the only host capabilities the product
negotiates; there is no steering flag. A host declares them through the
`capabilities` argument on `open_visual_review`, not through a side channel.
The tool descriptions ship the Check-In convention, so an agent following them
knows to call `check_in` between its own steps.

### Environment and data

| Variable                  | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `VISUAL_INTENT_DATA_DIR`  | Lifecycle data directory (default `~/.visual-intent-layer/data`).        |
| `VISUAL_INTENT_PORT`      | Default service port (default `3742`).                                  |
| `VISUAL_INTENT_NO_OPEN`   | Set to `1` to suppress automatic browser opening.                        |
| `VISUAL_INTENT_WAIT_MS`   | How long the agent-facing entry tool holds the call, in milliseconds.    |

Annotations, sessions, attachments, snapshot bytes and Check-In contact all live
under the data directory, so a service restart loses nothing. The packaged
`mcp.json` pins the current release version for the `npx` transport form.

## Envelope schema

The portable contract is `schema/envelope-v0.3.schema.json` (experimental,
versioned). One envelope carries one or more Annotations, each with its own
identity, targets, note, relationships, references and attachments. Every target
may carry Runtime State Evidence, including the address the artifact was showing.
TypeScript types are generated from it (`npm run build:types`).

The `0.1` schema is kept only for reading state written by older releases. `0.2`
envelopes are still readable: a `0.2` envelope without Runtime State Evidence
loads unchanged and is read as the current version. New envelopes are `0.3`.
`review-interruption` remains a reserved value in the `delivery.intent` enum and
is never emitted, because an interruption names no target and so cannot be an
envelope.

## Security and privacy

Reviewing is local-first. The service binds to loopback only, requires an
unguessable per-session capability, and confines file access to the artifact
directory. A saved HTML artifact keeps its own relative and root-relative assets
and may load the remote stylesheet, font and image origins it declares — and
those origins are disclosed in the surface *before* the artifact contacts them.
Runtime data requests stay blocked by a saved artifact's content policy. A
running local development server may be reverse-proxied through the review
service's own origin so its DOM is selectable; only loopback development origins
are proxied, a client's method, body, headers and redirects arrive intact, its
update channel is proxied, and authenticated production applications are
refused. A proxied application gets its own content policy that permits its own
proxied origin and nothing else, and the disclosure states what is permitted. A
Captured View is taken only by an explicit permissioned capture in the
reviewing tab; the permission cannot be persisted.

See `SECURITY.md` for the full policy.

## Develop

```sh
npm install
npm test            # full suite, including the browser-driven primary seam
npm run typecheck
npm run build       # compile the service and bundle the shell + artifact layer
npm run benchmark   # target-resolution mutation benchmark
npm run instrument  # latency / reliability / token-efficiency signals
npm run eval:invocation   # documented routing policy, not live agent judgment
```

The primary test seam is `tests/browser-loop.test.ts`: the Visual Direction
Loop is driven end to end in a real browser engine against the locally running
service — the served asset graph must load, the artifact must render with its
styles, and a human path (point, annotate, queue, send, reload, compare, amend,
stop, verify, restart) is performed through the DOM the product actually serves.
A surface that cannot load its own scripts fails CI rather than shipping.

The design gallery is at `/gallery` on a running service. It is not part of the
product's navigation. `tests/gallery-snapshot.test.ts` pins every design token
exactly, fails on a screenshot difference, checks every semantic surface/ink
pair against the contrast floor in both themes, and fails when a baseline is
missing rather than silently writing one. Tokens are pinned once because they
are strings; screenshots are pinned per rendering platform, because font
metrics move the layout — a missing platform baseline fails and leaves the
render this run produced in `.scratch/`, which CI uploads as the
`gallery-actual` artifact. Regenerate baselines for the platform you are on
with `UPDATE_GALLERY=1` once the change is intended.

## Layout

- `design.md` — normative Review Surface design contract (tokens, roles, states)
- `CONTEXT.md` — the domain language, including the words to avoid
- `schema/` — versioned Visual Intent Envelope contracts (0.2 current, 0.1 legacy)
- `src/annotation/` — the Annotation model, durable store, attachments, migration
- `src/artifact/` — identity, content-addressed revisions, fidelity rewriting, snapshots
- `src/resolution/` — target resolution and its reduced vocabulary
- `src/mcp/` — MCP server, the four tools, stdio transport
- `src/service/` — loopback HTTP service, sessions, Check-In records, security boundary, browser opening
- `src/ui/` — product-owned shell, artifact interaction layer, icon set, design gallery
- `src/adapters/` — the build-time source-location stamp reader (product and third-party attributes)
- `src/host/` — the surviving host-capability declaration (embedded UI, subscriptions)
- `src/benchmark/` — mutation benchmark matrix
- `src/instrumentation/` — product-boundary measurements
- `src/eval/` — documented invocation-routing eval
- `fixtures/` — the gallery artifact the Lever and tests drive
- `tests/` — the browser loop, the Lever contract, and the gallery baselines
- `scripts/` — UI bundling and envelope type generation
- `skills/` — thin optional Skill for agents

## Documentation

- `docs/adr/` — architecture decisions, including ADR-0018 on Check-In replacing
  a steering capability
- `docs/background/` — research and the product strategy brief
- `docs/pi-validation.md` — the live-pi checklist
- `docs/agents/` — the issue tracker, triage labels and domain-doc conventions
- `SECURITY.md` — the threat model, supported versions and disclosure process

## Maintaining this package

Releases go out through the Publish workflow (npm trusted publishing).
`/maintain-visual-intent-layer` lays out the paths — dogfood locally, cut a
pre-release to `next`, promote a validated pre-release, or fix a bad release —
and executes the one you pick. Pre-releases publish to `next`; `latest` only
moves when a validated pre-release is promoted.

## License

Apache-2.0. The complete local loop is permissively open; see `SECURITY.md`
for the threat model and disclosure process.