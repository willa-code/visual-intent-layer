# Independent review — minimalist interaction designer

Lens: every word, control, step and field the human meets is on trial; a capability that adds chrome must buy back more intent than it costs, and where the product can carry a distinction silently it must.

## DECISION 1 — Q1 (R4, multi-page): KEEP

**WHY.** The refusal is not a pending gap; it is shipped behaviour. `serveArtifactAsset` routes a `text/html` request to `serveOutsideDocumentNotice` (`src/service/http.ts:1489`, notice page `src/service/http.ts:1542-1572`), the layer intercepts an in-page link to another local `.html` and posts the same one sentence (`src/ui/artifact/layer.ts:1087-1121`), and `.scratch/target-evidence/issues/02` is `done` with acceptance criteria requiring exactly that sentence plus a way back. Serving other documents as pointable pages buys nothing a human can act on — there is no layer to point with — and it would push a new question into the chrome ("which document am I judging?"), a second subject beside the artifact, against VISION.md:52 and VISION.md:26 ("One control, one claim"). The backlog wording ("no spec took it", `.scratch/backlog.md` Reach) understates what already happened; the honest record is a refusal with a trigger, not a later feature.

*P2, within the same decision:* in the intercepted-click path the artifact never moves (`event.preventDefault()`, `src/ui/artifact/layer.ts:1114`) yet the notice still offers "Back to the reviewed document" (`src/ui/app.ts:1128-1134`) — one action for a non-event. The served notice page earns the action; the in-page notice does not need it.

**BOLDER.** One sentence, once, and no action when nothing moved. The notice page also spends the claim twice (heading "This link leaves the reviewed document" plus the message); the sentence alone is the boldest honest form. The refusal itself should stay exactly as wide as it is.

## DECISION 2 — Q2 (R5, rule-out sentences): KEEP

**WHY.** The exclusion is already written, just where nobody reads it: `.scratch/visual-intent-layer/spec.md:345` names "Documents, slides, PDFs, images, video, native desktop UI, or mobile application artifacts in V0", and `.scratch/review-surface/spec.md:427` repeats it. Published docs do not: the boundary is stated in the positive (`docs/background/product-strategy.md:90-100`) and rules out three other things in its closing sentence, while the four nouns appear in neither README.md, SECURITY.md nor design.md. Silence in the front door reads as an omission, and fixing it costs no control, no field and no word on the surface. The one real risk is spending the sentence three times: VISION.md:24-25 says a fact lives in one place, so this goes into the sentence that already rules things out, and nowhere else.

**BOLDER.** Not four paragraphs and not a support matrix: the four nouns inside the existing "not V0 commitments" clause at `docs/background/product-strategy.md:100`, so the list can never drift from the boundary it belongs to, and no reader ever meets a second copy.

## DECISION 3 — Q3 (T2, two tabs): KEEP (park)

**WHY.** A conflict marker is the expensive kind of chrome: it needs detection (a version or lock on every write), a worded state ("another tab has this review"), and a resolution act, all for a case the stated user does not have — one Builder-Reviewer, singular (CONTEXT.md "Builder-Reviewer"). Pass A refused it by name and kept last-write-wins (`.scratch/surface-refinement-pass-a/spec.md:374-375`). Nothing new becomes expressible, so VISION.md:39 (Precision) gives nothing back, while VISION.md:40-41 (Effort, Calm) both degrade for every session. A stable shareable review URL also means a second tab is the same review, which is a property, not a bug to police.

**Unparking evidence:** a real second session losing writing (`.scratch/backlog.md` Trust item's own trigger). Even then the cheapest honest form is a write-time refusal naming the other tab, never a merge UI, and never a sentence shown to everyone who ever opens two windows.

**BOLDER.** none. The boldest honest position is the current one: one URL is one review, and the product does not manufacture a conflict it cannot fix.

## DECISION 4 — Q4 (E7, declared state): KEEP (park)

**WHY.** E7 asks for a new evidence family — an open dialog, an active tab strip, a filter chip, a typed form value — which the product can only learn by demanding that the artifact report it: new wire fields (the envelope's `runtimeState` today carries only address, scroll, viewport and the frame chain, `schema/envelope-v0.4.schema.json:253-290`), new instrumentation in the human's build, and new words beside every target. A half-recorded state family is a false floor: the same failure returns at the next state the family misses. Before designing any of it, note that the honest readings already exist and are derived rather than stored — `src/resolution/model.ts:104-116` yields both "May exist only in a state no longer on screen" and "Inside a boundary this surface cannot read" — and the human's own acts already ship (`RepointAction`, `DeclareMissingAction`, design.md:295-296; approval blocking at `src/annotation/model.ts:186-187`). A closed dialog leaves address, scroll and viewport unchanged, so the target derives as `deleted` (`src/resolution/model.test.ts:33-35`); that is unsatisfying, but it is not a claim the surface cannot support.

**Unparking evidence:** the backlog's own trigger — a dogfood correction failing because the state, not the target, moved (`.scratch/backlog.md` Evidence). The first response to that evidence should be to test whether the existing derivation can be widened, not to open a recording surface.

**BOLDER.** none to build. The ambitious move, when evidence lands, is to push the derivation further rather than add a field: the product already owns the words for "this cannot be known from here", and they cost the human nothing.

## DECISION 5 — Q5 (R8, suggested re-points): KEEP (park)

**WHY.** Every honest shape of a suggestion is either forbidden or already shipped. With several candidates it is a list, and both a ranked list and a numeric confidence are anti-patterns (design.md:444-446); with one candidate it is a claim the product cannot check, and CONTEXT.md "Target Resolution" refuses to choose an uncertain target — a wrong pre-selection then needs an undo path, i.e. a new control and a new decision. The suggestion is already drawn: uncertainty is marked on the artifact and never listed (design.md:236-239), a `CandidateMark` carries no evidence figure (design.md:294), and the human's next selection re-points via `RepointAction` (design.md:295). That mark answers Precision and Effort better than a sentence would, because it reuses the gesture the human already knows.

**Unparking evidence:** re-pointing by hand proving to be the friction in real use (`.scratch/backlog.md` Resolution UX). Even then the honest form is a mark, not a proposal.

**BOLDER.** none. The shipped form is the boldest honest one: the proposal is the human's own next point, spent as a gesture rather than as a ranked claim.

## DECISION 6 — Q6 (P9, own stamp transform): KEEP (park), with one documentation-only slice

**WHY.** Owning the transform hands the human a new build step and a new failure mode inside their own project, and makes the product maintain other people's compilers — refused with reasons and a named trigger in `docs/adr/0021-claim-exact-provenance-only-from-instrumentation.md`. The product already owns the contract and reads both attributes (`src/adapters/source-stamp.ts:16-19`: `data-vis-source`, and `data-insp-path` from `code-inspector-plugin`), and a missing stamp reads honestly as unavailable rather than as weaker exact (CONTEXT.md "Provenance Confidence"; design.md §4 Provenance). So the cost is a reachability problem, not a capability gap.

**Smallest honest slice, and it belongs in documentation, not code:** ADR-0021 permits citing a working instrument, and the repo cites none where a user would look — README.md:316 names the adapter and README.md:162-165 explains the confidence axis, but no published file says what produces a stamp (the evidence lives at `.scratch/target-evidence/research.md:629-631`). One clause in that README paragraph, naming `data-insp-path` and `code-inspector-plugin`, is the whole fix.

**BOLDER.** That one clause, and nothing in chrome: it turns "unavailable" into "exact" for whoever opts in, at zero new controls and zero new steps for anyone else.

## DECISION 7 — Q7 (T1, redaction): KEEP

**WHY.** Redaction is a control the human must operate per evidence kind and per Annotation, a new word ("redact", "excluded", "redacted"), a new stored state that must then be verified and disclosed to the agent, and a new lie surface ("what did we actually send?"). Against VISION.md:40-41 it loses on both Effort and Calm, and it defends a risk the product can already state before delivery: the drawer's "What leaves this machine" lists the Annotations, the Captured Views and remote-origin contact (`src/ui/app.ts:862-895`), and says "Nothing will leave this machine yet." when the queue is empty (`src/ui/components.ts:479-486`).

*One caveat inside the same decision:* SECURITY.md:51-52 claims the UI discloses "exactly which evidence an envelope carries", but the per-target line names only label, role, accessible name, selector and box (`src/ui/components.ts:605-623`). Runtime State Evidence leaves unnamed — the artifact's address including query and fragment, its scroll, viewport and frame chain (`schema/envelope-v0.4.schema.json:253-290`). A query string is precisely where a token could ride out. Recording disclosure as the deliberate whole should be paired with making that one claim true, in the existing list, with no new control.

**BOLDER.** No redaction affordance, and one derived line naming the address and scroll among the evidence that leaves, so the human can decide what to open at all. The boldest form of "no redaction" is a disclosure complete enough that nobody needs one.