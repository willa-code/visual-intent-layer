---
name: maintenance
description: Release and maintain this package. Use when cutting a stable or pre-release version, publishing to npm, promoting a validated pre-release, deprecating a bad release, or doing periodic upkeep.
---

Cutting a release is the primary sequence; the policies after it are reference, read on demand.

Repo facts live in the environment — `.github/workflows/` (CI and Publish), `package.json` scripts, `scripts/check-bins.js`. Read them there.

## 1. Summarize and stop

Assemble the pending release and present it:

- target version and **channel** (`next` or `latest`)
- changes since the last tag (`git log <last-tag>..HEAD --oneline`)
- preflight results, once Step 2 has run

Wait for an explicit **ok** naming the version. Bumping and publishing always follow a human go-ahead.

Completion: the human has replied "ok" to a summary that names the version and channel.

## 2. Preflight

Run the CI gate locally; a red preflight stops the release.

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run benchmark`
- `node scripts/check-bins.js`
- `npm install -g --prefix /tmp/vil-ci . && /tmp/vil-ci/bin/visual-intent --help`

Completion: every command exits 0.

## 3. Bump

- First pre-release of a target: `npm version preminor --preid next --no-git-tag-version` (`0.2.1` → `0.3.0-next.0`); later ones: `npm version prerelease --preid next --no-git-tag-version` (→ `.1`, `.2`).
- Stable: `npm version <target> --no-git-tag-version`.
- `npm version` rewrites `package.json` formatting; restore the compact arrays so the diff stays version-only.
- Set the same version in `mcp.json`; `check-bins` reads the two files against each other.

Completion: `git diff` shows version fields only, and `node scripts/check-bins.js` prints the new pin.

## 4. Publish

- Commit (`Release X.Y.Z`), then `git push origin main`.
- Pre-release: `gh release create vX.Y.Z-next.N --prerelease --generate-notes --title "…"`.
- Stable: `gh release create vX.Y.Z --generate-notes --title "…"`.

Release notes come from `--generate-notes` off the commit history; there is no separate changelog. The release triggers Publish, which routes a pre-release to `--tag next` and a stable release to `latest`.

Completion: `gh run watch` reports the Publish run success.

## 5. Verify

- `npm view visual-intent-layer dist-tags`: a pre-release moves `next` and leaves `latest` in place; a stable release moves `latest`.
- `npm pack visual-intent-layer@<version>` in a temp dir and confirm the tarball's `mcp.json` pins `<version>`.

Completion: the published dist-tag and the tarball snippet both name the released version.

## Promote

Publish the stable version from the same commit as the validated pre-release (`0.3.0-next.3` → `0.3.0`). Leave `latest` pointing at stable: plain ranges exclude pre-release versions, so `npm dist-tag add … latest` on a pre-release makes install and update disagree.

## Failure

Versions are immutable; a released `name@version` is never republished or edited. Remedies, in order:

1. Fix forward with a new patch or minor.
2. `npm deprecate visual-intent-layer@<version> "<message>"` for anything users may have installed.
3. Move `latest` back to the last good version as an emergency stopgap, and say so in the release notes.
4. `npm unpublish` is a one-shot, irreversible last resort (inside 72 hours, no dependents, single owner).

## Version policy

Feature = minor, fix = patch, breaking = minor while on `0.x`, which semver defines as unstable. Pre-releases are `0.X.Y-next.N`; reserve `-rc.N` for a candidate byte-identical to the intended stable. Go `1.0.0` when the envelope and MCP surface are something others can depend on.

## Upkeep

Prefer wiring a failing check into CI over a recurring checklist. On a green run:

- ticket statuses under `.scratch/<feature>/issues/` — `done`, boxes ticked, evidence in Comments
- `npm outdated` and the major versions of GitHub Actions
- README and docs claims still match `visual-intent --help` and the writers in `src/`