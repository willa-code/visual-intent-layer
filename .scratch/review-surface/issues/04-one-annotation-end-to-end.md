# 04: One Annotation, end to end

**What to build:** In Review, choosing the Element tool and clicking part of the artifact opens a card anchored next to what was clicked. Typing in that card and queueing it creates a durable, individually identified Annotation in the Annotation Queue. Sending the queue delivers the Annotations to the agent as one envelope carrying each Annotation's own identity, and the surface shows where each one stands.

**Blocked by:** 03 (Give the surface a product-owned shell and a design language)

**Status:** done

- [x] Selecting an element with the Element tool opens a card anchored to that element and clamped to the viewport
- [x] A note typed in the card becomes an Annotation with its own identity, target and note, listed in the Annotation Queue
- [x] Annotations can be deleted and reordered before sending
- [x] Sending the queue delivers one envelope carrying each Annotation's identity, target evidence and note
- [x] The surface distinguishes locally queued, host-accepted and agent-acknowledged state per Annotation
- [x] Repeated delivery is idempotent and cannot create silent duplicates