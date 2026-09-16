> **Dispositioned 2026-09-16.** This review is closed. Every finding below has been accepted, rejected, or deferred, and the dispositions are at the foot of this file under `## Disposition`. Read that before acting on anything here — nothing in this file is open advice, and two findings were rejected after the parent checked them against the code.

## Blocking

1. **The Check-In convention has no usable retrieval interface**  
   **Location:** `.scratch/surface-refinement/issues/12-publish-the-check-in-convention.md:9-14`; `src/mcp/service.ts:384-428`; `src/mcp/service.ts:326-330`  
   **Problem:** Verified: the MCP surface only exposes open, status-by-`envelopeId`, and acknowledge; it exposes no “read new direction since cursor/session” operation. Agent contact is merely an in-memory timestamp. Publishing prose cannot make steering discoverable after the original call resolves.  
   **Suggested change:** Add one durable Check-In operation keyed by session plus monotonic cursor, returning amendments/interruption requests and atomically recording contact. Keep capability flags deleted, but do not confuse “no push channel” with “no channel.”

2. **Three modes contradict the iteration’s own interaction research**  
   **Location:** `docs/background/mode-and-toolbar-research.md:18-46`; `design.md:156,262-268,340-341`; issue `03:3-16`  
   **Problem:** Verified: the research concludes that targeting needs only two states—operate and intercept—and explicitly says click, text drag, and box drag are distinguishable within the intercept state. The contract then promotes operate to a peer mode and splits box out, contradicting both that conclusion and its own anti-pattern.  
   **Suggested change:** Prototype one gesture-driven Point state: click selects an element, native text drag selects text, empty-space drag draws an Area; Escape returns to artifact operation. Retain Box only if live evidence identifies irresolvable gesture conflicts. The exact drive needed is: exercise links, sliders, native text, draggable content, whitespace, and touch emulation while recording false activations and ambiguous drags.

## Significant

3. **Collapsing Verify is sound, but the comparison model is not Annotation-scoped**  
   **Location:** `design.md:199-205`; issue `06:9-18`; `src/ui/app.ts:1047-1084`  
   **Problem:** Verified: the current comparison toggle switches one session-wide `/before` artifact and marks every deliverable Annotation together. Once reload adopts revisions, rows can have different `writtenRevision` values, so “before the change” becomes ambiguous or false.  
   **Suggested change:** Selecting a row must set the comparison pair from that Annotation’s written revision to its candidate result revision. Show verdicts only for the active row; collapse settled rows and provide filters such as Needs decision / In flight / Closed.

4. **“One list” risks replacing navigation with an ever-growing audit log**  
   **Location:** `design.md:186-205`; issue `06:3-18`; `design.md:141`  
   **Problem:** Inference: putting drafts, sent work, resolution candidates, attachments, five verdicts, supersession links, and history into a fixed 380px rail optimizes conceptual purity, not scan time. A real project will accumulate enough rows that current work disappears into history.  
   **Suggested change:** Keep one underlying list, but add workflow views and progressive disclosure. Default to actionable items; archive verified/obsolete/superseded chains behind a filter.

5. **Area is too weak as a first-class durable target**  
   **Location:** `CONTEXT.md:103-105`; issue `04:9-17`; `src/ui/artifact/layer.ts:287-310`  
   **Problem:** Verified: Area has geometry/Rendered Grounding and can never have Source Provenance. Inference: after responsive reflow it is often neither resolvable nor actionable, especially for “padding” or cross-element selections.  
   **Suggested change:** Keep Area only as a fallback capture gesture. On completion, infer enclosed elements, gap/edge relationships, and nearby labels; preserve the rectangle as evidence rather than pretending it is the target. If nothing semantic can be derived, require or automatically attach explicit visual evidence with consent.

6. **Supersession is the right storage rule but an expensive default interaction**  
   **Location:** issue `08:3-16`; `CONTEXT.md:43-45`; `src/annotation/store.ts:295-304`  
   **Problem:** Verified: supersession currently exists only as a terminal verdict with an optional successor ID; the proposed change makes every delivered correction a new Annotation. Inference: trivial typo corrections will create noisy chains and inflate the agent’s active context.  
   **Suggested change:** Preserve immutability internally, but present amendment as editing a working copy with a compact diff; collapse the chain into one row and send only the effective successor plus lineage metadata.

7. **A full-height rail is better than the overloaded top bar, but fixed width is untested**  
   **Location:** issue `01:3-16`; `.scratch/surface-refinement/spec.md:133-134`; `design.md:141`  
   **Problem:** Verified: legibility at 380px remains an explicit open question, yet the width is already normative.  
   **Suggested change:** Make the rail resizable/collapsible with responsive breakpoints before committing the composition. Deleting the top bar is otherwise the right call.

## Minor

8. **“No words” overfits expert canvas tools**  
   **Location:** issue `03:3-15`; issue `02:9-14`; `docs/background/mode-and-toolbar-research.md:50-69`  
   **Problem:** Verified: the benchmark set is dominated by familiar expert tools; Point and Box are not universal symbols, and hover tooltips do not help touch, keyboard discovery, or first use.  
   **Suggested change:** Keep one SVG set and ban emoji, but show a transient/persisted active-mode label and shortcut hint until the user demonstrates familiarity.

## Cut / add / missed

- **Cut:** the third mode; always-expanded verdict controls; Area as an equal semantic target; visible supersession-chain clutter.
- **Add:** a durable cursor-based Check-In interface, Annotation-scoped revision comparison, actionable/history filters, rail resizing, and semantic interpretation of drawn Areas.
- **This iteration optimizes for:** vocabulary cleanliness, chrome minimalism, and implementation deletion. Users care more about confidently knowing what gesture will happen, what the agent has actually seen, and what needs attention now.
- **Missed:** latency/acknowledgement guarantees, amendment coalescing, conflict handling when agent output overtakes an amendment, long-session information architecture, touch/zoom testing, and measurable targeting error rates.
## Disposition

| Finding | Outcome | Where it landed |
| --- | --- | --- |
| 1 The Check-In convention has no usable retrieval interface | **Accepted** | 14 added: a session-scoped, cursor-based Check-In call that returns new direction, amendments and pending interruptions, and records contact durably |
| 2 Three modes contradict the iteration's own research | **Accepted** | 03 rewritten: two tiles, with operating the artifact as the **unarmed resting state**. §10's anti-pattern restated so it cannot be misread as licensing an operate tile |
| 3 Collapsing Verify is sound but the comparison is not Annotation-scoped | **Accepted** | 19 owns per-row comparison; 20 owns the re-resolve flow that makes it meaningful |
| 4 "One list" risks replacing navigation with an audit log | **Accepted, narrowed** | 19: actionable Annotations first, closed ones behind **one** toggle. Filters were rejected by the maintainer as a second question in a surface whose vision is one question at a time |
| 5 Area is too weak as a first-class durable target | **Accepted** | 04: an Area reports the elements it encloses, and the rectangle is kept as evidence rather than presented as the target |
| 6 Supersession is the right storage rule, an expensive default interaction | **Accepted** | 08: editing a working copy with a compact view of what changed, the chain collapsed into one row, and only the effective successor delivered |
| 7 Fixed rail width is untested | **Accepted, narrowed** | resizing rejected for this iteration as a non-goal; legibility at the fixed width is measured in 13 instead of asserted |
| 8 "No words" overfits expert canvas tools | **Accepted** | 03 gains a one-time first-run hint that never returns; tooltips and accessible names are required |
| Cut the third mode | **Accepted** | 03 |
| Cut always-expanded verdict controls | **Partly accepted** | verdicts stay on the row for actionable rows, which is the maintainer's decision that an Annotation is judged where it sits; closed rows are hidden by default in 19 so they stop accumulating |
| Cut Area as an equal semantic target | **Accepted** | 04 |
| Cut visible supersession-chain clutter | **Accepted** | 08 |
| Add a durable cursor-based Check-In interface | **Accepted** | 14 |
| Add Annotation-scoped revision comparison | **Accepted** | 19 and 20 |
| Add actionable/history filters | **Narrowed** | 19: one "show closed" toggle, no facets or search |
| Add rail resizing | **Rejected this iteration** | spec non-goals; measured in 13 |
| Add semantic interpretation of drawn Areas | **Accepted** | 04 |
| "This iteration optimises for vocabulary cleanliness, chrome minimalism and implementation deletion" | **Accepted as a fair criticism** | 19 (what needs attention now) and 20 (confidence that the loop closed) exist because of it |
| Missed: latency and acknowledgement guarantees | **Deferred** | spec's deferred list |
| Missed: amendment coalescing | **Accepted** | 08's chain collapse |
| Missed: conflict handling when agent output overtakes an amendment | **Deferred and recorded as a known gap** | 20's comment and the spec's deferred list; nothing in this iteration detects it |
| Missed: long-session information architecture | **Partly accepted** | 19's ordering and toggle; a full IA is deferred |
| Missed: touch and zoom testing | **Deferred** | spec's deferred list |
| Missed: measurable targeting error rates | **Deferred** | spec's deferred list |
