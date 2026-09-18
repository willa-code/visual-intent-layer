# 18: Relational intent after the mode change

**What to build:** Relational Intent survives the removal of the `Arrange` tool, expressed by a gesture that fits the two-tile island: dragging a target that is already selected moves a ghost and infers one relation — alignment, ordering, spacing, containment, equivalence or comparative size — which is shown back as one plain sentence before it is recorded and never mutates the artifact. A drag that begins anywhere else behaves as the artifact does, so text selection is unaffected. Nothing about this is pixel displacement: the stored relationship is implementation-neutral and the agent chooses how to achieve it.

**Blocked by:** 03 (the mode island), 04 (the pointing gestures)

**Deferred:** out of this iteration by maintainer decision. Relational Intent stays in the domain model and the envelope keeps its support for relationships, but the surface will express no relation until this ticket lands. `design.md` §5, §6 and §7 no longer promise relation guides, handles, sentences or a gesture, so the contract and the build agree while this waits. What would unblock it: a decision on how a relation is expressed — the drag-on-a-selected-target rule this ticket records, or explicit handles on a multi-selection — and an assessment of whether relational intent is worth the surface it costs.

**Status:** superseded

- [ ] Dragging a target that is already selected produces a relation, and the relation is visible as one sentence before anything is recorded
- [ ] Clicking, or dragging anywhere that is not an already-selected target, does not produce a relation
- [ ] Alignment, ordering, equal spacing, containment, shared property and comparative size are each expressible
- [ ] The relation is stored implementation-neutral with no pixel fields, and the agent receives the desired relationship rather than a displacement
- [ ] A relation drag is reversible, and the artifact's source and authoritative DOM are unchanged by it
- [ ] The relation sentence is shown in the card and in the rail row, from one implementation
- [ ] The `arrange` member of `LayerTool` and the dead code path issue 03 removed are not reintroduced: this is a gesture, not a mode
- [ ] Relational intent is reachable with keyboard alone, or its keyboard route is stated as not provided
- [ ] Driven live: a relation is expressed by dragging a selected target, the sentence is read back, and the stored relationship contains no pixel values

## Comments

Added after independent review, which found that issue 03 deleted the `Arrange` tool while asserting the capability survived "when two or more targets are selected" without naming a gesture, leaving roughly 150 lines of working relation code unreachable, while `design.md` §5 and §6 still promise relation guides and sentences, and the previous spec named relational intent as the product's non-parity differentiator.

**One design call in this ticket has not been reviewed by the maintainer:** that a drag beginning on an already-selected target is a relation drag. The alternative is deriving relations from explicit handles on a multi-selection, which is more work but is the model Figma users already know. `design.md` §7 records the chosen rule, added with the third amendment. Confirm or replace it before this ticket starts.

2026-09-18 — status `needs-triage` → `superseded`. The capability this ticket was waiting on shipped, and it shipped as the ticket's own recorded design call: a modifier extends the set, and a drag beginning on an already-selected target expresses the relation. `.scratch/several-targets-and-relations/` is `done` with every box ticked, its six relation families and the one sentence are covered by `tests/browser-loop.test.ts` and the resolution and store tests, the unreviewed design call was reviewed and decided (see that spec's **Decided already** and `advisors/`), and ADR-0023 records the gesture and the alternatives it traded against. `design.md` §5, §6 and §7 were amended in the same change, superseding amendment 4's deferral. Nothing here stands alone, so the whole ticket is superseded rather than partly absorbed.