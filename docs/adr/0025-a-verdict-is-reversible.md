# A verdict is reversible, and a closed Pass is a record

**Status:** accepted

The surface has one "no". `Reject` retires and `Not Fixed` is the single verdict
that a revision did not satisfy an Annotation, with `Obsolete` the abandonment.
Marking Not Fixed delivers nothing by itself: it judges one Annotation, and the
acts that follow are adding to the note, re-annotating, or asking for another Pass.
A decision is reversible, and changing it is one act. The verdict controls stay on
a decided row, the decision already recorded is marked on its own control, and
choosing another verdict applies it directly — reopening the Pass that closed
around the old decision. A decided row stays in the ledger rather than behind the
closed toggle, which now holds only Replaced and obsolete rows, because hiding it
would hide the act of changing it. There is no separate Reopen control, because a
second control to protect a first one is a tax the surface does not need.

Closing a Pass is a record rather than a label. It is allowed with members still
undecided, and those members read as **never decided** rather than as work still
to do. A closed Pass refuses later Target Resolution writes, so its outcome counts
and result revision stop changing, and opening, closing and reopening are recorded
as events rather than one overwritten timestamp.

**Considered Options:** Keeping `Reject` beside `Not Fixed` was rejected because
`CONTEXT.md` defined only one of them, so the two controls asked a Builder-Reviewer
to guess a distinction the domain never made. Making a verdict terminal, as it was,
was rejected because the only route back was a Replacement, and the domain reserves
a Replacement for new direction rather than a changed mind. Requiring a Reopen
control before a verdict could be changed was rejected because the product can
reopen the Pass as a consequence of the act the Builder-Reviewer already made.
Refusing to close a Pass with undecided members was rejected because it turns the
Builder-Reviewer's own decision to stop into an error.

**Consequences:** `design.md` §6 gains the `VerdictControls` and `PassLedger`
wording and §11 an amendment. `CONTEXT.md` states Not Fixed as the single "no" and
the Pass as frozen once closed. A Not Fixed Annotation stays amendable, because
adding to the note is the sharper attempt it asked for, so `ReplaceAction` is
offered there too and a decided row is not hidden behind the closed toggle. Stored
`rejected` records and `reject` verdicts are read as Not Fixed, so no migration
loses a decision. ADR-0019 is extended rather than reversed: a Pass is still the
unit of review and only the Builder-Reviewer closes it. Another Pass, which opens a
new Pass from a closed one, is a separate decision in `.scratch/closing-the-loop/`.