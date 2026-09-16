# 10: Reload adopts the revision, and the notice clears

**What to build:** The artifact-changed notice stops repeating forever. Reloading records the revision the surface has adopted **in a new field**, never by overwriting `session.revision`, which is what every annotation route authorises against and what the before/after snapshot is keyed by. The notice is short — one sentence and one action — and the revision identity lives in the rail head in mono instead of being pasted into the sentence. The artifact is never reloaded without being asked, because which revision an Annotation was written against is part of what the Annotation means.

**Blocked by:** 01 (one rail)

**Status:** ready-for-agent

- [ ] The adopted revision is a field distinct from `session.revision`, so `findByArtifactRevision` continues to find the session for every Annotation's `writtenRevision` and no annotation route starts refusing with 401
- [ ] The before/after snapshot is not keyed by the field this ticket writes, so before and after never resolve to the same revision
- [ ] Reloading updates the adopted revision, and the change check clears once it has been acted on
- [ ] The notice appears once per change, clears when acted on, and does not reappear while the artifact is unchanged across at least three polls
- [ ] The notice's text is one short sentence with no revision hash in it
- [ ] The revision currently under review is visible in the rail head as mono identity
- [ ] The artifact is never reloaded automatically: only a Builder-Reviewer action reloads it
- [ ] Reloading while an anchored card is open does not lose the note, and the card's target is re-resolved against the new revision
- [ ] An Annotation written against the previous revision is marked as such after the reload, in those words
- [ ] Every call site this field affects is named in the change, and driven evidence shows the annotation routes still authorising after a reload
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review, which found that the original mechanism broke three seams it did not name: `src/service/http.ts` authorises seven annotation routes through `findByArtifactRevision(annotation.artifactId, annotation.writtenRevision)`; the snapshot the before/after toggle reads is written under the session revision; and the ticket's own criterion about marking older Annotations becomes unreachable if `session.revision` moves, because the session for the old revision stops being found.
