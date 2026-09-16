# Compose, queue and send an Annotation

A Builder-Reviewer points at one or more visible targets, writes a note onto the selection, queues the Annotation, optionally reorders the queue, and sends it as Next-Pass Intent. The product stores each Annotation as a durable object with its own identity, and sending never removes it from the one list.

## Sub-features

- `select-point` clicks a thing the artifact owns with the point tile.
- `select-text` drags across exact words and takes the artifact's own selection.
- `select-box` draws a dashed Area and reports what it encloses.
- `select-multiple` adds further targets to the same Annotation.
- `mode-operate` returns to operating the artifact, the unarmed state.
- `annotate-note` writes the note that belongs to the selection.
- `queue-add` puts the Annotation in the Annotation Queue.
- `queue-reorder` moves a queued Annotation up or down.
- `send-next-pass` delivers the queue as Next-Pass Intent from the one send action.
- `send-draft-refused` refuses a draft intent rather than pretending to deliver it.
- `read-back` reads the stored Annotation with its delivery state.

## How to get to it (user POV)

- Arm `Point at things` or `Box an area` in the mode island, then operate the artifact.
- Write in the card anchored to the target and choose `Queue`.
- Choose `Send the queue`; there is no intent selector.
- Reorder queued Annotations with the up and down controls on their rows.

## Driving it with the Lever

Preconditions:

- A run is healthy: `… lever.mjs health` reports `ok`.
- The Artifact is on screen and the surface is operating the artifact.
- The Annotation Queue is empty unless the recipe says otherwise.

- **Point at an element.** Arm the point tile and click the target. Run `… lever.mjs select --tool point --target ".checkout-submit"`. Exit `0`, a screenshot under `evidence/`, and `… lever.mjs state` showing one draft Annotation with one target labelled `Place order`.
- **Point at an exact text range.** Arm the point tile and drag across the words. Run `… lever.mjs select --tool point --text ".gallery-note"`. Exit `0` and `state` showing a draft Annotation whose target `kind` is `text-range`.
- **Box an area.** Arm the box tile and drag a rectangle. Run `… lever.mjs select --tool box --from "h1" --to ".shipping-note"`. Exit `0` and `state` showing a draft Annotation whose target `kind` is `region` and whose `label` names the elements it encloses.
- **Return to operating.** Run `… lever.mjs mode --to operate` or press `v`. The tile reports no armed state.
- **Write the note.** Type into the anchored card. Run `… lever.mjs annotate --note "Make the Place order button impossible to miss."`. Exit `0`; after the debounce, `state` shows the same note on the draft.
- **Queue the Annotation.** Choose `Queue`. Run `… lever.mjs queue`. Exit `0` and `state` showing state `queued`.
- **Add a second Annotation.** Select another target and queue it. Run `… lever.mjs select --tool point --target ".gallery-note"`, `… lever.mjs annotate --note "…"`, `… lever.mjs queue`. `state` shows two Annotations in queue order.
- **Reorder the queue.** Move one up or down. Run `… lever.mjs reorder --from 1 --direction up`; the queue order in `state` changes and `order` reflects it.
- **Send.** Choose `Send the queue`. Run `… lever.mjs send --intent next-pass`. Exit `0` and `state` showing each Annotation `delivered` (or `resolved` after a re-resolution), and the row still present.
- **A draft is refused.** Run `… lever.mjs send --intent draft`. Exit `2`: a draft intent creates no batch and moves nothing out of draft or queued.
- **Dry run the send.** Run `… lever.mjs send --dry-run` before sending. Exit `0`; `state` shows the same states as before, proving nothing was delivered.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name queued`. The state names each Annotation, its delivery state and its target; the screenshot shows the one list.

## Gotchas

- The anchored card is positioned beside the first target and can cover a neighbouring target. Select the first target where the card will not sit over the second (for example, select a lower target and add an upper one), or close the card with Escape before the second selection.
- Arming an armed tile returns to operating. A select recipe must not assume the tile is unarmed; the Lever checks the armed state before clicking.
- The note is saved on a debounce. Wait for the observable note in `state`; do not assume the keystroke landed immediately.
- `Queue` needs at least one target. Selecting then immediately queueing without a note still creates a durable Annotation with `No note yet`.
- `Send the queue` is disabled while the queue is empty. Send in that state is a precondition failure, not a silent no-op.
- A `draft` intent is not a delivery the surface can produce: the tool description and the driver reject it rather than creating a batch.
- Sending does not clear the Annotation from the list; it changes the state pill and closes the active card. The selected targets stay marked until a new selection or `Escape`.
