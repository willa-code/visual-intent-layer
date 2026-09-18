# Ground every live document in the code

Status: ready-for-agent

## Problem Statement

The repository has accumulated documentation written ahead of, or alongside, code
that has since moved. Nothing currently checks a document against the behaviour it
describes, so a reader cannot tell a live claim from a stale one, and an agent
reading the docs inherits the same uncertainty. Two recent examples are already
known: the browser opener's `try/catch` cannot catch the asynchronous `error` event
a missing `xdg-open` emits, so a document claiming an honest fallback describes
something the code does not do; and the feature map still describes setup and
detection as product surface that is being deleted.

## Solution

Audit every live document against the code at HEAD, claim by claim, with the code as
the arbiter: where a document disagrees with the code, the document is wrong. Record
one report per document group under `audit/`, then convert the findings into tickets.
Run the same exercise in the inverse direction — every non-test source module is
checked for whether any document describes it, and code with no documentation is
judged load-bearing, development-only, or dead.

## The grounding rule

The code is the arbiter of what the product does. Documents describe the product;
where they conflict, the document is the defect.

Two exceptions, stated so they are not mistaken for compliance:

- `VISION.md` is a charter, not a description. Nothing in it is falsified by code.
- Material under `.scratch/**` and `.visual-intent-verify/**` is a historical record.
  It is never rewritten; a superseded record gains a `## Comments` entry instead.

## Scope

In scope, and under audit now:

| Report | Documents | Code it is checked against |
| --- | --- | --- |
| `audit/01-readme.md` | `README.md` | `src/cli.ts`, `src/cli-setup.ts`, `src/ui/**` |
| `audit/02-context-and-design.md` | `CONTEXT.md`, `design.md` | `src/ui/**`, `src/service/**` |
| `audit/03-security-and-process.md` | `SECURITY.md`, `AGENTS.md`, `docs/agents/**` | `src/service/**`, `scripts/check-records.js` |
| `audit/04-adr-0001-0015.md` | `docs/adr/0001`–`0015` | all of `src/**` |
| `audit/05-adr-0016-0030.md` | `docs/adr/0016`–`0030` | `src/service/**`, `src/annotation/**`, `src/envelope/**`, `src/resolution/**`, `src/ui/**` |
| `audit/06-background-and-pi-validation.md` | `docs/background/**`, `docs/pi-validation.md` | classification, not conformance |
| `audit/07-feature-map.md` | `verify-visual-intent-layer` SKILL.md and `references/features/**` (21 files) | `src/ui/**`, `src/service/**` |
| `audit/08-our-skills.md` | our five skills only | the repository as it is |
| `audit/09-code-coverage.md` | the inverse direction | every non-test module under `src/` |

Out of scope by rule: `.scratch/**` (174 markdown files), `.visual-intent-verify/**`,
and the 25 vendored skills named in `skills-lock.json`.

## Already-settled decisions the audit must classify, not debate

These were decided before the audit and must be reported as `STALE` with the
replacement named:

1. The `setup` command is deleted, with `src/cli-setup.ts`, `src/harness-registry.ts`
   and their tests. Installation becomes the human using their own Harness's native
   MCP registrar.
2. The product ships no Skill: `skills/visual-intent/`, the `pi.skills` manifest
   field, and the skill-install target all go.
3. The packaged repo-root `mcp.json` is deleted, with its release-time check.
4. Pre-releases are retired: no `X.Y.Z-next.N` versions, no `next` dist-tag, no
   pre-release step in `publish.yml`. Releases are official and users install
   `@latest`.
5. The CLI keeps `mcp`, `serve` and `open`; it loses `setup`.
6. Distribution adds an official MCP Registry listing.

## Acceptance

- [ ] Every in-scope document has a report giving each claim a `MATCHES`, `STALE`,
      `WRONG`, `MISSING` or `RECORD` verdict with a `file:line` citation on both sides
- [ ] Every non-test module under `src/` appears in `audit/09-code-coverage.md` with a
      documented-in value and a `LOAD-BEARING`, `DEV-ONLY` or `DEAD` verdict
- [ ] Nothing under `.scratch/**` or `.visual-intent-verify/**` is modified
- [ ] Every finding carries the concrete fix, or an explicit statement that no fix is
      wanted
- [ ] The findings are converted into tickets, and the ones caused by the six settled
      decisions above are grouped into the change that lands them

## Out of Scope

- Landing the fixes. This spec produces the findings and the tickets; the changes land
  under their own spec.
- Auditing the 25 vendored skills: they are third-party content, pinned by
  `skills-lock.json`, and not ours to rewrite.
- Re-litigating settled decisions, including any document's opinion about them.
