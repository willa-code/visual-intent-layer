# Attachments

A Builder-Reviewer attaches a reference image to an Annotation by picking a file, pasting an image, or dropping one on the card, and removes it again. A disallowed or oversized file is visibly refused without reading its bytes.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `attach-pick` attaches a reference image by picking a file.
- `attach-paste` attaches an image pasted into the card.
- `attach-drop` attaches an image dropped on the card.
- `attach-remove` removes an attached reference image.
- `attach-refuse-type` refuses a file that is not an allowed image type.
- `attach-refuse-size` refuses a file larger than the 5MB limit without reading its bytes.
- `attach-stored` stores the attachment with its media type, byte length and digest.

## How to get to it (user POV)

- Open an Annotation card and choose the attach control, then pick a file.
- Paste an image while the card has focus.
- Drop an image file onto the card.
- Remove an attachment with its chip control.

## Driving it with the Lever

Preconditions:

- A run is healthy with an element selected so an Annotation card is open.
- A small PNG exists at a known path, and a non-image file and a file over 5MB exist for the refusal recipes.

- **Attach by picker.** Choose the attach control and pick the image. Run `… lever.mjs attach --file /tmp/reference.png`. Exit `0`; `state` shows one attachment with `mediaType` `image/png` and its `byteLength`.
- **Remove it.** Remove the attachment chip. Run `… lever.mjs select --tool element --target ".gallery-note"` to reopen the card, then remove via the surface; `state` shows no attachments.
- **Refuse a non-image.** Pick a text file. Run `… lever.mjs attach --file /tmp/notes.txt` then `… lever.mjs state`. `state` shows no new attachment and `… lever.mjs screenshot --name attach-refused` shows the refusal message.
- **Refuse an oversized file.** Pick a file over 5MB. Run `… lever.mjs attach --file /tmp/huge.png` then `… lever.mjs state`. No attachment is stored and the surface states the size limit was not read.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name attach`. The state names the stored attachment; the screenshot shows its chip.

## Gotchas

- The attach control lives on the Annotation card. There is no attachment path without an open Annotation.
- The 5MB refusal is checked before the bytes are read; assert the stored state, not only the toast.
- Paste and drop exercise the same upload path as the picker but need a clipboard or drag payload; `attach --file` drives the picker path only.
- An attachment belongs to one Annotation. Removing it does not delete the stored blob from disk.
- Only image media types are allowed; a mislabelled extension still refuses on the declared type.