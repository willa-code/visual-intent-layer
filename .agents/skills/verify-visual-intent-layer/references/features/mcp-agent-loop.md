# The MCP agent loop

The product reaches an agent through its MCP tools over a real standard-input transport against the built server. The agent opens a review, reads intent status for a delivered batch, checks in between its own steps, and acknowledges. Acknowledgement is not implementation and not verification.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `mcp-open` opens a review through the entry tool.
- `mcp-status` reads a delivered batch with each Annotation's identity, resolution and revision relation.
- `mcp-check-in` reads new direction between steps, without an `envelopeId`, and records contact.
- `mcp-acknowledge` acknowledges a batch or one Annotation as the implementing agent.
- `mcp-boundary` keeps acknowledgement distinct from implementation and from verification.
- `mcp-human-required` names the confirmations that need a human at a keyboard.

## How to get to it (user POV)

- The agent host starts the MCP server and calls `open_visual_review`.
- The agent calls `get_intent_status` for a delivered batch, and `check_in` between its own steps.
- The agent calls `acknowledge_intent` to record receipt.

## Driving it with the Lever

Preconditions:

- The built MCP server exists at `dist/mcp/stdio.js`.
- `… lever.mjs mcp --run <name>` uses the run's lifecycle data directory, so a batch the browser drive delivered is visible to the MCP loop.
- A human send at the keyboard is needed to deliver a batch; this recipe reuses a batch produced by the browser drive instead of claiming a human send.

- **List the tools.** Run `… lever.mjs mcp --run <name> --tool open_visual_review --args '{"kind":"saved-html","path":"fixtures/gallery.html","waitMs":1}'`. Exit `0`; `tools` names `open_visual_review`, `check_in`, `get_intent_status` and `acknowledge_intent`, and the call returns a review URL and session identity.
- **Open a review.** The same call is the entry tool. With `waitMs: 1` it returns after the wait window and any Annotations remain queued durably; the result names the session.
- **Deliver a batch.** In the browser drive, run `select`, `annotate`, `queue`, `send`. Run `… lever.mjs state` and read `batches[].envelopeId`.
- **Read intent status.** Run `… lever.mjs mcp --run <name> --tool get_intent_status --args '{"envelopeId":"<id>"}'`. Exit `0`; the result carries each Annotation with `state`, `resolutions`, `revisionRelation` and the agent position.
- **Check in.** Run `… lever.mjs mcp --run <name> --tool check_in --args '{"sessionId":"<id>"}'`. Exit `0`; the result carries deliveries, amendments, any interruption, and the current state, and `… lever.mjs state` records `lastCheckedInAt`.
- **Acknowledge the batch.** Run `… lever.mjs mcp --run <name> --tool acknowledge_intent --args '{"envelopeId":"<id>","agentId":"lever"}'`. Exit `0`; `… lever.mjs state` shows the batch's Annotations acknowledged and the agent position `acknowledged`.
- **Prove the boundary.** Read the acknowledgement back. Acknowledgement appears on the Annotation and in the agent position, but the Annotation is not verified and no implementation happened. Acknowledgement is not implementation and not verification.
- **Proof.** Run `… lever.mjs state` and read `evidence`/`state.json`. The state carries the acknowledged batch and the position sentence; the server transport is recorded with the run.

## Gotchas

- The Lever drives the real standard-input transport against `dist/mcp/stdio.js`, not an in-memory pair. Build first; a stale server is the wrong server.
- `open_visual_review` holds the call for the wait window. Pass a small `waitMs` when an agent is not present, and read queued Annotations from the browser drive.
- A delivered batch is needed before `get_intent_status` and `acknowledge_intent`. The browser drive produces one; a human send at the keyboard is the real-world source.
- Listing the server inside a live pi session, and any Harness not installed on this machine, need a human at a keyboard and are not claimed here.
- The MCP server reads and writes the same lifecycle data directory as the run while the product is live. Do not drive the browser at the same moment as an acknowledging write.