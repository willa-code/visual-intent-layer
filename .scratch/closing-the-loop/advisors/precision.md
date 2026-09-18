# Independent review — precision and trust engineer

Lens: does it raise the fidelity of intent and never let the product claim more than it knows; push the bolder option when intent gets more precise without costing effort.

DECISION 1 - KEEP
WHY: Storing the human's own act and words is the only form that keeps a judgment out of the derived resolution vocabulary (`deleted`, `src/resolution/model.ts`), but it must be offered only where the product found zero candidates, or the declaration would hide candidates it does hold.
BOLDER: Name the act in `CONTEXT.md`, stamp it with the result revision it was made against so a target that returns cannot hide behind a stale declaration, and carry the human's sentence in the next envelope so the agent is told the target is gone.

DECISION 2 - KEEP
WHY: `refreshPassOutcome` (`src/annotation/store.ts:498`) derives every count from resolutions and never from verdicts, so reopening genuinely cannot move them — but the recommendation must also say what closing does to a member still undecided, since the header prints "1 to decide" on a Pass that is being frozen shut.
BOLDER: Freeze structurally instead of by rule — closure copies the member set and counts into the Pass and refuses later resolution writes (`store.ts:322` currently refreshes a Pass in any state) — and record close and reopen as events rather than one overwritten `closedAt`.

DECISION 3 - KEEP
WHY: A new Pass is the only implementable option because `batchIdempotencyKey` hashes the sorted member ids (`src/annotation/envelope.ts:20`), so re-delivering the same members returns the closed Pass itself; but "not accepted and not abandoned" is unwritable until Reject and Obsolete are pinned, since `CONTEXT.md` defines Not Fixed and nothing defines Rejected.
BOLDER: Make membership Pass-side and dated — each Pass records the members and the evidence it carried, and a carried member is delivered as a new version rather than through the single mutable `annotation.passId` (`store.ts`).

DECISION 4 - CHANGE
WHY: "Gone" asserts an absence the product only knows as "could not be found", swallowing both an ambiguous target (which carries candidates and never resolves itself) and the human's declared-missing act, so one word would carry a derived fact and a judgment — the conflation already sits at `store.ts:498-516`.
BOLDER: Decide the anchor fact from the target's own evidence — its box, or its Captured View — and read "nothing to compare" where there is none, instead of inferring Answered or Untouched from the name/role/text match in `keptOriginalEvidence` (`store.ts:712`).

DECISION 5 - CHANGE
WHY: "Before any member is acknowledged" is weaker than the product's own standard, because the agent can already read a delivery through a held-call return or `check_in` and never acknowledge it, so the withdraw would erase a send the agent has seen.
BOLDER: Use the Pass state `open`, which nothing reaches today: sent-but-not-collected is `open`, `in flight` begins only when the agent collects it, and a withdraw then returns members to the queue with no new state.

DECISION 6 - CHANGE
WHY: A failed fetch (session intact, retry meaningful) and a dead session (nothing on this URL works again) are claims as different as the policy-blocked state the recommendation rightly keeps apart, and one state forces one affordance onto both.
BOLDER: Take the dead session out of the frame entirely — the surface itself is over, so it becomes one terminal state that names the cause and states that unsent work is still stored — and leave `unreachable` for the artifact fetch alone.

DECISION 7 - KEEP
WHY: The Pass header holds the counts and the row holds the per-anchor fact, and a standing mark over the artifact would put the product's derived word on the very thing the human is there to judge — unlike candidate marks, which carry an action.
BOLDER: None — if a mark is ever built, make it the selected row's own gesture on the artifact rather than a standing claim.

DECISION 8 - CHANGE
WHY: A sliding window extended by any authorized request is extended by the shell's own 3-second status poll (`src/ui/app.ts:107, 1509`), so one open tab authorizes indefinitely — exactly what expiry exists to prevent — and nothing ever tells the human when the URL will stop working.
BOLDER: Put an absolute ceiling on the sliding window, state the moment it stops authorizing, and let the refusal name its cause (ended, expired, unknown capability) on the surface's terminal state rather than the single 401 sentence the service sends today (`src/service/http.ts:861`).