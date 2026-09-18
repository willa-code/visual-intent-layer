# 01: Say what the revision changed, per anchor

**What to build:** After a new version of the artifact arrives, each Annotation row
states, per anchor, whether the evidence at that anchor changed or is the same, and
names an anchor the revision could not locate; the Pass header sums those as
changed, same and not found. The vocabulary stops saying "answered".

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A Pass outcome is derived per anchor as changed, same or not found; an anchor whose evidence is unchanged reads `same`, and one whose evidence changed reads `changed`
- [x] An anchor the revision could not locate reads `not found`, and the row still names it as ambiguous or deleted in the row's own vocabulary (declared missing arrives with ticket 04)
- [x] A target that only moved does not read `changed`
- [x] Each Annotation row shows the comparison per anchor beside its existing resolution word, from one implementation shared with the Pass header
- [x] The Pass header states `N changed · N same · N not found` and no longer states answered/untouched/gone
- [x] ADR-0019 and `design.md` §5/§6 are amended: the outcome words change, and the pass-outcome marks are removed from the artifact with the rule that every mark on the artifact is something the Builder-Reviewer can act on
- [x] The gallery no longer renders a pass-outcome `OverlayMark` variant
- [x] Covered by store tests and the browser loop

## Comments

2026-09-18. Filed from `.scratch/closing-the-loop/spec.md` **Decided already**.
The words describe the evidence, not the request: the product cannot know a note
was satisfied, only that the thing on screen differs.

Done 2026-09-18. `anchorOutcome` and `evidenceUnchanged` live in `model.ts`, and the
store's Pass counts and the row's sentence call the same function, so the header and
the row can never disagree. The stored and wire outcome becomes
`{ changed, same, notFound }`, with older records read through a mapping from
`answered`/`untouched`/`gone`. ADR-0024 records the decision and ADR-0019 carries an
amendment note; `design.md` §5 and §6 lose the pass-outcome marks and a §11 amendment
states the rule that nothing derived is drawn on the artifact. Two store tests cover
the derivation and the moved-but-same case, and the browser loop asserts the row's
comparison word. Fixed in the same change: `recordResolutions` refreshed the Pass
outcome before the new resolutions were stored, so every count read stale data.