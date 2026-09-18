# Expiry bounds an idle review, and it announces itself

**Status:** accepted

A session the Builder-Reviewer never ends stops authorizing after **seven days
without a human act**. Renewal follows the acts themselves — writing, sending,
judging, re-pointing, reloading, taking back — and never the surface's background
status poll, so an open tab that nobody touches cannot keep a review alive. An
active review does not expire mid-session, because the act that opens it and every
act within it renew the window.

A refusal names its cause. When the review dies while the surface is open, the
surface shows one terminal state: a sentence saying whether the link was ended or
expired, and one action that opens the artifact again over the same stored notes.
The stored ledger is keyed by the artifact rather than the session, so opening
again loses nothing. The terminal state is never an `ArtifactFrame.unreachable`,
which stays for an artifact that could not be fetched, and which a dead session is
not.

**Considered Options:** Renewing on every authorized request was rejected because
the surface polls its own status every three seconds, so a forgotten tab would
authorize indefinitely, which is the outcome expiry exists to prevent. An absolute
ceiling with no idle rule was rejected because it would kill a review the
Builder-Reviewer is using. Folding a dead session into the artifact frame was
rejected because the frame is about the artifact under review, while a dead session
is a fact about the review itself, and the two need different exits. Ending and
expiring were kept distinguishable in words, because an ended review has to be
opened again by the agent while an expired one can be opened again in place.

**Consequences:** `SessionRecord` carries `expiresAt`, and an expired record is
refused exactly like an ended one across every authorized read. The service exposes
one reopen route, which accepts the session's own capability, revives an expired
record, and refuses an ended one. `design.md` §6 gains `TerminalState` and §11 an
amendment. Expiry bounds neglect; it is not a defence against a capability that was
already shared while the session was live.