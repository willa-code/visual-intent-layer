# Advisor POV — user advocate

Verdict: **endorse with change**.

The handler now asks the right question — "did the page lose focus?" rather than "did
the layer's window fire blur?" `renderCard()` ends in `textarea.focus()` and runs from
`onSelection` after two HTTP round-trips; that is the tool rearranging itself, not the
human leaving. On a slow machine that focus move lands mid-drag, and the old handler
read it as abandonment, so the relation vanished with only a preview that blinked out —
precisely the "silently lose intent" failure VISION forbids. The new test drives the
real seam, and the legitimate cancels are intact: Escape, pointer loss, and shell
`cancel-relation` are untouched, and leaving the window still cancels because
`hasFocus()` is false.

Main risk / blind spot: that last guarantee now rests on one 0ms-timeout call to
`topDocument().hasFocus()`. `hasFocus()` is a browser/OS-dependent proxy for "the human
is still here"; where it reports true while the window is unfocused, the drag survives
departure — and since the layer only receives `pointerup` on the artifact document, a
release outside the frame leaves a ghost plus a stale preview sentence, and
`onPointerDown` replaces `pointDrag` without clearing `drag.ghost`, so it sticks until
reload. Second gap: no test covers the true-leave cancel at all, so that path can rot
unnoticed.

Alternative: add a second, cheap signal in the same handler — cancel when
`topDocument().visibilityState === 'hidden'` too — and one sibling browser test that
backgrounds the page mid-drag and asserts the preview clears and no ghost remains.
(Larger option: `setPointerCapture` so a drag always receives a terminal event wherever
the pointer goes.)

Both gaps are report-only (P2); neither blocks the fix.
