# Collection is the boundary for taking back a send

**Status:** accepted

A send the agent has not read can be taken back; a send it has read cannot. The
boundary is **collection**, not acknowledgement, because acknowledgement is
optional and an agent can read a delivery through a held call, a `check_in` or a
status read without ever acknowledging it. A Pass therefore records the moment it
is collected, and `TakeBackAction` is offered only while that moment is absent: it
returns the Annotations to the queue, marks the Pass taken back, and records the
withdrawal. Once collected, the action is gone and a Replacement is the act that
changes what was sent, because what the agent was told is a record and a delivered
Annotation is never deleted.

The same rule governs re-aiming a judgement. Re-pointing a target or choosing a
different candidate is offered only on an undecided Annotation, or after its
decision has been reopened; a judged Annotation refuses the act at the store, so a
verdict can never be silently re-aimed at a different target. Reopening a decision
returns the Annotation to undecided, which restores both the re-point action and
the approval controls.

**Considered Options:** Gating the withdraw on acknowledgement was rejected
because it would let a Builder-Reviewer erase a send the agent already holds,
whenever the agent read it without acknowledging. Gating it on nothing, and
deleting any delivered Annotation, was rejected because it would rewrite what the
agent was told. Adding the moment of collection to the Review Surface only, and
not to the stored Pass, was rejected because the boundary has to survive a restart
and be the same fact the store enforces, not a surface guess.

**Consequences:** `Pass` carries `collectedAt`, and the service stamps it wherever
the agent reads a delivery: a held call returning the envelope, `check_in`,
`get_intent_status` and `acknowledge_intent`. A Pass gains the `withdrawn` state
and a `withdrawn` history event. `AnnotationStore.repoint` refuses a decided
Annotation, and the surface offers **Undo decision** on a decided row so the
re-point route is reachable again. `design.md` §6 and §11 are amended and
`CONTEXT.md` gains **Take Back** and the collection rule on **Pass**.