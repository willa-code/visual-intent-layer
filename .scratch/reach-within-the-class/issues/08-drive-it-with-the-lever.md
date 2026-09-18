# 08: Drive it with the Lever

**What to build:** The verification skill can drive a fixture carrying an open shadow root,
a nested shadow root, a closed shadow root and a same-origin frame, read the stored boundary
evidence back from state, and its feature map describes the surface as it now is. A
Verification Run is recorded.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** done

- [x] A fixture exists carrying an open shadow root, a shadow root inside a shadow root, a closed shadow root and a same-origin frame
- [x] The Lever points at a shadow-rooted element and at a frame element, and reads the stored grounding and boundary evidence back from `state`
- [x] The Lever drives the unrendered-row case and confirms the row's state word, and confirms the product never moves the artifact
- [x] The Lever drives the bound being reached and reads the recorded truncation fact back
- [x] Coverage is recorded only for behaviour a drive actually reached
- [x] The feature map no longer describes traversal as stopping at the artifact document, and names the refusals it does make
- [x] A Verification Run is recorded per the maintainer skill, or the untested paths are named with their preconditions

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md`. The previous iteration's
lesson carried forward: a drive the harness cannot perform must be named with its
preconditions rather than recorded as covered.

2026-09-18 — partly landed; four of seven boxes ticked, status left
`ready-for-agent`. `fixtures/reach.html` carries an open shadow root, a shadow root
inside a shadow root, a closed shadow root and a same-origin `<iframe>` (its own
policy sets `frame-src 'none'`, so in saved HTML that frame is present but never
loads — the spec's own finding). The browser-host's `locatorFor` now understands the
`>>` frame separator, so a Lever target can name a frame path. A Verification Run
was recorded: `.visual-intent-verify/runs/2026-09-18_04-30-07-reach`, outcome
`clean`, coverage `reach-within-the-class` for `reach-shadow`, `reach-nested-shadow`
and `reach-area`, with a recording, screenshots, ARIA snapshots and a `state`
read-back showing the shadow Area re-resolving to `recovered` after a
`reload-surface`. The feature map gains `reach-within-the-class.md` and
`resolution-and-honesty.md` names the `blocked` and `unread` words.

Three boxes remain, each with the precondition that blocks it, recorded in the
feature file and in the run's unreachable paths:

- **A frame element.** The Lever cannot reach a loadable same-origin frame in saved
  HTML; the frame-interior drive needs a loopback application embedding one. The
  browser loop already proves it against a proxied application, and the Lever
  attempt is recorded as an unreachable path rather than counted as covered.
- **The unrendered row.** Needs a virtualized-list fixture and a Lever scroll
  command; neither exists. The browser loop proves the state word and that the
  product never moves the artifact.
- **The bound.** Needs a large-roster fixture; the browser loop proves the
  truncation fact and the blocked approval.

2026-09-18 — status `ready-for-agent` → `done`, all seven boxes ticked. The Lever
gained a `scroll` command (a real wheel over the artifact frame, reporting the
resulting `scrollY`; no `--to` only reads), and the browser host learned the `>>`
frame separator and `/scroll`. The frame interior is reachable with a loopback
application: `fixtures/reach-app/server.mjs` serves an app embedding a same-origin
`/widget`, and driving it stores the `>>`-qualified selector and the
`runtimeState.documents` chain, then re-resolves `exact` after `reload-surface`.

Four Verification Runs cover the whole feature, each `clean`:

- `.visual-intent-verify/runs/2026-09-18_04-30-07-reach` — open shadow root, a
  shadow root inside a shadow root, an Area over shadow content re-found after a
  reload (`reach-shadow`, `reach-nested-shadow`, `reach-area`).
- `.visual-intent-verify/runs/2026-09-18_04-58-14-reach-frame` —
  `iframe#widget >> .widget-action` inside a loopback application (`reach-frame`).
- `.visual-intent-verify/runs/2026-09-18_04-56-45-unrendered-row` — a virtualized
  row scrolled in and out reads **May exist only in a state no longer on screen**
  while the artifact stays at `scrollY: 0` (`reach-unrendered-row`).
- `.visual-intent-verify/runs/2026-09-18_04-57-29-walk-bound` — a Target past the
  2000-node budget reads **Not in the part of this revision the surface read**,
  with the truncation recorded on the resolution (`truncated: true`) and read back
  from `state` (`reach-bound`).

The new fixtures are `fixtures/reach.html`, `fixtures/reach-widget.html`,
`fixtures/reach-app/server.mjs`, `fixtures/virtualized-roster.html` and
`fixtures/large-roster.html`. The two refusals stay driven by the browser loop
(closed shadow root, policy-blocked frame); the cross-origin refusal has a unit
seam because a cross-origin frame delivers no events to the surface.
