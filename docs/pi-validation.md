# Validate the core loop on pi (ticket 16)

> **Corrected.** This note described steering as a negotiated host capability.
> ADR-0018 establishes that steering and interruption are seen at the agent's
> Check-In, a published convention, and that every MCP call for a session records
> contact. The `steering` capability flag no longer exists; read steering as a
> Check-In everywhere below.

Status: awaiting-human — the automated contract suite passes; this checklist
needs a live pi session via pi-mcp-adapter.

## Prerequisites

- pi with MCP support and `pi-mcp-adapter` installed.
- This package installed: `npm install -g visual-intent-layer` (Node 20+), then `visual-intent setup` in a scratch project (or `setup --global`).
- MCP configuration registered by `setup` and picked up by `pi-mcp-adapter` (standard `.mcp.json` / `~/.config/mcp/mcp.json` files).

## Automated evidence already in place

- `npm test` — full suite, including the MCP protocol contract
  (`src/mcp/protocol.test.ts`) and the primary black-box loop (`tests/loop.test.ts`).
- `node scripts/stdio-smoke.js` — real stdio transport: list tools, call the
  entry tool against `fixtures/gallery.html`.
- Browser fallback is the complete V0 experience; steering is labelled
  unsupported on pi and held as next-pass (`src/host/capabilities.ts`).

## Live checklist

1. In pi, ask: "Open visual review for `fixtures/gallery.html` so I can point
   at the button." Confirm the agent calls `open_visual_review` and shares a
   working review URL (browser fallback, no embedded UI expected).
2. In the browser: enter Select, click the Place order button, confirm Rendered
   Grounding evidence shows, write direction, submit as next-pass. Confirm the
   delivery state reads host-accepted without implying action.
3. In pi, confirm the agent can read the envelope via `get_intent_status` and
   acknowledges via `acknowledge_intent`. Confirm acknowledgement never
   verifies: status must read agent-acknowledged, not verified.
4. Edit and save `fixtures/gallery.html` (copy it first; do not dirty the repo).
   Confirm the review surface reports the new revision and re-resolves the
   target with an explicit outcome.
5. Approve in the review surface. Confirm status becomes verified.
6. Restart the service mid-loop (between submit and verify on a second envelope)
   and confirm no acknowledged intent is lost or duplicated.

## Sign-off

- Date, pi version, pi-mcp-adapter version:
- Deviations from the checklist:
- Result: pass / fail (with issue links):
