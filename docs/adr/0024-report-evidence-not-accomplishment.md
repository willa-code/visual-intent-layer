# Report evidence, not accomplishment

**Status:** accepted

A Pass reports what the artifact revision did to each anchor, and the words say only
what the product can observe: **changed**, **same** or **not found**. *Changed* means
the evidence at that anchor differs from what the Builder-Reviewer pointed at; *same*
means it does not; *not found* means Target Resolution could not locate it. The
product never says a note was answered, fixed or satisfied, because nothing reports
that: an agent changing a file is not evidence that a request was met, and a change
the captured evidence cannot see — a colour, a border — would read as *same*. The one
comparison that decides the Pass counts also decides the sentence on the row, so the
header and the row can never disagree.

**Considered Options:** Keeping ADR-0019's *answered*, *untouched* and *gone* was
rejected because "answered" reads to a Builder-Reviewer as "the agent did what I
asked", which the product cannot know, and because "gone" carries three different
claims — an ambiguous target that still has candidates, a target with none, and the
Builder-Reviewer's own declaration — in one word. Drawing the outcome on the artifact
was rejected because it restates the Pass header and the row, and an anchor that was
not found has no location on the artifact to carry a mark. Inferring the comparison
from geometry, so that a target which only moved reads as *changed*, was rejected
because movement is not an attempt at the note and the before/after control already
shows it.

**Consequences:** `design.md` §5 and §6 are amended to remove the pass-outcome marks
and to state that every mark on the artifact is something the Builder-Reviewer can act
on — a target, a candidate or a relation ghost — and that nothing derived is drawn
there. The stored and wire `outcome` becomes `changed`, `same`, `notFound`, with older
records read through a mapping from their old names. ADR-0019 is amended rather than
reversed: a Pass is still the unit of review and only the Builder-Reviewer closes it.
This decision covers the outcome vocabulary alone; declaring a target missing,
reopening a verdict, asking for another Pass and the failure states are owned by
`.scratch/closing-the-loop/`.