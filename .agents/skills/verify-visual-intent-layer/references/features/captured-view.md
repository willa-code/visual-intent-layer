# A Captured View

A Builder-Reviewer can attach a Captured View to an Annotation: a browser-composited image of the artifact as they actually saw it, taken by an explicit permissioned capture in the tab that shows the artifact and cropped to the artifact rather than to the screen or the product's own chrome. It is never taken implicitly, never assembled from DOM and style data, and never replaced by a re-render. The stored image is content-addressed like a reference attachment and is subject to the same size refusal. The drawer discloses it will leave the machine before the queue is sent.

_Not yet driven. The capture itself is undriven because no script can grant the browser permission; everything around it is proved._

## Sub-features

- `capture-control` offers an explicit capture control on the Annotation card.
- `capture-permission` requests the browser's display-capture permission in the reviewing tab, one prompt per capture.
- `capture-crop` crops the capture to the artifact frame, not the screen and not the shell chrome.
- `capture-refuse` states the reason rather than silently doing nothing where a capture is unavailable or refused.
- `capture-stored` stores the image content-addressed with its own media type and the same size refusal as an attachment.
- `capture-disclosure` says in the drawer that a Captured View will leave the machine before the queue is sent.
- `capture-no-render` never produces, and never labels, a re-render as a Captured View.

## How to get to it (user POV)

- Open an Annotation card and choose the capture control.
- Grant or refuse the browser's permission prompt for the tab.
- Read the drawer's disclosure before sending the queue.

## Driving it with the Lever

Preconditions:

- A run is healthy with an element selected so an Annotation card is open.
- The reviewing browser is Chromium desktop; the permission cannot be persisted.

- **See the control.** Run `… lever.mjs snapshot --name capture`. The Annotation card's control group names a capture control alongside the attach control; it exists before any permission is granted.
- **The permission is requested, and nothing is captured without it.** Activate the control with `… lever.mjs click --name "Capture a view"` (or the exact accessible name the snapshot reports). The browser shows a permission request; **no script can grant it**, so this is the expected end of the drive. Record `capture-permission` as undriven and never report the capture as verified.
- **Where the API is absent, the control states why.** On a browser without a display-capture API the control is offered and, when activated, states the reason (`capture-refuse`) instead of doing nothing.
- **Disclosure.** With a stored Captured View on a queued Annotation, open `… lever.mjs state` and the decision drawer. The drawer says a Captured View will leave the machine on send; the stored bytes are content-addressed.
- **No re-render.** `… lever.mjs state` shows the attachment carrying an `image/*` media type and a `sha256`; there is no field or control anywhere that names a DOM-derived re-render a Captured View.
- **Support statement.** The control's title states Chromium desktop only and that the permission cannot be persisted.

## Gotchas

- No script can grant the display-capture permission, so the capture itself is reported **undriven** even when the control, the request and the stored evidence are proved. Stating otherwise is the failure mode this feature exists to prevent.
- The permission is per capture and cannot be persisted, even after it is granted once.
- The capture is cropped to the artifact frame. A capture of the whole tab, or of the shell's rail, is a defect.
- The artifact must stay rendered in the capturing tab; nothing moves it into a separate window.
- A client-side rasterizer is a re-render and must never be named a Captured View, not even as a fallback.
