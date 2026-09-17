# 02: Amend the contract for the designed gesture

**What to build:** The contract stops deferring Relational Intent and states the designed gesture, so the code that follows is implementing a contract rather than contradicting one.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `design.md` §11 gains an amendment that supersedes amendment 4's deferral of Relational Intent, recording why the capability returns and what is being re-promised
- [x] `design.md` §5 is amended so the artifact-document overlay draws the relation ghost, and the mode island and card are unchanged
- [x] `design.md` §6 restores the relation-sentence component on the `AnnotationCard` and the rail row, from one implementation
- [x] `design.md` §7 records the relational-drag binding: a drag beginning on an already-selected target is a relation drag; a drag beginning anywhere else behaves as the artifact does, so text selection is unaffected
- [x] A new ADR records the gesture, the rejected alternative (explicit handles on a multi-selection), and the decisions on the modifier, the cap, the Area, the refusal and the keyboard route
- [x] `CONTEXT.md`'s Relational Intent, Visual Intent Layer and Intent Preview entries describe the capability that ships, with Intent Preview named as the ghost plus the sentence rather than a separate capability
- [x] `README.md` is restored to describe gathering several targets into one Annotation and expressing how they relate
- [x] The amendment is recorded in `design.md` before the capability code lands

## Comments

Done 2026-09-17. `design.md` §11 gains the 2026-09-17 amendment superseding amendment 4; §5 draws the ghost, §6 restores `RelationSentence`, §7 records the set modifier, the relation drag and the stated-absent keyboard route. ADR-0023 records the gesture, the rejected handles alternative and how each family is chosen. `CONTEXT.md` (Relational Intent, Visual Intent Layer, Intent Preview) and `README.md` describe the shipped capability. The amendment landed before the capability code.
