# 07: The unreachable artifact frame

**What to build:** The artifact frame has its honest failure state: when the
artifact document or one of its assets cannot be fetched, the frame shows
`unreachable`, names the trigger, and offers a retry that can work — distinct from
`policy-blocked`.

**Blocked by:** 06

**Status:** done

- [x] `ArtifactFrame` renders loading, ready, unreachable, policy-blocked and changed, with `unreachable` reached by a fetch failure
- [x] The unreachable frame names its trigger and offers a retry that can work
- [x] `policy-blocked` remains a separate state for a content policy that prevents embedding
- [x] A dead session is not rendered as `unreachable`
- [x] The gallery renders every state
- [x] Covered by the gallery and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Blocked by 06 so the two failure states are drawn together and stay distinct.

Done 2026-09-18. `App.loadArtifact` now preflights a saved-HTML artifact and renders
`ArtifactFrame.unreachable` with the failing status named and a `Try again` control
that re-runs the load; `policy-blocked` stays the remote-origin consent gate and
`changed` stays the new-revision banner. A dead session never reaches that path:
the shell's 401 turns into the terminal state before the artifact loads. The gallery
renders every state as its own panel. Covered by the gallery snapshot and a
browser-loop test that deletes the artifact file, reads `unreachable`, restores the
file and retries into the loaded document.

The Lever has no command that removes a run's artifact, so the frame was recorded
as `unreachable` in the Verification Run with that missing precondition rather than
claimed; the browser loop drives it.