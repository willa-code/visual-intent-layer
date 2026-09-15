---
name: maintain-visual-intent-layer
description: Maintain this package. Use when dogfooding a build, cutting a stable or pre-release version, publishing to npm, promoting a validated pre-release, deprecating a bad release, or doing periodic upkeep.
---

# Maintain visual-intent-layer

Lay out the paths, recommend one, and wait for an explicit **ok** naming the version and channel. Then execute. Repo facts — `.github/workflows/`, `package.json` scripts, `scripts/check-bins.js` — live in the environment; read them there.

## Paths

| Path | Use when | Push + publish |
| --- | --- | --- |
| Dogfood locally | Feel the current tree before releasing anything | No |
| Pre-release to `next` | Hand out an installable build to dogfood | Yes |
| Promote | A `next` pre-release validated | Yes |
| Stable direct | A small fix not worth a pre-release | Yes |
| Fix a bad release | A released version is wrong | Yes |

State the path, the target version, the channel, and the changes since the last tag (`git log <last-tag>..HEAD --oneline`). Recommend one. Wait for the ok.

Completion: the human replied "ok" to a summary naming the path, version, and channel.

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

## Preflight

Run the CI gate on the release commit. A red preflight stops the release.

```sh
npm run typecheck && npm test && npm run build && npm run benchmark
node scripts/check-bins.js
npm install -g --prefix /tmp/vil-ci . && /tmp/vil-ci/bin/visual-intent --help
```

Completion: every command exits 0.

## Bump

- First pre-release of a target: `npm version preminor --preid next --no-git-tag-version` (`0.2.1` → `0.3.0-next.0`).
- Later pre-release of the same target: `npm version prerelease --preid next --no-git-tag-version` (→ `.1`).
- Stable: `npm version <target> --no-git-tag-version`.
- Set the same version in `mcp.json`; `check-bins` reads the two against each other.
- `npm version` rewrites `package.json` formatting; restore the compact arrays so the diff stays version-only.

Completion: `git diff` shows version fields only, and `check-bins` prints the new pin.

## Publish

1. Commit `Release X.Y.Z`, then `git push origin main`.
2. Pre-release: `gh release create vX.Y.Z-next.N --prerelease --generate-notes --title "…"`.
3. Stable: `gh release create vX.Y.Z --generate-notes --title "…"`.

The push is what lets Publish fire: the workflow triggers on `release: published` and routes a pre-release to `--tag next` and a stable release to `latest`. Release notes come from `--generate-notes` off the commit history; there is no separate changelog.

Completion: `gh run watch` reports the Publish run success.

## Verify

```sh
npm view visual-intent-layer dist-tags
npm pack visual-intent-layer@<version>   # in a temp dir
```

A pre-release moves `next` and leaves `latest`; a stable release moves `latest`. The tarball's `mcp.json` pins `<version>`.

Completion: the dist-tag and the tarball snippet both name the released version.

## Promote

Publish the stable version from the same commit as the validated pre-release (`0.3.0-next.1` → `0.3.0`). Leave `latest` pointing at stable: plain ranges exclude pre-releases, so `npm dist-tag add … latest` on a pre-release makes install and update disagree.

Completion: `latest` names the stable version, promoted from the validated `next` commit.

## Fix a bad release

Versions are immutable; a released `name@version` is never republished. Remedies in order:

1. Fix forward with a new patch or minor.
2. `npm deprecate visual-intent-layer@<version> "<message>"` for anything users may have installed.
3. Move `latest` back to the last good version as an emergency stopgap, and say so in the release notes.
4. `npm unpublish` is a one-shot, irreversible last resort (inside 72 hours, no dependents, single owner).

## Version policy

Feature = minor, fix = patch, breaking = minor while on `0.x`, which semver defines as unstable. Pre-releases are `0.X.Y-next.N`; reserve `-rc.N` for a candidate byte-identical to the intended stable. Go `1.0.0` when the envelope and MCP surface are something others can depend on.

## Upkeep

Wire a failing check into CI in preference to a recurring checklist. On a green run:

- ticket statuses under `.scratch/<feature>/issues/` — `done`, boxes ticked, evidence in Comments
- `npm outdated`, and the major versions of GitHub Actions
- README and docs claims still match `visual-intent --help` and the writers in `src/`
