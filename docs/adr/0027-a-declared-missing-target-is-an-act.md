# A declared missing target is the Builder-Reviewer's act

**Status:** accepted

When Target Resolution finds no candidate for a target, the product may say only
that it could not find it. It may not say the target is gone, because that is a
claim about the world rather than a report of a failed search, and only the
Builder-Reviewer can make it. So the surface offers one act, **Declare missing**,
beside re-pointing and only where the resolution found no candidate. It stores the
Builder-Reviewer's own declaration on the Annotation, stamped with the result
revision it was made against; it reads on the row in their words, never as the
derived `Deleted`; it clears that target's approval blocker; and it travels in the
next envelope so the agent is told the target is gone.

A declaration is made against one revision. When the artifact moves on and the
target is resolved again, the declaration no longer matches and the blocker
returns, so a stale declaration cannot quietly hide a target the product could
now find. The act is offered only where there is no candidate, because declaring a
target missing while candidates exist would hide evidence the Builder-Reviewer
should be choosing between; there the surface offers re-pointing instead.

**Considered Options:** Recording the declaration as a new kind of Target
Resolution was rejected because resolution is derived at read time and re-derived
on every revision, so a Builder-Reviewer's act stored there would be overwritten
by the next resolution run, and it would put a judgment inside a vocabulary the
domain reserves for evidence. Leaving the blocker in place after a declaration was
rejected because the act would then have no consequence, and the only route past a
target the Builder-Reviewer knows is gone would remain re-pointing it at something
else, which is the approximation the contract forbids. Carrying the declaration as
free text in the note was rejected because the agent reads targets, not prose, and
the product could not tell a declared target from an unrelated sentence.

**Consequences:** The envelope's target definition gains an optional
`declaredMissing` object carrying the time and the revision, an additive change to
version `0.3`. `CONTEXT.md` defines the act and keeps it clear of Target
Resolution's derived words. `design.md` §6 gains the action and §11 an amendment.
`approvalBlockers` consults the declarations, so approval clears only for a target
declared missing against the revision under review.