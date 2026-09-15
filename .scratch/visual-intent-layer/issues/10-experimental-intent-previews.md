# 10: Try the three experimental Intent Previews

**What to build:** Drag-to-reorder, align, and match-size ghost proxies let the Builder-Reviewer demonstrate an arrangement reversibly, each preview on probation until ticket 17 judges it against selection plus text.

**Blocked by:** 07 (Express Relational Intent across targets)

**Status:** done

- [x] Drag-to-reorder, align, and match-size manipulations render reversible ghost proxies against the live artifact
- [x] Confirming a preview emits the same implementation-neutral relational semantics as ticket 07 with authoritative source untouched
- [x] Discarding a preview restores the artifact exactly with no DOM or source residue
- [x] Each preview records the interaction evidence ticket 17 needs for its keep-or-kill verdict

## Comments

Implemented (implemented in 8b70d52): drag-to-reorder/align/match-size ghost previews (src/ui/previews.ts), reversible with interactionEvidence timestamps, confirm emits same relational semantics as ticket 07, discard restores DOM exactly; each records evidence for ticket 17 verdicts.

Superseded: drag-to-reorder, align and match-size stop being separate experimental previews and become the input method for Relational Intent inside the Review state, so the keep-or-kill question this ticket deferred is answered by whether they work as the relation input (ADR-0016).

See `.scratch/review-surface/spec.md`.
