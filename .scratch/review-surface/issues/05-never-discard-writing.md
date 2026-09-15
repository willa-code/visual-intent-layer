# 05: Never discard the Builder-Reviewer's writing

**What to build:** An unsent note survives a page reload, a process crash and a browser restart. Escape cannot destroy it. If the target a note was attached to disappears from the artifact for good, the text is kept visibly rather than dropped, and the Builder-Reviewer is told it could not be reattached.

**Blocked by:** 04 (One Annotation, end to end)

**Status:** done

- [x] Unsent note text survives a reload of the surface, a restart of the service and a restart of the browser
- [x] Escape never discards unsent text and only unwinds the surface one level
- [x] When a note's target can no longer be found, the note is retained visibly and the Builder-Reviewer is told
- [x] No code path discards a note silently

## Comments

Deferred confirmation: unsent text is persisted server-side per keystroke and asserted across a store/process restart; a hard browser-kill then relaunch is not scripted.
