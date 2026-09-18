Status: done

# Commits follow Conventional Commits, and the rule is enforced

## Problem statement

Every commit in this repository is an imperative prose sentence with no type prefix,
and nothing documented that choice or checked it. History is therefore readable but not
machine-parseable, subjects drift in length, and an agent or contributor has no way to
know what the repository expects.

## What was decided

Adopt **Conventional Commits** — `type(scope): imperative subject`, lowercase, body
explains why — and enforce it in both places a commit is made or lands:

- `commitlint.config.mjs` extends `@commitlint/config-conventional`, requires a scope,
  and restricts scopes to `ui`, `layer`, `service`, `mcp`, `cli`, `core`, `tests`, `ci`,
  `release`, `docs`, `repo`.
- A `commit-msg` hook (husky) checks the message at the keyboard, so a bad commit is
  never created.
- CI re-checks the commits a push or pull request introduces, so a bypassed hook is
  still caught. The check lints the change's own range, never the whole history.

## Why enforced, and why in this form

The local hook is the real gate: this repository pushes directly to `main`, so a CI
check that failed would report a problem it can no longer prevent without rewriting
published history. CI is the backstop for `--no-verify`, not the first line.

A scope is required because the package's modules give a real, small vocabulary and an
optional scope would go unused. The type set is left to `config-conventional` so the
list is not maintained here.

## What was deliberately not done

**History was not rewritten.** The commits before this one keep their prose subjects.
`.scratch` records cite commit SHAs, so rewriting would silently invalidate them, and a
correction is appended in this repository rather than rewritten.

The `@commitlint/*` and `husky` packages are development-only. They are absent from the
published tarball, and installing the package from npm runs neither the hook nor
`prepare`.

## Comments

**2026-09-18 — opened and closed.** `AGENTS.md` now carries the convention as a pointer
to the config, and `maintain-visual-intent-layer` commits a release as
`chore(release): X.Y.Z` and runs `npm run lint:commits` in its preflight.
Instructions were changed for `AGENTS.md` and that skill only; the other docs describe
behaviour, not process.

`npm audit` reports three advisories in `happy-dom` and `vitest`, both pre-existing and
unrelated to this change; `happy-dom`'s fix is a breaking major bump and is left for its
own ticket.
