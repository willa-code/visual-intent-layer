# Verify each Annotation where it sits

An Annotation is decided on its own row, in the one list: approve, reject, request another pass, or mark obsolete. A verdict that is blocked states its reason. Amending a delivered Annotation supersedes it; supersede is not a row verdict. The pre-change and post-change revisions are compared per row, on the stage, only while the selected row has something to compare.

## Sub-features

- `verify-in-place` judges a delivered Annotation on its own row without changing surface state.
- `verify-before-after` compares the revision an Annotation was written against with the revision its result came from.
- `verify-approve` accepts one Annotation.
- `verify-reject` rejects one Annotation.
- `verify-another-pass` requests another pass on one Annotation.
- `verify-obsolete` marks one Annotation obsolete.
- `verify-blocked` states the reason approval is refused.
- `verify-amend` supersedes a sent Annotation and delivers its successor with Steering Intent.
- `closed-toggle` hides and reveals verified, superseded and obsolete rows behind one control.

## How to get to it (user POV)

- Create and send an Annotation; its verdict controls appear on its own row.
- Choose a verdict control on the row.
- Select a row, then toggle `Before`/`After` on the stage.
- Choose `Amend` on a delivered row to supersede it.

## Driving it with the Lever

Preconditions:

- A run is healthy with each Annotation delivered and its targets resolved.
- The verdict under test is not blocked (except for the blocked recipe).

- **Judge in place.** Run `… lever.mjs verify`. Exit `0` and a screenshot showing the annotation rows with their verdict controls; there is no state switch to enter.
- **Compare one row.** Select a row whose target re-resolved against a new revision, then run `… lever.mjs compare --mode before --row 0` then `… lever.mjs compare --mode after --row 0`. Each exits `0` with a screenshot; the stage switches between the written revision and the revision the result came from. If the row has nothing to compare the command exits `4` and states the precondition.
- **Approve one Annotation.** Run `… lever.mjs decide --verdict approve --match "Make it impossible to miss."`. Exit `0` and `state` showing that Annotation `verified` with `verification.verdict` `approve`.
- **Reject one Annotation.** With another delivered Annotation, run `… lever.mjs decide --verdict reject --match "…"`. `state` shows `rejected` on that Annotation only; the first stays as it was.
- **Request another pass.** Run `… lever.mjs decide --verdict another-pass --match "…"`. `state` shows `another-pass` for that Annotation.
- **Mark obsolete.** Run `… lever.mjs decide --verdict obsolete --match "…"`. `state` shows `obsolete`.
- **Supersede by amending.** Run `… lever.mjs amend --note "Clearer wording." --match "…"`. Exit `0`; `state` shows the original `superseded` with a `supersededBy`, the successor carrying `supersedes`, and a batch with intent `steering`.
- **Hide the closed rows.** Run `… lever.mjs closed-rows`. Exit `0`; the visible row count changes and the toggle states how many are hidden.
- **Blocked verdict.** Give one target an unresolved resolution, then run `… lever.mjs decide --verdict approve --match "…"`. The command reports the refusal reason; the Annotation stays undecided.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name verify-decided`. The state carries each verdict and timestamp; the screenshot shows the decided rows.

## Gotchas

- Each verdict applies to one Annotation. Prefer `--match <note>` over `--row`, because approving a row hides it behind the closed toggle and shifts the remaining row indices.
- Approval is refused while a target is ambiguous or deleted. Drive `choose` first, or expect the stated refusal.
- `obsolete` settles the Annotation without accepting it; do not read it as approval. Supersession is reached only through `Amend`.
- A verdict on one Annotation never decides another. Assert the `annotationId`, not the count.
- The per-row comparison appears only when the row has a result from a different revision. Without a changed artifact there is nothing to compare and the drive reports exit `4`.
