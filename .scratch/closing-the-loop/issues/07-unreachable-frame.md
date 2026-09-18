# 07: The unreachable artifact frame

**What to build:** The artifact frame has its honest failure state: when the
artifact document or one of its assets cannot be fetched, the frame shows
`unreachable`, names the trigger, and offers a retry that can work — distinct from
`policy-blocked`.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] `ArtifactFrame` renders loading, ready, unreachable, policy-blocked and changed, with `unreachable` reached by a fetch failure
- [ ] The unreachable frame names its trigger and offers a retry that can work
- [ ] `policy-blocked` remains a separate state for a content policy that prevents embedding
- [ ] A dead session is not rendered as `unreachable`
- [ ] The gallery renders every state
- [ ] Covered by the gallery and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
Blocked by 06 so the two failure states are drawn together and stay distinct.