# Resolution and honest outcomes

When the Artifact moves on, the product locates each Annotation's target again in the new revision and reports the outcome honestly: matched, recovered on weaker evidence, ambiguous with its candidates marked on the artifact, or deleted. It never chooses an uncertain target, and whether the Annotation was written before the revision now on screen stays a separate Annotation-level fact.

## Sub-features

- `resolution-reload` reloads a changed Artifact under review.
- `resolution-matched` reports a target found on exact evidence.
- `resolution-recovered` reports a target found on weaker evidence.
- `resolution-ambiguous` reports an unresolved target with its candidates marked on the artifact, and no ranked list or figure.
- `resolution-deleted` reports an unresolved target with no candidates.
- `resolution-state-only` reports an unresolved target whose recorded address differs from the address now on screen, while the revision has not changed, as possibly existing only in a state no longer on screen.
- `resolution-adopted-revision` stamps the Annotation with the revision the artifact reported, not the revision the source offers.
- `resolution-repoint` lets the Builder-Reviewer re-point the Annotation at the right target by pointing.
- `resolution-revision-relation` reports whether the Annotation was written before the revision now on screen.
- `resolution-provenance-separate` keeps Provenance Confidence a separate axis from Target Resolution.

## How to get to it (user POV)

- Change the Artifact file, notice the change banner, and choose `Reload artifact`.
- Read each Annotation's resolution in words on its own row; there is no separate Verify state.
- Read the `Written before this revision` label where it applies.
- Re-point an Annotation whose target could not be matched before approving.

## Driving it with the Lever

Preconditions:

- A run is healthy with a delivered Annotation against the current revision.
- The Artifact file can be changed on disk and changed back.

- **Send against revision one.** Run `… lever.mjs select --tool point --target ".checkout-submit"`, `… lever.mjs annotate --note "Move this."`, `… lever.mjs queue`, `… lever.mjs send`. `state` shows a delivered Annotation.
- **Move the Artifact on.** Change the file (for example append a paragraph), then run `… lever.mjs reload`. Exit `0`; the change banner is dismissed and the new revision is on screen.
- **Read the honest outcome.** Run `… lever.mjs verify` then `… lever.mjs state`. Each `resolutions[].match` is one of `exact`, `recovered` or `unresolved`; `revisionRelation` is `advanced` when the Annotation predates the revision on screen.
- **Ambiguity is never auto-chosen.** An `unresolved` target with candidates is reported as ambiguous, its candidates are marked on the artifact with a numeral, and approval is blocked. Run `… lever.mjs decide --verdict approve` in that state; the surface refuses and states the reason.
- **Re-point the lost target.** Run `… lever.mjs repoint --row 0 --target "h1"`. The next selection becomes that Annotation's target; `state` clears its old resolution and approval is no longer blocked by it, with no candidate ever chosen.
- **Deleted target.** An `unresolved` target with no candidates is reported as deleted. No candidate list appears, the candidates are not marked, and approval stays blocked with the reason named.
- **A target that only existed in another state.** Point at something in a filtered or routed state, return the artifact to its default state while the revision is unchanged, and run `… lever.mjs state`. The row says the target **may exist only in a state no longer on screen** rather than reporting a bare Deleted; no percentage or score appears. A target that is unresolved without a state difference still reads as Deleted.
- **The Adopted Revision is the artifact's report.** After the artifact loads, run `… lever.mjs state`. `adoptedRevision` is the revision the document reported it holds, and a new Annotation carries that `writtenRevision`; where the source's `currentRevision` differs, the surface states the disagreement rather than substituting it.
- **Provenance stays separate.** `state` reports `provenanceConfidence` per target independently of `resolutions[].match`; neither shares the word "exact" in the surface.
- **Compare one row's revisions.** Select the row and run `… lever.mjs compare --mode before` then `--mode after`. Each exits `0` while the row has a result from a different revision; the comparison is per row, not one session-wide pair, and switching to Before does not overwrite the revision the result came from.
- **Proof.** Run `… lever.mjs state`, `… lever.mjs screenshot --name resolution` and `… lever.mjs snapshot --name resolution`. The state carries the resolution records and candidates; the screenshot shows the resolution list and the revision label.

## Gotchas

- Reloading the Artifact is a different act from reloading the Review Surface. `reload` reloads the Artifact; `reload-surface` reloads the page.
- The change banner only appears while the file differs from the opened revision. Reload clears it for the new revision.
- Ambiguous selection needs candidates from the layer. If the layer has not reported candidates yet, wait for the marks on the artifact before re-pointing.
- Approval is refused, not silently ignored, while any target is ambiguous or deleted; the refusal states which target and why, and re-pointing clears it.
- Restore the Artifact file after the drive. A leftover appended paragraph changes the revision for the next run.
- A `recovered` match is weaker evidence, not a failure. Assert the reported outcome, not a preference for `exact`.
