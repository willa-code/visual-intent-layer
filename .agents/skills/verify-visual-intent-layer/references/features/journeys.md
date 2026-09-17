# Cross-surface journeys

These behaviours span several areas, so they live in one file. They are the last thing a full sweep drives.

## Sub-features

- `journey-concurrent` runs two sessions at once without either corrupting the other's Annotations or scroll position.
- `journey-loop` walks opening, composing, sending, an agent implementing, verifying, and approving.
- `journey-amend-and-stop` amends an already-sent Annotation and asks the agent to stop, in one session.

## How to get to it (user POV)

- Open two Artifacts at once, in two terminals or two runs.
- Complete a Visual Direction Loop from opening to approval.
- Amend an Annotation already sent, then ask the agent to stop.

## Driving it with the Lever

Preconditions:

- Two saved-HTML Artifacts exist, or one Artifact opened in two runs.
- Each run has its own lifecycle data directory and its own ephemeral port.

- **Two sessions, no crosstalk.** Launch two runs: `… lever.mjs launch --html fixtures/gallery.html --name session-a` and `… lever.mjs launch --html fixtures/gallery.html --name session-b`. Each reports a different `baseUrl`, `sessionId` and `dataDir`.
- **Annotate each.** In run A, `… lever.mjs select --run session-a --tool point --target ".gallery-note"`, `… lever.mjs annotate --run session-a --note "Only in A"`. In run B, `… lever.mjs select --run session-b --tool point --target ".checkout-submit"`, `… lever.mjs annotate --run session-b --note "Only in B"`. `… lever.mjs state --run session-a` shows only `Only in A`; `… lever.mjs state --run session-b` shows only `Only in B`. Clean up both runs.
- **Scroll position is per session.** Scroll run A's artifact, reload run B's artifact, and return to run A. Run A's scroll offset is unchanged; run B never moved A.
- **The full loop.** Open: `… lever.mjs launch --html <path> --name loop`. Compose: `… lever.mjs select --tool point --target ".checkout-submit"`, `… lever.mjs annotate --note "Make it impossible to miss."`, `… lever.mjs queue`. Send: `… lever.mjs send --intent next-pass`. The agent implements: change the Artifact file (the agent's act, outside the Lever) and `… lever.mjs reload`. Verify: `… lever.mjs verify`, `… lever.mjs state` shows a resolution and the revision relation, `… lever.mjs compare --mode before` and `--mode after`. Approve: `… lever.mjs decide --verdict approve`; `state` shows the Annotation verified. Clean up.
- **Amend and stop.** Send a batch, then run `… lever.mjs amend --note "Clearer wording." --match "<part of the note>"`. Exit `0`; `state` shows the original `replaced` with a `replacedBy`, the Replacement carrying `replaces`, and a Pass with intent `steering`. Then run `… lever.mjs stop`; `state` shows a pending interruption and the surface says it is uncollected. A `check_in` returns both.
- **Proof.** Run `… lever.mjs state` at each step, `… lever.mjs record --name loop`, and `… lever.mjs snapshot --name loop`. The state carries identities, resolutions and verdicts; the recording shows the action and the resulting state.

## Gotchas

- Two sessions need two lifecycle data directories. Never point both runs at one directory; the second launch is refused.
- A session's scroll position is page-local, not stored by the product. Prove it by not disturbing the other session, not by reading a stored value.
- The agent's implementation happens outside the Lever. Change the file yourself, then `reload` under review.
- The one send action always delivers Next-Pass Intent. Steering Intent and Review Interruption are different acts: `amend` and `stop`.
- Amending Replaces the original; it never rewrites it. A second amendment Replaces the Replacement, so the chain collapses into the effective row.
- Clean up both runs at the end of the concurrency journey; a stranded run holds its data directory.