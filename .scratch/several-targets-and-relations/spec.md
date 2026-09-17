# Several targets and relations: pointing at a set, then saying how it relates

Status: needs-triage

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
