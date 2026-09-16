> **Dispositioned 2026-09-16.** This review is closed. Every finding below has been accepted, rejected, or deferred, and the dispositions are at the foot of this file under `## Disposition`. Read that before acting on anything here — nothing in this file is open advice, and two findings were rejected after the parent checked them against the code.

# Review — factual-claim audit of the surface-refinement iteration
Read-only review. Everything below is from files at the cited lines; inferences are marked.
## Claim verification
| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `deliveryPlan`'s strategy computed, never branched on | **Verified** | Computed `src/mcp/service.ts:269`, returned `:288`; HTTP uses only `delivery.label` (`src/service/http.ts:314`), UI uses the string (`src/ui/app.ts:833`). `.strategy` appears only in `src/host/capabilities.test.ts`. |
| 2 | `detectCapabilities` never passed a declaration; voids host id | **Verified** (production) | `src/mcp/service.ts:268` passes only a host string; `src/host/capabilities.ts:17` `void hostId`. A `declared` argument exists only in `capabilities.test.ts:17`. |
| 3 | PATCH has no state guard; delivered Annotation editable in place | **Verified** | `src/service/http.ts:521-531` → `annotations.update`; `src/annotation/store.ts:88-108` mutates note/targets/relationships/revisionRelation with no state check. |
| 4 | `session.revision` written at mint, never updated | **Verified** | Sole writer `sessions.mint` (`src/service/sessions.ts:31`); no update path. Reload only re-points the frame (`src/ui/app.ts:1131`); `sessionStatus` recomputes but does not persist (`src/service/http.ts:772`). |
| 5 | `draft` intent still calls `markDelivered` | **Verified** | `src/mcp/service.ts:269-279` always marks delivered; store moves draft/queued→delivered (`src/annotation/store.ts:236-241`); HTTP accepts `draft` (`src/service/http.ts:297-306`). |
| 6 | Only `open_visual_review` records agent contact; memory only | **Verified** | `src/mcp/server.ts:59` is the only caller; store is `const agentContact = new Map` (`src/mcp/service.ts:97`). |
| 7 | Card carries four lines of instruction copy | **Verified, with a counting caveat** | Four strings: label `What should change?` (`src/ui/app.ts:479`), placeholder `Describe the change…` (`:483`), `Enter queues this Annotation. Cmd/Ctrl+Enter…` (`:504`), `Add an image by picking a file, pasting, or dropping it here.` (`:513`). Counting the placeholder as copy gives four; prose-only gives three. |
| 8 | Tool row is five word-labelled buttons | **Verified** | `TOOLS` five entries (`src/ui/components.ts:120-126`), rendered as text buttons `:128-148`; confirmed in `…11-53-16-mode-research/evidence/01-opened.png`. |
| 9 | Arrange with nothing selected produces no result; a Verification Run recorded it as an unreachable path | **Mostly verified; attribution is inferred, not stated** | Code: `src/ui/artifact/layer.ts:onPointerDown` returns when no matching selected element. The run's only `unreachable` entry is `browser /wait` for `.anchored-card` at 11:55:41.650, ~158 ms before screenshot `05-arrange-with-no-selection` (11:55:41.808) — i.e. the drive timed out on a card that never opened. The run record never names "Arrange"; the feature map documents the behaviour (`…/features/relational-intent.md:42`). |
| 10 | Boxed target renders as the bare word "region" | **Verified** | `describeRegion` sets no label/accessibleName/semanticRole (`src/ui/artifact/grounding.ts:88`); `describeTarget` falls to `… ?? target.kind` (`src/ui/app.ts:1240`). |
| 11 | Top bar grows past its declared 48px when the agent sentence is present | **Overstated** | `.topbar { height:48px }` (`src/ui/styles/shell.css:52`) sits in a body grid row of `var(--topbar-height)` (`:20`); the sentence wraps inside a 360px `max-width` child (`:176`). The box cannot grow — the text overflows it. The 01-opened/05 screenshots show 2–3 lines that stay roughly within 48px. |
| 12 | Island can sit over the stage without the frame swallowing pointer events | **Unverifiable from source; architecturally plausible** | No island exists yet. Shell chrome already overlays the iframe: `.anchored-card` is `position:absolute;z-index:25` over the stage and is interactive (`shell.css:726-728`), so the pattern is proven. |
## Other load-bearing claims
- `HostCapabilities`, `DeliveryPlan`, `describeCapabilities` are production-unused — **Verified** (grep: only `capabilities.ts` + its test). Note: the review URL's `?cap=` is a *session auth* token (`service/sessions.ts:32`), unrelated to host capability — deletion must not touch it.
- Three tools fail silently on first try (Pointer/Text/Arrange) — **Verified**: `layer.ts` early-returns for non-`element` tools on over/click; Pointer is the no-interception state.
- Sending empties the queue and Verify is a separate place — **Verified**: `renderQueue` filters `isInQueue`; send moves queued→delivered; delivered rows render only under `view === 'verify'` (`app.ts:379-402`, `:566`).
- `Cmd/Ctrl+I` toggles a state (design §7/amendment) — **Verified** present (`app.ts:1189`).
- Single-key shortcuts ignored in a field while tool buttons stay enabled — **Verified** (`app.ts:1188-89`; `toolRow` buttons never disabled).
- "Steering" offered although no host declares it — **Verified**: `caps.steering` is always false in production (`capabilities.ts:17`), yet the `<select>` offers it (`app.ts:404`).
## Settleable only by running, not reading
1. Whether the agent sentence actually overflows/tips the 48px bar at real widths.
2. Whether the island receives pointer events over the live iframe under the artifact's own scroll/layers.
3. Rail-head legibility at 380px with identity + agent position + overflow (open question).
4. Whether a real agent honours the Check-In convention from the shipped descriptions (armccii ticket 13).
5. Drag-vs-native-text-selection threshold predictability on dragging artifacts.
6. Contrast of every semantic pair in both themes (gallery pass).
## Findings
- **Significant — claim 11 is used to justify composition and is not true of the code.** Location: `design.md` §11 amendment 1, `.scratch/surface-refinement/spec.md` Problem Statement. The bar's height is fixed by both rule and grid track, so the regression is overflow, not growth. Smallest fix: restate as "the agent sentence overflows the fixed 48px bar," or move the claim to the run-only list until driven.
- **Significant — the Arrange unreachable path is asserted as recorded but the record does not name it.** Location: spec Problem Statement; `.visual-intent-verify/runs/2026-09-16_11-53-16-mode-research/run.json` `unreachable[0]`. Suggested fix: cite the `05-arrange-with-no-selection` screenshot + timestamp as the attribution, or have ticket 13 name the command in the record.
- **Minor — "four lines of instruction copy" depends on counting the placeholder.** Location: spec Problem Statement vs `app.ts:479/483/504/513`. Suggested fix: state the four strings explicitly.
- **Minor — claim 12 is an assumption, not a verified fact.** Location: ticket 03 AC "sits at the stage's lower edge." Suggested fix: mark as to-confirm in the ticket-13 run.
## Merge verdict
**OK with notes.** All eleven code-behaviour claims that can be read from source are confirmed; claim 11 is overstated in the direction the amendment leans on, and claim 9's *recorded* attribution needs citing but its underlying behaviour is correct. No blocking issue for a design iteration.

## Disposition

| Finding | Outcome | Where it landed |
| --- | --- | --- |
| Claims 1–6, 8, 10 verified | **Accepted as stated** | no change; the claims remain load-bearing and are now backed |
| Claim 7, the counting caveat | **Accepted** | the spec names the four strings instead of asserting a count |
| Claim 9, the recorded attribution | **Accepted** | the spec cites `select-region-1789559725815.aria.txt` and `05-arrange-with-no-selection.png` and the run record's `unreachable[0]` timeout, rather than claiming the record names `Arrange` |
| Claim 11 overstated — overflow, not growth | **Accepted** | `design.md` amendment 1 corrected to say the sentence overflowed a fixed bar; the spec's problem statement corrected |
| Claim 12 unverifiable from source | **Accepted** | 03 carries a driven criterion; 13 measures pointer events over the live iframe |
| `?cap=` is session auth, unrelated to host capability | **Accepted** | 07 carries an explicit do-not-touch criterion; ADR-0018 records the collision so a later reader does not conflate the two |
| Six claims settleable only by running | **Accepted** | carried into 13's measurement criteria as requirements, not assertions |
| Merge verdict: OK with notes | **Noted** | no claim was left unresolved |
