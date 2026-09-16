# Cross-surface journeys

These behaviours span several areas, so they live in one file. They are the last thing a full sweep drives.

## Sub-features

- `journey-concurrent` runs two sessions at once without either corrupting the other's Annotations or scroll position.
- `journey-loop` walks opening, composing, sending, an agent implementing, verifying, and approving.
- `journey-timings` compares two delivery timings for the same direction.

## How to get to it (user POV)

- Open two Artifacts at once, in two terminals or two runs.
- Complete a Visual Direction Loop from opening to approval.
- Send the same direction twice with different delivery timings.

## Driving it with the Lever

Preconditions:

- Two saved-HTML Artifacts exist, or one Artifact opened in two runs.
- Each run has its own lifecycle data directory and its own ephemeral port.

- **Two sessions, no crosstalk.** Launch two runs: `… lever.mjs launch --html fixtures/gallery.html --name session-a` and `… lever.mjs launch --html fixtures/gallery.html --name session-b`. Each reports a different `baseUrl`, `sessionId` and `dataDir`.
- **Annotate each.** In run A, `… lever.mjs select --run session-a --tool element --target ".gallery-note"`, `… lever.mjs annotate --run session-a --note "Only in A"`. In run B, `… lever.mjs select --run session-b --tool element --target ".checkout-submit"`, `… lever.mjs annotate --run session-b --note "Only in B"`. `… lever.mjs state --run session-a` shows only `Only in A`; `… lever.mjs state --run session-b` shows only `Only in B`. Clean up both runs.
- **Scroll position is per session.** Scroll run A's artifact, reload run B's artifact, and return to run A. Run A's scroll offset is unchanged; run B never moved A.
- **The full loop.** Open: `… lever.mjs launch --html <path> --name loop`. Compose: `… lever.mjs select --tool element --target ".checkout-submit"`, `… lever.mjs annotate --note "Make it impossible to miss."`, `… lever.mjs queue`. Send: `… lever.mjs send --intent next-pass`. The agent implements: change the Artifact file (the agent's act, outside the Lever) and `… lever.mjs reload`. Verify: `… lever.mjs verify`, `… lever.mjs state` shows a resolution and the revision relation, `… lever.mjs compare --mode before` and `--mode after`. Approve: `… lever.mjs decide --verdict approve`; `state` shows the Annotation verified. Clean up.
- **Two delivery timings.** Run A: queue once and `… lever.mjs send --run session-a --intent draft`; read the batch delivery from `… lever.mjs state --run session-a`. Run B: queue the same direction and `… lever.mjs send --run session-b --intent next-pass`; read its delivery. The two batches report different delivery plans for the same written direction.
- **Proof.** Run `… lever.mjs state` at each step, `… lever.mjs record --name loop`, and `… lever.mjs snapshot --name loop`. The state carries identities, resolutions and verdicts; the recording shows the action and the resulting state.

## Gotchas

- Two sessions need two lifecycle data directories. Never point both runs at one directory; the second launch is refused.
- A session's scroll position is page-local, not stored by the product. Prove it by not disturbing the other session, not by reading a stored value.
- The agent's implementation happens outside the Lever. Change the file yourself, then `reload` under review.
- Delivery timings describe how a batch is offered to the host; compare the reported delivery plan, not a UI label alone.
- Run the timings in two runs. Sending consumes the queue, so one run cannot send the same Annotation twice without re-composing it.
- Clean up both runs at the end of the concurrency journey; a stranded run holds its data directory.