# Code coverage audit — src/** vs. in-scope documentation

Direction: for every non-test module under `src/`, is it described by any in-scope
document, and is it load-bearing, dev-only, or dead in the shipped product?

## Scope

Read in full or in relevant part:
- `package.json` (bin entries, files field, scripts)
- `src/cli.ts`, `src/mcp/stdio.ts`, `src/mcp/server.ts` (the two shipped entry points and the tool dispatcher)
- `src/cli-setup.ts` (imports only, header), `src/harness-registry.ts` (line count / grep)
- `src/service/http.ts` (imports, static-asset serving section), `src/annotation/store.ts` (imports), `src/mcp/service.ts` (imports)
- `src/adapters/source-stamp.ts` (full), `src/host/capabilities.ts` (full)
- `scripts/build-ui.js` (full) — establishes that `src/ui/**` is bundled into `dist/ui/*.js` and served
- `README.md` (Install, Use, Envelope schema, Develop, Layout, Documentation sections — lines 1–349)
- `CONTEXT.md`, `design.md`, `VISION.md` (grepped for module-specific terms)
- `docs/adr/0006`, `0010`, `0014`, `0018`, `0021`, `0022`, `0025`, `0029` (full or excerpt, as cited)
- `docs/background/harness-mcp-setup-research.md` (excerpt on `cli-setup.ts`/`harness-registry.ts`)
- `docs/agents/domain.md` (excerpt — generic tooling doc, not module-specific)
- Ran `npm pack --dry-run --json --ignore-scripts` to get the real shipped file list (dist wholesale) and cross-checked against `tsconfig.build.json`.

Left out: full text of every ADR and background doc (only grepped for terms
relevant to specific modules); `docs/pi-validation.md` beyond one grep hit;
`SECURITY.md` beyond one grep hit; all `*.test.ts` files (excluded by the
brief); `.scratch/**`, `.visual-intent-verify/**`, and the 25 vendored skills
(excluded by the brief).

## Module coverage table

Purpose is taken from the code itself (file:line cited). "Documented in"
cites the doc bullet/section that names the module, or "none". Value verdict
is LOAD-BEARING (reachable from a shipped bin entry or bundled into the
browser UI that a shipped entry point serves), DEV-ONLY (tooling/benchmarks/
evals invoked only via `npm run` scripts, not from a bin entry), or DEAD.

Shipped bin entries checked (`package.json:20-23`): `visual-intent` →
`./dist/cli.js` (built from `src/cli.ts`), `visual-intent-mcp` →
`./dist/mcp/stdio.js` (built from `src/mcp/stdio.ts`). No other bin entries
exist.

| Module | Purpose (code) | Documented in | Verdict |
|---|---|---|---|
| `src/cli.ts` | Parses argv; dispatches `setup`, `mcp`, `serve`, `open` (`src/cli.ts:47,113,116,133`) | README.md:21-32 (setup, STALE — see decision #1/#5), README.md:83-91 (serve/open, MATCHES) | LOAD-BEARING (bin `visual-intent`) |
| `src/cli-setup.ts` | Detects harnesses, plans/writes MCP registration + skill files, formats plan/status/result (`src/cli-setup.ts:17-18` `SERVER_NAME`, `SKILL_DIR`) | README.md:21-71 (Install section, harness table); `docs/adr/0014-...md:5`; `docs/background/harness-mcp-setup-research.md:7` | LOAD-BEARING today, but slated for deletion (settled decision #1) — doc text is STALE, must be removed with the module |
| `src/harness-registry.ts` | Per-harness descriptors: aliases, config paths, detection evidence, command resolution (`src/harness-registry.ts:1-2` imports `existsSync/readdirSync/statSync`, `delimiter/join`) | `docs/background/harness-mcp-setup-research.md:107`; `docs/adr/0014-...md:5` | LOAD-BEARING today via `cli-setup.ts` import (`src/cli-setup.ts:4-15`); slated for deletion (decision #1) — doc text is STALE |
| `src/mcp/stdio.ts` | Starts local HTTP service, builds MCP server, connects stdio transport (`src/mcp/stdio.ts:11-19`) | README.md:73 (`npx ... visual-intent-mcp` form); README.md §"Agent tools (MCP)" | LOAD-BEARING (bin `visual-intent-mcp`) |
| `src/mcp/server.ts` | Registers the 4 MCP tools (`open_visual_review`, `check_in`, `get_intent_status`, `acknowledge_intent`) and dispatches by name (`src/mcp/server.ts:31-38`) | README.md:220-229 (tool table) — MATCHES; tool names, count and one-line behaviours check out | LOAD-BEARING |
| `src/mcp/service.ts` | `createReviewService`: envelope validation, artifact revision/identity, annotation store wiring, session records, host capability detection, check-in store (`src/mcp/service.ts:4-14`) | README.md:318 ("src/mcp/ — MCP server, the four tools, stdio transport" — names the directory but not this file's role as the service core) | LOAD-BEARING |
| `src/service/http.ts` | Loopback HTTP server: static UI asset serving (`readUiFile`, `src/service/http.ts:1157,1620`), proxying, session/capability routes, CSP injection via `artifact/fidelity.ts` | README.md:320 ("src/service/ — loopback HTTP service, ... security boundary, browser opening"); README.md §"Security and privacy" | LOAD-BEARING |
| `src/service/launch.ts` | Builds machine-readable launch records for `--json` CLI output (`serveLaunchRecord`, `openLaunchRecord`, `launchRecordJson`) | README.md:91-95 ("--json prints one machine-readable launch record...") — described in prose, module not named | LOAD-BEARING, documented behaviourally but not by file name (acceptable — README doesn't name every file) |
| `src/service/browser.ts` | `openInDefaultBrowser`, `autoOpenSuppressed` (env var gate) | README.md:96-99 (`--no-open` / `VISUAL_INTENT_NO_OPEN`); README.md:320 ("browser opening") | LOAD-BEARING |
| `src/service/sessions.ts` | `SessionRecords`: per-session capability tokens, expiry (`src/service/sessions.ts:2` `timingSafeEqual`) | README.md:320 ("sessions"); `docs/adr/0029-expiry-bounds-an-idle-review.md:32` (`?cap=` token) | LOAD-BEARING |
| `src/service/check-in.ts` | `CheckInStore`: interruption/steering records for the Check-In convention | README.md:186-198 (Check-In section); `docs/adr/0018-steering-is-a-convention-not-a-capability.md:7` (names `src/service/http.ts`'s `?cap=` token explicitly, and the check-in mechanism) | LOAD-BEARING |
| `src/service/json-file.ts` | `readJsonFile`/`writeJsonAtomic`: durable JSON persistence helpers | none (utility, not named anywhere) | LOAD-BEARING, no doc — see "Code with no documentation" |
| `src/annotation/model.ts` | Core `Annotation` type, state machine helpers (`isInQueue`, `isAmendable`, `summarise`, etc.) | README.md:316 ("the Annotation model"); README.md §"The Annotation model" (prose describes the behaviour this file implements) | LOAD-BEARING |
| `src/annotation/store.ts` | `AnnotationStore`: durable persistence, migration invocation, pass lifecycle | README.md:316 ("durable store"); `docs/adr/0025-a-verdict-is-reversible.md:38` | LOAD-BEARING |
| `src/annotation/attachments.ts` | `AttachmentStore`: content-addressed reference-image storage | README.md:316 ("attachments"); README.md §"Reference images are added by picker, paste or drop, ... content-addressed by their own bytes" | LOAD-BEARING |
| `src/annotation/migrate.ts` | Legacy-record migration to current Annotation shape | README.md:316 ("migration"); `docs/adr/0016-annotation-as-the-unit-of-work.md:16` | LOAD-BEARING |
| `src/annotation/envelope.ts` | Builds the outgoing Visual Intent Envelope batch from Annotations (`buildBatchEnvelope`, `batchEnvelopeId`, `batchIdempotencyKey`) | README.md §"Envelope schema"; no file-level mention | LOAD-BEARING, documented behaviourally |
| `src/annotation/relations.ts` | `relationSentence`: renders a relation as one sentence | README.md:12-15, 129-153 (Relational Intent prose); `design.md:222-227,334-347` | LOAD-BEARING |
| `src/artifact/revision.ts` | `computeRevision`, `blakeHex`, `stableArtifactId`: content-addressed identity via blake3 | README.md:317 ("identity, content-addressed revisions") | LOAD-BEARING |
| `src/artifact/source-root.ts` | `computeSourceRootRevision`: walks a source-root directory tree to build an asset manifest/revision for a running app | README.md:317 (implied under "content-addressed revisions" but the source-root-specific walking behaviour is not called out) | LOAD-BEARING |
| `src/artifact/fidelity.ts` | CSP construction, HTML/CSS rewriting for proxied apps, artifact-layer script injection | README.md:317 ("fidelity rewriting"); README.md §"Security and privacy" (CSP/proxy prose) | LOAD-BEARING |
| `src/artifact/snapshots.ts` | `SnapshotStore`: persists Captured View bytes | README.md:317 ("snapshots"); `docs/adr/0022-capture-pixels-only-in-the-reviewing-tab.md` | LOAD-BEARING |
| `src/resolution/model.ts` | `TargetMatch`, `deriveResolutionLabel`, `RuntimeStateContext`, viewed-state comparison | README.md:318 ("target resolution and its reduced vocabulary"); README.md §"Resolution, honesty and the agent" | LOAD-BEARING |
| `src/resolution/resolve.ts` | `resolveTarget`: re-locates a target against a changed artifact, produces `ResolutionCandidate`/`TargetResolutionRecord` | README.md:318; README.md §"Resolution, honesty and the agent" | LOAD-BEARING |
| `src/envelope/validate.ts` | Ajv-based `validateEnvelope` against the generated JSON Schema types; defines `Envelope` type used everywhere | README.md §"Envelope schema" describes the schema and generated types but never names `src/envelope/` as a Layout bullet (only `schema/` is listed, README.md:314) | LOAD-BEARING, directory not named in Layout — see "Code with no documentation" |
| `src/envelope/fixtures.ts` | `representativeEnvelope`, `SCHEMA_VERSION` fixture used by instrumentation and tests | none by name; `SCHEMA_VERSION`/version story covered in README §"Envelope schema" | DEV-ONLY (only consumed by `src/instrumentation/measure.ts:4` and tests) — not reachable from a bin entry |
| `src/envelope/generated/envelope-v0.4.ts` | Generated TS types from the JSON Schema (`scripts/generate-envelope-types.js`) | README.md §"Envelope schema": "TypeScript types are generated from it (`npm run build:types`)" | LOAD-BEARING |
| `src/host/capabilities.ts` | `HostCapabilities`, `detectCapabilities`, `describeCapabilities` (embeddedUI/subscriptions only) | README.md:323 ("the surviving host-capability declaration"); README.md §"Agent tools (MCP)" (`embeddedUI`/`subscriptions` prose); `docs/adr/0018-...md:7` | LOAD-BEARING |
| `src/adapters/source-stamp.ts` | `provenanceForElement`, `parseStamp`: reads `data-vis-source` / `data-insp-path` attributes for Provenance Confidence | README.md:322; README.md:168-171; `docs/adr/0021-claim-exact-provenance-only-from-instrumentation.md:9` | LOAD-BEARING (bundled into `dist/ui/artifact-layer.js` per `scripts/build-ui.js:11`, imported by `src/ui/artifact/grounding.ts:1` and `src/ui/artifact/layer.ts:1`) |
| `src/ui/app.ts` | Shell application logic (rail, island, annotation drafting, API client wiring) | README.md:321 ("product-owned shell"); README.md §"One rail, two tiles" | LOAD-BEARING (bundled as `dist/ui/shell.js` per `scripts/build-ui.js:10`, served by `src/service/http.ts:1157`) |
| `src/ui/api.ts` | Typed HTTP client (`Api`, `ApiError`) the shell uses against `src/service/http.ts` routes | README.md:321 (implied, shell client) — not named by file | LOAD-BEARING |
| `src/ui/components.ts` | DOM component builders for annotation cards, rail rows, etc. | README.md:321 (implied under "shell") | LOAD-BEARING |
| `src/ui/dom.ts` | Small DOM builder helpers (`h`, `button`, `iconButton`, `qs`, `clear`) | none by name | LOAD-BEARING, undocumented utility |
| `src/ui/icons.ts` | Icon name registry + `icon()` renderer | README.md:321 ("icon set") | LOAD-BEARING |
| `src/ui/gallery.ts` | Design gallery page logic | README.md:299-308, 321 ("design gallery") | LOAD-BEARING (bundled as `dist/ui/gallery.js`) — but the gallery itself is explicitly "not part of the product's navigation" (README.md:299-300) |
| `src/ui/protocol.ts` | Message/type contracts between shell and artifact-layer iframe (`LayerMessage`, `ShellMessage`, etc.) | none by name; behaviour implied by design.md's iframe/artifact-layer architecture but not cited to this file | LOAD-BEARING, undocumented by name |
| `src/ui/capture.ts` | `captureArtifactView`, `CAPTURE_SUPPORT_STATEMENT`, `captureAvailable` — Captured View permissioned capture | `docs/adr/0022-capture-pixels-only-in-the-reviewing-tab.md` (full); README.md §"A Target may carry a Captured View" | LOAD-BEARING |
| `src/ui/runtime.ts` | `readConfig`, `apiBaseUrl`, `debounce` — shell runtime config reader | none by name | LOAD-BEARING, undocumented utility |
| `src/ui/artifact/bootstrap.ts` | `ARTIFACT_FRAME_CLASS`/`ARTIFACT_FRAME_SESSION_ATTRIBUTE`, `isArtifactDocument` — artifact-frame identification | README.md:321 ("artifact interaction layer", generic) | LOAD-BEARING (bundled into `dist/ui/artifact-layer.js`) |
| `src/ui/artifact/boundary.ts` | Frame/shadow-DOM boundary traversal (`FRAME_SEPARATOR`, `SHADOW_SEPARATOR`, `composedFrameParts`, `elementOf`, `BoundaryRefusal`) | `design.md` frame/shadow boundary language (grepped generically, no direct file citation found) | LOAD-BEARING |
| `src/ui/artifact/grounding.ts` | `provenanceForElement`-based grounding + `Box`/`Grounding` construction from a resolved element | `docs/adr/0010-separate-rendered-grounding-from-source-provenance.md` (conceptually) | LOAD-BEARING |
| `src/ui/artifact/layer.ts` | The artifact-layer content script: pointer/box tools, relation drag, marks, messages to shell | README.md:321 ("artifact interaction layer"); design.md §"A relation is a gesture, not a third tile" | LOAD-BEARING (bundled as `dist/ui/artifact-layer.js`, iife format) |
| `src/benchmark/cli.ts` | Standalone CLI: `buildMatrix` + `runBenchmark`, printed via `npm run benchmark` | README.md:287, 324 ("target-resolution mutation benchmark"; "src/benchmark/ — mutation benchmark matrix") | DEV-ONLY (invoked only via `npm run benchmark` → `node dist/benchmark/cli.js`; not imported by `src/cli.ts` or `src/mcp/stdio.ts`) |
| `src/benchmark/matrix.ts` | Builds the mutation-benchmark case matrix | same as above | DEV-ONLY |
| `src/benchmark/run.ts` | Runs one benchmark case against `resolveTarget` | same as above; also consumed by `src/instrumentation/measure.ts:8` | DEV-ONLY |
| `src/eval/cli.ts` | Standalone CLI: `runInvocationEval`, printed via `npm run eval:invocation` | README.md:289, 326 ("documented routing policy, not live agent judgment"; "documented invocation-routing eval") | DEV-ONLY |
| `src/eval/invocation.ts` | The documented invocation-routing eval logic | same as above | DEV-ONLY |
| `src/instrumentation/cli.ts` | Standalone CLI: `collectInstrumentation`, printed via `npm run instrument` | README.md:288, 325 ("latency / reliability / token-efficiency signals"; "product-boundary measurements") | DEV-ONLY |
| `src/instrumentation/measure.ts` | Spins up a real `AnnotationStore` + `createReviewService` + `startLocalService` against `representativeEnvelope`, runs the benchmark matrix, measures timing | same as above; `CONTEXT.md:140` (Provenance Confidence framing referenced, not the file) | DEV-ONLY |

## Findings

- CLAIM: "`src/cli-setup.ts` ... writes project `.mcp.json` or global `~/.config/mcp/mcp.json`" — `docs/background/harness-mcp-setup-research.md:7`
  CODE: `src/cli-setup.ts` exists and does exactly this today (`src/cli-setup.ts:17-18` `SERVER_NAME`/`SKILL_DIR`; full write logic in the rest of the file).
  VERDICT: STALE (settled decision #1: the setup command, `src/cli-setup.ts` and `src/harness-registry.ts` are being deleted).
  FIX: Remove this doc's dependency on `cli-setup.ts` behaviour, or mark the whole research note as historical background (RECORD) once the module is deleted; it must not remain a live description of shipped behaviour.

- CLAIM: "Harness knowledge becomes a registry of per-harness descriptors ... instead of inline conditionals in `cli-setup.ts`." — `docs/adr/0014-union-harness-detection-and-content-verified-registration.md:5`
  CODE: `src/harness-registry.ts` implements this registry (`src/harness-registry.ts:1-2` and exported `HARNESSES`, `detectHarnessPresence`, etc., per `src/cli-setup.ts:4-15` import list).
  VERDICT: STALE (settled decision #1).
  FIX: Once `cli-setup.ts`/`harness-registry.ts` are deleted, this ADR describes a design decision for code that no longer exists; leave as RECORD (historical ADR) but do not let README or other live docs continue citing it as current behaviour.

- CLAIM: "`src/mcp/` — MCP server, the four tools, stdio transport" — README.md:318
  CODE: `src/mcp/server.ts:31-38` dispatches exactly 4 tools (`open_visual_review`, `check_in`, `get_intent_status`, `acknowledge_intent`); `src/mcp/stdio.ts` is the stdio transport entry.
  VERDICT: MATCHES.
  FIX: none.

- CLAIM: "`src/adapters/` — the build-time source-location stamp reader (product and third-party attributes)" — README.md:322
  CODE: `src/adapters/source-stamp.ts:14-17` defines `OWN_STAMP_ATTRIBUTE` ('data-vis-source', product) and a third-party contract for `data-insp-path` (`code-inspector-plugin`) — matches "product and third-party attributes" exactly.
  VERDICT: MATCHES.
  FIX: none.

- CLAIM: "`src/host/` — the surviving host-capability declaration (embedded UI, subscriptions)" — README.md:323
  CODE: `src/host/capabilities.ts:1-2` types exactly `{ embeddedUI, subscriptions }`, no `steering` field — matches "surviving" (steering was retired per ADR-0018).
  VERDICT: MATCHES.
  FIX: none.

- CLAIM: "The `0.1` schema is kept only for reading state written by older releases. `0.2` and `0.3` envelopes are still readable" — README.md §"Envelope schema"
  CODE: The generated types module is `src/envelope/generated/envelope-v0.4.ts` (only a 0.4 generated module found under `src/envelope/generated/`); could not find 0.1/0.2/0.3 generated type modules or migration-version-branch code in `src/envelope/validate.ts` within the read excerpt.
  VERDICT: UNVERIFIED (see "Could not verify" below) — do not report this as WRONG without checking `src/annotation/migrate.ts` and `src/annotation/store.ts` version-handling logic in full, which is outside a quick read.
  FIX: none pending verification.

- CLAIM: Layout section (README.md:311-330) enumerates `src/` subdirectories including `annotation`, `artifact`, `resolution`, `mcp`, `service`, `ui`, `adapters`, `host`, `benchmark`, `instrumentation`, `eval`.
  CODE: `src/envelope/` and `src/cli.ts`/`src/cli-setup.ts`/`src/harness-registry.ts` are real, non-trivial modules with no corresponding Layout bullet (`src/envelope/validate.ts:1-98`, `src/envelope/fixtures.ts:1-82`, `src/cli.ts:1-201`).
  VERDICT: MISSING (code with no Layout-level documentation, though `src/envelope/`'s schema is described narratively under "Envelope schema" and `src/cli.ts` is described narratively under "Use").
  FIX: Add a `src/envelope/` bullet to the Layout list distinguishing it from `schema/` (the JSON Schema files vs. the TS loader/validator/generated-types/fixtures). No fix needed for `src/cli.ts` since its behaviour is documented under "Use", just not listed as a Layout bullet — that is a stylistic choice (single files aren't bulleted), not an error.

## Code with no documentation

- `src/service/json-file.ts:1-31` — `readJsonFile`/`writeJsonAtomic`, the atomic-write primitive every store (`annotation/store.ts`, `annotation/attachments.ts`, `service/sessions.ts`, `service/check-in.ts`) depends on. LOAD-BEARING; no doc names this file, though its effect ("service restart loses nothing", README.md:241) is described at the behavioural level.
- `src/ui/dom.ts:1` — DOM builder helpers (`h`, `button`, `iconButton`, `clear`, `qs`) used throughout `src/ui/*`. LOAD-BEARING (bundled into every UI bundle); pure implementation detail, undocumented by name — reasonable to leave undocumented.
- `src/ui/runtime.ts` — `readConfig`, `apiBaseUrl`, `debounce`. LOAD-BEARING (bundled into `shell.js`); undocumented by name.
- `src/ui/protocol.ts` — the shell/artifact-layer message contract (`LayerMessage`, `ShellMessage`, `LayerTarget`, etc.). LOAD-BEARING (imported by both `src/ui/app.ts:36` and `src/ui/artifact/layer.ts:5`, i.e., it is the seam between the two bundled scripts); no doc names this file or describes the postMessage contract explicitly, though design.md describes the resulting UX (relation drag, marks) that this protocol carries.
- `src/ui/artifact/boundary.ts` — frame/shadow-DOM composed-path traversal (`composedFrameParts`, `composedShadowParts`, `contentDocumentOf`, `elementOf`, `BoundaryRefusal`). LOAD-BEARING; no direct file citation found in design.md/ADRs despite the frame-chain concept ("the ordered chain of documents it was reached through", README.md §"Envelope schema") clearly depending on this module.
- `src/benchmark/`, `src/eval/`, `src/instrumentation/` (all files) — confirmed DEV-ONLY: not imported by `src/cli.ts` or `src/mcp/stdio.ts` (full import graph traced via `grep -rn "^import" src`), only reachable via `npm run benchmark` / `npm run eval:invocation` / `npm run instrument` scripts (`package.json` scripts block). They ARE named in README's Layout list (MATCHES at the directory-description level) so this is not an undocumented-existence problem — the finding here is a **packaging** fact, not a documentation-content fact: `npm pack --dry-run --json --ignore-scripts` confirms `dist/benchmark/**`, `dist/eval/**`, `dist/instrumentation/**` (24 files) ship inside the published npm tarball because `package.json:"files"` lists `"dist"` wholesale (`package.json:26-31`) and `tsconfig.build.json` has no exclusion for these directories (only `*.test.ts` and `dist` are excluded). No in-scope document states that these directories ship inside the published package to end users who only need the `visual-intent`/`visual-intent-mcp` binaries. This is dev/measurement scaffolding riding along in every install for no run-time reason.

## Could not verify

- Whether `src/envelope/validate.ts` and `src/annotation/migrate.ts`/`src/annotation/store.ts` actually implement the 0.1/0.2/0.3-read, 0.4-write behaviour claimed in README's "Envelope schema" section (README.md §"Envelope schema": "`0.2` and `0.3` envelopes are still readable ... New envelopes are `0.4`"). I only read the first ~20-25 lines of `validate.ts` and the import header of `store.ts`/`migrate.ts`; the full version-branch logic needs a complete read of `src/annotation/migrate.ts` (49? lines — not measured) and the relevant sections of `src/annotation/store.ts` (1000+ lines) to confirm or refute. Settling this requires reading `src/annotation/migrate.ts` in full and grepping `store.ts` for `0.1`/`0.2`/`0.3`/`0.4` version-branch handling.
- Whether `src/ui/artifact/boundary.ts`'s frame/shadow traversal is described anywhere in `design.md`'s composition sections beyond the generic frame/shadow language grepped here — settling this requires a full read of `design.md` (only grepped for "relation"/"frame" terms, not read end to end for this audit).
- Whether any in-scope doc explicitly discloses that `dist/benchmark`, `dist/eval`, `dist/instrumentation` ship inside the published npm package — I grepped README, CONTEXT.md, design.md, SECURITY.md, and the ADR/background directories for "benchmark", "eval", "instrumentation" and found only descriptions of what these tools measure, never a packaging disclosure. Settling this fully would require grepping SECURITY.md and docs/pi-validation.md in full (only single-term greps were run here) for any packaging/distribution disclosure I might have missed.
