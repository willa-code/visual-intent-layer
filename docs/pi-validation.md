# Validate the core loop on pi

> **Corrected.** This note once described steering as a negotiated host
> capability. ADR-0018 establishes that steering and interruption are seen at
> the agent's Check-In, a published convention, and that every MCP call for a
> session records contact. The `steering` capability flag no longer exists.

Status: awaiting-human — the automated suite passes; this checklist needs a live
pi session via pi-mcp-adapter.

## Prerequisites

- pi with MCP support and `pi-mcp-adapter` installed.
- This package installed: `npm install -g visual-intent-layer` (Node 20+), then `visual-intent setup` in a scratch project (or `setup --global`).
- MCP configuration registered by `setup` and picked up by `pi-mcp-adapter` (standard `.mcp.json` / `~/.config/mcp/mcp.json` files).

## Automated evidence already in place

- `npm test` — full suite, including the MCP protocol contract
  (`src/mcp/protocol.test.ts`) and the primary black-box loop
  (`tests/browser-loop.test.ts`).
- A surface-refinement Verification Run drove the whole loop through the real
  surface and recorded its evidence under `.visual-intent-verify/` (gitignored).
- Browser fallback is the complete V0 experience. pi declares no host
  capabilities, so `detectCapabilities` reports browser review with polling
  updates (`src/host/capabilities.ts`).

## Live checklist

1. In pi, ask: "Open visual review for `fixtures/gallery.html` so I can point
   at the button." Confirm the agent calls `open_visual_review` and shares a
   working review URL (browser fallback, no embedded UI expected).
2. In the browser: arm the point tile, click the Place order button, confirm
   Rendered Grounding evidence shows, write direction, and queue it. Send the
   queue; confirm the delivery state reads delivered without implying action.
3. In pi, confirm the agent can read the batch via `get_intent_status` and
   acknowledge via `acknowledge_intent`. Confirm acknowledgement never
   verifies: status must read agent-acknowledged, not verified.
4. In pi, confirm the agent calls `check_in` between its own steps and that the
   call returns what arrived without an `envelopeId`. Confirm the surface then
   states when the agent last checked in.
5. While the agent is between steps, amend the sent Annotation in the surface
   and ask the agent to stop. Confirm a later `check_in` returns the steering
   amendment and the interruption request, and that the surface never claims
   work was stopped.
6. Edit and save `fixtures/gallery.html` (copy it first; do not dirty the
   repo). Confirm the review surface notices the new revision, that reload
   adopts it, and that the target re-resolves with an explicit outcome.
7. Approve in the review surface. Confirm status becomes verified. Confirm a
   delivered Annotation cannot be edited in place.
8. Restart the service mid-loop (between send and verify on a second envelope)
   and confirm no queued or acknowledged intent is lost or duplicated, and that
   "last checked in" survives the restart.

## Sign-off

- Date, pi version, pi-mcp-adapter version:
- Deviations from the checklist:
- Result: pass / fail (with issue links):
