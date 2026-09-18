# Independent review — minimalist interaction designer

Lens: lower the words, controls and steps the human meets; calmer and more beautiful; added vocabulary or controls are guilty until they earn their place.

DECISION 1 — KEEP
WHY: `approvalBlockers` (`src/annotation/model.ts:66`) blocks approval on every zero-candidate target, and the derived word "Deleted" is a guess the product cannot know, so the act is both the only unblock and the only honest home for the human's claim.
BOLDER: one word — "Missing" — on the unresolved row, with no new composer: the Annotation's existing note already carries the human's words, so the act adds a word, not a field.

DECISION 2 — KEEP
WHY: the counts are recomputed from resolutions, never from verdicts (`refreshPassOutcome`, `src/annotation/store.ts:499`), so a reopen genuinely cannot move them without lying, and `markPassesReady` already leaves closed Passes alone.
BOLDER: no Pass-level Reopen control — reopening the verdict reopens the Pass as a derived consequence, so the human meets one word where they already are.

DECISION 3 — KEEP
WHY: re-delivering the same Pass would force its outcome counts to be reset in place, which the record rule forbids, and one ledger group per delivery keeps one count line per attempt.
BOLDER: carry only the members the human actually judged — Reject or Not Fixed — so a retry is the sum of acts already made and no unjudged row is swept into Pass 3.

DECISION 4 — KEEP
WHY: `design.md` §5/§6 assign counts to the Pass header and the per-anchor fact to the row, and the artifact-overlay alternative is displaced by decision 7.
BOLDER: spend no word where the resolution already implies it — "Matched" is untouched — and mark only changed evidence and gone, on the existing resolution line rather than as a second label.

DECISION 5 — KEEP
WHY: acknowledgement is the only observable evidence that the agent has read anything, so it is the one boundary the product can honestly draw, and §10 leaves a Replacement as the only later act.
BOLDER: no new verb — keep the row's existing remove gesture available until the first acknowledgement, so withdrawing is a wider window on an icon already there, not a control.

DECISION 6 — CHANGE
WHY: an ended or expired session also revokes the rail's own reads (`SessionRecords.get`/`authorized`), so folding it into `ArtifactFrame.unreachable` claims working chrome around a dead session.
BOLDER: one terminal sentence over the whole workspace, `Session ended · reopen from your agent`, with no frame; the frame keeps only the artifact fetch failure.

DECISION 7 — KEEP
WHY: drawing derived facts on the artifact mixes them into an overlay that today means only "what you are acting on", while the counts already sit in the Pass header (`components.ts:511`).
BOLDER: state the rule rather than remove one entry — every mark on the artifact means something the human can act on (target, candidate, relation ghost), and nothing derived is ever drawn there.

DECISION 8 — KEEP
WHY: it adds no control and no word, and unsent Annotations survive on disk regardless, so the worst case is one sentence naming a trigger.
BOLDER: drop "expired" from the surface entirely — reopening the artifact mints a fresh session through the path the agent already uses, so expiry converges on reopen and is never explained.