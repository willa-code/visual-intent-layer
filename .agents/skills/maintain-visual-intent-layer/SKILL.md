---
name: maintain-visual-intent-layer
description: Maintain this package. Use when dogfooding a build, cutting a release, publishing to npm, updating the MCP Registry listing, deprecating a bad release, or doing periodic upkeep.
---

# Maintain visual-intent-layer

Lay out the paths, recommend one, and wait for an explicit **ok** naming the version. Then execute. Repo facts — `.github/workflows/`, `package.json` scripts, `scripts/check-bins.js` — live in the environment; read them there.

## Paths

| Path | Use when | Push + publish |
| --- | --- | --- |
| Dogfood locally | Feel the current tree before releasing anything | No |
| Release | Anything that should reach users | Yes |
| Fix a bad release | A released version is wrong | Yes |

Every published version is an official release. There is no pre-release channel and no promotion step: a build either ships or it does not.

State the path, the target version, and the changes since the last tag (`git log <last-tag>..HEAD --oneline`). Recommend one. Wait for the ok.

Completion: the human replied "ok" to a summary naming the path and version.

## Dogfood locally

No push and no publish.

```sh
npm run build
npm install -g --prefix /tmp/vil-dogfood .
/tmp/vil-dogfood/bin/visual-intent --help
```

Start a session (`visual-intent open --html …` or `--app …`), or let the agent call `open_visual_review`. The in-tree binary works too: `node dist/cli.js open …`.

Dogfooding is what closes the `ready-for-human` verification tickets under `.scratch/*/issues/`; record the result there.

Completion: the built binary runs, and the behaviour under test is exercised end to end.

## Docs sync

Docs are a cache of the environment, so a sync runs code → docs: read the shipped surface from its own sources, then correct every current doc that disagrees. Do this before a release, and whenever behaviour changed.

Read the surface from its own sources, not from the docs:

- `visual-intent --help` and `src/cli.ts` — commands, flags, environment variables
- `createReviewService().listTools()` — the MCP tool names, descriptions and input schemas, including the four triggers that reach for the loop
- the route patterns in `src/service/http.ts` — what a caller can actually reach
- `schema/`, `package.json` (`bin`, `files`, `mcpName`, `scripts`), `server.json` and `src/host/capabilities.ts`
- `src/ui/` — the modes, keys and surfaces a Builder-Reviewer sees

The install table in `README.md` is the one doc whose facts come from outside this
repository: verify each command against that Harness's own CLI (`<harness> mcp add
--help`) rather than trusting the table, since the Harness owns the syntax.

Then correct the current docs that claim otherwise: `README.md`, `CONTEXT.md`,
`design.md`, `SECURITY.md`, `docs/pi-validation.md`, and the verification feature
map under `.agents/skills/verify-visual-intent-layer/references/features/`.

Rules:

- Keep one source of truth: a doc states the behaviour, the environment holds the value. Delete a lookup the agent can re-read.
- Keep ADRs, `docs/background/` research and `.scratch/` records as history. When one asserts behaviour that changed, mark it superseded or corrected; never rewrite the record.
- Every feature file keeps its four sections and a truthful coverage marker (`Not yet driven.`, `Partly driven live`, or none), and no internal doc link breaks.

Completion: every shipped behaviour named in a current doc matches its environment
source, no current doc carries vocabulary the build removed, and every internal
doc link resolves.

## Preflight

Run Docs sync first, then the CI gate on the release commit. A red preflight stops
the release.

```sh
npm run typecheck && node scripts/check-records.js && npm test && npm run build && npm run benchmark
node scripts/check-bins.js
npm install -g --prefix /tmp/vil-ci . && /tmp/vil-ci/bin/visual-intent --help
```

Completion: every command exits 0, and `check-bins` reports both bin shebangs.

`node scripts/stdio-smoke.js` opens a stdio MCP client against `dist/mcp/stdio.js`,
lists the four tools, and opens `fixtures/gallery.html` over the real transport. It
is a manual check and not part of the gate: it opens a browser and holds
`open_visual_review` for the service's wait window, so it cannot run unattended. Set
`VISUAL_INTENT_NO_WAIT=1` and `VISUAL_INTENT_NO_OPEN=1` when running it headless.

## Bump

- `npm version <target> --no-git-tag-version`. Feature = minor, fix = patch, breaking = minor while on `0.x`.
- Set the same version in `server.json`, in both the top-level `version` and the npm package entry.
- `package.json`'s `mcpName` must equal `server.json`'s `name`; the registry rejects the listing otherwise.
- `npm version` rewrites `package.json` formatting; restore the compact arrays so the diff stays version-only.

Completion: `git diff` shows version fields only, and `package.json` and `server.json` name the same version.

## Publish

1. Commit `Release X.Y.Z`, then `git push origin main`.
2. `gh release create vX.Y.Z --notes-start-tag <last stable tag> --generate-notes --title "…"`.

The push is what lets Publish fire: the workflow triggers on `release: published`, and it refuses a GitHub pre-release rather than publishing it, because every published version is an official release. `--notes-start-tag` should name the last *stable* release, so an upgrading reader gets the whole story rather than the distance from the last pre-release.

**Then read the generated body, because it is usually wrong.** `--generate-notes` lists merged pull requests, not commits: work that landed directly on `main` does not appear at all. 0.3.0 was generated naming one unrelated PR for 69 commits of work. If the body does not describe the release, write the notes by hand and `gh release edit vX.Y.Z --notes-file <path>`. There is still no separate changelog — but the release body is what a user reads, so it is not a field to accept unread.

Completion: `gh run watch` reports the Publish run success.

## Registry listing

The official MCP Registry hosts metadata only, and it verifies that the npm package it
points at declares the same name. So the listing is published after the release, never
before.

```sh
mcp-publisher validate        # reads server.json
mcp-publisher login github
mcp-publisher publish
```

Completion: `mcp-publisher publish` names the server and the released version, and
`curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.willa-code/visual-intent-layer"`
returns it.

## Verify

```sh
npm view visual-intent-layer dist-tags
npm pack visual-intent-layer@<version>   # in a temp dir
```

`latest` names the released version. The tarball carries no dev tooling — no
`dist/benchmark`, `dist/eval` or `dist/instrumentation` — and a session opened from it
reports the released version in its `open_visual_review` result.

Completion: `latest`, the tarball contents and the version the server reports all agree.

## Fix a bad release

Versions are immutable; a released `name@version` is never republished. Remedies in order:

1. Fix forward with a new patch or minor.
2. `npm deprecate visual-intent-layer@<version> "<message>"` for anything users may have installed.
3. Move `latest` back to the last good version as an emergency stopgap, and say so in the release notes.
4. `npm unpublish` is a one-shot, irreversible last resort (inside 72 hours, no dependents, single owner).

## Version policy

Feature = minor, fix = patch, breaking = minor while on `0.x`, which semver defines as unstable. Go `1.0.0` when the envelope and MCP surface are something others can depend on. The running server reads its version from `package.json` (`src/version.ts`), so the version a review reports is always the released one.

## Upkeep

Wire a failing check into CI in preference to a recurring checklist. On a green run:

- the one thing `scripts/check-records.js` does not automate: evidence in Comments on a ticket whose boxes are ticked
- `npm outdated`, and the major versions of GitHub Actions
- a Docs sync, so no current doc has drifted from the build
