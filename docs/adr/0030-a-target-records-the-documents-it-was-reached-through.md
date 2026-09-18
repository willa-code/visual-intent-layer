# A Target records the documents it was reached through

**Status:** accepted

Runtime State Evidence keeps the artifact's own address in its existing field and
gains an ordered chain of the documents the Target was reached through, each with
the frame that names it, its own address relative to the artifact's base, and the
scroll it was showing. Until this, a Target inside a same-origin frame could only
be recorded as though it lived in one document, so a frame navigation and a node
that moved could not be told apart.

Folding the frame into the single address string was refused: the derived state
label compares that string with the address on screen, so a composite would report
a state change for every frame Target even when nothing moved. The chain also
gives the backlog's **Declared state beyond the address** one place to land, so it
is a shape rather than a third expansion.

**Consequences:** The envelope minor version moves to 0.4. Every 0.3 field keeps
its shape and a 0.3 envelope still validates, read as 0.4. `Target Resolution`
records the viewed chain beside the viewed address, scroll and viewport, and
compares a frame by its path so one frame navigating never reports an unrelated
frame's Target as moved.
