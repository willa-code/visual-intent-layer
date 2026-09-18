# 01: Repair the three documents the code contradicts today

Status: done

**What to build:** The three defects in `findings.md` §1 that are wrong whatever we
decide about distribution. Each is a document asserting something `src/**` does not do.

- [x] `SECURITY.md:76-79` — state the policy the code actually builds. Read
      `applicationContentSecurityPolicy` (`src/artifact/fidelity.ts:229-246`) and list
      every directive set to something other than `'none'`, naming `manifest-src`,
      `base-uri` and `object-src`, and stating that `script-src` carries
      `'unsafe-inline'`, `'unsafe-eval'` and `blob:`. Delete the "permits nothing else"
      claim, which is false as written.
- [x] `CONTEXT.md:47` (**Replacement**) — replace the `supersedes` claim with the real
      mechanism: a Replacement reaches the agent as `replacedId`/`replacementId` in the
      `check_in` result, and no envelope schema past `0.1` carries a `supersedes` field.
- [x] `design.md:284` (`AnnotationCard`) — either give `describeTarget`
      (`src/ui/app.ts:2102-2107`) a fallback that is not a bare kind word, or narrow the
      claim to what the code does. Do not leave the sentence as it stands.

**Evidence:** `audit/02-context-and-design.md`, `audit/03-security-and-process.md`.

Adapter coverage folded in from `audit/02` when this ticket was written: the same
lane found three more live-body defects of the same kind, repaired here rather than
left for a ticket of their own — `design.md:172` (Pass states), `design.md:174` and
`:287` (the retired `rejected` state) and `design.md:175` and `:293` (Resolution
vocabulary missing `state-only` and `blocked`).

## Comments

Landed. `SECURITY.md` now lists the directives
`applicationContentSecurityPolicy` actually sets and says plainly that the
disclosure states the policy in two sentences rather than as a directive list —
`permits` is a hand-written pair of sentences at `src/service/http.ts:930-931`, so
the old claim that the human sees "this permit list" was wrong twice. `CONTEXT.md`
loses the wire-field clause entirely, which also removes an implementation detail
from a glossary; the Replacement mechanism stays documented where it belongs.

`design.md:284` was narrowed to the code rather than the code changed to the
design: `describeTarget` (`src/ui/app.ts:2102-2107`) prefers the target's own label,
then its accessible name, then its semantic role, and falls back to the kind only
when the artifact offers none. Whether that fallback should instead read as human
words ("an area you drew") is a surface change, not a doc repair, and is left open
in the `standard-mcp-distribution` spec.

Dated amendment bodies inside `design.md` were not rewritten — the block at
`design.md:702` still records the sentence as it read at the time. The repository's
rule is that a correction is appended, never rewritten; the live tables are the
part that must be true.

Ran: `npm run typecheck`, `node scripts/check-records.js`, `node scripts/check-bins.js`
and `npm test` (414 passed, 30 files) — all green.

**Correction, 2026-09-18, from the code review's Spec axis.** The Comment above
claimed "the Replacement mechanism stays documented where it belongs". That was
wrong: no document named the identifiers. `CONTEXT.md` is a glossary and must carry
no implementation detail, so the field names belong in `README.md`, and the
`check_in` row of the Agent tools table now reads "amendments as
`replacedId`/`replacementId` pairs", matching `src/mcp/service.ts:72,469`. The same
paragraph's "amendments that superseded something" also used a word `CONTEXT.md`
lists under _Avoid_ for **Replacement**, and now reads "replaced".
