## Scope

Read in full: `README.md` (all 352 lines). Cross-checked against `src/cli.ts`, `src/cli-setup.ts`, `src/harness-registry.ts`, `src/mcp/server.ts`, `src/mcp/service.ts`, `src/mcp/stdio.ts`, `src/service/http.ts`, `src/service/browser.ts`, `src/host/capabilities.ts`, `src/annotation/model.ts`, `src/annotation/migrate.ts`, `src/annotation/envelope.ts`, `src/adapters/source-stamp.ts`, `src/ui/app.ts`, `src/ui/components.ts`, `src/ui/artifact/layer.ts`, `package.json`, `mcp.json`, `.github/workflows/publish.yml`, `skills-lock.json`, `skills/visual-intent/`, `docs/adr/0018-*.md`, and directory listings of `tests/`, `docs/`, `src/`, repo root.

Left out (per instructions and lane boundaries): `.scratch/**`, `.visual-intent-verify/**`, the 25 vendored skills in `skills-lock.json`, deep review of `VISION.md`/`CONTEXT.md`/`design.md` content (README only cites their existence/purpose, which I verified by `ls`, not their full prose), and `dist/**` (used only to note what ships, not as source of truth — not needed for this pass since no README claim required it).

## Findings

### P0 — Entire "Install" section (harness matrix + Transport + Setup flags) is going away wholesale
- CLAIM: `README.md:21-79` — the full `## Install` section: the `visual-intent setup` usage block (25-28), the harness-detection table (35-40), the detection-behavior prose (30-49), the scope-write table (53-58), the merge/repair prose (60-66), `### Transport` (68-73), and `### Setup flags` (75-81, including `--no-skill`).
- CODE: Today this text is a precise, verified description of `src/cli-setup.ts` and `src/harness-registry.ts` (every table cell checked: `piGlobalPaths`/`piAgentDir` harness-registry.ts:79-84,96-98; Codex paths harness-registry.ts:100-118,126-134; Claude paths harness-registry.ts:106-108,120-122; opencode paths harness-registry.ts:136-153; scope-write behavior cli-setup.ts:222-380; `selectTransport` cli-setup.ts:124-138; `--no-skill`→`withSkill` cli.ts:86 and cli-setup.ts:339-349). But per the settled decision, `src/cli-setup.ts`, `src/harness-registry.ts` and their tests are being deleted, and the `setup` verb is leaving `src/cli.ts` entirely.
- VERDICT: STALE — accurate against current HEAD, but the entire feature it documents is scheduled for deletion.
- FIX: Replace the whole `## Install` section (including both tables, `### Transport`, `### Setup flags`) with a short section describing that installation is done by the human registering the MCP server with their own harness-native registrar (no `visual-intent setup` verb, no harness auto-detection, no `--no-skill`/`--print-only`/`--status`/`--harness` flags). It should state the two transport forms a human would enter by hand (`command: "visual-intent", args: ["mcp"]` when installed globally — still true per `cli.ts:19,113-114` — or the `npx -y --package visual-intent-layer@<version> visual-intent-mcp` fallback), and mention the new official MCP Registry listing (settled decision #6) as the discovery path instead of the detection matrix.

### P0 — pi Skill references throughout Install/flags/Layout are stale
- CLAIM: `README.md:78` — "`--no-skill` — skip the pi Skill install."; `README.md:56` "`pi` | `.mcp.json` (shared) + Skill | `~/.config/mcp/mcp.json` + Skill"; `README.md:315` "`skills/` — thin optional Skill for agents" (Layout section).
- CODE: `skills/visual-intent/SKILL.md` exists (`ls skills/`, `ls skills/visual-intent/`), `package.json:16-18` still declares `"pi": { "skills": ["./skills"] }`, and `cli-setup.ts:339-349` (`planSkill`) still copies it. Per settled decision #2, the pi Skill (`skills/visual-intent/`, the `pi.skills` field, `--no-skill`) is being deleted.
- VERDICT: STALE.
- FIX: Remove the "+ Skill" column entries, remove the `--no-skill` bullet, and remove/rewrite the `skills/` Layout bullet once the directory is gone (or repurpose it if any non-product skill content remains there — currently it holds only the product Skill being deleted).

### P0 — Packaged repo-root `mcp.json` and its release check are undocumented as deletable but implicitly referenced
- CLAIM: `README.md:242-243` — "The packaged `mcp.json` pins the current release version for the `npx` transport form."
- CODE: `mcp.json:1-9` (repo root) exists and currently pins `visual-intent-layer@0.3.0-next.3`, matching the claim as of HEAD. Settled decision #3 deletes this file and its release-time check.
- VERDICT: STALE.
- FIX: Delete this sentence from the "Environment and data" section; nothing replaces it since the artifact itself is being removed.

### P0 — "Maintaining this package" section documents the pre-release channel being retired
- CLAIM: `README.md:341-347` — "`/maintain-visual-intent-layer` lays out the paths — dogfood locally, cut a pre-release to `next`, promote a validated pre-release, or fix a bad release... Pre-releases publish to `next`; `latest` only moves when a validated pre-release is promoted."
- CODE: `.github/workflows/publish.yml:20-25` currently has exactly this pre-release/`next`-tag step (`if: ${{ github.event.release.prerelease }}` → `npm publish ... --tag next`), and `package.json:3` has `"version": "0.3.0-next.3"`, confirming the pre-release channel is live at HEAD. Settled decision #4 retires this channel entirely; releases become official-only and users install `@latest`.
- VERDICT: STALE.
- FIX: Rewrite this section to describe only the official-release path (no `next` tag, no pre-release promotion step); drop "cut a pre-release to `next`" and "promote a validated pre-release" language, replacing with whatever the retained `/maintain-visual-intent-layer` paths become (dogfood locally, cut a release, fix a bad release).

### P2 — CLI verbs and `--help` verb list are correct today and match the settled end-state
- CLAIM: `README.md:19` help text lists `serve`, `open`, `setup`, `mcp`; README's own prose (`Use` section, `README.md:83-98`) only narrates `open`/`serve`/`mcp`-adjacent behavior, and setup verb removal is covered above.
- CODE: `src/cli.ts:19-24` currently prints `serve`, `open`, `setup`, `mcp` in `HELP`; `src/cli.ts:66-119` implements exactly these four verbs (`setup`, `mcp`, `serve`, `open`) — no others exist.
- VERDICT: MATCHES today; the `setup` verb removal is already flagged as P0 above (settled decision #5: `mcp`, `serve`, `open` stay, `setup` goes) so this is not a new finding, just confirmation that no other stray verb needs fixing.
- FIX: none beyond the Install-section rewrite already noted; the CLI `HELP` string in `cli.ts:19` will also need `setup`'s line removed when the deletion lands (implementation-side, not README, but worth flagging so the doc and the `--help` text move together).

### Correct — "Use" section matches `src/cli.ts` exactly
- CLAIM: `README.md:83-98` — `open --html <path>`, `open --app <url>`, `--source-root`, `serve --port 3742`, auto-open behavior, `--no-open`/`VISUAL_INTENT_NO_OPEN=1`, "the URL is still printed," and "reopening the same artifact revision reuses the open session."
- CODE: `src/cli.ts:132-171` implements `open --html`/`--app`/`--source-root`/`--port`/`--json`/`--no-open` exactly as described; `src/service/browser.ts:4` (`autoOpenSuppressed`) plus `cli.ts:135` implement the suppression; `src/mcp/service.ts:178-186,230-237,182-208,233-259` implement session reuse (`reused: true/false`) keyed on artifact+revision.
- VERDICT: MATCHES.

### Correct — "One rail, two tiles" description matches `src/ui/**` precisely
- CLAIM: `README.md:100-124` — two icon-only tiles ("point at things," "box an area"), operate as unarmed resting state (not a third tile), `Shift` extends selection to "a set of up to eight targets," dragging an already-selected target starts a relation drag with a preview sentence, `P`/`B`/`V` arm/disarm.
- CODE: `src/ui/components.ts:248-251` `MODE_TILES` has exactly two entries (`point`, `box`); `layer.ts:29` `MAX_TARGETS = 8`; `layer.ts:315-323` `appendTarget` enforces the 8-cap with a matching refusal message; `layer.ts:729-751` implements the relation-drag ghost + `relation-preview` sentence; `app.ts:1946-1951` binds `p`→point, `b`→box, `v`→operate.
- VERDICT: MATCHES.

### Correct — Escape/Enter keyboard model matches `app.ts:1885-1953`
- CLAIM: `README.md:123-124` — "Type and press Enter in the Annotation card to queue it; `Cmd/Ctrl+Enter` sends the whole queue. Escape unwinds exactly one level — close the card, then clear the selection, then return to operating the artifact — and never discards unsent writing."
- CODE: `app.ts:1890-1901` (Cmd/Ctrl+Enter → `sendQueue()`; Enter without Shift → `queueActive()` or `submitAmend`); `app.ts:1917-1940` Escape ladder: coachmark → menu → drawer → amend → repoint → active card → selection → mode→operate → focus island. The card/selection/operate levels README calls out are present in that order; unsent text is preserved because closing the card doesn't clear `note` (persisted via debounced `saveNote`, `app.ts:1370-1382`).
- VERDICT: MATCHES (README simplifies by omitting the menu/drawer/repoint intermediate levels, which is a reasonable abridgement, not a contradiction).

### Correct — "Agent tools (MCP)" table matches `src/mcp/server.ts`
- CLAIM: `README.md:217-223` — four tools: `open_visual_review`, `check_in`, `get_intent_status`, `acknowledge_intent`.
- CODE: `src/mcp/server.ts:31-40` dispatches exactly these four tool names; no others exist in the switch.
- VERDICT: MATCHES.

### Correct — Environment variable table matches implementation
- CLAIM: `README.md:234-238` — `VISUAL_INTENT_DATA_DIR`, `VISUAL_INTENT_PORT`, `VISUAL_INTENT_NO_OPEN`, `VISUAL_INTENT_WAIT_MS`.
- CODE: `cli.ts:39-42` (help text), `cli.ts:46-47`, `service/browser.ts:4`, `mcp/service.ts:139`, `mcp/stdio.ts:10-11` all use exactly these four variables with the documented defaults.
- VERDICT: MATCHES.

### Correct — Envelope schema section matches `schema/` and `src/annotation/`
- CLAIM: `README.md:245-259` — current schema is `schema/envelope-v0.4.schema.json`; `0.1` kept only for legacy reads; `0.2`/`0.3` still readable; new envelopes are `0.4`; types generated via `npm run build:types`; `review-interruption` reserved and never emitted.
- CODE: `find schema/*.json` shows `envelope-v0.1/0.2/0.3/0.4.schema.json` all present; `src/annotation/envelope.ts:39` stamps new envelopes `schemaVersion: '0.4'`; `src/annotation/migrate.ts` implements legacy-record migration; `package.json` script `build:types` → `node scripts/generate-envelope-types.js`; `review-interruption` appears only in type unions (`host/capabilities.ts:6`, generated types) and a test asserting the reserved value, never in an emission path.
- VERDICT: MATCHES.

### Correct — Host-capability negotiation matches `src/host/capabilities.ts`
- CLAIM: `README.md:225-229` — `embeddedUI` and `subscriptions` are the only negotiated capabilities; declared via `capabilities` argument on `open_visual_review`, not a side channel.
- CODE: `host/capabilities.ts:1-16` `HostCapabilities` has exactly these two fields; `host/capabilities.test.ts:31-35` explicitly asserts no `steering`/`deliveryPlan` flag exists; `capabilities.test.ts:39-48` shows the MCP tool schema exposes `capabilities.embeddedUI`/`capabilities.subscriptions`.
- VERDICT: MATCHES.

### Correct — Provenance-stamp claim matches `src/adapters/source-stamp.ts`
- CLAIM: `README.md:180-183` — `exact` provenance is claimed "only where an instrumented artifact stamped a source location... a stamp read from `data-vis-source`, or from `data-insp-path` written by `code-inspector-plugin`."
- CODE: `source-stamp.ts:13-18` defines `OWN_STAMP_ATTRIBUTE = 'data-vis-source'` and a second contract `{ attribute: 'data-insp-path', adapter: 'code-inspector-plugin' }`; `source-stamp.test.ts:24-30` confirms the third-party attribute is read.
- VERDICT: MATCHES.

### Correct — Verdict/decision model matches `src/annotation/model.ts` and `src/ui/components.ts`
- CLAIM: `README.md:104-105` — "Verdicts are decided where the Annotation sits: approve, reject with another pass, or mark obsolete."
- CODE: `components.ts:368-392` (`verdictControls`) exposes `approve`, `not-fixed` ("Not Fixed"), `obsolete`; `model.ts:21,148-154` shows `not-fixed` is both `isAmendable` and `isAttemptable` — i.e., it drives "another pass," matching the README's paraphrase.
- VERDICT: MATCHES.

### Correct — Security & privacy section matches `src/service/http.ts`
- CLAIM: `README.md:263-278` — loopback binding, per-session capability, only declared remote origins allowed pre-load, reverse-proxy restricted to loopback dev origins, Captured View requires explicit permissioned capture.
- CODE: `http.ts:94,131` bind to `127.0.0.1`; `http.ts:286-289,989-1004` enforce capability verification (401 on missing/invalid); `http.ts:1054-1074` restrict proxy targets to loopback/localhost.
- VERDICT: MATCHES.

## Code with no documentation

- `src/service/http.ts:170-172,1601-1610` — a `/gallery` route serving `gallery.html`. README does mention `/gallery` in the `## Develop` section (`README.md:299-308`, "The design gallery is at `/gallery` on a running service. It is not part of the product's navigation."), so this is actually documented — not a gap. No undocumented behavior found beyond what's already covered above; the audit surfaced no load-bearing code path in `src/cli.ts`, `src/mcp/**`, or `src/ui/**` lacking any README mention within this lane.

(Section required to be present even if empty — no additional undocumented code found beyond the items already cross-referenced above.)

## Could not verify

- The exact prose "the nearest canvas-agent prior art refuses check-in outright and schedules later requests instead; polling through the MCP Tasks extension is the one push-free pattern the specification sanctions" (`README.md:213-214`) is a claim about external MCP ecosystem behavior, not `src/**` behavior. It cannot be settled from this repository's code; it would need the referenced canvas-agent implementation and the MCP Tasks extension spec text to verify. Marked RECORD/UNVERIFIED rather than a finding, since it is not a `src/**`-contradicted claim.
- Whether `/maintain-visual-intent-layer` (referenced `README.md:343`) is a command that exists anywhere reviewable — it wasn't found under `src/**`, and per audit rules I did not inspect `.scratch/**` where slash-command definitions for this repo's own tooling might live. Would need to know where that command is implemented (likely a `.claude`/`.codex` command definition or an agent skill outside the lane) to verify its described behavior beyond the publish-workflow facts already checked directly against `.github/workflows/publish.yml`.