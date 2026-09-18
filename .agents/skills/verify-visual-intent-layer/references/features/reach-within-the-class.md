# Reach within the artifact class

A Target can be pointed at wherever the artifact actually renders it: inside an
open shadow root, inside a shadow root nested in another, and inside a same-origin
frame of a proxied application. The composed walk keeps one fixed order and one
shared budget, a stored Target's anchors are boundary-qualified so a later revision
re-finds the same node, and a drawn Area encloses what it geometrically encloses
across a boundary. Where the product cannot look in — a closed shadow root, a
cross-origin frame interior, a frame the content policy never loaded — it states
the boundary with its true cause rather than reporting the Target as gone.

_Driven live: the runs pointed into an open shadow root and into a shadow root
inside a shadow root, drew an Area over shadow content and re-found it after a
reload, pointed inside a same-origin frame of a loopback application and
re-resolved it exactly, scrolled a virtualized row in and out to read its state
word, and pointed past the walk bound to read the truncation fact back. The
Verification Runs are `.visual-intent-verify/runs/2026-09-18_04-30-07-reach`,
`2026-09-18_04-56-45-unrendered-row`, `2026-09-18_04-57-29-walk-bound` and
`2026-09-18_04-58-14-reach-frame`. The two refusals are driven in the browser loop
(closed shadow root, policy-blocked frame); the cross-origin refusal has a unit
seam._

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
- A same-origin frame is reachable only in a proxied application: a saved-HTML artifact sets `frame-src 'none'`, so it cannot nest a loadable frame. Start `node fixtures/reach-app/server.mjs` and pass its printed URL to `launch --app`.

- **Point inside an open shadow root.** Run `… lever.mjs select --tool point --target ".shadow-action"`, then `… lever.mjs state`. The stored Target's `selectors[0]` contains the `|` shadow separator and names `div#open-host`.
- **Point inside a host inside a host.** Run `… lever.mjs select --tool point --target ".deep-action"`, then `… lever.mjs state`. The selector names both hosts, separated by `|`.
- **Box an area over shadow content.** Run `… lever.mjs select --tool box --from ".shadow-note" --to ".shadow-action"`, then `… lever.mjs state`. The Target is `region`, its label names the enclosed control, and its selectors are boundary-qualified.
- **Re-find it after a reload.** Run `… lever.mjs annotate --note "…"`, `… lever.mjs queue`, `… lever.mjs send`, `… lever.mjs reload-surface`, then `… lever.mjs state`. The Target's `resolutions[].match` is `exact` or `recovered`, never `unresolved`.
- **Point inside a same-origin frame.** Run `… lever.mjs select --tool point --target "iframe#widget >> .widget-action"`, then `… lever.mjs state`. The selector contains `>>` and the frame path, `runtimeState.documents[0]` names `iframe#widget` with its own address `widget`, and after `annotate`, `queue`, `send` and `reload-surface` the resolution is `exact`.
- **Read an Area that could not read a hole.** With `fixtures/reach.html`, point at the closed host; with a saved-HTML artifact carrying a frame, draw an Area over it. The Area keeps its rectangle and names the one hole as **a frame the artifact's content policy blocks**.
- **An unrendered row is not deleted.** Launch `fixtures/virtualized-roster.html`, run `… lever.mjs scroll --to 6000`, `… lever.mjs wait --target "#row-100" --frame artifact`, point at `#row-100`, write and send, then `… lever.mjs scroll --to 0`. `… lever.mjs snapshot` contains **May exist only in a state no longer on screen** and Approve is disabled; a further `… lever.mjs scroll` reports the artifact still at `scrollY: 0`, so resolving never moved it. Scrolling back to `6000` restores the match.
- **The bound is stated, not silent.** Launch `fixtures/large-roster.html`, point at `.row:nth-of-type(2400)` (past the 2000-node budget), send, and `… lever.mjs reload-surface`. `… lever.mjs state` reports the resolution `unresolved` with `truncated: true`, and `… lever.mjs snapshot` contains **Not in the part of this revision the surface read** with Approve disabled.

## Gotchas

- A saved-HTML artifact blocks every frame by policy. A `>>` selector in saved HTML is a defect, not a target.
- Playwright pierces open shadow roots with a plain CSS selector; pass the element's own class, not a host path, in the drive.
- The anchored card intercepts a click when it overlaps the next target. Complete or dismiss the current draft before pointing again.
- A closed shadow root is indistinguishable from an ordinary leaf at pointing time; the refusal can only be stated when a stored boundary-qualified Target stops resolving.
- The composed walk spends one budget across the artifact document and one frame level. A later frame is not traversed.
- `scroll` moves the artifact the way an operator would (a real wheel over the frame), and reports the resulting `scrollY`; with no `--to` it only reads.
