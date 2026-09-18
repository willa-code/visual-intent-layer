# 05: Relational Intent by direct manipulation

**What to build:** An agent expresses Relational Intent the way a Builder-Reviewer does — by manipulating the selected targets rather than describing the relationship in prose — and the product reads it back as one plain sentence and stores it implementation-neutrally.

**Blocked by:** 04 (Compose, queue and send an Annotation)

**Status:** ready-for-agent

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [x] A relation is expressed by manipulating the selected targets, not through a picker and not through prose
- [ ] Each relation kind the product supports can be expressed, and the surface shows the current relation set back as one readable sentence
- [x] The stored Annotation carries the relation without pixel fields, and the envelope for the Annotation carries it
- [x] A recording demonstrates the manipulation, since a drag is easier to demonstrate than to describe
- [x] `relational-intent` exists in the feature map with the four required sections, its preconditions, and the exact commands actually used
- [x] The Lever's contract test gains this drive, asserting on the relation read back from stored state

## Comments

`relate` drives a real drag on the Arrange tool and reads the stored relation back; the contract test asserts a relation appears. Not driven live: every relation operator (the drag geometry decides the operator). `relational-intent.md` maps all operators.

Deferred 2026-09-17: `done` becomes `deferred` because the one remaining box cannot be driven. Deferred confirmation: the unticked box, "Each relation kind the product supports can be expressed, and the surface shows the current relation set back as one readable sentence", cannot be driven — Relational Intent was deferred out of the surface by `design.md` §11 amendment 4, and it is restored by `.scratch/several-targets-and-relations/`. The rest of the ticket stands: the manipulation mechanism shipped and was recorded, and no ticked box is rewritten.

2026-09-18 — status `deferred` → `ready-for-agent`. The reason for the parking is gone: Relational Intent returned as a gesture over a set, landed in `.scratch/several-targets-and-relations/` and is recorded by ADR-0023, so the unticked box is now drivable rather than blocked by a decision. It is not, however, met. The Lever drives four of the six relation families — `align-left`, `equal-gap`, `after` and `member-of`, plus a refusal case — and drives neither equivalence (`shared-property`) nor comparative size (`same-width` / `same-height`). The browser loop covers all six, so the product capability is evidenced; what is missing is the instrument. That gap is now shared with `.scratch/reach-within-the-class/issues/08`, which extends the same Lever, and it is listed in `.scratch/backlog.md` under **Parked, waiting on a human** as the one item there that is agent work. The `Trigger:` line above is kept as the history of the parking.
