# Independent review — sceptical user advocate

Lens: the human's convenience and authority; find places where a proposal is more honest but makes the human do more work, think harder, or hit a wall.

DECISION 1 - KEEP
WHY: A zero-candidate anchor blocks Approve forever (`approvalBlockers`, `src/annotation/model.ts`) with Repoint as the only escape, so a human who knows the thing is gone is walled in — and a resolution kind would be a derived fact wearing a judgment's name, which VISION forbids.
BOLDER: Make the declaration one mark — "Not there any more" — with the operator's words optional, so the honest exit costs a click, not a paragraph.

DECISION 2 - CHANGE
WHY: Freezing counts is right, but freezing verdicts buys nothing — the recommendation itself says a changed verdict cannot move a count — while charging the operator two acts (reopen the Pass, then change the verdict) to fix a mis-tap.
BOLDER: Let the row's verdict be changed in place and have the surface reopen the Pass as part of that one deliberate act, so the human never performs a separate reopen.

DECISION 3 - KEEP
WHY: A new Pass is the only shape that keeps "Pass 2 answers Pass 1" legible and stops outcome counts from mixing two artifact revisions.
BOLDER: Derive each Pass's rows from its own frozen `annotationIds` rather than the single `annotation.passId` (`renderList`, `src/ui/app.ts`), so carried rows stay visible under Pass 1's frozen counts instead of leaving its group.

DECISION 4 - CHANGE
WHY: The row already prints Matched/Recovered/Ambiguous/Deleted per anchor (`resolutionItem`, `src/ui/components.ts`), so Answered/Untouched/Gone stacks a second word on the same evidence, and "Gone" tells the operator a target vanished when the product only knows it could not be matched (`refreshPassOutcome` counts every unresolved resolution as gone).
BOLDER: Spend one word per anchor describing the evidence itself — changed, same, unmatched — and let ambiguity keep its own label instead of collapsing into "Gone".

DECISION 5 - CHANGE
WHY: The recommendation names the boundary as "after the agent has seen it" but triggers the withdraw on acknowledgment, which is optional, so an agent that collected the delivery through `check_in` and never acknowledged leaves a delete offered on something it already holds.
BOLDER: Gate the withdraw on the fact the product already records — whether the agent has collected that delivery — and show that moment on the row, so the window is both real and visible.

DECISION 6 - CHANGE
WHY: An ended or expired session is not a fact about the artifact, so folding it into `ArtifactFrame.unreachable` puts the cause on the wrong subject and hands the operator a Reload that can never work, while the two triggers need different exits rather than different sentences.
BOLDER: Keep the artifact's own failure in the frame and give session end/expiry a surface-level state whose one action is "open this artifact again", so the sentence and the way out agree.

DECISION 7 - KEEP
WHY: §5 already marks uncertainty on the artifact through candidate marks and keeps every other fact in one place, so pass-outcome marks would duplicate the header's counts and the row's per-anchor fact — VISION's "a fact lives in one place".
BOLDER: none.

DECISION 8 - KEEP
WHY: Sliding idle expiry extended on every authorized request never interrupts an active review, and re-opening the same revision already reuses a live session, so the wall only appears after a week of silence, when a fresh session is the correct act anyway.
BOLDER: State the expiry one disclosure away and make re-opening the same revision re-issue a session over the same persisted ledger, so it is never a surprise and never a loss.