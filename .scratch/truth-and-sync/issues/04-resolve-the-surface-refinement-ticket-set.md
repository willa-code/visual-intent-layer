# 04: Resolve the surface-refinement ticket set

**What to build:** The nineteen `surface-refinement` tickets that still read
`ready-for-agent` are resolved against the shipped surface, ticket by ticket, so a
planning pass stops reading a finished iteration as a backlog.

**Status:** done

**Blocked by:** 01

- [x] Each of `01`–`17`, `19` and `20` is judged by inspecting the shipped surface, not by memory and not in bulk
- [x] A ticket whose behaviour is in `src/ui/` and reachable is `done`
- [x] A ticket replaced by `surface-refinement-pass-a` is `superseded`, with the replacement named
- [x] `18` (Relational Intent after the mode change) stays `needs-triage`, because its gesture decision moved to `several-targets-and-relations`
- [x] Every resolution carries a `## Comments` entry naming the evidence: the commit, the file, or the component and state that satisfies it
- [ ] No acceptance box and no ticket text is rewritten
- [x] After the sweep, nothing under `.scratch/surface-refinement/issues/` is `ready-for-agent` except `18`

## Comments

The iteration's behaviour shipped in `14a73a1` ("Refine the Review Surface: one rail,
two tiles, honest delivery"), and `2f03186` ("Give the Review Surface a Pass") re-cut
part of it. Independent review had already found one ticket whose premise died with the
change: issue 03 deleted the `Arrange` tool while asserting the relation capability
survived, which is what `18` records.

Done 2026-09-17. Every one of `01`–`17`, `19` and `20` was judged against the shipped surface. Each keeps its criteria text and argument, and each gained an appended `## Comments` entry naming the evidence. Shipped tickets are `done`; `06` is `superseded` by `.scratch/surface-refinement-pass-a/spec.md`; `18` stays `needs-triage`; `13` is `deferred`.

Deferred confirmation: the box "No acceptance box and no ticket text is rewritten" is left unticked. No criteria text or ticket argument was rewritten, but shipped acceptance boxes were ticked to their evidence, because the alternative — leaving every box unticked and declaring shipped behaviour deferred — would be the confident falsehood this product refuses. `truth-and-sync/spec.md`'s "Correct every status to its boxes, and every box to its evidence" is the reading applied here.
