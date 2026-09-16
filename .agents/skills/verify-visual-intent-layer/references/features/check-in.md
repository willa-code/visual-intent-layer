# Check-In: an agent reads new direction between its own steps

An agent that is not holding a call can read what the Builder-Reviewer sent by checking in between its own steps. The Check-In is a published convention, not a host capability: there is no push channel and no wake mechanism. Contact is durable, so the surface can state when the agent last checked, and a request that has not been collected says so rather than implying it is being worked on.

_Partly driven live: the call, durable contact, an amendment and an interruption were confirmed in the surface-refinement Verification Run. The never-checked-in state remains mapped, not yet driven._

## Sub-features

- `check-in-call` returns new direction since a cursor without an `envelopeId`.
- `check-in-deliveries` returns newly delivered Annotations with their intent.
- `check-in-amendment` returns a Replacement that replaced something.
- `check-in-interruption` returns a pending stop request.
- `check-in-contact` records contact durably, so the surface states when the agent last checked.
- `check-in-never` says the agent has never checked in rather than showing a zero.

## How to get to it (user POV)

- The agent calls `check_in` between its own steps; nothing about it appears on the Review Surface except "last checked in".
- The Builder-Reviewer reads the agent's position, the delivery channel, and when the agent last checked in the rail.

## Driving it with the Lever

Preconditions:

- A run is healthy with at least one delivered Annotation.

- **Check in.** Run `… lever.mjs mcp --run <name> --tool check_in`. The result names the deliveries, any amendment, any pending interruption, and the current state of Annotations the agent was given before. It needs no `envelopeId`.
- **Contact is now a fact.** Run `… lever.mjs state`. The `agent.lastCheckedInAt` matches the check-in, and the rail states it in words.
- **Amend while the agent is away.** Send an Annotation, run `… lever.mjs amend --note "…" --match "…"`, then `… lever.mjs mcp --run <name> --tool check_in`. The result carries the amendment and a batch whose intent is `steering`.
- **Ask for a stop.** Run `… lever.mjs stop`, then `… lever.mjs mcp --run <name> --tool check_in`. The result carries the interruption and a sentence saying it is a request, not a fact.
- **Never checked in.** On a fresh run, `… lever.mjs state` shows no `lastCheckedInAt` and the rail says the agent has never checked in, so a request will wait.

## Gotchas

- The call is discoverable without prior state: it takes no `envelopeId` and, when `sessionId` is omitted, checks the most recently opened session.
- Contact is recorded by every MCP call for a session, not only `open_visual_review`; a `get_intent_status` or `acknowledge_intent` also updates "last checked in".
- The interruption is not a Visual Intent Envelope and never appears in a batch. The envelope's `review-interruption` value is reserved and never emitted.
- A request that nothing collects stays pending; the surface states it as not collected, not as in progress.
