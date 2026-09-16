# Resolution and honest outcomes

When the Artifact moves on, the product locates each Annotation's target again in the new revision and reports the outcome honestly: matched, recovered on weaker evidence, ambiguous with candidates, or deleted. It never chooses an uncertain target, and whether the Annotation was written before the revision now on screen stays a separate Annotation-level fact.

## Sub-features

- `resolution-reload` reloads a changed Artifact under review.
- `resolution-matched` reports a target found on exact evidence.
- `resolution-recovered` reports a target found on weaker evidence.
- `resolution-ambiguous` reports an unresolved target with its candidates.
- `resolution-deleted` reports an unresolved target with no candidates.
- `resolution-choose` lets the Builder-Reviewer choose among ambiguous candidates.
- `resolution-revision-relation` reports whether the Annotation was written before the revision now on screen.
- `resolution-provenance-separate` keeps Provenance Confidence a separate axis from Target Resolution.

## How to get to it (user POV)

- Change the Artifact file, notice the change banner, and choose `Reload artifact`.
- Enter `Verify` to see each Annotation's resolution and its candidates.
- Read the `Written before this revision` label where it applies.
- Choose a candidate for an ambiguous target before approving.

## Driving it with the Lever

Preconditions:

- A run is healthy with a delivered Annotation against the current revision.
- The Artifact file can be changed on disk and changed back.

- **Send against revision one.** Run `… lever.mjs select --tool element --target ".checkout-submit"`, `… lever.mjs annotate --note "Move this."`, `… lever.mjs queue`, `… lever.mjs send`. `state` shows a delivered Annotation.
- **Move the Artifact on.** Change the file (for example append a paragraph), then run `… lever.mjs reload`. Exit `0`; the change banner is dismissed and the new revision is on screen.
- **Read the honest outcome.** Run `… lever.mjs verify` then `… lever.mjs state`. Each `resolutions[].match` is one of `exact`, `recovered` or `unresolved`; `revisionRelation` is `advanced` when the Annotation predates the revision on screen.
- **Ambiguity is never auto-chosen.** An `unresolved` target with candidates is reported as ambiguous and blocks approval. Run `… lever.mjs decide --verdict approve` in that state; the surface refuses and states the reason.
- **Choose a candidate.** Run `… lever.mjs choose --node <nodeId>` with a node id from `state`. `state` then records `chosenCandidates` for that target and approval is no longer blocked by it.
- **Deleted target.** An `unresolved` target with no candidates is reported as deleted. No candidate chooser appears and approval stays blocked with the reason named.
- **Provenance stays separate.** `state` reports `provenanceConfidence` per target independently of `resolutions[].match`; neither shares the word "exact" in the surface.
- **Proof.** Run `… lever.mjs state`, `… lever.mjs screenshot --name resolution` and `… lever.mjs snapshot --name resolution`. The state carries the resolution records and candidates; the screenshot shows the resolution list and the revision label.

## Gotchas

- Reloading the Artifact is a different act from reloading the Review Surface. `reload` reloads the Artifact; `reload-surface` reloads the page.
- The change banner only appears while the file differs from the opened revision. Reload clears it for the new revision.
- Ambiguous selection needs candidates from the layer. If the layer has not reported candidates yet, enter Verify and wait for the resolution list before choosing.
- Approval is refused, not silently ignored, while any target is ambiguous or deleted; the refusal states which target and why.
- Restore the Artifact file after the drive. A leftover appended paragraph changes the revision for the next run.
- A `recovered` match is weaker evidence, not a failure. Assert the reported outcome, not a preference for `exact`.