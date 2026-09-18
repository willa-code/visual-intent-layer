# 06: A dead review link has its own surface

**What to build:** A session left unended expires after seven days without a human
act, renewed only by human acts. When it dies the surface says so live and offers
one action that opens the artifact again over the same stored notes. Ended and
expired are the same terminal state, and neither is the artifact frame.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A session carries an expiry; the background status poll does not renew it, while annotation writes, sends, verdicts and reloads do
- [x] An expired session is refused exactly like an ended one across every authorized read
- [x] An active review never expires mid-session
- [x] The shell detects the refusal and shows one whole-surface terminal state that names the cause, instead of scattered errors
- [x] That state offers one action that opens the artifact again, preserving the stored Annotation ledger
- [x] An ended or expired session is never reported as `ArtifactFrame.unreachable`
- [x] Covered by service tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
The revocation half landed in `.scratch/truth-and-sync/issues/09`; this ticket is
expiry and the surface that announces it.

Done 2026-09-18. `SessionRecord` carries `expiresAt` with a seven-day idle TTL, and
`SessionRecords` refuses an expired record exactly like an ended one across `get`,
`authorized` and `findByArtifact*`. Renewal lives in the service's `authorize`, so
the status poll's GETs leave the window alone while every act — POST, PATCH,
DELETE — pushes it out; an active review cannot expire mid-session. A refusal names
its cause (ended vs expired), and the shell turns a 401 into one `.terminal` state
with a single action that opens the artifact again through `POST /api/sessions/:id/reopen`,
which revives an expired record and refuses an ended one. `design.md` §6 gains
`TerminalState` and §11 an amendment; ADR-0029 records the decision.

One product gap surfaced while driving it: the shell's status poll refreshed only
the agent position, so a collection or any other state change performed out of band
never reached the ledger. `AnnotationStore` now counts its own revisions and the
session status reports one, so the shell re-reads the ledger when it changes.

**Verification Run, 2026-09-18.** Run
`.visual-intent-verify/runs/2026-09-18_00-58-35-closing-the-loop-2` ended `changed`;
its `expire-session` drive reported `terminal: 1`, proving an open surface shows one
terminal state when its session expires. The same run found a defect in ticket 05
(see there) rather than in this ticket. The Lever gained `expire-session` to make
the state drivable. A fresh load of a dead review URL is refused outright, so the
terminal state is what an already-open surface shows; that is stated in the feature
map's gotchas.