# Review Surface lifecycle: complete code trace

Status: evidence document. Every claim below carries a `file:line`. Where a claim is
about what the *product* does, it is read from source, not from running the app.
Where I could not determine something from code it is in §8.

Files read in full: `design.md`, `CONTEXT.md`, `.scratch/surface-refinement/spec.md`,
`src/ui/app.ts`, `src/ui/components.ts`, `src/ui/api.ts`, `src/ui/protocol.ts`,
`src/ui/runtime.ts`, `src/ui/artifact/layer.ts`, `src/ui/artifact/grounding.ts`,
`src/annotation/model.ts`, `src/annotation/store.ts`, `src/annotation/envelope.ts`,
`src/annotation/migrate.ts`, `src/annotation/attachments.ts`, `src/resolution/model.ts`,
`src/resolution/resolve.ts`, `src/mcp/service.ts`, `src/mcp/server.ts`,
`src/service/check-in.ts`, `src/service/http.ts`, `src/service/sessions.ts`,
`src/artifact/revision.ts`, `src/artifact/snapshots.ts`, `src/host/capabilities.ts`,
`tests/browser-loop.test.ts`, `tests/lever-contract.test.ts`.

Two entry points exist for the same surface. The **browser shell** is
`src/ui/app.ts` (1483 lines, class `App`), served by `serveReviewShell` (`src/service/http.ts:903-923`)
into an iframe stage plus a rail. The **HTTP API** is `handleApi` (`src/service/http.ts:225-704`),
and all annotation state lives in `AnnotationStore` (`src/annotation/store.ts`).
The **agent side** is four MCP tools (`src/mcp/service.ts:569-640`) plus one held HTTP
call (`src/mcp/server.ts:58-82`).

---

## 1. The state machine, as built

`AnnotationState` is declared at `src/annotation/model.ts:12-22`. Ten states.
Every setter and leaver below is a real code path; setters marked **[API-only]** are
reachable over HTTP but not from the shell UI.

### 1.1 Setter and leaver inventory

| State | What sets it | What can leave it (where) | Rendered by the surface? |
| --- | --- | --- | --- |
| `draft` | `createDraft` `src/annotation/store.ts:83-110` (`state: 'draft'` at :88); legacy migration default `mapStatus` `src/annotation/migrate.ts:169-170` | `queue()` → `queued` (`store.ts:234-239`, guard `if (annotation.state === 'draft')` :236); `delete()` `store.ts:210-216`; `update()` note/targets, no state change `store.ts:112-137`; **[API-only]** `verify()` → any verdict state `store.ts:340-351` (no state guard); **[API-only]** `recordResolutions` writes `resolutions` but leaves state `draft` `store.ts:302-314` | Yes — `statePill('draft')` label "Draft" (`model.ts:87`, `components.ts:67-76`), tone `progress` (`components.ts:32-47`) |
| `queued` | `queue()` `store.ts:234-239` (`:237`); migration `queued-local` → `queued` `migrate.ts:158-159` | `markDelivered` → `delivered` `store.ts:289-292`; `delete()`; `update()` still allowed (`isInQueue`, `model.ts:103-105`); **[API-only]** `verify()`, `recordResolutions` | Yes — label "Queued", cue icon `move-up` (`components.ts:52-61`) |
| `delivered` | `markDelivered` `store.ts:289-292`; `importEnvelope` sets `state: 'delivered'` directly `store.ts:392` | `recordResolutions` → `resolved` `store.ts:308-310`; `acknowledge` → `acknowledged` `store.ts:330-332`; `amend` → `superseded` `store.ts:155-160`; `verify` → verdict state; **[API-only]** `delete()` | Yes — label "Delivered to host" (`model.ts:89`), tone `progress` |
| `resolved` | `recordResolutions` `store.ts:308-310` (only from `delivered`/`acknowledged`) | Re-resolution keeps it `resolved` (`store.ts:308` guard false); `acknowledge` → `acknowledged`; `amend` → `superseded`; `verify` → verdict state | Yes — label "Re-resolved" (`model.ts:90`), cue icon `recovered` (`components.ts:56`) |
| `acknowledged` | `acknowledge` `store.ts:330-332` (only from `delivered`/`resolved`) | `recordResolutions` → back to `resolved` `store.ts:308-310`; `amend` → `superseded`; `verify` → verdict state | Yes — label "Acknowledged by agent" (`model.ts:91`), cue `check` |
| `verified` | `verify('approve')` → `verdictState` `store.ts:346`, `store.ts:510-516` | Nothing. `amend` refuses (`store.ts:147`, `isVerification` `model.ts:111-113`); `update` refuses (`store.ts:117-121`); only **[API-only]** `delete()` | Yes — label "Verified by you" (`model.ts:92`), tone `success` |
| `rejected` | `verify('reject')` → `store.ts:510-516` | Nothing except **[API-only]** `delete()` | Yes — label "Rejected", tone `closed` |
| `another-pass` | `verify('another-pass')` → `store.ts:510-521` | Nothing except **[API-only]** `delete()` | Yes — label "Another pass requested" |
| `superseded` | `amend` `store.ts:156`, `supersededBy` set `store.ts:157` | Nothing except **[API-only]** `delete()` | Yes — label "Superseded", plus "Replaced by …" hint `app.ts:354-364` |
| `obsolete` | `verify('obsolete')` → `store.ts:510-521` | Nothing except **[API-only]** `delete()` | Yes — label "Obsolete" |

### 1.2 Table of the transitions that are actually reachable

| From | To | Trigger | Code |
| --- | --- | --- | --- |
| (new) | `draft` | click a target in the artifact | `app.ts:820` → `api.ts:64-69` → `http.ts:270-275` → `store.ts:83` |
| `draft` | `queued` | Queue button / `Enter` | `app.ts:552-554`, `871-888` → `http.ts:514-529` → `store.ts:234` |
| `queued` | `delivered` | Send the queue | `app.ts:476-484`, `890-904` → `http.ts:304-340` → `service.ts:355-378` → `store.ts:289-292` |
| `delivered` | `resolved` | re-resolution after reload | `app.ts:1139-1170` → `http.ts:415-445` → `store.ts:302-314` |
| `acknowledged` | `resolved` | re-resolution after reload | same |
| `delivered` | `acknowledged` | `acknowledge_intent` | `server.ts:37-44` → `service.ts:277-295` → `store.ts:328-338` |
| `resolved` | `acknowledged` | `acknowledge_intent` | same |
| `delivered`/`resolved`/`acknowledged` | `superseded` | Amend + "Deliver the amendment" | `app.ts:916-928` → `http.ts:341-374` → `service.ts:380-394` → `store.ts:139-170`; successor created as `draft` then delivered as `steering` `store.ts:148-154`, `service.ts:388-392` |
| `delivered`/`resolved`/`acknowledged` | `verified`/`rejected`/`another-pass`/`obsolete` | verdict control | `app.ts:986-994` → `http.ts:479-512` → `store.ts:340-351` |
| any | (removed) | delete | `app.ts:940-954` → `http.ts:561-565` → `store.ts:210-216` |
| `draft`/`queued` | order changed | Move up / Move down | `app.ts:955-972` → `http.ts:284-302` → `store.ts:218-232` |
| any | `revisionRelation` `advanced` | a resolve POST with a revision ≠ `writtenRevision` | `http.ts:441` → `store.ts:353-366` |
| any | `resolutions` replaced | a resolve POST | `http.ts:438-442` |

### 1.3 States declared but unreachable, and code with no caller

**Unreachable event types.** `AnnotationEvent` declares `'dequeued'` (`model.ts:29`) and it is
never pushed anywhere. `'relation-added'` / `'relation-removed'` are pushed only by
`addRelation` / `removeRelation` (`store.ts:172-189`), which no caller invokes — `grep` over
`src/` and `tests/` finds the definitions and nothing else.

**Unreachable functions.** `AnnotationStore.queueAllDrafts` (`store.ts:244-248`) has no caller.
`isSettled` (`model.ts:107-109`) has no caller. `chosenCandidate` (`resolve.ts:148-150`) has no
caller. `relationTypeOf` / `RELATION_OPERATORS` / `operatorLabel` (`model.ts:224-263`) are used
only from each other; the surface never builds a relation. `Annotation.verification.successorId`
(`model.ts:65`) is accepted by `http.ts:503-505` but no UI path or service path ever sets it.

**Unreachable states.** None of the ten states is unreachable: all four verdict states, and
`resolved`, are produced by paths the shell drives (`tests/lever-contract.test.ts:60-77`,
`:283-320`). But three state *transitions* that the contract implies are impossible:

1. `verified` → anything. `verify` has no inverse and `amend` refuses verified (`store.ts:147`).
   No reopen path exists anywhere.
2. `rejected` / `another-pass` → back to the queue or to `queued`. A rejection is terminal
   except for the API-only delete.
3. `obsolete` → anything. Same.

**States reachable only through the API.** `verify()` has no "was it delivered?" guard
(`store.ts:340-351`); it accepts any state and `verificationRefusedReason` blocks only `approve`
(`model.ts:133-139`). So `draft → rejected`, `draft → obsolete`, `queued → verified` are all
reachable by any client holding the session capability (`http.ts:479-512`), while the UI renders
verdict controls only when `isDelivered` is true (`app.ts:405-407`, `app.ts:1398-1400`).
Likewise `recordResolutions` has no state guard (`store.ts:302-314`, `http.ts:415-445`), so a
`draft` can carry resolutions, and `rank()` will then sort that draft above everything else
(`app.ts:1402-1412`, unresolved → rank 0).

### 1.4 Transitions that contradict `design.md` §4 or `CONTEXT.md`

- **`design.md` §4 Annotation row** says the `closed` role covers
  "rejected/another-pass/superseded/obsolete", and §6 `AnnotationList` says
  "closed ones behind one toggle rather than deleted". The shell's `isClosed`
  (`app.ts:1394-1396`) is `verified || superseded || obsolete` — it **omits `rejected` and
  `another-pass` and includes `verified`, which §4 classifies as `success`, not `closed`**.
  Result: a rejected Annotation keeps its `closed`-toned pill (`components.ts:38-46`) but sits in
  the open list forever and is counted in the rail's "N needing attention" header (`app.ts:281`).
- **`design.md` §4 Revision** and §5 make "which revision an Annotation was written against" an
  Annotation-level fact. The code stamps `writtenRevision: session.revision` at creation
  (`http.ts:272`) and never moves `session.revision` on reload (`http.ts:391-403` only writes
  `adoptedRevision`). So an Annotation composed **after** a reload is recorded as written against
  the revision before it, and `noteRevisionAdvance` will label it "Written before this revision"
  (`app.ts:338-340`). See §7 item 3.
- **`design.md` §4 Provenance** requires the word "exact" to belong to resolution alone, and
  `CONTEXT.md` (Provenance Confidence) says the axis is "separate from Target Resolution and never
  shares the word 'exact' with it". The types share exactly that string: `TargetMatch` is
  `'exact' | 'recovered' | 'unresolved'` (`resolve.ts:1`, re-declared `model.ts:3`) and
  `provenanceConfidence` is `'exact' | 'inferred' | 'unavailable'` (`protocol.ts:50-51`).
  See §7 item 1.
- **`CONTEXT.md` Draft Intent** — "A Visual Intent Envelope saved locally but not yet delivered.
  It is the state of a stored Envelope" — has no code path. `markDelivered` refuses the `draft`
  intent ("it creates no batch" `store.ts:258-260`) and `sendQueue` returns `delivered: false`
  without creating an envelope (`service.ts:360-366`). There is no stored Envelope for a draft.

---

## 2. Every trigger that can change anything

### 2.1 Reviewer actions

| Trigger | Code path | What it mutates | What the reviewer sees |
| --- | --- | --- | --- |
| Click a target (point mode) | `layer.ts:271-306` `onPointerUp` → `selectElement` `:213` → `renderTargets` `:176` → posts `selection` → `app.ts:789-790` → `onSelection` `:804-829` | new draft via `POST /annotations` (`api.ts:64`), or `PATCH` targets if an in-queue Annotation is active (`api.ts:75`, `app.ts:813`) | new row + anchored card; selection marks in the iframe |
| Drag across words | `layer.ts:292-300` (`text-range`) | same as above | same |
| Box an area | `layer.ts:282-291`, `selectEnclosed` `:225-259` | same | same; a below-minimum box posts a `notice` → toast `layer.ts:279-286`, `app.ts:796-798` |
| Type a note | `app.ts:831-842` → `debounce 250ms` `:846-855` → `PATCH /api/annotations/:id` | `annotation.note` + a `note-changed` event (`store.ts:122-125`) | nothing until refresh; over-threshold flag set at 1200 chars (`app.ts:838`) but never rendered as a warning |
| Queue (button or `Enter`) | `app.ts:552-554`, `871-888` → `POST /queue` (`api.ts:88`) | `draft → queued` `store.ts:237` | row pill becomes "Queued"; card closes; toast "Queued. It stays on this machine until you send." |
| Send the queue (button or `Cmd/Ctrl+Enter`) | `app.ts:476-484`, `890-904`, `1312-1315` → `POST /send` (`api.ts:95`) | batch created; `draft/queued → delivered`; `sentAt`; history `delivered` (`store.ts:281-299`) | row pill "Delivered to host"; toast naming the channel |
| Amend | `app.ts:411-414`, `906-914`, `916-928` → `POST /amend` (`api.ts:103`) | new successor draft + original `superseded` + successor delivered as `steering` (`store.ts:139-170`, `service.ts:380-394`) | original row gains "Replaced by …", successor row appears; toast |
| Verdict | `app.ts:463-471`, `986-994` → `POST /verify` (`api.ts:139`) | state + `verification` + history (`store.ts:346-348`) | row pill changes; "Recorded: …" hint (`app.ts:401-404`) |
| Choose candidate | `app.ts:973-984` → `POST /candidate` (`api.ts:133`) | `chosenCandidates[targetId]` (`store.ts:322`) | radio checked; approve becomes enabled |
| Delete | `app.ts:417-421` (row, in-queue only), `556-559` (card), `940-954` → `DELETE` (`api.ts:79`) | annotation removed (`store.ts:210-216`) | row disappears |
| Reorder | `app.ts:418-419`, `955-972` → `POST /reorder` (`api.ts:85`) | `order` 0..n-1 for the artifact (`store.ts:218-232`) | row order changes |
| Ask the agent to stop | `app.ts:262-268`, `930-939` → `POST /interruptions` (`api.ts:113`) | interruption record (`check-in.ts:52-63`), held call resolved (`service.ts:402`) | toast "Stop requested. Your agent sees this at its next Check-In; nothing has been stopped yet." (`http.ts:388`) |
| Reload artifact | `app.ts:1197-1205` (banner), `695-720` (menu), `1207-1224` → `POST /reload` | `adoptedRevision` (`http.ts:399`); iframe `src` reassigned; then request-candidates → re-resolution | banner clears; new revision on screen; rows re-resolve |
| Before/after toggle | `app.ts:1106-1138` | iframe `src` only (`app.ts:1133`) | the other document is displayed + toast |
| Theme | `app.ts:721-734`, `components.ts:242-262` | `localStorage['vil-theme']`, `documentElement.dataset.theme` | chrome recolours |
| Show/hide closed rows | `app.ts:315-324` | local `closedHidden` | closed rows appear/disappear |
| Attach a reference image | `app.ts:1005-1034`, `1035-1085` → `POST /attachments` (`api.ts:152`) | bytes on disk + `annotation.attachments` (`http.ts:572-608`, `store.ts:191-200`) | chip with thumbnail, or a `failed` chip + Retry (`app.ts:605-613`) |
| Remove an attachment | `components.ts:337-361` → `app.ts:995-1004` → `DELETE` (`api.ts:165`) | `attachments` array (`store.ts:202-208`) | chip disappears |
| Select a row | `app.ts:746-750` | local `selectedRowId` | row highlight; before/after toggle appears/clears |
| "Show on the artifact" | `app.ts:407-410`, `752-773` | iframe marks + local selection | targets highlighted in the artifact (note: it sets `selectedRowId`, not `activeAnnotationId`, so no card opens) |
| Escape | `app.ts:1325-1343` | local UI state, one level | drawer → menu → amend → card → selection → mode → focus island |
| Mode tiles / `P` / `B` / `V` | `app.ts:736-740`, `1348-1355`, `components.ts:181-205` | local mode + `configure` message to the layer (`app.ts:742-744`) | lit tile, crosshair cursor |
| End session | `app.ts:1294-1297` | **nothing on the server**; toast + `window.close()` | window closes; capability and stored state remain valid |
| Open/close drawer, overflow menu | `app.ts:243-260`, `1245-1258` | local flags | overlay |
| Incoming `hover` message | `app.ts:799-800` | nothing — deliberately ignored | nothing (the hover label is never shown to the reviewer) |

### 2.2 Agent actions

| Trigger | Code path | Mutation | Reviewer sees |
| --- | --- | --- | --- |
| `open_visual_review` | `server.ts:58-82` → `service.openArtifact` `service.ts:153-238`, `noteAgentContact` `:498-502`, `waitForSend` `:65` | mints/reuses a session (`sessions.ts:40-46`), opens the browser (`service.ts:180-182`), records `lastContactAt`, registers a waiter | agent sentence "Your agent is holding the call and waiting for you right now. Sending is urgent." (`service.ts:522-530`); Stop action offered (`app.ts:262-268`) |
| `check_in` | `server.ts:33-34`, `85-96` → `service.checkIn` `service.ts:410-454` | `lastContactAt` (`check-in.ts:51`); collects a pending interruption (`:419-421`) | agent sentence changes to "working" if within 60 s of contact with something delivered (`service.ts:536-545`); `pendingInterruption` clears |
| `get_intent_status` | `server.ts:35-36` → `service.getBatchStatus` `service.ts:296-321` | `recordContact` `:304` | same as check_in for the sentence |
| `acknowledge_intent` | `server.ts:37-44` → `service.acknowledge` `service.ts:277-295` | `delivered/resolved → acknowledged`; `acknowledgedAt/By`; contact recorded (`:291`) | **not** the rows: `pollStatus` never refetches annotations (`app.ts:1174-1196`); only the agent sentence shows "acknowledged" |
| `POST /api/intents` (envelope submission) | `http.ts:645-663` → `service.submitEnvelope` `service.ts:240-251` → `importEnvelope` `store.ts:368-415` | annotations created directly in `delivered` | rows appear as delivered |

### 2.3 Filesystem, timer and lifecycle events

| Trigger | Code path | Mutation | Reviewer sees |
| --- | --- | --- | --- |
| Artifact bytes change (saved-html) | `app.ts:94` 3 s poll → `api.status` → `http.ts:239-247` → `sessionStatus` `:850-901` (`computeRevision` on file bytes) | none server-side; `snapshot.agent`, `adoptedRevision`, `currentRevision` locally | `.banner` "The artifact changed under review." + Reload button (`app.ts:1197-1205`) |
| Artifact bytes change (react-vite-app) | same, via `fetchAppRevision` `service.ts:694-708` (HTTP GET of the app root, 3 s timeout) | as above | as above |
| Artifact deleted / unreadable | `sessionStatus` catch → `changed: false, unreadable: true` (`http.ts:871-877`, `:889-894`) | none | **nothing**: the banner is hidden (`app.ts:1183-1187`) and `status.unreadable` is never read; the stage shows the raw plain-text 404 from `GET /artifact/:id` (`http.ts:474-477`) |
| 3 s status poll | `app.ts:94`, `1174-1195` | overwrites `snapshot.agent`, `adoptedRevision`, `currentRevision`; re-renders rail head + footer only | agent sentence and Stop action update |
| 250 ms note debounce | `app.ts:846-855` | one `PATCH` per quiet period | nothing visible |
| 4 s toast timer | `app.ts:1378-1386` | hides the toast | toast disappears |
| Held-call timeout | `service.ts:456-470`, default `DEFAULT_WAIT_MS` 15 min `service.ts:127`, `VISUAL_INTENT_WAIT_MS` `service.ts:136` | none | Stop action disappears when the poll shows no waiter |
| Tab regains visibility | `app.ts:88-92` | full `refresh()` | rows re-read from the server |
| Shell page reload (F5) | browser | loses `uploads`, `pendingNote`, `activeAnnotationId`, `resolvedRevision`; drafts survive because they are server-side | card gone, queue rows still there (asserted `tests/lever-contract.test.ts:198-222`) |
| Service restart | `store.ts:457-467` (refuses on version mismatch), `sessions.ts:62-70`, `check-in.ts:71-79` | reloads persisted state; **loses all in-memory waiters** (`service.ts:143`) | a held call never returns; the agent's tool call ends only at its own timeout |
| Session cookie mint | `http.ts:168-179` `rememberSessionCookie` | sets `vil_session` / `vil_cap` cookies | subsequent fetches authorised without the query param (`http.ts:719-731`) |

---

## 3. The delivery round-trip, exactly

Numbered, with the exact call at each hop, and a verdict on whether the product
automates the step or depends on a convention.

1. **Reviewer presses Send the queue.** `app.ts:476-484` builds the button; `disabled` only when
   `queue.length === 0` (`:475`). Click → `sendQueue` `app.ts:890-904`.
2. **Pending note flushed.** `flushNote` `app.ts:857-869` cancels the debounce and `PATCH`es the
   outstanding note.
3. **`api.send`.** `api.ts:95-99` → `POST /api/sessions/:id/send` with `{intent:'next-pass'}`.
4. **Service.** `http.ts:304-340` rejects any intent other than `next-pass`
   ("The one send action always delivers Next-Pass Intent…", `:309-317`) and calls
   `review.sendQueue(sessionId, {host:'browser', intent:'next-pass'})` `:326`.
5. **Queue read.** `service.sendQueue` `service.ts:355-378` → `annotations.queueOf(artifactId)`
   `:368`, ordered by `order` (`store.ts:71-73`, `:250-252`); empty → throws
   "The Annotation Queue is empty; there is nothing to send." `:370` → 409.
6. **Batch created and state moved.** `deliverAnnotations` `service.ts:330-353` →
   `markDelivered` `store.ts:254-300`: idempotency key = sha256 of the sorted annotation ids
   (`envelope.ts:14-20`); duplicate key returns the cached batch (`store.ts:272-275`); envelope
   built by `buildBatchEnvelope` `envelope.ts:56-92`; `draft/queued → delivered`, `sentAt`,
   history `delivered` (`store.ts:288-293`); persisted to `annotations.json` (`store.ts:296-299`,
   `:505-507`).
7. **Held call released.** `holding = waiters present` (`service.ts:350`) is computed **before**
   `resolveWaiters` `:351`, which resolves the pending promise from `waitForDelivery`
   (`service.ts:456-470`) that `open_visual_review` is awaiting (`server.ts:65`). The tool returns
   `{status:'sent', envelope, annotationIds, …}` (`server.ts:66-81`).
8. **HTTP response and toast.** `http.ts:330-338` returns `channel`/`holding`; the shell toasts
   either "…to a call that is being held" or "…the agent reads it at its next Check-In"
   (`app.ts:900`).
9. **Durable cursor.** The batches are durable (`annotations.json`); the *cursor* is not stored
   server-side. `checkIn` takes `options.cursor` and filters `batch.at > since`
   (`service.ts:413-417`), returning `cursor: checkedInAt` (`:437`). Only `lastContactAt` is
   persisted (`check-in.ts:51-56`). So "durable" describes the delivery, not the cursor: an agent
   that loses its cursor and omits it gets **every** batch for the artifact, ever
   (`since === null`, `service.ts:414-417`).
10. **Agent actually told to edit the artifact.** It is not. The envelope carries targets, note,
    evidence and `artifact {id, kind, revision, displayName}` (`envelope.ts:70-91`); no file path,
    no source span requirement, no instruction. The only "instruction" is prose in the tool
    descriptions (`service.ts:570-640`). Nothing verifies that the artifact was edited at all.
11. **Acknowledgement.** `acknowledge_intent` → `service.acknowledge` `service.ts:277-295` →
    `store.acknowledge` `store.ts:328-338`; explicitly documented as never counting as
    verification (`service.ts:621-624`, `statusOf` `:665-679`).
12. **Surface learns the bytes changed.** The 3 s poll of `GET /api/sessions/:id`
    (`app.ts:1174-1196` → `http.ts:239-247` → `sessionStatus` `:850-901`) compares
    `computeRevision(file bytes)` to `adoptedRevision`. This is a poll, not a push: there is no
    `EventSource` or `WebSocket` anywhere in `src/ui`.
13. **Reload.** `POST /reload` `app.ts:1207-1224` → `http.ts:391-403` writes
    `adoptedRevision = currentRevision`; the shell reassigns `iframe.src` (`:1218`), which
    re-requests `/artifact/:id`; the server re-reads the bytes and injects
    `data-revision: computeRevision(bytes)` (`http.ts:960-970`). The shell then posts
    `request-candidates` (`app.ts:1220`), the layer answers with `extractCandidates(document)`
    (`layer.ts:355-357`, `grounding.ts:201-229`, limit 2000) and the shell stores them
    (`app.ts:792-794`).
14. **Re-resolution.** `resolveAll` `app.ts:1139-1170` takes every annotation that is neither in
    the queue nor a verification (`:1152-1154`) and `POST`s `/api/annotations/:id/resolve` with the
    candidate pool and the layer's revision (`api.ts:120-126`). Server: `resolveTarget` per target
    (`http.ts:438-440`, `resolve.ts:52-96`), then `noteRevisionAdvance` `:441`, then
    `recordResolutions` `:442` (`delivered/acknowledged → resolved`).
15. **What the reviewer sees.** Resolution rows (`app.ts:367-380`), candidate chooser for
    `unresolved`+candidates (`:381-400`), "Written before this revision" pill (`:338`),
    before/after toggle when `writtenRevision !== resolvedRevision` (`:1095-1104`),
    "Re-resolved Ns ago" (`:281-284`), and an attention badge counting unresolved + advanced +
    queue (`:1234-1243`).

### 3.1 Automated vs. convention

**Automated in product code:** send and batch persistence; the held-call release; duplicate-send
idempotency; acknowledgement recording; the changed-revision poll; reload; candidate extraction;
the re-resolution loop; resolution rendering; verdict recording; supersession; the durable store.

**Depend on an external agent honouring a convention:**

- Editing the artifact. Nothing triggers it, nothing detects it.
- Calling `check_in` to see Steering Intent or a Review Interruption. This is the whole basis of
  the Stop action (`design.md` amendment of 2026-09-16, "an MCP server cannot put anything into an
  agent's running turn"), and the surface only reports `lastCheckedInAt` (`components.ts:132-155`).
- Acknowledging at all.
- Implementing what the note asked for.
- Producing a *new* revision. The loop closes only because the file on disk (or the app's HTML)
  happens to change; no channel tells the surface a revision is coming.

**Neither automated nor conventional — simply wrong:** after a reload the batch still carries
`session.revision`, the revision the session was minted at (`service.ts:345`), not the revision
under review. An agent sent direction after a reload is told the wrong revision.

---

## 4. Can the reviewer keep working? (the concurrency truth)

**Can the reviewer compose a new Annotation while the agent is working?**
**Yes.** `onSelection` `app.ts:804-829` calls `createAnnotation` unconditionally; nothing in the
creation, queue or send path reads `snapshot.agent`. The only agent-dependent chrome is the Stop
action (`app.ts:262-268`) and the send hint (`app.ts:488-495`).

**Can they compose while another Annotation is in flight, and send a second batch before the first
is acknowledged?**
**Yes.** Send requires only a non-empty queue (`app.ts:475`, `service.ts:368-371`).
`markDelivered` does not consult acknowledgement (`store.ts:254-300`); `acknowledge` is a terminal
side branch that nothing gates on. A second batch gets a different idempotency key because the id
set differs (`envelope.ts:14-20`).

**Can they annotate more after sending, and does the sent Annotation stay visible?**
**Yes.** `renderList` iterates every annotation of the artifact (`app.ts:272-273`); `isClosed`
hides only `verified`/`superseded`/`obsolete` (`app.ts:1394-1396`), so `delivered`, `resolved`,
`acknowledged`, `rejected` and `another-pass` rows stay in the open list. Asserted at
`tests/browser-loop.test.ts:115-121`.

**Can they amend an Annotation that is already superseded, verified, or obsolete?**
**No.** The Amend button is rendered only when `isDelivered` (`app.ts:405-414`, `:1398-1400`), and
`store.amend` throws for `isVerification` states: "Amend is offered only on a delivered Annotation
that is not yet verified." (`store.ts:147`, `:167-169`). There is no reopen path at all.

**Can they open an anchored card while a re-resolution is running?**
**Yes.** `resolveAll` holds no UI lock; `reading` only serialises `resolveAll` against itself
(`app.ts:1143-1150`). Card creation (`app.ts:804-829`) is independent. The card is not re-rendered
when `resolveAll`'s `refresh()` completes — `refresh()` calls head/list/footer/island/hint/drawer/
menu, not `renderCard` (`app.ts:133-152`) — so the card simply stays.

**If the artifact changes while a card is open, does the surface swap it out?**
**No — §5 holds.** `pollStatus` only renders the banner (`app.ts:1183-1187`); the only writes to
`iframe.src` are `loadArtifact` `:200`, `setBeforeAfter` `:1133` and `reloadArtifact` `:1218`.
Nothing re-requests the artifact on a poll. Two caveats: (a) the reviewer's own Reload *does* swap
it, which is the "asked" case; (b) for a `react-vite-app` the proxy only forwards GET/POST
(`http.ts:774-812`), so an HMR websocket is not proxied and the frame cannot self-reload.

**Reload while a held call is open?** Allowed and uncomplicated: reload writes only
`adoptedRevision` (`http.ts:399`); the waiter is untouched. But every Annotation created after
that reload is stamped with the pre-reload revision (§7 item 3), so the rows misreport the
relationship, and the next send carries the old revision to the agent (`service.ts:345`).

**Reload while attachments are uploading?**
Unaffected. `reloadArtifact` reloads **only the iframe** (`app.ts:1218`); the shell document and its
`uploads` array (`app.ts:56-62`) survive, so an in-flight `POST /attachments` continues and its
failed chip still renders (`app.ts:1035-1085`). A full shell reload (F5) is different: the fetch is
aborted and the `uploads` array — the only record of a failure — is memory-only.

**Two tabs / two sessions editing the same annotations — lock or last-write-wins?**
**Last-write-wins, with no lock and no version check.** `mutate` is read-modify-write on a shared
in-memory object then an atomic file write (`store.ts:445-455`, `:505-507`); nothing compares an
etag, timestamp or version. Two tabs sharing one annotation id will overwrite each other's note.
Worse, two tabs on different revisions each hold their own `resolvedRevision` guard
(`app.ts:1147-1149`), so both will POST `/resolve` and each will overwrite `resolutions`,
`resolvedRevision` and `revisionRelation` for **all** annotations of the artifact
(`http.ts:441-442`, `store.ts:304-310`, `:353-361`) — the last tab to finish resolving wins, and it
can mark rows "written before this revision" that were written against the revision that tab is
showing. Annotations are also keyed by `artifactId`, not `sessionId` (`store.ts:75-77`), and
`stableArtifactId` ignores the revision (`revision.ts:12-14`), so a second session minted for the
same file after an edit shares the first session's annotation list and queue, and `sendQueue` will
send both sessions' queued work (`service.ts:367-368`).

**Session expiry, server restart, stale annotationId?**

- Expiry: none exists. `SessionRecord` has no TTL (`sessions.ts:11-23`); `authorize` only
  constant-time-compares the capability (`sessions.ts:44-56`). "End session" is
  `window.close()` + a toast (`app.ts:1294-1297`) and calls no endpoint.
- Server restart: `annotations.json`, `service-sessions.json`, `check-in.json` and attachments all
  reload from disk (`store.ts:457-467`, `sessions.ts:62-70`, `check-in.ts:71-79`,
  `attachments.ts:108-116`). All in-memory waiters are lost (`service.ts:143`), so a call being
  held never resolves and the agent's `open_visual_review` ends only at its own timeout
  (`service.ts:456-461`). Asserted for annotations at `tests/browser-loop.test.ts:216-222`.
- Stale `annotationId`: every `/api/annotations/:id*` route answers 404 "Unknown Annotation"
  (`http.ts:418-421`, `:483-485`, `:518-520`, and the shared guard at `:531-543`); the shell
  toasts the body text (`app.ts:1378`) and the next `refresh()` drops the row.

---

## 5. Races and edge cases

1. **Annotation created after a reload is stamped with the wrong revision.**
   `http.ts:272` (`writtenRevision: session.revision`) plus `http.ts:399` (reload moves only
   `adoptedRevision`) plus `store.ts:356`. Consequence: `noteRevisionAdvance` marks it `advanced`,
   the row is labelled "Written before this revision" (`app.ts:338-340`) although it was written
   against the revision on screen, and the next send tells the agent the old revision
   (`service.ts:345`).
2. **Revision changed between resolve and verdict.** `verify` has no revision guard
   (`store.ts:340-351`, `http.ts:479-512`). Consequence: an approve can be recorded against a
   result from a revision that is no longer under review, and nothing invalidates the verdict when
   the artifact advances again.
3. **Approval blockers computed from stale resolutions.** `approvalBlockers` reads
   `annotation.resolutions` (`model.ts:115-131`), which only a resolve POST rewrites. If the
   artifact advanced and no reload/re-resolution has run, approve is blocked (or allowed) on
   evidence from a previous revision.
4. **Candidate chosen for a node that no longer exists.** `chooseCandidate` validates against the
   candidate list of the moment (`store.ts:318-321`), but `approvalBlockers` only checks that
   *some* nodeId is recorded (`model.ts:125-127`). After a new re-resolution the stale nodeId still
   unblocks approval, while the chooser renders every radio unchecked because the nodeId is gone
   (`components.ts:276-300`).
5. **Candidate choice misattributed.** `choose` resolves the annotation as
   `this.activeAnnotation() ?? this.deliverable().find(...)` (`app.ts:973-976`). With a draft card
   open (so `activeAnnotation()` is truthy), clicking a candidate radio on an *older* resolved row
   posts the wrong annotationId and fails with 409 "Unknown candidate" (`store.ts:320`), shown as a
   toast.
6. **Send with an empty queue.** 409 with the service message (`service.ts:369-371`) shown as a
   toast (`app.ts:901-903`); only reachable by racing the disabled state (`app.ts:475`).
7. **Send while a previous send is in flight.** The button is not disabled optimistically
   (`app.ts:472-497`). Two rapid clicks run two `flushNote`+`send` sequences; the second finds the
   queue empty and shows a 409 toast. No double delivery is possible, because `markDelivered` flips
   the state synchronously inside one request handler (`store.ts:288-293`) before the second
   request's `queueOf` runs (`service.ts:368`).
8. **Amend the same Annotation twice.** Refused: the first amend leaves the original `superseded`
   (`store.ts:156`) and `isVerification` rejects it (`store.ts:147`, `:167-169`). Amending the
   *successor* is allowed (it is `delivered`), so a chain is possible — and each amend produces its
   own batch because the id set changes (`envelope.ts:14-20`).
9. **Reload twice.** `reloadArtifact` resets `resolvedRevision = undefined` (`app.ts:1212`), so
   re-resolution runs again for the same unchanged revision and rewrites `resolvedAt`
   (`store.ts:304-311`). Harmless to data, but it contradicts `issue 20`'s criterion "Re-resolution
   runs once per revision, and a second pass over the same revision does not repeat the work"
   (`.scratch/surface-refinement/issues/20-close-the-loop.md`), and the "Re-resolved Ns ago" hint
   (`app.ts:281-284`) will always read as just-now.
10. **The artifact file deleted.** `sessionStatus` catches the read error and returns
    `changed: false, unreadable: true` (`http.ts:871-877`); `pollStatus` therefore **hides** the
    banner (`app.ts:1183-1187`) and `status.unreadable` (`api.ts:22`) has no consumer. The stage
    shows the plain-text 404 from `GET /artifact/:id` (`http.ts:474-477`). `design.md` §6 requires
    an `ArtifactFrame` `unreachable` state; the shell has loading, policy-gate and ready only
    (`app.ts:155-196`, `:197-202`).
11. **The artifact unable to load.** Oversize → 413, path escape → 403, both `text/plain`
    (`http.ts:481-490`, `:493-495`), rendered inside the iframe with no chrome state.
12. **Artifact modified between the shell's first document GET and the snapshot write.**
    `snapshots.save(artifactId, session.revision, bytes)` runs on the first successful
    `serveArtifactDocument` (`http.ts:961-963`) and is keyed by the mint-time revision. If the file
    changes before that first GET, the "Before" view shows bytes that are not the revision it
    claims — and before/after then render the same revision.
13. **Before/after on Application Mode is a no-op.** Snapshots are only saved for `saved-html`
    (`http.ts:962`), and `serveArtifactBefore` silently falls back to the current document when no
    snapshot exists (`http.ts:750-753`). `comparisonFor` still renders the toggle (`app.ts:1095-1104`),
    so "Before" and "After" show the same app.
14. **Ordering collisions: none.** `reorder` rewrites `order` 0..n-1 for the artifact
    (`store.ts:218-232`) and `nextOrder` is max+1 (`store.ts:440-443`). Note though that the UI
    offers reorder only for queued rows (`app.ts:417-419`, `:955-960`) while `store.reorder`
    reorders *every* annotation of the artifact, pushing delivered rows behind the queue — the
    queue order itself (what the agent receives, `store.ts:281`) is preserved because `queueOf`
    sorts by `order` (`store.ts:71-73`, `:250-252`).
15. **Unsent text discarded.** (a) The debounce slot is a single instance
    (`app.ts:840`, `:846-855`), so switching cards inside 250 ms drops the earlier card's last edit;
    (b) an F5 inside 250 ms loses it; (c) a debounced save that races a send returns silently
    because the annotation left the queue (`app.ts:848-850`) — the text vanishes with no message.
16. **Note edited after send.** No card exists for a sent Annotation (`activeAnnotationId` is
    cleared at `app.ts:880` on queue and `:898` on send), and a direct PATCH is refused by
    `store.update` with "…cannot be edited in place. Amend it instead: what the agent was told stays
    a record." (`store.ts:117-121`). This matches the contract.
17. **An attachment that fails upload.** The chip shows `failed — reason` with a Retry
    (`app.ts:605-613`); nothing was stored server-side because the record is created only after a
    successful bounded read (`http.ts:586-597`). The failure record is memory-only (`app.ts:56-62`),
    so a shell reload erases it.
18. **Upload while the card closes.** `upload` re-reads `activeAnnotation()` (`app.ts:1035-1039`)
    and returns silently if the card is gone — the chosen file is dropped with no chip and no toast.
19. **Attachment added to a delivered Annotation via the API.** `store.addAttachment` has no state
    guard (`store.ts:191-200`) and the route has none either (`http.ts:572-608`), so the record of
    what the agent was told can be changed after delivery — the thing `design.md` §10 forbids for
    text ("Editing a delivered Annotation in place. What the agent was told is a record"). The UI
    cannot reach it, because the card only exists for in-queue annotations.
20. **Stop while a call is held.** `requestInterruption` resolves the waiter with an interruption
    signal (`service.ts:396-404`) → `waitForSend` returns `null` (`service.ts:472-475`) →
    `open_visual_review` reports `status: 'stepped-away'` and the note "The host could not hold the
    call for the human." (`server.ts:66-81`), which is false in this case. The stop reason reaches
    the agent only through a later `check_in` (`service.ts:444-451`), while the reviewer's toast
    says "nothing has been stopped yet" (`http.ts:388`).
21. **`check_in` with no cursor re-reads everything.** `since === null` disables the filter
    (`service.ts:413-417`), while the tool description promises "everything that arrived since your
    last check-in … Omit to read everything not yet collected" (`service.ts:585-590`).
22. **Verify an undelivered Annotation.** No state guard (`store.ts:340-351`); only `approve` is
    ever refused (`model.ts:133-139`). A capability holder can set a draft to `verified`.
23. **Resolve an undelivered Annotation.** Same (`http.ts:415-445`); state stays `draft`
    (`store.ts:308`) but `rank()` (`app.ts:1402-1412`) then puts the unresolved draft at the top of
    the list.
24. **`noteRevisionAdvance` trusts a client-supplied revision.** The server never compares the
    resolve body's `revision` to the file (`http.ts:432-437`; `sessionStatus` `:850-901` is not used
    here), so any client can post an arbitrary revision string and mark every row of the artifact
    `advanced` (`store.ts:355-357`).
25. **Ordering of the stale-resolve and the send within one page.** `sendQueue` flushes the note,
    then sends (`app.ts:892-893`); the flushed note is a `PATCH` on an in-queue annotation, so it
    lands before the batch is built (`store.ts:281-285` takes the annotations as they are at
    `markDelivered`). No race there.
26. **The banner does clear.** `pollStatus` hides it when `changed` is false (`app.ts:1185-1187`)
    and reload hides it (`:1214`); the old "true forever" bug recorded in `spec.md` is gone because
    `adoptedRevision` is a separate field (`http.ts:399`, `:854`).

---

## 6. What does NOT exist

Verified by reading every route in `src/service/http.ts:225-704`, every tool in
`src/mcp/service.ts:569-640`, every method of `AnnotationStore`, and every control in
`src/ui/app.ts`.

- **Regenerate / re-run / retry the agent's work.** No tool, route, button or state. The only
  "Retry" in the codebase is attachment upload (`app.ts:612`, `:1086-1093`).
- **Undo a send.** A batch cannot be recalled; `markDelivered` has no inverse (`store.ts:254-300`),
  and there is no route that removes or annotates a delivered batch. The only ways to change what
  was sent are Amend (a new batch, `service.ts:380-394`) and Stop (an interruption record,
  `check-in.ts:52-63`).
- **Reopen a verified / rejected / another-pass / obsolete Annotation.** `isVerification` blocks
  amend (`store.ts:147`) and `verify` has no inverse (`store.ts:340-351`). The verdict controls
  remain rendered on the row after a verdict (`app.ts:405-407` does not check the current state),
  so the reviewer can re-verify — overwriting `verification` and the state — but cannot un-verify.
- **Delete a delivered Annotation through the surface.** The delete control is rendered only for
  `isInQueue` rows (`app.ts:417-421`) and inside the card, which only exists for in-queue
  annotations. The API's `DELETE` has no state guard (`http.ts:561-565`, `store.ts:210-216`).
- **Edit a delivered Annotation in place.** Refused by design (`store.ts:117-121`). This one exists
  as a rule, not as a missing feature.
- **Reassign a candidate after a verdict.** *It does exist*, unexpectedly: `chooseCandidate` has no
  state guard (`store.ts:316-326`) and `annotationRow` renders the candidate chooser for any
  annotation whose resolution is `unresolved` with candidates, verified or not (`app.ts:381-400`).
  So a verified row can still be re-pointed, silently, after the decision.
- **A real diff between revisions.** `setBeforeAfter` swaps the whole document URL
  (`app.ts:1132-1138`). There is no computed diff, no change list, no highlighted change anywhere.
- **A revision history.** `SnapshotStore` keeps at most one document per `(artifactId, revision)`
  key and skips a write if the key exists (`snapshots.ts:19-27`); nothing lists snapshots; status
  exposes only `openedRevision/adoptedRevision/currentRevision` (`http.ts:854-861`).
- **A second reviewer.** One capability per session (`sessions.ts:40-46`), no user identity; the
  only actor fields are `acknowledgedBy` and the agent id (`model.ts:65-68`).
- **A notification that a revision landed.** The 3 s poll plus the banner is the entire mechanism
  (`app.ts:94`, `:1174-1196`). No `EventSource`, no `WebSocket`, no server push (grep over `src/`).
- **Any agent-side signal other than the three calls.** The tool surface is exactly
  `open_visual_review`, `check_in`, `get_intent_status`, `acknowledge_intent`
  (`service.ts:569-640`). There is no progress event, no "edit applied", no completion call, no
  failure call. The only trace of agent activity is the incidental `lastContactAt`
  (`check-in.ts:51-56`) and `history` events on an annotation.
- **Multi-target composition from the surface.** The model supports `targets: AnnotationTarget[]`
  (`model.ts:53`) and the envelope carries them all (`envelope.ts:76-84`), but every selection
  replaces the selection (`layer.ts:176-199`, `:213`, `:254-257`) and each selection creates a new
  draft (`app.ts:820`). Only `importEnvelope` (`store.ts:368-415`) and legacy migration can create a
  multi-target Annotation.
- **Relational Intent.** `addRelation` / `removeRelation` exist but have no caller
  (`store.ts:172-189`); the surface renders a relation sentence only if a relation already exists
  (`app.ts:364`, `:546-549`), which no UI path can create.

---

## 7. Code-versus-contract contradictions

1. **"exact" is shared between provenance and resolution.**
   `design.md` §4 Provenance row: "'exact' … belongs to resolution alone"; `CONTEXT.md`
   (Provenance Confidence): "This axis is separate from Target Resolution and never shares the word
   'exact' with it."; `design.md` §10 anti-pattern: "One control that carries two claims, in
   particular the word 'exact' meaning both that the target matched and that the source span is
   known."
   Code: `provenanceConfidence: 'exact' | 'inferred' | 'unavailable'` (`src/ui/protocol.ts:50-51`,
   `src/annotation/model.ts` via `Envelope`) and `TargetMatch = 'exact' | 'recovered' | 'unresolved'`
   (`src/resolution/resolve.ts:1`, `src/annotation/model.ts:3`). The rendered labels differ
   (`resolutionLabelText` maps `exact` to "Matched", `src/resolution/model.ts:8-20`), and
   `describeEvidence` prints "exact source span" for provenance (`components.ts:431`), but the data
   vocabulary the surface reads and writes violates the sentence.
2. **`closed` means two different things.**
   `design.md` §4 Annotation family: "`closed` rejected/another-pass/superseded/obsolete"; §6
   AnnotationList: "closed ones behind one toggle rather than deleted".
   Code: `isClosed = verified || superseded || obsolete` (`app.ts:1394-1396`) while `stateTone`
   gives `rejected`/`another-pass` the `closed` tone (`components.ts:38-46`). A rejected row keeps a
   `closed` pill, stays in the open list, and is counted in "N needing attention" (`app.ts:281`).
   `spec.md` Solution says the same thing: "Actionable Annotations come first and closed ones sit
   behind one toggle."
3. **An Annotation written after a reload is recorded as written before the reload — and the agent
   is told the old revision.**
   `design.md` §5: "which revision an Annotation was written against is part of what the Annotation
   means"; §5 reload rule: "The surface never swaps the artifact out from under an open card".
   Code: `writtenRevision: session.revision` at creation (`http.ts:272`), `session.revision` fixed
   for the life of the session (`sessions.ts:14-22`), reload writing only `adoptedRevision`
   (`http.ts:399`), and `markDelivered` stamping the envelope with `revision: session.revision`
   (`service.ts:342-347`). Consequences: the false "Written before this revision" pill
   (`app.ts:338-340`) and a stale `artifact.revision` handed to the agent. This also contradicts the
   intent recorded in `.scratch/surface-refinement/issues/10-reload-adopts-the-revision.md`
   ("An Annotation written against the previous revision is marked as such after the reload").
4. **No `unreachable` state.** `design.md` §6 `ArtifactFrame`: "loading, ready, unreachable,
   policy-blocked, changed". Code: `renderGate` handles loading + policy gate + declined
   (`app.ts:155-196`); the banner handles changed (`:1197-1205`); nothing handles unreachable, and
   `SessionStatus.unreadable` (`api.ts:22`) is never read. A deleted artifact silently 404s inside
   the iframe (`http.ts:474-477`).
5. **Acknowledgement is not visible on the Annotation.**
   `design.md` §4 Agent position requires an "acknowledged" state and §6 `AnnotationPill` lists
   `acknowledged`. `CONTEXT.md` (Annotation/Verified Intent) and `service.ts:621-624`
   ("Acknowledgement is visible to the Builder-Reviewer") likewise. Code: `pollStatus` never
   refetches annotations (`app.ts:1174-1196`), so the row's pill does not change until the reviewer
   performs any action or refocuses the tab (`app.ts:88-92`). Only the agent sentence updates.
6. **Per-target provenance is not always labelled.**
   `design.md` §4 Provenance: "Always labelled." Code: `annotationRow` shows the resolution items
   and the note but never provenance (`app.ts:325-431`); provenance appears only in the disclosure
   and the card's target line (`components.ts:419-435`, `app.ts:1442-1448`).
7. **The Annotation state named `resolved` collides with Resolution vocabulary.**
   `design.md` §1 precedence 3: "The surface must not imply a state the domain does not have, and
   must not present two different claims with one word"; `CONTEXT.md` Target Resolution owns
   matched / recovered / unresolved / "left unresolved" and Resolution's labels are
   matched/recovered/ambiguous/deleted (`design.md` §4). Code: `AnnotationState` includes
   `resolved` (`model.ts:16`) and its cue icon is the **same glyph** as the Resolution `recovered`
   label (`components.ts:56` and `:91-104`). The user-facing label "Re-resolved" (`model.ts:90`)
   mitigates the word but not the glyph or the data attribute.
8. **"End session" does not end anything.**
   `design.md` §5 lists "end session" in the overflow menu. Code: `endSession` shows a toast and
   calls `window.close()` (`app.ts:1294-1297`); no endpoint, and the session capability remains
   valid (`sessions.ts:44-56`) with all state still readable.
9. **`Enter` in the amendment editor is swallowed, and `Cmd+Enter` there sends the queue.**
   `design.md` §7: "`Enter` in an anchored annotation card queues the annotation. `Cmd/Ctrl+Enter`
   queues and sends the whole queue." Code: the typing branch matches **any** textarea, including
   the amend editor (`app.ts:1310-1318`); `queueActive()` then finds no active annotation and
   returns (`app.ts:872-875`), so `Enter` does nothing visible; `Cmd+Enter` sends the queue instead
   of delivering the amendment. The amendment must be delivered with the mouse.
10. **`Escape` order differs from the contract.**
    `design.md` §7: "`Escape` unwinds exactly one level and no more: close the anchored card, then
    clear the selection, then return to operating the artifact, then move focus to the mode island."
    Code: drawer → menu → amend → card → selection → mode → island (`app.ts:1325-1343`). The extra
    levels are overlays, which is defensible; the amendment editor is unwound *before* the card,
    which is not in the contract's list at all.
11. **Relational Intent vocabulary is still rendered.**
    `design.md` §11 amendment 4 and §6 remove `RelationGuide`/`RelationHandle`/`RelationSentence`,
    and `spec.md` Non-goals say "Expressing Relational Intent. No relation is built and none is
    promised." Code: `relationSentenceEl` is still appended to every row and every card
    (`app.ts:364`, `:546-549`; `components.ts:264-267`) and the full relation operator table is
    still exported (`model.ts:224-263`). It renders only for data no UI can create, so it is dead
    chrome, not a live promise — but `design.md` §6 no longer lists the component while the code
    still draws it.
12. **`design.md` §10 "Reloading the artifact without being asked" / §5 "Reloading asks".**
    Satisfied for the shell. Note the one place the artifact content can change without an explicit
    action: the app proxy forwards the upstream document on every request (`http.ts:774-812`), and
    a `react-vite-app` that reloads itself inside the frame will be served new bytes. Not product
    code, but not blocked either.
13. **Send is one verb — satisfied, but the intent is hardcoded in the transport.**
    `design.md` §10: "A delivery intent the Builder-Reviewer has to choose" is an anti-pattern.
    Code: `api.send` hardcodes `{intent:'next-pass'}` (`api.ts:97`) and the route rejects anything
    else with a message naming the other two acts (`http.ts:309-317`). Matches the contract.
14. **The theme is the operator's — satisfied.**
    `readStoredTheme` / `applyTheme` (`app.ts:721-734`, `:1424-1427`); nothing samples the artifact.
15. **The first-run hint is permanent instruction copy.**
    `design.md` §10 lists "A permanent sentence explaining a control that teaches itself through its
    icon, its armed state and the cursor" as an anti-pattern, and §6 AnnotationCard says "No
    instruction copy". Code: `renderHint` places a sentence of instruction on the stage until the
    reviewer dismisses it, remembered per artifact in `localStorage` (`app.ts:503-522`). It is
    dismissible rather than permanent, but it is copy the contract's own list of what teaches
    itself would not need.

---

## 8. Honest gaps

Things I could not settle from the code, with what would settle them.

1. **Whether an agent honours the Check-In convention.** Not determinable statically. The surface
   reports only `lastCheckedInAt` (`components.ts:132-155`, `check-in.ts:51`). Settled by driving
   `tests/lever-contract.test.ts` against a real harness (the spec's issue 13).
2. **Whether reassigning `iframe.src` to the same URL actually re-fetches in the reviewer's
   browser.** `reloadArtifact` relies on it (`app.ts:1218`). The browser-loop test passes
   (`tests/browser-loop.test.ts:136-142` waits for the new content), which is strong evidence, but
   the test's URL is served with a new computed revision only because the server re-reads the file.
3. **The behaviour of `data-visual-intent-id` and `provenanceForElement`.** `describeElement`
   picks up `data-visual-intent-id` as `stableRuntimeId` (`grounding.ts:39-42`) and the layer
   consults `provenanceForElement` (`layer.ts:206-211`, `src/adapters/react-provenance.ts`), but
   nothing instruments an artifact to set that attribute in this repo. This matters because
   `extractCandidates` omits `sourceFile`/`sourceLine`/`sourceColumn` (`grounding.ts:201-229`), so
   the `source-provenance` scoring anchor in `scoreCandidate` (`resolve.ts:105-113`) **can never
   fire from a re-resolution candidate pool** — re-resolution depends entirely on the
   runtime-id / name / text / selector / structural / geometry anchors. Settled by reading the
   adapter and by instrumenting a fixture.
4. **Why `SessionStatus.unreadable` exists.** It is typed (`api.ts:22`) and produced
   (`http.ts:875`, `:893`) but never consumed. Settled by finding the ticket that asked for an
   `ArtifactFrame` unreachable state (not in this repo's `.scratch/surface-refinement/issues`).
5. **Whether `'dequeued'`, `'relation-added'`, `'relation-removed'` are consumed anywhere outside
   this repo** (e.g. by a stored-state reader or a benchmark). Grep finds no consumer here.
   Settled by a repo-wide history search.
6. **What the intended lifecycle of a `draft` in a second session is.** Annotations are scoped to
   `artifactId` while sessions are scoped to `(artifactId, revision)`; I read the consequence (§4)
   from the code but not the intent. Settled by issue 10/15 or the ADR set.
7. **Whether the amendment editor's `Enter` behaviour is a bug or an omission.** Both readings fit
   the code (`app.ts:1310-1318`). Settled by the ticket that added the amend editor.
8. **Whether a rejected/another-pass row is meant to stay in the open list.**
   `app.ts:1394-1396` says yes; `design.md` §4/§6 say closed. Settled by an amendment to
   `design.md`.

No test in this repo covers: creating an Annotation **after** a reload (the browser loop creates
its only annotation before the reload, `tests/browser-loop.test.ts:117-124`); a deleted artifact;
two tabs on different revisions; an attachment failing upload; or a Stop while a call is held
(`tests/lever-contract.test.ts:154-161` asserts only that the request was recorded). Those five are
where the findings above would first surface as user-visible behaviour.

---

## Start here for a redesign

`src/annotation/store.ts` is the state machine — `markDelivered` (`:254`),
`recordResolutions` (`:302`), `acknowledge` (`:328`), `verify` (`:340`), `amend` (`:139`) — and it
is the only place where the missing guards (verify-from-any-state, resolve-from-any-state,
delete-from-any-state, no revision check on a verdict) can be closed. Then `src/service/http.ts`
for what the surface is allowed to ask (`:239-704`), and `src/ui/app.ts` for what it actually
renders.
