## Vision

Every product decision defers to `VISION.md` before local taste or implementation
convenience: raise the fidelity of human intent, and keep the surface concise,
minimal, intuitive and beautiful. Read it before designing or reviewing behaviour.

**Decide with an advisor panel.** For a product decision, convene independent
sub-agent reviewers under distinct lenses — minimalist interaction designer, user
advocate, precision and trust — each reading `VISION.md`, and keep their POVs
beside the spec under `.scratch/<feature>/advisors/`. The panel removes bias; the
maintainer decides.

**Verify a product change with the Lever.** Drive it through
`/verify-visual-intent-layer` and record a Verification Run before calling it done.
Keep the feature map describing the surface as it is with
`/maintain-verification-skill` whenever the surface moves.

## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses the single-context layout. See `docs/agents/domain.md`.

## coding standard
**No comments by default:** Prefer refactoring unclear code over explaining it with comments.

## commit standard
**Conventional Commits:** `type(scope): imperative subject`, lowercase, with a body that
says why. `commitlint.config.mjs` holds the enforced types and scopes. The `commit-msg`
hook checks every commit at the keyboard and CI re-checks the change; `npm run
lint:commits` checks `HEAD`.