## Scope

Read in full: `.agents/skills/verify-visual-intent-layer/SKILL.md` and all 20 files under `references/features/` (`README.md`, `accessibility-and-keyboard.md`, `agent-position.md`, `annotate-and-send.md`, `attachments.md`, `captured-view.md`, `check-in.md`, `decision-drawer.md`, `journeys.md`, `material-and-theme.md`, `mcp-agent-loop.md`, `never-discard-writing.md`, `open-artifact.md`, `proxied-application.md`, `reach-within-the-class.md`, `relational-intent.md`, `resolution-and-honesty.md`, `session-and-overflow.md`, `setup-and-detection.md`, `verify-each-annotation.md`).

Cross-checked against: `src/ui/app.ts`, `src/ui/api.ts`, `src/ui/components.ts`, `src/ui/capture.ts`, `src/ui/runtime.ts`, `src/ui/artifact/layer.ts`, `src/ui/artifact/boundary.ts`, `src/ui/artifact/grounding.ts`, `src/ui/styles/{tokens,shell}.css`, `src/service/http.ts`, `src/service/sessions.ts`, `src/service/launch.ts`, `src/annotation/{model,store,attachments}.ts`, `src/resolution/model.ts`, `src/mcp/service.ts`, `src/cli.ts`, `src/cli-setup.ts`, and fixture files under `fixtures/`.

Left out deliberately (out of lane / instructed exclusions): `.scratch/**`, `.visual-intent-verify/**`, the 25 vendored skills, and `bin/lever.mjs` internals (the Lever's own driving mechanics, cited only to confirm fixture/command names exist, not audited line-by-line since the lane is the feature map's description of the *product* surface, not the harness script).

## Findings

- CLAIM: "The Lever's `setup` runs the built product under a sandboxed `HOME`... registers the MCP server with each configured Harness" — `references/features/setup-and-detection.md:3,29` and `SKILL.md:141` (`$LEVER setup --status --harness pi # the built product's setup and Harness Detection under a sandboxed home`), plus the sweep-order and feature-index entries in `references/features/README.md:52,94`.
  CODE: `src/cli.ts:11-17,44-92` still implements `visual-intent setup` via `src/cli-setup.ts` and `src/harness-registry.ts`, both present at HEAD. Per the settled decisions for this audit, "the setup command is being deleted, along with `src/cli-setup.ts`, `src/harness-registry.ts` and their tests." Installation becomes the human's own harness-native MCP registrar (decision 1), and CLI verbs staying are `mcp`, `serve`, `open` (decision 5).
  VERDICT: STALE — currently MATCHES the code, but describes a feature slated for deletion.
  FIX: Delete `references/features/setup-and-detection.md` entirely; remove its "Third tier" entries from `references/features/README.md` (sweep-order item 8, and the "Setup and Harness Detection" bullet under "Third tier (mapped, not yet driven)"); remove the `$LEVER setup …` line and its two example `mcp …` lines' framing from `SKILL.md`'s "Secondary product surfaces" section (lines ~140-144) to the extent they depend on the deleted verb. Replace with, at most, a short note that installation is via the human's own harness-native MCP registrar, if verification of that path is ever added.

- CLAIM: "the setup version and server transport are recorded with the run." — `references/features/mcp-agent-loop.md:37` (Proof bullet).
  CODE: The "setup version" comes from `formatStatus(plan)`/`planSetup` in `src/cli-setup.ts`, which is being deleted (decision 1); no such evidence exists once that command is gone.
  VERDICT: STALE.
  FIX: Drop "the setup version and" from that sentence, leaving "the server transport are recorded with the run," or remove the clause if the Lever evidence format changes with the setup command's removal.

- CLAIM: "`Queue` needs at least one target. Selecting then immediately queueing without a note still creates a durable Annotation with `No note yet`." — `references/features/annotate-and-send.md` (Gotchas section).
  CODE: `src/ui/app.ts:460` renders `annotation.note || 'No note'` — the literal string is `"No note"`, not `"No note yet"`. A repo-wide search (`grep "No note yet"` in `src`) finds no such string anywhere.
  VERDICT: WRONG.
  FIX: Change the quoted string in the gotcha to `No note`.

## Code with no documentation

- Module: `src/ui/artifact/layer.ts:401-416` (`unreadableHoles`) and `src/ui/artifact/boundary.ts:4` (`BoundaryRefusal` type). The Area/box gesture's unreadable-hole detector can report a fourth boundary category, `unloaded-frame` ("a frame that has not loaded"), distinct from the three refusal categories reach-within-the-class.md documents as sub-features (`reach-refusal-closed`, `reach-refusal-policy`, `reach-refusal-cross-origin`). The same fourth case is also wired into `src/ui/app.ts:2156` (`boundaryReasonSentence`'s `'unloaded-frame'` branch) and `layer.ts:596`, so it is reachable from both the point-target boundary refusal and the Area-hole disclosure. Read: load-bearing (it has dedicated user-facing copy — "lives inside a frame that has not loaded, so there is nothing inside it to find yet" / "a frame that has not loaded" — so it is not dead code), but `reach-within-the-class.md` never names it as a fourth sub-feature or gives it a drive recipe.

- Module: `src/ui/app.ts` — `overflowMenu` item "End session" is documented (`session-and-overflow.md`), but the `Ctrl/Cmd+Enter` shortcut wiring in `onKeyDown` (`src/ui/app.ts:~1875-1880`) also silently does nothing when `this.amendFor` is set (i.e., while an amend editor is open, Cmd/Ctrl+Enter is swallowed rather than submitting the amendment or sending). Neither `accessibility-and-keyboard.md` nor `verify-each-annotation.md` documents this interaction between the amend editor and the send shortcut. Read: minor, likely load-bearing (deliberate guard against accidentally sending while amending) but currently unstated anywhere in the map.

## Could not verify

- The Lever's own `health` read-back fields (`alive`, `owned`, `capabilityAuthorised`, `buildFreshness`, `stale`) named throughout `SKILL.md` and `open-artifact.md` are implemented in `bin/lever.mjs`, which is outside this lane's src/ui/src/service ground truth. I did not audit that script's logic, only confirmed the underlying product primitives it must be reading (401 on bad capability, revision computation) exist in `src/service/http.ts` and `src/artifact/revision.ts`. Settling the exact field names/behavior of `health` itself would require auditing `bin/lever.mjs`, which is explicitly the harness script, not product code.
- Claims about live Verification Run directories cited as evidence in `reach-within-the-class.md` (e.g. `.visual-intent-verify/runs/2026-09-18_04-30-07-reach`) are excluded from this lane per instructions (`.visual-intent-verify/**` out of scope) and were not checked for existence.
- `tests/browser-loop.test.ts`'s two-tab scenario is cited by `resolution-and-honesty.md`; I confirmed the test name exists (`tests/browser-loop.test.ts:904`) but did not run it, so I cannot confirm it currently passes.