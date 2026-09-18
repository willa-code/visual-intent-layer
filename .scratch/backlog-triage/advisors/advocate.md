# Independent review — sceptical user advocate

**Lens:** for every idea I asked whether it leaves the person pointing at their own work doing more work, thinking harder, or being told something the product cannot know — and whether the current silence is doing any of those things already.

---

## DECISION 1 — R4, a multi-page saved site artifact

**VERDICT: KEEP.**

**WHY.** The refusal already ships as an act, not as an omission: `serveArtifactAsset` routes any `text/html` local asset to `serveOutsideDocumentNotice` (`src/service/http.ts:1507-1510`), whose page says "`<name>` is another document. This artifact is reviewed as one document, so it is not served with pointing." (`:1545`) and offers "Back to the reviewed document" (`:1561`). Ticket 02 is `done` (`.scratch/target-evidence/issues/02-name-a-navigation-off-the-reviewed-document.md`). Serving that second page unpointed would be worse for the human than refusing it: VISION's whole thesis is that pointing raises fidelity, so a page you cannot point at is a wall you walk into silently. The backlog entry is the *feature* ("Promotes when: dogfooding a real multi-page saved site makes the refusal the friction"); no such dogfood is recorded anywhere in this repository. So the feature stays pending, but the record should stop reading as an open question: the one-document boundary is an accepted, implemented, asserted decision, and the only edit I want is that sentence in the backlog's Reach section.

**BOLDER.** The refusal is right; its way back is not free. The notice's action is wired to `reloadArtifact()` (`src/ui/app.ts:1131-1133`), which POSTs `/reload`; that route adopts the current revision *and* calls `markPassesReady` unconditionally (`src/service/http.ts:465-467`), unlike `/adopted`, which guards it (`:262-263`). So clicking a link off the document and coming back can move a Pass to **ready** with no new revision — the rail then says it is your turn while the agent is still working, which `design.md` §4 says only a new revision may do. The boldest honest form keeps the refusal and makes the return a re-point of the frame at the reviewed document — the same one line `reloadArtifact` already contains (`src/ui/app.ts:1798`) — with no new words and no new control.

## DECISION 2 — R5, rule-out sentences for phones, native desktop, design files, PDFs

**VERDICT: KEEP.**

**WHY.** I verified the absence rather than trusting it: no occurrence of *mobile, phone, native desktop, Figma, PDF, design file* in `README.md`, `SECURITY.md`, `design.md`, `VISION.md` or `CONTEXT.md`. The exclusions exist only where a Builder-Reviewer does not read: `.scratch/visual-intent-layer/spec.md:345` names "Documents, slides, PDFs, images, video, native desktop UI, or mobile application artifacts in V0", and `docs/background/product-strategy.md:105` rules out production apps only. `README.md` has no scope section at all (its headings run Install → Use → … → License), so a human on a phone or with a Figma file gets silence, which reads as "we never thought about it". VISION says a fact lives in one place; write it once, in `README.md`, in four nouns and one sentence — a doc sentence, not a capability.

**BOLDER.** Let that one sentence carry the reason, in the product's own already-published words for a boundary it cannot read (`design.md` §11 amendment: "Inside a boundary this surface cannot read"). A reader who learns *why* does not come back to ask again, and the reason is a fact the product already states elsewhere.

## DECISION 3 — T2, two tabs on one session

**VERDICT: CHANGE.**

**WHY.** I agree with parking the lock, the second-reviewer workflow and revision history: Pass A refused them by name (`.scratch/surface-refinement-pass-a/spec.md:345` Out of Scope, "A revision history, a second reviewer, or a lock or version check between two browser sessions. Last-write-wins stays for now"), and no lost write is recorded. What I do not accept is that the current silence is harmless. One open mints one session and the same review URL (`src/mcp/service.test.ts:24-30` asserts reuse), and `adoptedRevision` is one field on that session (`src/service/sessions.ts:14`). Tab A shows revision 1's bytes; tab B reloads, and `/reload` writes `adoptedRevision` for the session (`src/service/http.ts:465`); tab A's three-second poll then copies that revision into *its own* label (`src/ui/app.ts:1720-1722`) although only the reloading tab re-fetched the frame (`:1798`). The result is a tab that states "Revision under review: 2" while displaying revision 1, that flips every row's revision reading (`annotation.writtenRevision === this.adoptedRevision`, `src/ui/app.ts:619`), and that stamps the next Annotation with revision 2 through `createDraft` (`src/service/http.ts:338`) while the target evidence came from revision 1. `design.md` §5 is explicit that which revision an Annotation was written against is part of what it means; VISION's Honesty test forbids the rest.

**BOLDER.** The smallest honest slice adds nothing to the surface and no locking: a tab adopts the revision *it* is showing, so drop the poll's adoption of another actor's revision (`src/ui/app.ts:1720-1722`) and let the tab that reloads set and report it, as it already does (`:1790`). No word, no control, no notice. Evidence that would unpark the lock itself: a real second session losing a write — the backlog's own trigger, still unobserved.

## DECISION 4 — E7, declared state beyond the address

**VERDICT: KEEP.**

**WHY.** The parked work is storage, and the schema shows exactly how much is missing: `runtimeState` holds only the address and the frames' addresses and scrolls (`schema/envelope-v0.4.schema.json:253-290`), with viewport and scroll living in `renderedGrounding` (`:412-426`); nothing records a dialog, a chip or a typed value. But the human is not stranded or lied to about their own act: re-pointing and Declared Missing both ship (`src/annotation/store.ts:354, :375`; `src/service/http.ts:577, :613`), and Declared Missing reads in their own words and clears the blocker. The derived reading is deliberately narrow — README requires that the target "was pointed at a different address than the one now showing" (`README.md:159-165`) — so a closed dialog reads as Deleted when the product only knows it cannot find it now. That costs the human a thought ("was it deleted?"), not a wall; recovery is to re-enter the state and re-point. The maintainer's own note (backlog, Evidence) is that this wants a dogfood case first, and building a field, a UI and a wire shape for an unobserved case is exactly the speculative work the product should not do. Unpark evidence: a dogfood correction that fails because the *state* moved and hand re-pointing does not recover it.

**BOLDER.** None. Recording state is the parked work; adding a word or a field to hedge it would be the speculative move.

## DECISION 5 — R8, suggested re-points

**VERDICT: KEEP.**

**WHY.** This is the one parking that also raises fidelity: uncertainty is already marked on the artifact and the human points at the right target (`design.md` §5, "Uncertainty is marked on the artifact, never listed"; `CandidateMark`, `RepointAction`), and re-pointing ships (`src/service/http.ts:577`). The only forms a suggestion could take are the two `design.md` forbids by name — a ranked candidate list and a numeric confidence (§10) — and no unranked honest form has been designed. A product-chosen target would also contradict `CONTEXT.md`'s Target Resolution, which "never chooses an uncertain target". Park until hand re-pointing is observed as friction (the backlog's trigger).

**BOLDER.** None. The boldest form already ships: a mark on the artifact that costs one click, which is faster and more honest than any list.

## DECISION 6 — P9, our own source-location stamp transform

**VERDICT: KEEP.**

**WHY.** ADR-0021 refused owning per-framework transforms with its reason ("maintaining other people's compilers is not this product's job") and a named trigger, and the reader already accepts both attributes (`src/adapters/source-stamp.ts:13, :17-18`). A missing stamp reads honestly as unavailable/inferred and is never promoted to a file (`README.md:162-165`), so no human is misled; building the transform would hand them a new build step and a new failure mode inside their own project, which VISION's Effort test rejects. Leave the trigger where it is.

**BOLDER.** A sentence, not a transform: the product's own attribute `data-vis-source` appears in no reader-facing document (no match in `README.md` or `docs/`), so a consumer's build cannot even learn the contract the product already owns. Naming it costs one line and makes exact provenance reachable without the third-party plugin.

## DECISION 7 — T1, redaction before send

**VERDICT: KEEP.**

**WHY.** The disclosure is specific and live: the drawer's "What leaves this machine" counts Annotations and Captured Views and describes a capture as bytes that "leave this machine with the queue" (`src/ui/app.ts:868-890`), matching `SECURITY.md:50-51`. The human also keeps an act: any attachment, capture included, can be removed before or after send (`src/ui/app.ts:546-551`, `:1432-1440`; `DELETE …/attachments/…`, `src/service/http.ts:794-811`), and a capture exists only because they granted it (`src/ui/app.ts:1442-1460`). Partial redaction would add a control they must learn and could never trust to catch every token. Record in `SECURITY.md` that disclosure, plus the removal act, is the deliberate whole of the mitigation. One companion worth noting when it is written: that removal has no delivered-state guard (`src/annotation/store.ts:218-224`), so evidence can be dropped from an already-delivered row — a record-integrity question the same sentence should not accidentally bless.

**BOLDER.** None beyond the sentence. Naming a redaction affordance would be the speculative control; the boldest honest form is that the sentence states the mitigation *and* the one act that exists.