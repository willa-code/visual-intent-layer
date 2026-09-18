# Findings: every live document against the code

Status: ready-for-agent

Consolidated register over the nine lane reports in `audit/`. This file is the index;
the lane reports hold the full citations.

The code is the arbiter. Where a document disagrees with `src/**` at HEAD, the
document is the defect. `.scratch/**` and `.visual-intent-verify/**` were not
audited — they are records. The 25 vendored skills named in `skills-lock.json` were
not audited — they are third-party content.

Counts: 8 `WRONG` (a document contradicts the code today), 14 `STALE` (a document
describes a mechanism that is moving or already moved), 5 `MISSING` (code behaviour no
document describes), 3 dead-weight code items, 6 claims the audit could not settle.

## 1. Wrong today, whatever we decide

These are defects independent of the distribution change. Each is a document
asserting something the code does not do.

| # | Document | Claim | Code | Ticket |
| --- | --- | --- | --- | --- |
| 1 | `SECURITY.md:76-79` | The proxied document's policy "permits nothing else" beyond a listed set | `src/artifact/fidelity.ts:229-246` also sets `manifest-src 'self'`, `base-uri 'self'` and `object-src 'none'`, and `script-src` is `'self' 'unsafe-inline' 'unsafe-eval' blob:` — the enumerated grant is narrower than the real one | 01 |
| 2 | `CONTEXT.md:47` | "the published envelope schema still names the field `supersedes`" | No schema ≥0.2 has `supersedes`; it survives only in the frozen v0.1 and in `migrate.ts`. A Replacement reaches the agent as `replacedId`/`replacementId` on the `check_in` result (`src/mcp/service.ts:72,469`) | 01 |
| 3 | `design.md:284` | The target line is "never the bare kind word" | `describeTarget` (`src/ui/app.ts:2102-2107`) falls through to `target.kind`, reachable for a drawn Area with no accessible name | 01 |
| 4 | `verify-visual-intent-layer/references/features/annotate-and-send.md` | The empty-note placeholder reads `No note yet` | `src/ui/app.ts:460` renders `No note` | 02 |
| 5 | `maintain-visual-intent-layer/SKILL.md:70-77` | Preflight is "the CI gate on the release commit" with a listed command block | `.github/workflows/ci.yml:20` runs `node scripts/check-records.js`, which Preflight omits entirely — following the skill skips a real gate | 02 |
| 6 | `docs/adr/0002:3` | "one self-describing model-visible MCP entry tool" | Four tools exist (`src/mcp/service.ts:606-673`); ADR-0018 records the growth and 0002 never points at it | 03 |
| 7 | `docs/adr/0012:3` | Verdicts are "approve, reject, supersede, or mark obsolete" | `VerificationVerdict = 'approve' \| 'not-fixed' \| 'obsolete'`; reject and supersede are retired by 0025/0026. 0012 carries no amendment header, unlike its siblings | 03 |
| 8 | `docs/adr/0019:3` | A Pass state is "open, in flight, ready, closed" | `PassState` includes `withdrawn`, and `'open'` is read at `store.ts:756` but never written by any creation path | 03 |

## 2. Stale: the document is right about code that is leaving

| # | Document | What goes |
| --- | --- | --- |
| 9 | `README.md:21-81` (whole Install section, both tables, Transport, Setup flags) | `setup`, the harness matrix, detection, `--no-skill` |
| 10 | `README.md:56,78,315` | The pi Skill in the scope table, the flag, and the Layout bullet |
| 11 | `README.md:242-243` | The packaged root `mcp.json` pin |
| 12 | `README.md:341-347` | The pre-release channel |
| 13 | `CONTEXT.md:83,87` | **Harness Detection** and **Harness Registration** lose their footing — no product code will detect or write after the change |
| 14 | `SECURITY.md:11-14` | The `0.3.0-next.x` / `next` tag sentence |
| 15 | `docs/pi-validation.md:14-15` | The `visual-intent setup` prerequisite |
| 16 | `docs/adr/0014` (whole), `docs/adr/0002` (Skill clause) | Superseded by the change |
| 17 | `docs/background/harness-mcp-setup-research.md`, `mcp-integration-research.md` §4, `release-and-prerelease-practices.md` (recommendation section), `product-strategy.md:151,173` | Written to spec the setup command, the Skill, or the pre-release channel — each needs a supersession note, not a rewrite |
| 18 | `verify-visual-intent-layer/references/features/setup-and-detection.md` + its index entries and the `$LEVER setup` line in `SKILL.md:141` | The whole file dies; it is the only feature-map entry for setup |
| 19 | `verify-visual-intent-layer/references/features/mcp-agent-loop.md:37` | "the setup version and server transport are recorded" — the version half has no source once setup is gone |
| 20 | `maintain-visual-intent-layer/SKILL.md` (6 places: description, paths table ×2, docs list, Bump, Publish, Verify, Promote, Versioning) | The pre-release channel, the `mcp.json` pin check, and the `cli-setup`/`harness-registry` source bullet |

`docs/background/README.md` already frames that directory as "kept for provenance",
so each note in row 17 is a short header addition, not an edit to the research.

## 3. Correct — recorded so they are not re-litigated

`README.md`'s Use section, "One rail, two tiles", the keyboard model, the MCP tool
table, the environment table, the envelope-schema section, host-capability
negotiation and the provenance-stamp claim all match `src/**` exactly and were
checked line by line. ADR-0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0013,
0015, 0016, 0017, 0018, 0020–0030 all match the code, most with amendment headers
already in place. `docs/agents/{domain,issue-tracker,triage-labels}.md` match the
repository exactly, including `scripts/check-records.js`'s vocabulary.

## 4. Code no document describes

| # | Code | Read |
| --- | --- | --- |
| 21 | `src/ui/artifact/boundary.ts:4` — a fourth `BoundaryRefusal`, `unloaded-frame`, distinct from the three documented ones, with its own user-facing copy at `src/ui/app.ts:2156` | Load-bearing. `design.md:895-905` names three boundary causes; the feature map's `reach-within-the-class.md` names three refusals. Neither has this one |
| 22 | `src/service/browser.ts` — `openInDefaultBrowser` returns a boolean **that all four call sites discard** (`src/mcp/service.ts:173,201,224,252`), and a missing opener throws an unhandled `'error'` event instead of returning false | A defect, not a doc gap: on a headless machine the MCP server dies rather than saying it cannot open a browser. Ticket 05 |
| 23 | `src/service/json-file.ts`, `src/ui/protocol.ts`, `src/ui/runtime.ts`, `src/ui/dom.ts` | Load-bearing, undocumented by name — the shell↔artifact-layer message contract in `protocol.ts` is the only one worth a paragraph |
| 24 | `src/annotation/store.ts` — session selection orders by `sessionId` string comparison (`sessions.ts:97-108`) as a recency proxy | Load-bearing for reopen-after-expiry (ADR-0029) and the tie-break rule is stated nowhere |
| 25 | `scripts/stdio-smoke.js` | A working MCP smoke test that no `package.json` script, CI step, or skill mentions — a reader would never learn it exists |

## 5. Dead weight

| # | Item | Evidence |
| --- | --- | --- |
| 26 | 28 dev-tooling files ship in the published tarball (`dist/benchmark/**`, `dist/eval/**`, `dist/instrumentation/**`), out of 209 | `npm pack --dry-run`: `files` lists `"dist"` wholesale and `tsconfig.build.json` excludes nothing |
| 27 | `PassState 'open'` is never written by any creation path | `store.ts:323,542,724` all start a Pass at `'in-flight'`; `'open'` is only read at `store.ts:756` |
| 28 | `src/envelope/fixtures.ts` is reachable only from instrumentation and tests; `src/ui/gallery.ts` and the `/gallery` route ship although the README calls the gallery "not part of the product's navigation" | import graph and `package.json` scripts |

Deleting `mcp.json`, `skills/` and `dist/{benchmark,eval,instrumentation}` from the
tarball also shrinks `files` from `["dist","schema","skills","mcp.json"]` to
`["dist","schema"]` plus an exclusion list.

## 6. The audit could not settle

Six claims need a second pass before they can be called right or wrong:

1. Whether a `0.3` envelope still validates and is read as `0.4` (`docs/adr/0030:9`,
   `README.md`'s schema section) — `src/envelope/validate.ts` was not read for a
   version-upgrade path. Two lanes flagged it independently.
2. Whether `collectPass` is called at exactly the four MCP sites ADR-0028 names
   (`src/mcp/service.ts` call sites were not enumerated).
3. Whether every polled route is a `GET`, which is what ADR-0029's renewal rule
   depends on.
4. Whether `design.md` §2–§3's token values (hex, radii, elevation) match
   `src/ui/styles/**` — no lane read the CSS.
5. Whether `normalizeOutcome` (`src/annotation/store.ts:1008`) maps the old outcome
   names ADR-0024 claims.
6. Whether `CONTEXT.md`'s **Certified Experience** and **Baseline Compatibility**
   are deliberately forward-looking — corroborated by
   `docs/background/product-strategy.md:148` but not by code.

## 7. Cleanup this exercise makes visible

- `CONTEXT.md`'s **Verification Run** and **Mechanical Verification** have no code
  footing inside `src/**` — their implementation lives in the verify skill, which is
  out of this audit's scope.
- The local data directory is created without an explicit mode
  (`src/service/sessions.ts:2`, `http.ts:80`, `check-in.ts:31`, `snapshots.ts:9`,
  `store.ts:87`), so it takes the umask default. `SECURITY.md` makes no promise here,
  so nothing is contradicted — but the "local boundary" framing implies a hardening
  nobody implemented.
- `SECURITY.md:43` calls the session cookie "scoped" while it is `Path=/`; the
  scoping is in the token's value and its server-side check, not the attributes.
  Accurate but worth saying precisely.

## Comments

**Correction to the consolidation, 2026-09-18.** Assembling §1 and §2 from the lane
reports dropped four `audit/02` findings. They are recorded here so the register is
complete, and all four were repaired rather than filed:

- `design.md:172` and `CONTEXT.md:44` listed the Pass states as "open, in flight,
  ready, closed". No creation path assigns `open`, and `withdrawn` — rendered "Taken
  back" — was missing. Both now read in flight, ready, closed, taken back.
- `design.md:174` and `:287` listed `rejected` as a live Annotation state. It is
  retired (ADR-0025); the tone cell said `closed` rejected/not-fixed/replaced/obsolete.
- `design.md:175` gave Resolution as "matched, recovered, ambiguous, deleted" and
  `design.md:293` as "matched, recovered, ambiguous, deleted, advanced". The real
  vocabulary is matched, recovered, ambiguous, state-only, blocked, deleted; both rows
  were missing the two the surface actually renders.
- `design.md:272` describes the status line as stating whether a Pass is "open, in
  flight or ready". That still names `open`, and it is the one survivor: it is bound
  to the same decision as `PassState 'open'` itself, which ticket 04 owns.

**Landed, 2026-09-18.** Tickets 01, 02 and 03 are done and committed together: three
documents the code contradicted, the feature map and `maintain-visual-intent-layer`,
and three ADR headers. `npm run typecheck`, `node scripts/check-records.js`,
`node scripts/check-bins.js` and `npm test` (414 passed, 30 files) were green before
the commit. Tickets 04–07 remain open; 06 is deferred on the change spec.
