# 09: Make the end-session control true

**What to build:** Ending a session ends it. The capability that authorizes every route
stops authorizing, and the surface says what happened instead of closing a window and
leaving a stored URL live.

**Status:** done

**Blocked by:** 01

- [x] `SessionRecords` can end a record, and an ended record no longer satisfies `authorized`
- [x] A route ends a session for its own holder, authorized by the same capability as every other route
- [x] The overflow action calls that route before closing the window, and states what it did
- [x] After ending, the stored review URL and its capability are refused rather than silently authorizing
- [x] A session that was never ended still authorizes, and its stored state is untouched by another session's end
- [x] The feature map's session-and-overflow file and the overflow label say what the action does
- [x] Asserted through the API and through the surface, not by reading a store field
- [x] If the server-side end is judged too large for this iteration, the fallback is stated in this ticket's Comments: rename the control to what it does, and file the revocation into `closing-the-loop` as an owned deferral

## Comments

`design.md` §5 puts "end session" in the overflow menu. `src/ui/app.ts:1524` shows
"Session ended. Your unsent Annotations are still stored on this machine." and calls
`window.close()`. The second sentence is true and the first is not: `SessionRecords`
(`src/service/sessions.ts`) has `put`, `mint`, `get`, `findByArtifact*` and `authorized`,
and no way to end a record, while every route authorizes through `authorizedOrRefuse`
(`src/service/http.ts:176` onward). So after "ending", the stored review URL still works.

This is the smallest code change in the iteration and the one that makes a sentence in
the contract true, which is why it rides here rather than waiting for the session
lifecycle work in `closing-the-loop`. That spec still owns session expiry and the
`unreachable` artifact frame.

Done 2026-09-17. `SessionRecords` gained `end`, which marks a record ended and persists it; ended records no longer satisfy `get`, `authorized`, `findByArtifact` or `findByArtifactRevision`. `POST /api/sessions/:id/end` authorizes through the same capability, and the overflow action calls it before closing and states what the server did. `src/service/http.test.ts` proves the refusal and that another session is untouched; `tests/browser-loop.test.ts` proves the Builder-Reviewer action. The feature map now says the action revokes the capability.

The overflow label needed no reword: it already read **End session**, and the action now does exactly that — it ends the session server-side. A longer label ("End session and revoke the review URL") was tried and reverted, because the open overflow menu overlays the rail head, and a wider menu then covers the Stop action. That overlay behaviour is pre-existing and belongs to the surface, not to this iteration; the feature map states the revocation in words instead.
