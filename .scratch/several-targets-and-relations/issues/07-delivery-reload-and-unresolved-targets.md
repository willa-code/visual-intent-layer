# 07: Delivery, reload and a relation whose target moved

**What to build:** The recorded relation leaves the machine on delivery and survives a reload, and a relation whose target can no longer be matched is reported in words rather than silently dropped or silently kept.

**Blocked by:** 03

**Status:** done

- [x] A recorded relation travels in the delivered envelope for its Annotation, with no pixel field
- [x] The set and the relation survive a surface reload and a service restart
- [x] When a target a relation names cannot be matched in the current revision, the row states it in words and the relation is neither silently dropped nor silently treated as matched
- [x] The existing resolution and blocker vocabulary is used rather than a new parallel model

## Comments

Done 2026-09-17. A store test proves the relation survives a restart and appears on the delivered envelope with no pixel field. `missingRelationTargets` names a target a relation refers to that is gone, and the row and card state it in words; driven live by patching the target set and reloading.

The Verification Run of 2026-09-17 drove all six families, then replaced the target set with a plain click between drives. Relations naming the removed targets were kept, rendered with raw target ids, and would have been delivered in an envelope referencing targets absent from the Annotation. That is a defect in this ticket's subject, found by the run and fixed after it: `relationsAmong` keeps a relation only while every target it names is present, `AnnotationStore.update` and `AnnotationStore.repoint` prune with it, and the shell states the removal in a notice. Driven live by the new browser-loop case that removes a member from a set carrying a relation.
