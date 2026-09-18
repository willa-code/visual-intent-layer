# Precision and trust advisor — readme-front-door

Checked here 2026-09-18: `codex-cli 0.149.0`, `opencode 1.18.29`, `pi 0.85.1`, `pi-mcp-adapter 2.34.0`.
No `claude` CLI is installed.

## 1. Identity paragraph (Q1)

One paragraph, keeping the two claims that decide whether the product can work at all — the
browser-rendered boundary and install-where-the-screen-is — plus the loop sentence. Drop "no prose
location descriptions, no lost context": a judgment about outcomes, not a fact — VISION: "a fact and a
judgment never share a word." The three nouns belong in the manual, where `CONTEXT.md` and the tool
descriptions can check them.

## 2. Uninstall (Q2)

State the act; ship no removal matrix. ADR-0031: what a Harness's configuration holds is "that
Harness's business and the product observes none of it." A matrix forces the README to name config
files — the inventory ADR-0031 deleted — and the drift is visible already: `opencode mcp --help` lists
only `add`, `list`, `auth`, `logout`, `debug`, and opencode's live config here is
`~/.config/opencode/opencode.jsonc`, not the `opencode.json` the deleted writer knew. Name a verb only
where the Harness ships one we verified: `codex mcp remove <NAME>`. Two facts we own: `npm uninstall -g
visual-intent-layer`, and that uninstalling removes no data — `src/cli.ts:38` defaults to
`~/.visual-intent-layer/data`, and `package.json` has no pre/postuninstall hook, so the record survives
until that directory is deleted.

## 3. Contributor material (Q3)

Move it, but the cost is maintenance. `.agents/skills/maintain-visual-intent-layer/SKILL.md:56` names
the docs a Docs sync corrects (`README.md`, `CONTEXT.md`, `SECURITY.md`, `docs/pi-validation.md`, the
feature map) — not a guide file. A `docs/guide.md` must join that list in the same change, or the moved
sections freeze as prose claiming live behaviour.

## 4. The no-agent CLI route (Q4)

Guide. CLI verbs are the best-maintained facts here: `visual-intent --help` and `src/cli.ts` are
Docs-sync sources (`SKILL.md:46`). One front-door line only as recovery ("tools do not appear").

## 5. The `docs/` index (Q5)

Keep a short explicit list, naming `docs/pi-validation.md`. Collapsing to one link removes the route
to the records that qualify the front door's own claims: ADR-0031 and the pi checklist, whose Status is
`awaiting-human`. No link checker exists in `scripts/`, so a moved section's links are hand-checked
once, then drift.

## (a) Decisions I would reverse

**Reverse item 4, the spelled-out `pi` entry.** pi is the least verified row and would become the most
elaborated. The repo's own record: "The adapter's source could not be verified … Treat as unverified"
(`docs/background/harness-mcp-setup-research.md:58`), and `docs/pi-validation.md:8` reads
`awaiting-human`. I verified two proposed facts against the installed adapter 2.34.0 — project
`.mcp.json` loads, `.pi/mcp.json` is the Pi project override (`pi-mcp-adapter/README.md:35,60-61`) — but
the maintain rule is `<harness> mcp add --help` (`SKILL.md:52-55`), and the adapter is not the Harness:
pi ships no MCP (pi README:499, "**No MCP.**"). Either leave pi at table altitude, or verify against the
adapter, record its version, then lift `awaiting-human`. Also, `/mcp disable` is not uninstall — it
persists a `disabled` flag to the Pi-owned layer and leaves the entry in place
(`pi-mcp-adapter/CHANGELOG.md:103`).

**Reverse the `@latest` update promise** (README: "each session resolves the current release and nothing
needs updating by hand"; item 5 carries it forward). False on the pi path: the adapter caches the
resolved bin keyed by the spec string for 24 hours and skips the version check for a non-exact spec
(`npx-resolver.ts:9,56-66`); `~/.pi/agent/mcp-npx-cache.json` records `packageVersion: "0.3.1"`.
Say npm resolves the current release when npx fetches, and a Harness that caches a resolved command
may serve the version it resolved.

## (b) What the spec is silent on

- **Unverified, report as such:** `claude mcp remove <name> --scope <scope>` (no CLI here; only external
  docs, `harness-mcp-setup-research.md:24-28`); "restart the agent and it takes effect" per Harness
  (unverified for codex and opencode; pi's adapter reloads the session after a panel write); "the panel
  reports why it failed" — plausible but not driven live. The 24-hour cache was read from source, not
  reproduced with a release in flight.
- **The maintain skill needs the new check.** If removal or update facts land, `SKILL.md:52-55` must
  verify them (`<harness> mcp remove --help`, adapter version), or they have no maintainer path.
- **The Docs-sync constraint has no instrument.** No script or named owner runs the hand link check;
  if the manual moves, say who re-runs it.
