# Reach within the artifact class

A Target can be pointed at wherever the artifact actually renders it: inside an
open shadow root, inside a shadow root nested in another, and inside a same-origin
frame of a proxied application. The composed walk keeps one fixed order and one
shared budget, a stored Target's anchors are boundary-qualified so a later revision
re-finds the same node, and a drawn Area encloses what it geometrically encloses
across a boundary. Where the product cannot look in — a closed shadow root, a
cross-origin frame interior, a frame the content policy never loaded — it states
the boundary with its true cause rather than reporting the Target as gone.

_Partly driven live: the run pointed into an open shadow root, into a shadow root
inside a shadow root, drew an Area that encloses shadow content, and re-found the
Area after a reload on exact-and-weaker evidence. The frame interior and the two
refusals are driven in the browser-loop against a proxied application embedding a
same-origin frame; the Lever drive for them is named below with its precondition.
The unrendered-row and walk-bound drives are also proven in the browser-loop and
named with their preconditions._

## Sub-features

- `reach-shadow` points inside an open shadow root and stores a boundary-qualified selector.
- `reach-nested-shadow` resolves a host inside a host.
- `reach-frame` points inside a same-origin frame of a proxied application, and the mark draws at its true position in the reviewed viewport.
- `reach-area` draws an Area that encloses content inside a shadow root or a frame.
- `reach-refusal-closed` reports a Target whose boundary has become a closed shadow root as the boundary, never as deleted.
- `reach-refusal-policy` reports a frame the artifact's content policy never loaded as policy-blocked, with that cause.
- `reach-refusal-cross-origin` reports a frame served from another origin as its own refusal.
- `reach-unrendered-row` reports a virtualized row that is not rendered as a state no longer on screen, and the operator's own scroll restores it.
- `reach-bound` records that the composed walk stopped early, says so, and never lowers a threshold or marks a skipped node.

## How to get to it (user POV)

- Arm `Point at things` and click an element rendered inside an open shadow root or a same-origin frame; the hover outline and the mark track it.
- Arm `Box an area` and drag a rectangle over shadow-rooted or framed content; the Area names what it encloses.
- Point at content, send the Annotation, then reload the artifact or the surface; the Target re-finds itself.
- Scroll a virtualized list with a Target written against a row that has left the rendered window; the row reports a state no longer on screen until the operator scrolls it back.

## Driving it with the Lever

Preconditions:

- A healthy run, one browser, and either `fixtures/reach.html` (saved HTML) for shadow content or a loopback application embedding a same-origin frame for the frame interior.
- A same-origin frame is reachable only in a proxied application: a saved-HTML artifact sets `frame-src 'none'`, so it cannot nest a loadable frame.

- **Point inside an open shadow root.** Run `… lever.mjs select --tool point --target ".shadow-action"`, then `… lever.mjs state`. The stored Target's `selectors[0]` contains the `|` shadow separator and names `div#open-host`.
- **Point inside a host inside a host.** Run `… lever.mjs select --tool point --target ".deep-action"`, then `… lever.mjs state`. The selector names both hosts, separated by `|`.
- **Box an area over shadow content.** Run `… lever.mjs select --tool box --from ".shadow-note" --to ".shadow-action"`, then `… lever.mjs state`. The Target is `region`, its label names the enclosed control, and its selectors are boundary-qualified.
- **Re-find it after a reload.** Run `… lever.mjs annotate --note "…"`, `… lever.mjs queue`, `… lever.mjs send`, `… lever.mjs reload-surface`, then `… lever.mjs state`. The Target's `resolutions[].match` is `exact` or `recovered`, never `unresolved`.
- **Point inside a same-origin frame.** Run `… lever.mjs select --tool point --target "iframe#widget >> .widget-action"`, then `… lever.mjs state`. The selector contains `>>` and the frame path; screen-read the mark with `… lever.mjs screenshot`. _Not driven: requires a loopback application embedding a same-origin frame; the browser-loop proves it against a proxied application._
- **State the two refusals.** Point at a stored Target whose host has since become a closed shadow root, or draw an Area over a frame the policy never loaded. The row reads **Inside a boundary this surface cannot read** and its hint names the cause; the Area keeps its rectangle and names the one hole. _Not driven with the Lever: the closed-root case needs a stored boundary-qualified Target whose host closes between revisions, and the policy case needs a saved-HTML artifact with a frame; both are proven in the browser-loop._
- **An unrendered row is not deleted.** Write a Target against a virtualized row, send it, scroll the row out of the rendered window, then run `… lever.mjs state`. The row's derived word is a state no longer on screen and approval stays blocked; scrolling back restores it. _Not driven: needs a virtualized-list fixture and a Lever scroll command; the browser-loop proves it._
- **The bound is stated, not silent.** Point past the walk budget on a large artifact, send, reload, then run `… lever.mjs state`. The resolution is `unresolved` and the row states that the surface read only part of the revision. _Not driven: needs a large-roster fixture; the browser-loop proves it._

## Gotchas

- A saved-HTML artifact blocks every frame by policy. A `>>` selector in saved HTML is a defect, not a target.
- Playwright pierces open shadow roots with a plain CSS selector; pass the element's own class, not a host path, in the drive.
- The anchored card intercepts a click when it overlaps the next target. Complete or dismiss the current draft before pointing again.
- A closed shadow root is indistinguishable from an ordinary leaf at pointing time; the refusal can only be stated when a stored boundary-qualified Target stops resolving.
- The composed walk spends one budget across the artifact document and one frame level. A later frame is not traversed.