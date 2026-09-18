# 06: A dead review link has its own surface

**What to build:** A session left unended expires after seven days without a human
act, renewed only by human acts. When it dies the surface says so live and offers
one action that opens the artifact again over the same stored notes. Ended and
expired are the same terminal state, and neither is the artifact frame.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A session carries an expiry; the background status poll does not renew it, while annotation writes, sends, verdicts and reloads do
- [ ] An expired session is refused exactly like an ended one across every authorized read
- [ ] An active review never expires mid-session
- [ ] The shell detects the refusal and shows one whole-surface terminal state that names the cause, instead of scattered errors
- [ ] That state offers one action that opens the artifact again, preserving the stored Annotation ledger
- [ ] An ended or expired session is never reported as `ArtifactFrame.unreachable`
- [ ] Covered by service tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
The revocation half landed in `.scratch/truth-and-sync/issues/09`; this ticket is
expiry and the surface that announces it.