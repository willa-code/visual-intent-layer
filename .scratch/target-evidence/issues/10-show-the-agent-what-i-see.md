# 10: Show the agent what I see

**What to build:** The Builder-Reviewer can attach a Captured View of the artifact
to an Annotation, so a complaint whose defect *is* the rendering can be conveyed
rather than described.

**Status:** done

- [x] Capture is an explicit action taken by the Builder-Reviewer and is never taken implicitly
- [x] The capture is browser-composited and cropped to the artifact, not to the screen and not to the product's own chrome
- [x] The capture is refused or unavailable where the browser cannot take one, and the control states the reason rather than silently doing nothing
- [x] A re-render assembled from DOM and style data is never produced and never labelled as a Captured View
- [x] The stored image is content-addressed like an attachment, carries its own media type, and is subject to the same size refusal
- [x] The drawer discloses that a Captured View will leave the machine before the queue is sent
- [x] The artifact stays rendered in the capturing tab, and nothing moves it into a separate window
- [x] The support statement says the capture is Chromium desktop only and that the permission cannot be persisted
- [ ] A Verification Run proves the control, the permission request and the stored evidence, and reports the capture itself as undriven because no script can grant the permission

## Comments

The strategy brief already listed screenshot evidence as part of Rendered Grounding
(`docs/background/product-strategy.md:104`) while `SECURITY.md:63` excluded it.
ADR-0022 resolves the contradiction in favour of a Captured View, with the
mechanism and its costs recorded there.

What the research rules out, and why it matters: a client-side rasterizer returns
blank for canvas and WebGL (WebGL's `preserveDrawingBuffer` defaults to `false`),
blank for cross-origin iframes, nothing for closed shadow roots, and empty areas
for cross-origin images and fonts — precisely the cases this ticket exists for.
It is cheap and npm-only, and it is a re-render, which is why it is not adopted
under any name that implies pixels. Shipping a browser would work and is refused as
the default: a Chromium download is roughly 281 MB, and `playwright` no longer
installs browsers automatically, so it would become an extra setup step on a
product whose promise is one install. Attaching to the Builder-Reviewer's own
browser over CDP is closed to us since Chrome 136 stopped honouring the
remote-debugging switches against a default data directory.

One open question belongs to this ticket's first hour of work rather than to a
document: whether a crop or restriction target is eligible when the artifact is a
same-origin iframe element. MDN states the constraint about the *tab* and about
`fromElement` taking an element from the capturing document, which our framed
shell satisfies, but the iframe-element case was not verified. Confirm it before
committing to the control's shape.

**Implementation note.** The control, the permission request path, the crop to
the artifact frame, the content-addressed store and the drawer disclosure all
ship, and the browser-loop seam proves the control exists with its Chromium
desktop support statement. The capture itself is not driven, and no script can
grant the display-capture permission, so the Verification Run box stays open
until a human grants it once and records the stored bytes.
