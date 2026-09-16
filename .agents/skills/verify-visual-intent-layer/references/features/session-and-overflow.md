# Session and overflow actions

The More actions menu reloads the Artifact, copies the Artifact path, copies evidence for the queue, opens the disclosure, and ends the session. Ending the session closes the surface while leaving unsent Annotations stored.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `overflow-reload` reloads the Artifact under review.
- `overflow-copy-path` copies the Artifact's source path.
- `overflow-copy-evidence` copies the evidence for the queued Annotations.
- `overflow-disclosure` opens the decision drawer.
- `overflow-end-session` ends the session and closes the surface.
- `session-end-keeps-writing` keeps unsent Annotations stored after the session ends.

## How to get to it (user POV)

- Open `More actions` in the topbar and choose an item.
- Clipboard items show a `Copied.` status when they succeed.

## Driving it with the Lever

Preconditions:

- A run is healthy on a saved-HTML Artifact.
- The clipboard is available to the browser context for the copy recipes.

- **Reload the Artifact.** Run `… lever.mjs overflow --item "Reload artifact"`. Exit `0`; the banner clears and `state.currentRevision` matches the file on disk.
- **Copy the Artifact path.** Choose `Copy artifact path`. Run `… lever.mjs overflow --item "Copy artifact path"` and `… lever.mjs screenshot --name copied-path`. The surface reports `Copied.`; the value is the Artifact's `file://` source.
- **Copy the evidence.** Queue an Annotation, then choose `Copy evidence for the queue`. Run `… lever.mjs overflow --item "Copy evidence for the queue"` and `… lever.mjs screenshot --name copied-evidence`. The surface reports `Copied.` and the copied text names each target's evidence.
- **Open the disclosure.** Run `… lever.mjs overflow --item "Open the disclosure"`. The drawer opens with the same content as `attention`.
- **End the session.** Run `… lever.mjs overflow --item "End session"`. The page closes; `… lever.mjs state` still reports the unsent Annotations.
- **Proof.** Run `… lever.mjs state` before and after ending the session. The unsent writing persists; the screenshot shows the menu item and the status.

## Gotchas

- `End session` closes the page. Run it last; the browser session cannot drive anything afterwards.
- Clipboard reads need permission. Assert the `Copied.` status and the stored state, not a clipboard read, unless the context grants clipboard access.
- `Copy evidence` is only meaningful with a non-empty queue; it copies nothing for an empty queue.
- Reloading the Artifact through the menu on an unchanged file is a no-op for the revision; change the file first to observe a revision change.
- The overflow menu lists actions; the drawer opened by `attention` is the same disclosure, reached two ways.