## Review

**Correct:**
- `src/service/browser.ts` and `src/mcp/service.ts:159-163` (`openBrowserIfAsked`) collapse the four duplicated `if (openOptions.openBrowser) { openInDefaultBrowser(...) }` call sites into one helper — resolves the Duplicated Code smell the ticket (04/05) itself named, per AGENTS.md's refactor-over-explain bias.
- No comments were added anywhere in `browser.ts`, `service.ts`, or `server.ts` (`grep '^\s*//|/\*'` on all three: no matches) — conforms to AGENTS.md's "No comments by default."
- `browserOpened` tri-state (`true`/`false`/`undefined`) is honestly produced: `undefined` only when `openBrowser !== true` (never asked), `false`/`true` only from the injected `openUrl` result — verified against `mcp/service.test.ts:399-433`, which drives the real `createReviewService`, not an over-mocked fake.
- `src/service/browser.test.ts` tests behavior, not fake internals: `fake.specs`/`fake.unrefs` assertions check real side effects the function must produce (call the seam once, `unref()` on success), not fake bookkeeping unrelated to the contract.
- `src/ui/gallery.ts:245` now renders exactly `['in-flight', 'ready', 'closed', 'withdrawn']`, matching `PassState` (`store.ts:32`) — the dead `'open'` member and its two case arms are gone with no orphaned read left, and the doc/code drift the ticket found is closed.

**Finding (P1):** `.agents/skills/verify-visual-intent-layer/references/features/open-artifact.md` — untruthful coverage marker.
The file carries no marker (H1 paragraph → straight into `## Sub-features` at line 5), which per `README.md:64` and the SKILL.md docs-sync invariant ("every feature file keeps ... a truthful coverage marker (`Not yet driven.`, `Partly driven live`, or none)") asserts the file is fully driven live. But this diff adds:
> `open-no-browser` ... (Sub-features, line 12)
and, in Gotchas (line 47):
> `open-no-browser` has no live drive: a Lever run suppresses the product's automatic browser and its host always has one, so the condition cannot be produced in a run. It is held by the opener's unit tests, the service's three-state test and the MCP protocol test instead.

This is the same shape the first review already flagged for `reach-within-the-class.md`: a named sub-feature the file's own text admits is undriven, while the marker (here, its absence = "none"/fully-driven) says otherwise. Smallest fix: add `_Partly driven live: ... open-no-browser remains mapped, not yet driven._` under the H1, matching the convention in `agent-position.md:5`/`decision-drawer.md:5`.

**Finding (P2, judgment call):** `openInDefaultBrowser` (`browser.ts:29-44`) has no timeout; if neither `'spawn'` nor `'error'` ever fires the promise hangs forever and blocks `openArtifact`. Not currently reachable per Node's documented mutual-exclusivity of the two events, and `resolve()` being idempotent means a double-fire is harmless — so this is a note, not a defect this diff introduces incorrectly.

Merge verdict: **OK with notes** — one feature-map marker to fix before the map is truthful again.