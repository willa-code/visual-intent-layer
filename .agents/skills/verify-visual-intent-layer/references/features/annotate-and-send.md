# Compose, queue and send an Annotation

A Builder-Reviewer selects one or more visible targets, writes a note onto the selection, queues the Annotation, optionally reorders the queue, and sends it with a delivery timing. The product stores each Annotation as a durable object with its own identity.

## Sub-features

- `select-element` selects a visible element with the Element tool.
- `select-text` selects an exact text range with the Text tool.
- `select-region` draws a region with the Region tool.
- `select-multiple` adds further targets to the same Annotation.
- `annotate-note` writes the note that belongs to the selection.
- `queue-add` puts the Annotation in the Annotation Queue.
- `queue-reorder` moves a queued Annotation up or down.
- `send-next-pass` delivers the queue for a clean agent turn.
- `send-steering` offers the queue at the next safe boundary.
- `send-draft` keeps the queue on this machine.
- `read-back` reads the stored Annotation with its delivery state.

## How to get to it (user POV)

- Choose the `Element`, `Text` or `Region` tool, then operate the artifact.
- Write in the card anchored to the target and choose `Queue`.
- Choose the delivery timing in the `Send` footer and choose `Send the queue`.
- Reorder queued Annotations with the up and down controls.

## Driving it with the Lever

Preconditions:

- A run is healthy: `… lever.mjs health` reports `ok`.
- The Artifact is on screen in Review.
- The Annotation Queue is empty unless the recipe says otherwise.

- **Select an element.** Choose the Element tool and click the target. Run `… lever.mjs select --tool element --target ".checkout-submit"`. Exit `0`, a screenshot under `evidence/`, and `… lever.mjs state` showing one draft Annotation with one target labelled `Place order`.
- **Write the note.** Type into the anchored card. Run `… lever.mjs annotate --note "Make the Place order button impossible to miss."`. Exit `0`; after the debounce, `state` shows the same note on the draft.
- **Queue the Annotation.** Choose `Queue`. Run `… lever.mjs queue`. Exit `0` and `state` showing state `queued`.
- **Add a second Annotation.** Select another target and queue it. Run `… lever.mjs select --tool element --target ".gallery-note"`, `… lever.mjs annotate --note "…"`, `… lever.mjs queue`. `state` shows two Annotations in queue order.
- **Reorder the queue.** Move one up or down. The queue order in `state` changes; `order` reflects it.
- **Send with a timing.** Choose the timing and send. Run `… lever.mjs send --intent next-pass`. Exit `0` and `state` showing each Annotation `delivered` (or `resolved` after a re-resolution).
- **Send as a draft.** With an unsent Annotation queued, run `… lever.mjs send --intent draft`. The batch is recorded as a draft; the delivery label differs from `next-pass`.
- **Dry run the send.** Run `… lever.mjs send --dry-run` before sending. Exit `0`; `state` shows the same states as before, proving nothing was delivered.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name queued`. The state names each Annotation, its delivery state and its target; the screenshot shows the queue.

## Gotchas

- The anchored card is positioned beside the first target and can cover a neighbouring target. Select the first target where the card will not sit over the second (for example, select a lower target and add an upper one), or close the card with Escape before the second selection.
- The note is saved on a debounce. Wait for the observable note in `state`; do not assume the keystroke landed immediately.
- `Queue` needs at least one target. Selecting then immediately queueing without a note still creates a durable Annotation with `No note yet`.
- `Send the queue` is disabled while the queue is empty. Send in that state is a precondition failure, not a silent no-op.
- A `draft` delivery never reaches an agent. It is a deliberately local batch.
- Sending clears the active Annotation and the selection; re-select before driving another Annotation.