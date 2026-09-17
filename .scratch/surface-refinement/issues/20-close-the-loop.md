# 20: Close the loop: re-resolve after the artifact changes

**What to build:** After the agent changes the artifact, the loop closes inside the surface without the Builder-Reviewer prompting anyone. Issue 10 notices the changed revision and offers the reload. On reload, every Annotation written against an earlier revision is re-resolved against the new one — matched, recovered, ambiguous with its candidates, or deleted — so each row shows what happened to its own target and the Builder-Reviewer judges it in place. Nothing is auto-selected, and a target that cannot be found says so rather than being approximated.

**Blocked by:** 06 (the rows), 10 (the changed revision), 19 (per-row comparison)

**Status:** done

- [x] Changing the artifact on disk leads, through the surfaced reload, to every Annotation written against an earlier revision being re-resolved against the new revision
- [x] Each row states its own resolution outcome, and the four outcomes are distinguishable by label plus a non-colour cue
- [ ] An ambiguous resolution presents its candidates on the row and chooses none of them
- [x] An unresolved target with no candidates is reported as deleted, and the row states that approval is blocked
- [x] Re-resolution runs once per revision, and a second pass over the same revision does not repeat the work
- [x] The surface states when re-resolution last ran, so a stale resolution is visible as stale
- [x] A resolution never changes the artifact, and never changes an Annotation's note or targets
- [x] Each re-resolved row can be compared before and after without changing surface state
- [ ] Driven live: a fixture is changed on disk, the reload is driven, and stored state shows each Annotation's resolution against the new revision alongside its per-row comparison

## Comments

Added because this was the hole in the iteration, and independent review could not see it: the review audited each ticket against the design contract, and the contract never owned this flow either. Composing, sending, amending, stopping and noticing a changed artifact were all covered; what happens *next* — the artifact moved, my targets re-resolved, here is what changed, judge it — was one vague criterion in issue 06 and one in issue 10. That is the middle of the loop the product's vision rests on: the Builder-Reviewer stays on this surface while visible work is directed.

Known gap recorded rather than closed: what happens when the agent has already implemented something and the Builder-Reviewer amends it anyway. The amendment and the work in flight can conflict, and nothing in this iteration detects or reports that. It is in the spec's deferred list.

Resolved 2026-09-17: done. Changing the artifact on disk, surfacing the reload and re-resolving every Annotation shipped; `tests/browser-loop.test.ts` drives the changed revision, the candidate marks and repair by re-pointing. `surface-refinement-pass-a` tickets 05 and 06 replaced the on-row candidate chooser with candidate marks on the artifact and repair by pointing, so that box is left unticked; anchor-level comparison and Pass-outcome reporting moved to Pass B.

Deferred confirmation: the `Driven live` box and the on-row candidate box are parked as described above.
