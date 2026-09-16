> **Dispositioned 2026-09-16.** This review is closed. Every finding below has been accepted, rejected, or deferred, and the dispositions are at the foot of this file under `## Disposition`. Read that before acting on anything here — nothing in this file is open advice, and two findings were rejected after the parent checked them against the code.

## Inherited decisions and constraints (baseline contract)
- Precedence (§1): accessibility > privacy/security (incl. ADR-0015) > CONTEXT.md > **design.md** > local taste; a conflict is resolved **by amending the contract first**, never by an implementation decision (§11: "made before the implementation changes").
- ADR-0012/0016/0017 and CONTEXT.md "Verify"/"Verified Intent" make verification a per-Annotation human act; design.md §5/§6 already encode one list + per-row verdicts, so the "Verify is not a place" pivot is *contract-backed*, not a new decision.
- ADR-0008 deliberately selected progressive host enhancement "when negotiated."
## Findings
### Blocking
**B1 — New interaction language is being built without the design.md amendments §1/§11 require.**
Location: `.scratch/surface-refinement/spec.md` (header + issues 05/09/11) vs `design.md` §5/§6 and §11.
Amendment 2 ends: *"Still open from the same dogfood, and amended separately: the anchored card and its copy, and the Stop action and its host contract."* No third amendment exists (design.md §11 records only the two 2026-09-16 entries), and design.md §6 lists no Stop component and no theme control, while §5 fixes the overflow menu to exactly *"end session, reload artifact, copy artifact path, copy evidence, and open the disclosure."* Issues 09 (Stop action + its "host contract") and 11 (theme control) therefore resolve open contract questions **by implementation decision**, which §1 forbids. Suggested change: record a third design.md amendment *before* tickets 05/09/11 — add `StopAction` and `ThemeControl` to §6, state where the theme control lives (overflow/drawer, since §5 says non-core jobs go there), update §5's overflow list, and state the Stop action's host contract (or that it has none).
**B2 — The capability-flag deletion over-reaches ADR-0008's deliberate negotiation path.**
Location: issue 07 ("`detectCapabilities`, `deliveryPlan`, `describeCapabilities` and the capability type are gone") vs `design.md` §10 anti-pattern and ADR-0008.
§10's added anti-pattern bans only *"A capability flag gating behaviour that does not exist."* The stub is genuinely dead (`capabilities.ts:16` `void hostId;`, `service.ts:270` passes no declaration), so deleting `deliveryPlan`/`steering` honours §10. But `embeddedUI` and `subscriptions` are ADR-0008's *deferred, not refused*, enhancement path — ADR-0008: *"Embedded MCP Apps, active-turn steering, subscriptions, and other optional capabilities will progressively enhance the experience when negotiated."* Removing the type and the negotiation seam discards that path silently, and CONTEXT.md still carries "Certified Experience." Suggested change: delete only `deliveryPlan` and the `steering` flag; keep (or explicitly sustain) the `embeddedUI`/`subscriptions` negotiation seam, **or** record an ADR that supersedes ADR-0008's negotiation clause so the discard is a decision rather than an omission. This is judgement-call blocking: name it for the parent.
### Significant
**S1 — Mode island over the artifact is compliant; the pointer/contrast floor is not asserted.**
design.md §5 explicitly permits *"The mode island is the only chrome over the artifact"*; §10's modal/dialog ban and ADR-0015's fidelity clause (base rewriting, remote origins, proxy) do not apply. §6 explicitly licenses icon-only mode selection. However, issue 03 never asserts §8's *"Pointer targets meet the 24×24 minimum"* (the collapsed single tile especially) nor a 3:1 non-text check for tile states. Suggested change: add acceptance criteria citing §8 and the §4 Mode cue set.
**S2 — Reordering Annotations is silently dropped.**
Location: previous spec US 38 (*"I want to reorder how annotations will be presented to the agent"*) and Implementation Decisions (*"individually deletable and reorderable before sending"*) vs the new spec/issue 06.
Issue 06 only says the rail lists them *"in the order they set"*, but no ticket, acceptance criterion, or §6 component provides a reorder affordance, and the new spec never declares it dropped. The capability exists today (`http.ts:284`, `store.ts:179`, `app.ts:907`) and risks vanishing in the rebuild. Suggested change: either add a reorder criterion to issue 06 or move reordering to non-goals explicitly.
**S3 — Icon-only `delete` may breach §6/§10.**
Location: issue 05 (*"attach and delete are icon buttons"*) vs design.md §6 *"Consequential actions use visible text"* and §10 *"Icon-only controls for consequential actions."* Deleting a draft Annotation is irreversible. Suggested change: keep `delete` worded, or record the judgement that a pre-send draft delete is not consequential.
**S4 — Host-capability-degradation promise from the previous spec quietly leaves the test plan.**
Previous spec Testing Decisions: *"Delivery lifecycle — idempotency, duplicate delivery, acknowledgement versus verification, host-capability degradation."* The new iteration deletes capabilities and has no Testing Decisions section, so this promised seam disappears without acknowledgement. Suggested change: state which of the previous spec's test seams survive.
### Minor
**M1** — Spec's irrationale ("`deliveryPlan`'s output is never branched on") is imprecise: the strategy is dead, but the *label* is surfaced (`service.ts:289` → `http.ts:319` → `app.ts:876`). Say "never branched on," not "never read."
**M2** — CONTEXT.md's Next-Pass Intent is *"held for a new agent turn after active work finishes,"* but issue 07 sends the queue as `next-pass` even while the agent holds the call. Worth one clarifying sentence, not a change.
**M3** — Ticket 12's "only the opening call records agent contact" is verified (`server.ts:59` is the sole `noteAgentContact` caller).
## Verified vs inferred
Verified from files: every citation above. Inferred: that ADRs are binding-equivalent to the §1 ladder (the ladder names design.md, not ADRs); that `delete` is "consequential"; that the rebuild will drop reorder.
## Compliance, one line each
- Collapsing Verify into per-row verdicts: **compliant** (ADR-0012, CONTEXT.md, §5/§6).
- Mode island over the artifact: **compliant** (§5).
- Icon-only mode tiles: **compliant** on §6 permission; §8 floor unasserted (S1).
- Check-In convention: **compliant** — CONTEXT.md "Check-In" already reads *"seen at a Check-In and never mid-step, so both ask rather than take effect."*
- Theme never sampled: **compliant** (§2, §10).
## Need from main agent
For B2: is the intent to keep a host-negotiation seam for `embeddedUI`/`subscriptions` (ADR-0008), or to supersede ADR-0008's negotiation clause as a recorded decision? That answer decides whether B2 is a required spec change or a required ADR.
## Suggested execution prompt
No worker handoff is warranted yet: the blocking items are contract edits (a third design.md amendment; an ADR decision), which belong to the main agent, not an executor.

## Disposition

| Finding | Outcome | Where it landed |
| --- | --- | --- |
| B1 interaction language built without the §1/§11 amendments | **Accepted** | amendment 3 recorded: the card contract, the Stop action and its host contract, and the theme control's placement. 05, 09 and 11 now rest on contract text that exists |
| B2 capability deletion over-reaches ADR-0008 | **Accepted** | 07 narrowed: only `deliveryPlan`, `DeliveryPlan` and the `steering` flag go; `embeddedUI` and `subscriptions` keep their seam and the declaration becomes reachable through the tool schema. ADR-0018 retires ADR-0008's steering clause only |
| S1 §8's pointer and contrast floor unasserted for the island | **Accepted** | §8 updated to name the island and the 24×24 floor at rest; 03 carries the criteria; 13 measures |
| S2 reordering silently dropped | **Accepted** | 19 owns reordering; `CONTEXT.md`'s Annotation Queue now states that the order is what the agent receives |
| S3 icon-only delete may breach §6/§10 | **Accepted with a recorded judgement** | §6 states why deleting an unsent Annotation is not consequential in the sense it means; 05 records the judgement and when to revisit it |
| S4 the previous spec's host-capability-degradation test promise vanishes | **Accepted** | the spec gains a Testing decisions section stating the retirement is deliberate, and which seams survive, are re-cut, or retire |
| M1 "never branched on" imprecise | **Accepted** | the spec says the strategy is never branched on and is computed, returned and ignored, and that the label is surfaced |
| M2 Next-Pass Intent versus sending while a call is held | **Accepted as covered** | 07 requires the send action to state what will happen and whether a call is currently held |
| M3 confirmed | **Noted** | no change |
| "Need from main agent": keep the negotiation seam or supersede ADR-0008? | **Answered** | keep the mechanism, retire the steering clause — recorded in ADR-0018 |
