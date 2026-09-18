# Require human verification to complete intent

> **Superseded in part by ADR-0025 and ADR-0026.** The verbs are no longer
> "approve, reject, supersede, or mark obsolete". `Reject` retires and `Not
> Fixed` is the single verdict that a revision did not satisfy an Annotation. A
> later Annotation that replaces a delivered one is a Replacement, and asking for
> another attempt opens a new Pass; neither is a per-Annotation verdict.

A delivered Visual Intent Envelope is not complete merely because an agent acknowledges it or changes source. The product will retain its original artifact revision and target evidence, resolve the target against the resulting revision, and require the Builder-Reviewer to approve, reject, supersede, or mark the intent obsolete. This makes human verification part of the domain lifecycle and requires it to survive process restarts.
