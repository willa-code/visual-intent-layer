# Verify each Annotation

In Verify, a Builder-Reviewer decides each delivered Annotation on its own: approve, reject, request another pass, supersede, or mark obsolete. A verdict that is blocked states its reason. The pre-change and post-change revisions can be toggled in place.

## Sub-features

- `verify-enter` enters Verify and lists each delivered Annotation.
- `verify-before-after` toggles the pre-change and post-change revisions in place.
- `verify-approve` accepts one Annotation.
- `verify-reject` rejects one Annotation.
- `verify-another-pass` requests another pass on one Annotation.
- `verify-supersede` supersedes one Annotation with a successor.
- `verify-obsolete` marks one Annotation obsolete.
- `verify-blocked` states the reason approval is refused.

## How to get to it (user POV)

- Choose `Verify` in the state switch after at least one Annotation is delivered.
- Toggle `Before the change` and `After the change`.
- Choose a verdict control on the Annotation row.

## Driving it with the Lever

Preconditions:

- A run is healthy with each Annotation delivered and its targets resolved.
- The verdict under test is not blocked (except for the blocked recipe).

- **Enter Verify.** Run `… lever.mjs verify`. Exit `0` and a screenshot showing the annotation rows with their verdict controls.
- **Toggle the comparison.** Run `… lever.mjs compare --mode before` then `… lever.mjs compare --mode after`. Each exits `0` with a screenshot; the artifact frame switches between the written revision and the current one.
- **Approve one Annotation.** Run `… lever.mjs decide --verdict approve`. Exit `0` and `state` showing that Annotation `verified` with `verification.verdict` `approve`.
- **Reject one Annotation.** With another delivered Annotation, run `… lever.mjs decide --verdict reject --row 1`. `state` shows `rejected` on that Annotation only; the first stays as it was.
- **Request another pass.** Run `… lever.mjs decide --verdict another-pass --row 1`. `state` shows `another-pass` for that Annotation.
- **Supersede.** Run `… lever.mjs decide --verdict supersede --row 1`. `state` shows `superseded`.
- **Mark obsolete.** Run `… lever.mjs decide --verdict obsolete --row 1`. `state` shows `obsolete`.
- **Blocked verdict.** Give one target an unresolved resolution, then run `… lever.mjs decide --verdict approve`. The command reports the refusal reason; the Annotation stays undecided.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name verify-decided`. The state carries each verdict and timestamp; the screenshot shows the decided rows.

## Gotchas

- Each verdict applies to one Annotation. `--row` picks the row; the default is the first.
- Approval is refused while a target is ambiguous or deleted. Drive `choose` first, or expect the stated refusal.
- `supersede` and `obsolete` settle the Annotation without accepting it; do not read them as approval.
- A verdict on one Annotation never decides another. Assert the `annotationId`, not the count.
- Verify only lists delivered Annotations. An Annotation still in the queue is not there.
- The comparison toggles the artifact frame in place; it does not change stored state.