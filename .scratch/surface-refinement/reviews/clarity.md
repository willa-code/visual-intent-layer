> **Dispositioned 2026-09-16.** This review is closed. Every finding below has been accepted, rejected, or deferred, and the dispositions are at the foot of this file under `## Disposition`. Read that before acting on anything here — nothing in this file is open advice, and two findings were rejected after the parent checked them against the code.

## Review
Lens: can these tickets be executed by an agent with no context? Verified against the files; inferred items marked.
### Blocking
**B1. No ticket owns the test seams that these changes break.**
Verified: `tests/browser-loop.test.ts:105` clicks `name: /Element tool/` and `:143` clicks `'Verify'` — both deleted by 01/03/06; `tests/lever-contract.test.ts:239` loops `['next-pass','steering','draft']` expecting delivery, which 07 forbids for `draft`; `tests/host/capabilities.test.ts` (whole file) imports `detectCapabilities`/`deliveryPlan`, deleted by 07; `tests/gallery-snapshot.test.ts:47,57` regenerates missing baselines, so any drift "passes". Only ticket 13 mentions evidence, and it scopes itself to the verification skill's feature files. Smallest fix: add a ticket "re-cut the test seams" blocked by 01–11, and add to 07's checklist "delete `src/host/capabilities.ts` and its test".
**B2. Ticket 09 (stop) has no expressible delivery.**
Verified: `src/annotation/envelope.ts:22` throws on zero Annotations; `schema/envelope-v0.2.schema.json` gives `annotations` `minItems: 1`; `markDelivered` requires ids and stamps `sentAt`/history. 09 requires "a stored batch with `review-interruption` intent" and "the Annotation states are unchanged", which the envelope contract cannot carry. Fix: decide the carrier (a session-scoped interruption record, not a Visual Intent Envelope), then split off a ticket for the envelope/schema amendment; 09 as written is ungradeable.
**B3. Nothing defines where relational intent lives once `Arrange` is deleted.**
03 removes the mode and asserts the capability "is reachable only when two or more targets are selected" — no gesture is named; 04 gives every drag a different meaning (text range / area). `src/ui/artifact/layer.ts:305-330` (`arrange` in `onPointerDown`), `computeRelation`/`alignmentFor`/`startDrag` (~150 lines) become unreachable with no ticket. `design.md` §5 still draws "relation guides and handles" and §6 keeps `RelationGuide`/`RelationSentence`, and `.scratch/review-surface/spec.md` names relational intent as the non-parity differentiator. Fix: add a ticket defining the relation gesture (or an explicit "relations deferred, amended in `design.md`§5/§6/§10" decision).
**B4. Ticket 10's mechanism breaks three seams it does not name.**
10 says reload updates the revision under review and "the stored session revision reflects the new file". Verified: `src/service/sessions.ts:46` `findByArtifactRevision` is how `http.ts:453,516,548` authorize every `/api/annotations/*` call, keyed by `annotation.writtenRevision` — after reload those lookups fail (401) and 10's own criterion 7 ("an Annotation written against the previous revision is marked as such") becomes unreachable; `http.ts:890` saves the snapshot under `session.revision` and `serveArtifactBefore` (`http.ts:906`) reads it, so overwriting `session.revision` makes before/after show the same revision. Fix: 10 must add a distinct field (e.g. `lastCheckedRevision`) and list the call sites; do not overwrite `session.revision`.
### Significant
**S1. Ticket 12's key criterion is ungradeable.** It requires the descriptions to "name the tool that reads it", but there is no session-scoped "new direction" tool: `listTools` (`src/mcp/service.ts:391-441`) is `open_visual_review`/`get_intent_status`/`acknowledge_intent`, and only `open_visual_review` records contact (`src/mcp/server.ts:59`). A steering/stop batch delivered while the agent was not waiting is retrievable only by `envelopeId`, which the agent does not have. Fix: decide the Check-In read (re-wait on `open_visual_review`, or add a session-scoped status tool) inside 12.
**S2. 06 and 08 overlap, and neither names a delivery seam.** 06 lists `supersede` as a row verdict; 08 makes supersession the effect of `Amend` and says it must state what replaced it — both could claim the same control. Both also need "deliver these Annotations with this intent": `sendQueue` (`src/mcp/service.ts:242-246`) sends the whole queue and throws when it is empty, so it cannot serve 08's amendment or 09's stop. Fix: remove `supersede` from 06's verdict list and make it unreachable except through `Amend`; add a ticket for `deliver(annotationIds, intent)`.
**S3. 06 presupposes resolution timing.** "Its candidate chooser when a resolution is ambiguous" needs a resolution run, which today only happens on entering Verify (`app.ts` `enterView` → `request-candidates` → `resolveAll`, guarded by `resolvedRevision`). With one state, nothing says when re-resolution runs.
**S4. 11's theme control has no home.** 01 closes the rail head's contents and the overflow menu's contents (mirroring `design.md` §5, which also forbids frequent actions there) and §6's inventory has no theme control. Fix: place it in 01 or add the `design.md` §5/§6 entry in 11.
**S5. Ticket 03 contradicts itself** ("the island hides while an anchored card is open" vs "the mode stays reachable by pointer while focus is in a field"): every text field lives in the card, so both cannot hold. `design.md` §5 and §7 restate the same two claims. Fix: choose one — the island stays visible over the card, or the card carries the mode tiles.
**S6. 02 and 11 both rewrite the gallery and its baselines, unordered.** Both edit `src/ui/gallery.ts` (which still renders `toolRow`, `stateSwitch`, `SendControls`, and a Listbox of "Pointer/Element/Text/Region") and require `tests/__screenshots__` regeneration; every UI ticket (01/03/05/06/07) drifts `gallery-light.png`/`gallery-dark.png`. Nobody owns regenerating the PNGs after the dust settles. Also: 01, 03, 05, 06, 07, 08, 09, 10, 11 all rewrite `src/ui/app.ts`, and 01/03/06/11 all rewrite `src/ui/styles/shell.css`, while 11 is declared startable at any time. Fix: order 11 after 01–10 (or make it blocked by 01), and add a final "regenerate the gallery baselines once" step, taken by whichever of 02/11 lands last.
**S7. `design.md` §11 is not maintained.** Its second amendment defers "the anchored card and its copy, and the Stop action and its host contract" to separate amendments; no ticket amends `design.md`. Related: deleting capability negotiation leaves `docs/adr/0008-progressively-enhance-mcp-hosts.md`, `docs/background/product-strategy.md:76,146,217` and `docs/pi-validation.md` asserting host steering as a capability, and 12 only covers README/skill/CONTEXT.
**S8. Ticket 13 cannot reach its own drives.** `lever.mjs:852` clicks a `Review` button that 01/06 delete, `:844` whitelists `element|text|region|arrange`, `:922` excludes `review-interruption`; there is no `amend` or `stop` command. Running the drive commands as written returns exit 4. Fix: add lever commands/whitelists before 13.
### Tickets I would add
1. Re-cut the test seams (`browser-loop`, `lever-contract`, gallery baselines) for the new vocabulary — blocked by 01–11.
2. Delete `host/capabilities.ts` **and** `host/capabilities.test.ts`; retire `SendResult.delivery` (fold into 07).
3. Define the relation gesture in the three-mode model, or record relations as deferred and amend `design.md` §5/§6/§10.
4. Introduce `deliver(annotationIds, intent)` and make 08 and 09 depend on it.
5. Decide the carrier for Review Interruption; amend the envelope/schema if one is needed (blocks 09).
6. Decide the Check-In read path and, if a tool is needed, add it (blocks 12).
7. Place the theme control in the rail head or overflow; update `design.md` §5/§6 (blocks 11).
8. Amend `design.md` §11 for the card copy, the Stop action and one-state composition; update ADR-0008/product-strategy for capability deletion.
9. Update the lever drive surface (modes, amend, stop, intent whitelist) — blocks 13.
10. Regenerate the gallery screenshot and token baselines once, after 01–11.
11. Retire the dead `arrange` code path in `src/ui/artifact/layer.ts` and the `arrange` member of `LayerTool` in `src/ui/protocol.ts`.
**Merge verdict: BLOCK.** B1–B4 each make at least one ticket ungradeable or leave a reachable seam broken.

## Disposition

| Finding | Outcome | Where it landed |
| --- | --- | --- |
| B1 no ticket owns the test seams | **Accepted** | 16 rescoped to the baselines and the cross-cutting sweep; a "re-cut the tests this change breaks" criterion added to all 15 UI and behaviour tickets |
| B2 09 has no expressible delivery | **Accepted** | 09 rewritten onto a session-scoped interruption record; 14 owns the record; the envelope's `review-interruption` value documented as reserved |
| B3 relational intent orphaned by deleting `Arrange` | **Accepted as real, resolved by deferral** | 18 deferred (`Status: needs-triage`); `design.md` §5/§6/§7 amended so the contract stops promising guides, handles, sentences and a gesture |
| B4 10 breaks three seams it does not name | **Accepted, verified by the parent** | 10 rewritten to write a distinct field, never `session.revision`, and to name every call site |
| S1 12's key criterion is ungradeable | **Accepted** | 14 added (the Check-In call); 12 blocked by 14 |
| S2 06 and 08 overlap, and neither names a delivery seam | **Accepted** | `supersede` removed from 06's verdicts; 15 added (`deliver(annotationIds, intent)`); 08 blocked by 15 |
| S3 06 presupposes resolution timing | **Accepted** | 20 added; 06 carries a criterion and points at it |
| S4 11's theme control has no home | **Accepted** | `design.md` §5's overflow list and §6's `ThemeControl`; 11 now blocked by 01 and 02 |
| S5 03 contradicts itself on the hidden island | **Accepted** | §5 rewritten: the island is never hidden; 03 criteria updated |
| S6 02 and 11 unordered; baselines unowned | **Accepted** | 11 blocked by 02 and 01; 16 owns the baselines |
| S7 `design.md` §11 unmaintained; ADRs still assert host steering | **Accepted** | amendment 3 recorded; ADR-0018 written; 12 carries the criterion to correct the asserting documents |
| S8 13 cannot reach its own drives | **Accepted** | 17 added; 13 blocked by 17 |
| The eleven tickets you would add | **Accepted** | 1→16, 2→07, 3→18 (deferred), 4→15, 5→14/09, 6→14/12, 7→`design.md` §5/§6, 8→amendment 3 + ADR-0018, 9→17, 10→16, 11→03 |
| Merge verdict BLOCK | **Cleared** | every blocking item was resolved in one pass; the set is ready for an agent |

**Rejected sub-claim.** "`gallery-snapshot.test.ts` regenerates missing baselines, so any drift passes" is wrong. Checked by the parent: the baseline is auto-written only when the file is absent or `UPDATE_GALLERY=1`; with the file present, drift fails the pass. The real risk — that nobody owns regenerating it after the UI lands — stands, and 16 now owns it.
