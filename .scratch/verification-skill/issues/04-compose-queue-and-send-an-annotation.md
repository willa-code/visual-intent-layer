# 04: Compose, queue and send an Annotation

**What to build:** An agent drives the first half of the Visual Direction Loop the way a Builder-Reviewer does: select a target, write a note onto it, queue the Annotation, send the Annotation Queue, and read back what the product actually stored.

**Blocked by:** 03 (The Lever — launch, health, evidence and cleanup)

**Status:** done

- [x] A target is selected through the Review Surface's own targeting, for the Review tools the feature file names
- [x] A note is written onto the selected target and the Annotation appears in the Annotation Queue
- [x] Several Annotations can be queued, and the Queue can be reordered
- [x] The Annotation Queue can be sent with each supported delivery timing
- [x] The stored Annotation state is read back as structured data and includes the Annotation's delivery state
- [x] A recording shows the user action and the resulting state together, and a screenshot names the state it captures
- [x] A dry-run of sending performs no delivery
- [x] `annotate-and-send` exists in the feature map with the four required sections, its preconditions, and the exact commands actually used
- [x] The Lever's contract test gains this drive, asserting on the read-back state as well as the visible result

## Comments

`select`, `annotate`, `queue`, `reorder` and `send --intent next-pass|steering|draft` are implemented and driven live; the contract test sends with every timing and reads the stored state back. `annotate-and-send.md` maps the feature.
