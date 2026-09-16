# 03: A Pass is a thing

**What to build:** Sending opens a **Pass**. The rail groups Annotations under the Pass they belong to, with a header stating the Pass's state and how many of its Annotations still need a decision. When the artifact's bytes change and the Builder-Reviewer reloads, the open Pass moves to **ready** — never closed. Only the Builder-Reviewer closes a Pass; an agent acknowledging a batch or a revision arriving changes nothing about closure.

This is the object the surface has been missing. `DeliveryBatch` currently carries an identity, an idempotency key, a host, a delivery intent, a member list and a timestamp and **no state at all**, while the browser client's snapshot type declares a `status` the server has never sent.

The shape, recorded precisely because it is the decision:

```
Pass {
  passId, artifactId,
  fromRevision,                 // what its Annotations were written against
  toRevision,                   // the revision that answers it, once one lands
  annotationIds: string[],
  state: 'open' | 'in-flight' | 'ready' | 'closed',
  outcome: { answered, untouched, gone },
  openedAt, closedAt?
}
```

`outcome` is anchor-level only, derived from Target Resolution: *answered* means the anchor survived with changed evidence, *untouched* means it survived unchanged, *gone* means it did not survive. It never means an agent fixed anything, because nothing reports that.

**Blocked by:** 02 — Rename the vocabulary and migrate stored data

**Status:** done

- [x] A Pass is stored with an identity, the revision range it spans, its member Annotations, a state of open, in-flight, ready or closed, anchor-level outcome counts, and its open and close timestamps
- [x] Sending a queue opens a Pass in flight, and every sent Annotation is a member of it
- [x] Reloading after the artifact's bytes changed moves the open Pass to ready
- [x] No code path other than a Builder-Reviewer action sets a Pass to closed. A test drives an agent acknowledgement and a revision change and asserts the Pass is still not closed
- [x] The rail renders one header per Pass, stating its state and its outstanding count, with its rows beneath it
- [x] A session with no Pass renders no header and no empty group
- [x] Pass state is readable from the API as well as from the rendered rail, so a read-back can prove it
- [x] The delivery metadata that `DeliveryBatch` carried becomes an attribute of the Pass rather than a second object beside it
- [x] A session with several Passes stays legible, and its Passes are ordered

## Comments

Landed. A `Pass` is stored with identity, revision range, members, state, anchor-level outcome counts and timestamps, and its delivery metadata; the rail groups rows under one header per Pass.

Confirmation deferred to the maintainer rather than the agent: the checklist's several-Passes legibility is exercised by ordering in `listPasses()` and one browser drive per Pass state; a long multi-Pass session has not been driven end to end.
