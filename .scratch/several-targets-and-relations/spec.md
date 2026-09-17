# Several targets and relations: pointing at a set, then saying how it relates

Status: done

Scope and gesture accepted by maintainer decision. The design and the tickets are not
written; this file exists so the capability has an owner rather than a promise with
nowhere to land.

## Why it exists

`design.md` §11 amendment 4 defers Relational Intent explicitly and conditionally: the
capability returns "in a later iteration with a gesture that is designed rather than
inherited". ADR-0016 names it the product's deliberate non-parity with integrated
design-mode products, and `surface-refinement/18` owns the one design call that was
never reviewed. The `target-evidence` spec restates the gap in its own Out of Scope:
"No relation is built and none is promised."

Its input is missing too. Multi-target composition shipped and was removed in `14a73a1`
without a decision record, which `.scratch/truth-and-sync/issues/05` corrects in the
record. So today no surface path produces more than one Target — `selectElement`
(`src/ui/artifact/layer.ts:207`), `selectEnclosed` (`:237`) and the text-range path
(`:340`) each assign a one-element array — while the envelope, the store, the resolver
and the shell all still carry the set: `relationships` is in
`schema/envelope-v0.3.schema.json:179,468` and in `Annotation.relationships`
(`src/annotation/model.ts:6,53`), and the shell patches the whole array
(`src/ui/app.ts:925-950`).

## What it will build

- **The set.** Point at several targets into one Annotation, with the set visibly marked
  while the note is written, and remove one without starting again.
- **The gesture.** Dragging a target that is already selected moves a ghost and infers
  one relation, shown back as one plain sentence before release. A drag that begins
  anywhere else behaves as the artifact does, so text selection is unaffected.
- **The relations.** Order, alignment, equal spacing, containment, shared property and
  comparative size, each expressible by manipulating the set — the operator vocabulary
  ADR-0016 reduced to the relations that have a real gesture.
- **Implementation neutrality.** The stored relation is the desired relationship, with
  no pixel field anywhere, and the agent chooses the implementation.
- **Reversibility.** The artifact's source and authoritative DOM are never changed by a
  relation drag, and the ghost and sentence are the Intent Preview that was promised: a
  reversible visual proposal, shown before it is recorded.
- **The sentence.** Shown in the card and in the rail row from one implementation.
- **The contract change.** `design.md` §5, §6 and §7 are amended in the same change,
  superseding amendment 4's deferral, and a new ADR records the gesture and the
  alternatives it traded against. The `README.md` sentence corrected by
  `.scratch/truth-and-sync/issues/08` is restored with the capability, and the
  verification skill's relational-intent feature file stops saying "deferred" and gains
  a drive, and the Lever regains `select --add` as the set-building drive —
  `.scratch/truth-and-sync/issues/08` removes it only because nothing reads the modifier
today.

## Decided already

- The gesture is **(a)**: a modifier extends the set, and a drag beginning on an
  already-selected target expresses the relation. The alternative — explicit handles on
  a multi-selection, the model Figma users know — was considered and not chosen, because
  it costs a new selection-bounds component and the island's two tiles are a settled
  decision.
- Multi-target composition returns; the model keeps "one or more targets" in `CONTEXT.md`
  and in the envelope.
- **Intent Preview is not a separate capability.** The ghost plus one sentence is the
  reversible preview. The drag-to-reorder / align / match-size roadmap item retires, and
  the `dogfood.md` preview table that asks for verdicts on it is superseded rather than
  filled in.

## Open before tickets can be written

- The exact modifier for extending the set, and how a set is cleared or reduced.
- The keyboard route: `surface-refinement/18` requires relational intent to be reachable
  with the keyboard alone, or the absence of a keyboard route to be stated.
- The maximum set size, and whether a drawn Area participates in a relation.
- The sentence's vocabulary for each operator, and what happens when the drag geometry
  infers nothing — a refusal stated in words, or no relation recorded.
- Whether the set and a recorded relation survive a reload, and what re-resolution does
  to a stored relation whose targets changed.
- Whether the ghost is drawn by the artifact layer or by the shell, given that the layer
  executes inside the artifact's document under its own content policy.
- Which target the anchored card is positioned near when the set holds several.

## Out of scope

- Style values, pixel displacement, and a freehand pen, highlighter, arrow or shape
  palette: ADR-0016 considered and refused a stroke layer, and `design.md` §10 forbids
  the rest.
- A relation picker or an operator list: ADR-0016 removed them because a relation must
  have a real gesture.
- Canvas-object applications and desktop shells: those need the target's cooperation and
  are adapter opportunities, with tldraw recorded as the cheap exception.
- Proof and measurement, which remain parked.

## Comments

Landed 2026-09-17: `Status: done`. Every ticket in `issues/` is done with every acceptance box ticked. The set, the gesture, all six relation families, the one sentence, delivery and reload are implemented and covered by `tests/browser-loop.test.ts`, `src/annotation/relations.test.ts`, `src/annotation/model.test.ts`, `src/annotation/store.test.ts` and `tests/lever-contract.test.ts` (314 tests green, `scripts/check-records.js` green). `design.md` §5/§6/§7 and a new amendment supersede amendment 4, and ADR-0023 records the gesture.

No Verification Run was performed for this iteration. The tickets `.scratch/truth-and-sync/05` deferred to "the Verification Run of `.scratch/several-targets-and-relations/`" therefore stay deferred; that run is the named trigger and the next step.

**Verification Run, 2026-09-17.** Run `.visual-intent-verify/runs/2026-09-17_16-24-50-several-targets-and-relations` ended `changed`: it drove the set, all six relation families and the sentence, and found a defect. Replacing the target set between drives left relations pointing at targets that had left the Annotation, rendered with raw target ids and deliverable in an envelope referencing targets absent from `annotations[].targets`. Fixed in `97bac1e` (`relationsAmong`, pruning in `AnnotationStore.update` and `AnnotationStore.repoint`, and a stated notice on removal), then re-driven.

Run `.visual-intent-verify/runs/2026-09-17_16-39-37-several-targets-and-relations` ended `clean`, with no unreachable paths. It drove `relational-intent` sub-features `relation-alignment`, `relation-spacing`, `relation-containment`, `relation-equivalence`, `relation-comparative-size`, `relation-ordering`, `relation-sentence` and `relation-stored`; `annotate-and-send` `select-point`; `open-artifact`; and `accessibility-and-keyboard` `rail-legibility`, `island-pointer-events`, `tile-minimum-size`. `measure` reported no problems, `network` no failures and `console` no errors. The pre-release preview sentence is asserted by `tests/browser-loop.test.ts` rather than captured mid-drag by the Lever, which releases the drag in one command.

An exploratory run at `2026-09-17_16-20-13-several-targets-and-relations` was cleaned up without a `finish` and is not the record. Both recorded runs name the trigger `truth-and-sync` set for its parked tickets; those stay `deferred` pending maintainer time, which is the other half of their trigger.
