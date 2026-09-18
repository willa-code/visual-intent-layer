## Claim 1 — Does a 0.3 envelope still validate and get read as 0.4?

- VERDICT: **REFUTED** (as bundled in README; ADR-0030's own narrower claim is CONFIRMED)
- EVIDENCE:
  - `src/envelope/validate.ts:29-30`: `CURRENT_VERSION = '0.4'` and `READABLE_VERSIONS = ['0.4', '0.3', '0.2']` — **0.1 is not in the array**.
  - `src/envelope/validate.ts:74-84` (`validateEnvelope`): iterates only `READABLE_VERSIONS`; if none validate, returns `{ ok: false }`.
  - `src/envelope/envelope.test.ts` — `'keeps a 0.3 envelope without a documents chain readable'` (sets `schemaVersion = '0.3'`, asserts `result.ok === true` and `result.value.schemaVersion === '0.4'`): this is the test that proves ADR-0030's specific claim ("Every 0.3 field keeps its shape and a 0.3 envelope still validates, read as 0.4"). **CONFIRMED** for 0.3.
  - `src/envelope/envelope.test.ts` — `'keeps a 0.2 envelope without Runtime State Evidence readable'` similarly proves 0.2 is read as 0.4. **CONFIRMED** for 0.2.
  - `src/envelope/envelope.test.ts` — `'keeps the published wire name supersedes on the envelope schema'` (near line 172) only does `JSON.parse(readFileSync('schema/envelope-v0.1.schema.json'))` and checks `Object.keys(published.properties)` — it never calls `validateEnvelope`, so no test exercises a 0.1 envelope through the actual read path.
  - `schema/envelope-v0.1.schema.json`: top-level `required: [..., "targets", ...]`, `additionalProperties: false`, and no `annotations` property at all — structurally incompatible with the 0.2/0.3/0.4 shape (which uses a top-level `annotations` array; `envelope.test.ts`'s own `'rejects a batch that carries the retired envelope-level targets array'` test shows the current schema rejects the old flat-`targets` shape). So even apart from being excluded from `READABLE_VERSIONS`, a 0.1 document would fail the 0.2 validator too.
  - `src/annotation/migrate.ts` (`LegacyRecord`/`LegacyEnvelope`, full file) and `src/annotation/store.ts:840-871` (`migrateFromLegacy`): this is a **separate, one-time store-startup migration**, triggered only when the current store file is absent and a `legacyFile` exists. It is a hand-written TS mapping (`migrateLegacyRecords`) — it never calls `validator('0.1')`, never loads `schema/envelope-v0.1.schema.json`, and is not part of `validateEnvelope`/`submitEnvelope`'s wire-schema negotiation at all.
  - `README.md:256-258`: "The `0.1` schema is kept only for reading state written by older releases. `0.2` and `0.3` envelopes are still readable: one without a documents chain loads unchanged and is read as the current version." This sentence bundles 0.1 into the same load-time "still readable, read as current" mechanism as 0.2/0.3, but the code shows 0.1 is excluded from that mechanism entirely.
  - Also stale in the same document: `README.md:317` — "`schema/` — versioned Visual Intent Envelope contracts (0.2 current, 0.1 legacy)" — the current version is 0.4, not 0.2 (`src/envelope/validate.ts:29`, `src/annotation/envelope.ts:39`).
- CONSEQUENCE: `README.md:256` must not claim 0.1 is "kept only for reading state written by older releases" through the envelope-schema mechanism. It should say something like: "`schema/envelope-v0.1.schema.json` is kept only as a historical record of the wire shape (e.g. the retired `supersedes` field name); `validateEnvelope` reads `0.4`, `0.3` and `0.2` only, and a 0.1-shaped envelope submitted today is rejected. Pre-Annotation-model store files in that older shape are migrated once, on store startup, by `annotation/migrate.ts`, independently of envelope schema-version negotiation." `README.md:317`'s "(0.2 current, 0.1 legacy)" should be corrected to "(0.4 current; 0.2 and 0.3 read for compatibility; 0.1 kept only as a historical reference)".

## Claim 2 — Is `collectedAt` stamped at exactly the four MCP sites ADR-0028 names?

- VERDICT: CONFIRMED
- EVIDENCE:
  - `docs/adr/0028-collection-is-the-boundary-for-taking-back-a-send.md` (Consequences paragraph): "the service stamps it wherever the agent reads a delivery: a held call returning the envelope, `check_in`, `get_intent_status` and `acknowledge_intent`."
  - `collectPass` defined at `src/annotation/store.ts:642-649`.
  - Five call sites, all in `src/mcp/service.ts`:
    - `service.ts:297` — inside `acknowledge()` (`service.ts:283-302`) → wired to the `acknowledge_intent` tool at `src/mcp/server.ts:38-45`.
    - `service.ts:311` — inside `getBatchStatus()` (`service.ts:306-329`) → wired to the `get_intent_status` tool at `src/mcp/server.ts:36`.
    - `service.ts:363` — inside `deliverAnnotations()`, guarded by `if (holding)` where `holding = (waiters.get(sessionId)?.length ?? 0) > 0` (`service.ts:361-365`) — this is the "held call returning the envelope" path: `open_visual_review` → `waitForSend`/`waitForDelivery` (`service.ts:497-524`) held by `waiters`, resolved when a first delivery lands.
    - `service.ts:383` — same holding-guarded pattern inside `anotherPass()` (`service.ts:369-386`) — the same "held call returning the envelope" category, realized on the replacement/"another pass" production path instead of the first-delivery path. Not a distinct named category, but the same one the ADR names generically.
    - `service.ts:454` — inside `checkIn()`, a loop `for (const pass of passes) { annotations.collectPass(pass.passId); }` (`service.ts:444-460`) → wired to the `check_in` tool at `src/mcp/server.ts:34`.
  - `src/mcp/service.ts:611-682` (`listTools()`): exactly four MCP tools are exposed — `open_visual_review`, `check_in`, `get_intent_status`, `acknowledge_intent` — matching the ADR's four names one-to-one (with `open_visual_review`'s held-call mechanism implemented via two internal functions).
  - No other exposed MCP tool or code path reads a delivery without stamping: `listPasses()` (`service.ts:331-339`) is not registered as an MCP tool (absent from the `switch` in `server.ts` and from `listTools()`), and `deliverAnnotations`/`anotherPass` only stamp when `holding` is true — consistent with the ADR's rule that an unheld delivery (`channel: 'next-check-in'`) is not yet "read" and so is correctly left unstamped.
- CONSEQUENCE: none.

## Claim 3 — Is every polled route a GET?

- VERDICT: CONFIRMED
- EVIDENCE:
  - `docs/adr/0029-expiry-bounds-an-idle-review.md`: "Renewal follows the acts themselves ... and never the surface's background status poll."
  - `src/service/http.ts:1000-1010` (`authorize`): `if (context.request.method !== 'GET') { return context.sessions.touch(sessionId) ?? session; } return session;` — GET requests never call `sessions.touch`.
  - `src/ui/app.ts:1713-1737` (`pollStatus`, called every 3000ms from `window.setInterval` per ADR-0029's own "Considered Options" note): calls `this.api.status()` and `this.api.agent()`, and conditionally `this.refresh()` (which calls `this.api.snapshot()`) when `ledgerRevision` changes.
  - `src/ui/api.ts:93-99`: `status()` → `this.json(this.url('/api/sessions/${this.sessionId}'))`; `agent()` → `this.json(this.url('/api/sessions/${this.sessionId}/agent'))` — both use the default `fetch` method (GET), no `{ method: ... }` override.
  - `src/ui/api.ts:85-87` (`snapshot()`): same pattern, GET, no method override, hitting `/api/sessions/${id}/annotations`.
  - Route registrations in `src/service/http.ts`: `sessionMatch` at `http.ts:306` guarded by `method === 'GET'`; `agentMatch` at `http.ts:540` guarded by `method === 'GET'`; the `annotationsMatch` GET branch at `http.ts:321` (`if (method === 'GET') { sendJson(response, 200, annotationSnapshot(...)); }`); `/health` at `http.ts:157` guarded by `method === 'GET'`.
  - All routes the review surface polls in the background (`status`, `agent`, and the conditional `annotations` snapshot) are registered as GET, and `authorize` only renews on non-GET, so the code matches ADR-0029's claim.
- CONSEQUENCE: none.

## Claim 4 — Do design.md's visual-token values match the stylesheets?

- VERDICT: REFUTED (hex/numeric values are exact matches everywhere; several named tokens diverge or are missing, which is the part of the claim that fails)
- EVIDENCE (exhaustive comparison, `design.md` §2/§3 vs `src/ui/styles/tokens.css` and `src/ui/styles/shell.css`, the only two files under `src/ui/styles/`):
  - **All hex values match exactly** (case-insensitive) between `design.md:82-108` (light/dark primitives) and `tokens.css` `:root` block and `[data-theme='dark']` block: `canvas #FBFAF8`/`#191614`, `surface #FFFFFF`/`#211D1A`, `surface.raised #FFFFFF`/`#2A2521`, `surface.sunken #F4F1EE`/`#12100E`, `ink.primary #20202A`/`#F4F1ED`, `ink.secondary #676674`/`#B3ACA4`, `ink.muted #76727C`/`#8D867E`, `line.default #E9E5E5`/`#332F2B`, `line.strong #D4CED1`/`#474139`, `accent #2B5FD7`/`#7AA2F0`, `accent.ink #FFFFFF`/`#14110E`.
  - **All semantic surface pairs match exactly**, `design.md:123-128` vs `tokens.css`'s `--attention-*`, `--private-*`, `--progress-*`, `--success-*`, `--closed-*`, `--destructive-*` (both light block and `[data-theme='dark']` block): attention `#FFF2CC/#6B4A00` → `#3A2E15/#F0D089`; private `#EEEAFD/#4D3D97` → `#2B2545/#CFCBF5`; progress `#E9EAFE/#37358F` → `#232449/#B9BCF5`; success `#E6EFE2/#2E4A28` → `#212E1D/#A9C9A0`; closed `#F0EEEC/#57535E` → `#262220/#B3ACA4`; destructive `#FFEDE6/#7E3A28` → `#3A241B/#F0B49F`. No differences found.
  - **Radius, elevation, motion, spacing, and most metrics all match**: `design.md:157` (`8/12/16/pill`) ↔ `tokens.css:67-70` (`--radius-input:8px; --radius-card:12px; --radius-overlay:16px; --radius-pill:999px`); `design.md:157` elevation strings ↔ `tokens.css` `--elevation-card/-overlay/-sheet` (identical rgba triples, `.10` vs `.1` is the same numeric value); `design.md:158` motion ↔ `tokens.css` `--motion-fast/-base/-deliberate/--ease` (exact match); `design.md:156` spacing scale ↔ `tokens.css:53-61` (`--space-1..12`, exact match); `design.md:156` metrics (rail 380, drawer 380, card max-width 340, control heights 32/28/36, icon button 28×28) ↔ `tokens.css:59-63` `--rail-width/--drawer-width/--card-max-width/--control-height/-small/-large/--icon-button` (exact match).
  - **Naming mismatch found**: `design.md:143` names the token `type.panel.title` (15/22, 600) for "Rail and card headings"; the CSS variable actually used for that purpose is `--type-rail-title` (`tokens.css:40`, used at `shell.css:99,311,402,1111`). Same value, different name — code has no `--type-panel-title`.
  - **Missing token found**: `design.md:142` names `type.body.strong` (13/18, 600) as a distinct semantic type token ("Selected rows, active tool"); no `--type-body-strong` (or equivalent) variable exists in `tokens.css`. It is instead realized ad hoc, e.g. `shell.css:342-345` (`.status-line { font: var(--type-body); font-weight: 600; }`) and similarly at `shell.css:235, 312, 391, 507, 554, 759` — a manual pairing repeated at each call site rather than a named token.
  - **Missing token found**: `design.md:157` lists radius `full` for icon buttons as a named radius alongside `pill`. `tokens.css` defines no `--radius-full`. The actual icon-button rule, `shell.css:783-788`, hardcodes `border-radius: 999px;` literally — it doesn't even reference the numerically-identical `--radius-pill`.
  - **Tokens present in CSS but never named in design.md's tables**: `tokens.css:63` `--icon-size: 18px` (used for icon glyph sizing) and `tokens.css:64` `--island-tile: 36px` (mode-island tile size, `shell.css:187-188`). `design.md:380` only states a floor ("Each mode tile is at least 24×24"), never the shipped 36px value, and never mentions icon glyph size at all.
- CONSEQUENCE: `design.md` §3 must be corrected to (a) rename `type.panel.title` → `type.rail.title` (or the CSS variable renamed to match, whichever the maintainer intends as the source of truth), (b) either define `--type-body-strong`/`--radius-full` as real CSS custom properties or drop those token names from the table and describe the composition explicitly ("body text at 600 weight", "999px, same construction as pill"), and (c) add `icon.size` (18px) and the mode-island tile's actual shipped size (36px) to the Metrics/Type rows, or state explicitly that they are implementation detail not covered by the token contract.

## Claim 5 — Does `normalizeOutcome` map the old outcome names ADR-0024 claims?

- VERDICT: CONFIRMED
- EVIDENCE:
  - `docs/adr/0024-report-evidence-not-accomplishment.md`: "The stored and wire `outcome` becomes `changed`, `same`, `notFound`, with older records read through a mapping from their old names" and "Keeping ADR-0019's *answered*, *untouched* and *gone* was rejected."
  - `src/annotation/store.ts:1008-1014`:
    ```
    function normalizeOutcome(value: unknown): PassOutcome {
      const stored = (value ?? {}) as Record<string, number | undefined>;
      return {
        changed: stored['changed'] ?? stored['answered'] ?? 0,
        same: stored['same'] ?? stored['untouched'] ?? 0,
        notFound: stored['notFound'] ?? stored['gone'] ?? 0
      };
    }
    ```
  - This is an exact match to the ADR's claimed mapping: `answered → changed`, `untouched → same`, `gone → notFound`, each falling back to `0` if neither key is present, with the current name (`changed`/`same`/`notFound`) preferred over the old one when both exist.
  - `src/annotation/store.ts:36`: `PassOutcome = { changed: number; same: number; notFound: number }` confirms these are the only three current wire/stored keys.
- CONSEQUENCE: none.

## Claim 6 — Are CERTIFIED EXPERIENCE and BASELINE COMPATIBILITY deliberately forward-looking?

- VERDICT: CONFIRMED for Certified Experience; REFUTED for Baseline Compatibility (treated as a pair, the claim only half holds)
- EVIDENCE:
  - `CONTEXT.md:71-77`: defines both terms with identical epistemic weight, as plain present-tense glossary entries, with no "deferred" or forward-looking marker on either. No other glossary entry in `CONTEXT.md` uses a status/roadmap marker either (checked the full file's language for "deferred/not yet/future/planned" — the only "not yet" hits, at `CONTEXT.md:40,60,92`, describe product states like an unsent Annotation Queue, not documentation status).
  - `docs/adr/0008-progressively-enhance-mcp-hosts.md:9-11`: "Ordinary MCP tools and Visual Intent Envelopes will form the portable baseline for any conforming host ... The project will publish a host-and-version certification matrix for richer behavior ... **V0 (Personal Proof) defers the published matrix** and validates baseline delivery on pi via pi-mcp-adapter."
  - `docs/background/product-strategy.md:147-148`: "**Baseline Compatibility:** any conforming MCP host can invoke ordinary tools and receive a structured envelope. V0 is validated on pi..." / "**Certified Experience:** deferred past Personal Proof." — explicit, intentional deferral is corroborated outside `CONTEXT.md`.
  - **Baseline Compatibility is not forward-looking — it is implemented and running today**: `src/mcp/service.ts:611-682` (`listTools`, four working tools), `src/mcp/service.ts:268-278` (`submitEnvelope`, validated against the real schema), `src/mcp/server.ts:24-46` (the actual MCP request handler dispatching those tools), and `src/service/http.ts` (the working local HTTP service backing the review surface). This is present, functioning "ordinary tools + envelope" behavior, not a plan.
  - **No code in `src/**` implements a certification matrix** for Certified Experience: no host/version registry, no per-host test-result store, no "published" artifact of tested host combinations exists anywhere under `src/`.
- CONSEQUENCE: `CONTEXT.md`'s **Certified Experience** entry (`CONTEXT.md:75-77`) should be annotated so a reader of the glossary alone — without cross-referencing `product-strategy.md` or ADR-0008 — can tell it names a deferred process rather than a current one, e.g. append "(deferred past Personal Proof; no matrix is published yet)" or a cross-reference to ADR-0008. **Baseline Compatibility**'s entry needs no change; it already accurately describes a currently-implemented capability, so pairing it with Certified Experience under one open question is not itself a defect — only Certified Experience's entry is missing the deferred-status signal.

## Register updates

- Claim 1: `findings.md`'s "0.1/0.2/0.3 envelope readability" row should split into two verdicts — 0.2/0.3→0.4 CONFIRMED by `src/envelope/envelope.test.ts`'s "keeps a 0.2/0.3 envelope readable" tests; 0.1 REFUTED, since `src/envelope/validate.ts:30`'s `READABLE_VERSIONS` excludes `'0.1'` and no test exercises it through `validateEnvelope` — `README.md:256,317` need correction.
- Claim 2: `findings.md`'s "collectedAt stamping sites" row should be marked CONFIRMED — all five `collectPass` call sites in `src/mcp/service.ts` (297, 311, 363, 383, 454) map exactly onto ADR-0028's four named mechanisms, with the held-call category realized via two internal functions (`deliverAnnotations`, `anotherPass`).
- Claim 3: `findings.md`'s "polling never renews a session" row should be marked CONFIRMED — `src/service/http.ts:1008-1009`'s `authorize` skips `sessions.touch` only on GET, and every route the UI polls (`status`, `agent`, conditional `annotations` snapshot) is registered as GET.
- Claim 4: `findings.md`'s "visual-token values unverified" row should be updated to REFUTED-in-part: all hex/numeric values in `design.md` §2/§3 match `tokens.css`/`shell.css` exactly, but `type.panel.title`/`--type-rail-title` naming mismatch, missing `type.body.strong` and `radius.full` CSS tokens, and undocumented `--icon-size`/`--island-tile` are real, citable doc defects.
- Claim 5: `findings.md`'s "normalizeOutcome legacy mapping" row should be marked CONFIRMED — `src/annotation/store.ts:1008-1014` maps `answered→changed`, `untouched→same`, `gone→notFound` exactly as ADR-0024 claims.
- Claim 6: `findings.md`'s "Certified Experience / Baseline Compatibility forward-looking" row should be marked split: Certified Experience CONFIRMED forward-looking/deferred (corroborated by ADR-0008 and `product-strategy.md:148`, unimplemented in `src/**`); Baseline Compatibility REFUTED as forward-looking — it is implemented now in `src/mcp/service.ts` and `src/service/http.ts`. `CONTEXT.md:75-77` should gain a deferred-status marker.