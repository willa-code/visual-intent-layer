# Agent position

The Review Surface states where the agent is as one sentence: holding the call, working, acknowledged, or stepped away. Acknowledgement is visible but never reads as verification.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `position-awaiting` states that the agent is holding the call and waiting right now.
- `position-working` states that the agent is working and not waiting.
- `position-acknowledged` states that the agent has acknowledged the direction.
- `position-stepped-away` states that the agent has stepped away, with what remains queued.
- `position-not-verification` keeps acknowledgement distinct from Verified Intent.

## How to get to it (user POV)

- Read the agent position sentence in the topbar and in the Send footer.
- Send a queue; the agent then collects and acknowledges it through its host.

## Driving it with the Lever

Preconditions:

- A run is healthy on a saved-HTML Artifact.
- For the acknowledged position, an MCP agent loop against the run's lifecycle data directory.

- **Stepped away.** Read the position before any delivery. Run `… lever.mjs state`. `agent.position` is `stepped-away` and the sentence names what remains queued.
- **Awaiting you.** Hold the agent call while the run is live (the MCP entry tool with a long wait window). Run `… lever.mjs state` and read `agent.position` as `awaiting-you`; the sentence says sending is urgent, and the surface marks it as holding.
- **Working.** After a send, with a recent agent contact, `state` reports `working` and the sentence says it is not waiting on the call.
- **Acknowledged.** Acknowledge the batch over MCP, then read the position. Run `… lever.mjs mcp --run <name> --tool acknowledge_intent --args '{"envelopeId":"<id>","agentId":"lever"}'` then `… lever.mjs state`. `agent.position` is `acknowledged` and the sentence says acknowledgement is not implementation and not verification.
- **Proof.** Run `… lever.mjs state` at each step and `… lever.mjs screenshot --name agent-position`. The state carries the position and sentence; the screenshot shows the sentence on screen.

## Gotchas

- The position is a statement about the agent, not a verdict on an Annotation. Never read `acknowledged` as approved.
- `recentlyConnected` decides `working` versus `stepped-away`; the transition is time-based, so wait for the observable sentence in `state`.
- The `awaiting-you` position needs a live agent call being held; a completed call falls back to another position.
- The position sentence appears in the topbar and the Send footer at the same time; they are one fact, not two.
- Acknowledgement updates the position but leaves the Annotation awaiting a Builder-Reviewer verdict.
## Driving the stop request and the Check-In channel

- **Ask the agent to stop.** With the agent working or having acknowledged an Annotation, run `… lever.mjs stop`. Exit `0`; `… lever.mjs state` shows `agent.pendingInterruption` true and `pendingInterruptionSince` set. The surface says the request has not been collected, not that work stopped.
- **State the channel.** `… lever.mjs state` reports `agent.channel` as `held-call` while a call is held and `next-check-in` otherwise, with `lastCheckedInAt` when the agent has checked in, and no timestamp at all when it never has.
- **Collect it.** Run `… lever.mjs mcp --run <name> --tool check_in --args '{"sessionId":"<id>"}'`. The interruption is returned and cleared, and the contact time is recorded.
