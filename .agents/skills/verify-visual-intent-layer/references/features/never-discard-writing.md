# Never discard writing

An unsent draft outlives the three ways a run can lose it: a Review Surface reload, a service restart, and a browser restart. Each survival is established by reading the state back, not by the absence of an error. Escape unwinds the card, the selection and the mode without discarding writing.

## Sub-features

- `survive-reload` keeps an unsent draft across a Review Surface reload.
- `survive-service-restart` keeps an unsent draft across a service restart.
- `survive-browser-restart` keeps an unsent draft across a browser restart.
- `survive-escape` unwinds the card, the selection and the mode without discarding writing.
- `survive-readback` proves each survival by reading the stored Annotation.

## How to get to it (user POV)

- Write a note in the card and leave it unqueued.
- Reload the page, restart the service, or restart the browser.
- Read the note again from the one list and the card.
- Press Escape to close the card and selection.

## Driving it with the Lever

Preconditions:

- A run is healthy and the Artifact is on screen, with nothing armed.
- The Annotation Queue contains no unsent draft before the recipe starts.

- **Create an unsent draft.** Run `… lever.mjs select --tool point --target ".gallery-note"` then `… lever.mjs annotate --note "Draft that must survive"`. Do not queue or send. `state` shows a `draft` with the note.
- **Surface reload.** Reload the page and read back. Run `… lever.mjs reload-surface` then `… lever.mjs state`. The draft is still present with the same note.
- **Service restart.** Restart the product and read back. Run `… lever.mjs restart-service` then `… lever.mjs state`. The same draft and note are present; the run keeps its isolation and its data directory.
- **Browser restart.** Restart the browser and read back. Run `… lever.mjs restart-browser` then `… lever.mjs state`. The same draft and note are present; the run's evidence is preserved.
- **Escape unwinding.** Press Escape with the card open. The card closes, then the selection clears, then the surface returns to operating the artifact, in that order; the draft is not deleted. Run `… lever.mjs state` after Escape and confirm the draft and note remain.
- **Proof.** Run `… lever.mjs state` after each survival and `… lever.mjs screenshot --name draft-restored`. The state proves the writing survived; the screenshot shows the restored draft.

## Gotchas

- `reload` reloads the Artifact under review; `reload-surface` reloads the page. Only the page reload tests the surface reload.
- Restarting the service mints a new review URL on a new ephemeral port. Use the Lever commands; do not reuse an old URL.
- A draft is durable because it is stored server-side on a debounce. Wait for the note to appear in `state` before restarting, or the last keystrokes may be in flight.
- Escape never discards writing, but it does clear the active card. Re-select the target to continue editing.
- Restarting the browser keeps the run's isolation; it does not start a second browser. Check `health` afterwards.
- Do not clean up between the survival steps; the draft is the point.