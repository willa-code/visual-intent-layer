## Scope

Read in full: `.agents/skills/maintain-visual-intent-layer/SKILL.md`, `.agents/skills/maintain-verification-skill/SKILL.md`, `.agents/skills/create-verification-skill/SKILL.md`, `.agents/skills/playwright-cli/SKILL.md`, and all three files under `.agents/skills/create-verification-skill/references/feature-map-example/` (`README.md`, `create-note.md`, `search.md`).

Cross-checked against: `src/cli.ts`, `src/cli-setup.ts` (existence only), `src/harness-registry.ts` (existence only), `src/mcp/service.ts`, `src/service/http.ts`, `src/host/capabilities.ts`, `src/ui/`, `package.json`, `mcp.json` (existence), `scripts/check-bins.js`, `scripts/check-records.js`, `scripts/stdio-smoke.js`, `.github/workflows/publish.yml`, `.github/workflows/ci.yml`, `skills/visual-intent/` (existence), `docs/pi-validation.md`, `skills-lock.json`, `.gitignore`.

Also read, for the "real feature map format" comparison required for `create-verification-skill`: `.agents/skills/verify-visual-intent-layer/SKILL.md`, `.agents/skills/verify-visual-intent-layer/references/features/README.md`, and `.agents/skills/verify-visual-intent-layer/references/features/setup-and-detection.md`. I did not audit `verify-visual-intent-layer` itself (out of lane) beyond this format comparison — content-level staleness inside its feature files (e.g. that `setup-and-detection.md` documents a command being deleted) is left unreported except as a passing observation.

Left out: the 25 vendored skills in `skills-lock.json`, `.scratch/**`, `.visual-intent-verify/**`, and the rest of `verify-visual-intent-layer`'s feature files beyond the one sampled for format comparison.

## Findings

- CLAIM: "Use when dogfooding a build, cutting a stable or pre-release version, publishing to npm, promoting a validated pre-release, deprecating a bad release, or doing periodic upkeep." — `maintain-visual-intent-layer/SKILL.md:3`
  CODE: settled decision 4 retires the npm pre-release channel (`-next.N`, `dist-tag next`) entirely; releases become official-only.
  VERDICT: STALE
  FIX: drop "or pre-release" and "promoting a validated pre-release"; e.g. "Use when dogfooding a build, cutting a release, publishing to npm, deprecating a bad release, or doing periodic upkeep."

- CLAIM: Paths table rows `| Pre-release to \`next\` | Hand out an installable build to dogfood | Yes |` and `| Promote | A \`next\` pre-release validated | Yes |` — `maintain-visual-intent-layer/SKILL.md:15-16`
  CODE: decision 4 retires the pre-release channel; there is no `next` tag or promotion step left to perform.
  VERDICT: STALE
  FIX: delete both rows; keep Dogfood locally / Stable direct / Fix a bad release. Consider adding a row for maintaining the official MCP Registry listing added by decision 6 (see Findings entry below).

- CLAIM: "`harness-registry.ts` and `cli-setup.ts` — detected harnesses, scopes, transports, Skill install" as a source to read for Docs sync — `maintain-visual-intent-layer/SKILL.md:49`
  CODE: `src/cli-setup.ts` (present, has `withSkill`/harness logic at e.g. `src/cli-setup.ts:33,457`) and `src/harness-registry.ts` both exist at HEAD, but decision 1 deletes both files and the `setup` verb, and decision 2 deletes the pi Skill (`skills/visual-intent/`, `pi.skills` in `package.json:16-19`, `--no-skill`) that this bullet says to read them for.
  VERDICT: STALE
  FIX: remove this bullet outright; once decisions 1–2 land there is no harness-detection/setup/Skill surface left to source docs from.

- CLAIM: docs to correct during Docs sync include "`skills/visual-intent/`" — `maintain-visual-intent-layer/SKILL.md:54`
  CODE: `skills/visual-intent/` exists at HEAD (`ls skills` → `visual-intent/`), but decision 2 deletes it.
  VERDICT: STALE
  FIX: remove `skills/visual-intent/` from the list of current docs; it will not exist to sync.

- CLAIM: "First pre-release of a target: `npm version preminor --preid next --no-git-tag-version` … Later pre-release … `npm version prerelease --preid next …` … Set the same version in `mcp.json`; `check-bins` reads the two against each other." — `maintain-visual-intent-layer/SKILL.md:83-86`
  CODE: `package.json:2` is currently `"version": "0.3.0-next.3"` and `scripts/check-bins.js:14-21` reads `mcp.json`'s pinned version against `package.json`'s; but decision 3 deletes the packaged repo-root `mcp.json` and its release-time check, and decision 4 retires the `-next.N` pre-release scheme.
  VERDICT: STALE
  FIX: collapse Bump to a single stable-only step (`npm version <target> --no-git-tag-version`); drop the pre-release bump commands and the `mcp.json`/`check-bins` pairing note (replace with whatever `check-bins.js` verifies once its `mcp.json` check is removed — not yet knowable from `src/**`, see Could not verify).

- CLAIM: "2. Pre-release: `gh release create vX.Y.Z-next.N --prerelease --generate-notes --title "…"`. … the workflow triggers on `release: published` and routes a pre-release to `--tag next` and a stable release to `latest`." — `maintain-visual-intent-layer/SKILL.md:94,97`
  CODE: `.github/workflows/publish.yml:16-23` currently has exactly this two-branch behaviour (`if: ${{ github.event.release.prerelease }}` → `--tag next`; else plain `npm publish`), matching the doc today — but decision 4 retires this pre-release publishing path.
  VERDICT: STALE
  FIX: delete the pre-release publish step and its description; document only `gh release create vX.Y.Z --generate-notes --title "…"` and unconditional `npm publish --provenance --access public`.

- CLAIM: "A pre-release moves `next` and leaves `latest`; a stable release moves `latest`. The tarball's `mcp.json` pins `<version>`." — `maintain-visual-intent-layer/SKILL.md:108`
  CODE: decision 3 removes the packaged `mcp.json`; decision 4 removes the `next` tag.
  VERDICT: STALE
  FIX: drop the `next`/`latest` comparison and the `mcp.json` pin check from Verify; verify only that `latest` names the released version and that the published tarball's `package.json` version matches (pending decision 3's actual replacement for the pin check).

- CLAIM: entire "## Promote" section, e.g. "Publish the stable version from the same commit as the validated pre-release (`0.3.0-next.1` → `0.3.0`)." — `maintain-visual-intent-layer/SKILL.md:112-116`
  CODE: decision 4 retires the pre-release channel that this section exists to promote from.
  VERDICT: STALE
  FIX: delete the whole "Promote" section; there is no pre-release to promote once releases are official-only.

- CLAIM: "Pre-releases are `0.X.Y-next.N`; reserve `-rc.N` for a candidate byte-identical to the intended stable." — `maintain-visual-intent-layer/SKILL.md:129`
  CODE: decision 4 retires the pre-release channel this sentence defines.
  VERDICT: STALE
  FIX: delete this sentence; keep the surrounding minor/patch/breaking-on-`0.x` and 1.0.0 guidance, which is unaffected.

- CLAIM: Preflight is "the CI gate on the release commit," given as `npm run typecheck && npm test && npm run build && npm run benchmark`, `node scripts/check-bins.js`, `npm install -g --prefix /tmp/vil-ci . && …` — `maintain-visual-intent-layer/SKILL.md:70-77`
  CODE: `.github/workflows/ci.yml:19-33` runs, in order: `npm run typecheck` (19), **`node scripts/check-records.js`** (20), `npm test` (21), `npm run build` (30), `npm run benchmark` (31), `node scripts/check-bins.js` (32), then the install+`--help` check (33). The Preflight block omits `node scripts/check-records.js` entirely, so a maintainer following this skill's Preflight literally would not run the check that actually gates CI on `.scratch/**` record hygiene.
  VERDICT: WRONG
  FIX: insert `node scripts/check-records.js` between the typecheck and test steps in the Preflight command block, matching `ci.yml`'s order.

- CLAIM (related): Upkeep lists as a manual item "ticket statuses under `.scratch/<feature>/issues/` — `done`, boxes ticked, evidence in Comments" — `maintain-visual-intent-layer/SKILL.md:135`, next to the stated principle "Wire a failing check into CI in preference to a recurring checklist" (`SKILL.md:133`)
  CODE: `scripts/check-records.js:5-13,58-70` already automates most of this (status vocabulary, issue filename shape, unticked boxes on a `done` ticket without a `Deferred confirmation:`), and is wired into CI (`ci.yml:20`) — but the Preflight section above never names it, so the skill's own stated preference (automate over checklist) is undermined by the same omission.
  VERDICT: P2 — the checklist item is partially redundant with an automated check the skill doesn't cite
  FIX: once check-records.js is added to Preflight (previous finding), narrow this Upkeep bullet to only what isn't automated (evidence-in-Comments), or drop it in favor of pointing at the CI check.

- CLAIM: Docs sync's `src/cli.ts`, `createReviewService().listTools()`, `src/service/http.ts`, `schema/`/`package.json`/`src/host/capabilities.ts`, `src/ui/` as sources — `maintain-visual-intent-layer/SKILL.md:46-51`
  CODE: all confirmed present and matching — `src/cli.ts` (verbs `serve`/`open`/`mcp`/`setup`, flags as described at `src/cli.ts:11-27`), `listTools()` at `src/mcp/service.ts:100,605,678`, HTTP server at `src/service/http.ts:1,83`, `src/host/capabilities.ts` exists, `src/ui/` exists with the listed contents.
  VERDICT: MATCHES
  FIX: none (for the parts that survive decisions 1–4; the harness-registry/cli-setup bullet is separately STALE above).

- CLAIM: "Start a session (`visual-intent open --html …` or `--app …`), or let the agent call `open_visual_review`." — `maintain-visual-intent-layer/SKILL.md:34`
  CODE: `src/cli.ts:139-141` implements `open` with `--html`/`--app`; `src/mcp/service.ts:608` names the tool `open_visual_review`.
  VERDICT: MATCHES
  FIX: none.

- CLAIM: "Dogfooding is what closes the `ready-for-human` verification tickets under `.scratch/*/issues/`" — `maintain-visual-intent-layer/SKILL.md:36`
  CODE: `ready-for-human` is a live status vocabulary term used throughout `.scratch/**` issue files (e.g. `.scratch/visual-intent-layer/issues/16-validate-on-pi.md:17`, `.scratch/truth-and-sync/spec.md:138`) and is one of `scripts/check-records.js:5-13`'s recognized statuses.
  VERDICT: MATCHES
  FIX: none.

- CLAIM (decision 6 coverage): no line in `maintain-visual-intent-layer/SKILL.md` mentions maintaining an official MCP Registry listing.
  CODE: `src/**` and repo root have no registry manifest yet (`find server.json` → no results; no `mcpName`/registry field in `package.json`). Decision 6 records this as a settled future addition to distribution.
  VERDICT: MISSING (a settled decision with no corresponding step, but also no code yet to ground a specific fix)
  FIX: once the registry-publishing mechanism is implemented, add a Publish/Verify step here for updating the MCP Registry listing; nothing to correct today beyond noting the gap.

- CLAIM: `create-verification-skill/SKILL.md`'s feature-map generation instructions ("Follow the shape in `references/feature-map-example/`... The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`.") — `create-verification-skill/SKILL.md` §3
  CODE: the real project feature map (`verify-visual-intent-layer/references/features/README.md` "Feature entry contract" and `setup-and-detection.md`) uses exactly the same four H2 titles in the same order, with an H1 + one-paragraph lead, matching `feature-map-example/create-note.md` and `search.md` structurally section-for-section.
  VERDICT: MATCHES
  FIX: none.

- CLAIM: `maintain-verification-skill/SKILL.md` and `create-verification-skill/SKILL.md` overall content
  CODE: neither file references any visual-intent-layer-specific path, command, or the settled decisions (`grep` for "setup", "skills/visual-intent", "mcp.json", "pre-release", "--no-skill", "Lever", "visual-intent" all returned no matches in either file).
  VERDICT: MATCHES (project-agnostic; nothing in scope drifted)
  FIX: none.

- CLAIM: `playwright-cli/SKILL.md`'s command set, `.playwright-cli/` output convention, and installation instructions
  CODE: this skill documents the third-party `@playwright/cli` tool, not this repo's own `src/**`. The one repo-local touchpoint — the `.playwright-cli/` scratch directory the skill's Snapshots section writes to — is confirmed gitignored at `.gitignore:2`. No package.json script or CI step invokes `playwright-cli` (only the unrelated `playwright` test library at `package.json:60`).
  VERDICT: MATCHES (the only checkable repo-local fact holds; the rest is out of `src/**`'s ground truth by nature — see Could not verify)
  FIX: none.

## Code with no documentation

- `scripts/check-records.js:1-108` — validates every `.scratch/**` `spec.md`/`issues/*.md` file's `Status:` line against the closed vocabulary, issue filename shape, unticked-box-without-deferred-confirmation rule on `done` tickets, and `Trigger:` dating on `deferred` tickets. Wired into CI (`ci.yml:20`) but never named by `maintain-visual-intent-layer/SKILL.md`'s Preflight or Docs-sync source list. Load-bearing: it is a real release gate today, and its absence from the maintenance skill is the WRONG finding above.
- `scripts/stdio-smoke.js:1-19` — opens a stdio MCP client against `dist/mcp/stdio.js`, lists tools, calls `open_visual_review` against `fixtures/gallery.html`, and prints the result. Not referenced anywhere in the four in-lane skills or in `package.json` scripts/CI (not found in `ci.yml` or `package.json` scripts list). Appears to be a manual smoke-test helper; likely load-bearing for the maintainer during Preflight/dogfooding but currently has no invocation documented anywhere in the maintenance skill, so a reader following `maintain-visual-intent-layer/SKILL.md` literally would never learn it exists.

## Could not verify

- The exact replacement for `scripts/check-bins.js`'s `mcp.json` pin check once decision 3 removes the packaged `mcp.json`. Settling the Bump/Verify sections' precise fixed wording requires seeing the post-decision-3 `check-bins.js`, which does not exist yet in `src/**`/`scripts/**`.
- Whether `Publish` will remain a single unconditional `npm publish` step or gain new flags once decision 4's retirement of the pre-release path is implemented in `.github/workflows/publish.yml` (currently still branches on `github.event.release.prerelease}}` at `publish.yml:19-23`).
- The shape of the future MCP Registry maintenance step (decision 6): no manifest, script, or workflow step exists yet in this checkout to ground a concrete FIX beyond flagging the gap.
- `playwright-cli`'s own command behavior (flags like `--mobile`, `webmcp-*`, `video-*`) is defined by the external `@playwright/cli` package, which is not vendored in this repo's `src/**`; settling correctness of those specific commands would require that package's own source/docs, not this repository.