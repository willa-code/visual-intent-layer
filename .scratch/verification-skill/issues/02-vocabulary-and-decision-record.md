# 02: Vocabulary for Verification Run and Mechanical Verification

**What to build:** The repository now uses "verification" for two different actors: the Builder-Reviewer who completes an Annotation in Verify, and the agent that proves a mechanism works. The glossary gains the agent-facing sense and states the boundary where it can be read, so a green run is never mistaken for a Builder-Reviewer's judgement.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `CONTEXT.md` gains **Verification Run** — one execution that launches, drives mapped behaviour, captures evidence and cleans up
- [x] `CONTEXT.md` gains **Mechanical Verification** — evidence that the mechanism behaved as specified, explicitly not Verified Intent
- [x] The boundary to **Verify** and **Verified Intent** is stated in one line, and neither existing term changes meaning
- [x] A decision record states the trade-off: an automated Verification Run is not Verified Intent. It names what a green run does establish and what it does not, and why the choice is hard to reverse and surprising without context
- [x] The glossary entries hold no implementation detail and name no source structure
- [x] The new terms follow the glossary's voice, including an _Avoid_ line where a synonym would drift

## Comments

Added **Verification Run** and **Mechanical Verification** to `CONTEXT.md` with _Avoid_ lines and the one-line boundary to Verified Intent; added `docs/adr/0017-an-automated-verification-run-is-not-verified-intent.md`.
