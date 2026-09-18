# 04: Remove the dead weight the audit found

Status: done

**What to build:** Three items that ship or declare things with no consumer. Each was
verified against the code by hand, not taken from a lane report.

- [x] Stop shipping dev tooling. `npm pack --dry-run` shows 28 of 209 tarball files are
      `dist/benchmark/**`, `dist/eval/**` and `dist/instrumentation/**`, because
      `package.json` `files` lists `"dist"` wholesale and `tsconfig.build.json` excludes
      nothing. Those three trees are reachable only from `npm run benchmark`,
      `npm run eval:invocation` and `npm run instrument` — never from either bin entry.
      Either exclude them from the tarball or move them out of `dist`; state the choice
      in the release notes.
- [x] `PassState 'open'` (`src/annotation/store.ts:32`) is read at `store.ts:756` and
      assigned by nothing — `store.ts:323`, `:542` and `:724` all start a Pass at
      `'in-flight'`. Either delete the member and simplify the read, or give a Pass a
      path that begins in `open`; do not leave a type member the code cannot produce.
- [x] Give `src/envelope/fixtures.ts` and the design gallery an explicit place.
      `fixtures.ts` is reachable only from instrumentation and tests; `src/ui/gallery.ts`
      and the `/gallery` route ship although the README says the gallery "is not part of
      the product's navigation". Decide each, and if the gallery stays, say in `README.md`
      why a shipped route is not product surface.

**Evidence:** `audit/09-code-coverage.md` §Findings and §Code with no documentation;
tarball contents confirmed at HEAD with `npm pack --dry-run --json`.

## Comments

Landed.

**Dev tooling no longer ships.** `package.json`'s `files` gained negations:
`["dist", "!dist/benchmark", "!dist/eval", "!dist/instrumentation", "schema",
"skills", "mcp.json"]`. Verified with `npm pack --dry-run --json`: 209 files before,
181 after, and 0 of the 28 dev-tooling files. The source stays in the repository and
`npm run build` still emits it, so `npm run benchmark`, `npm run eval:invocation` and
`npm run instrument` are unaffected for anyone with a checkout; they simply stop
riding along in every install. These are dev-only by construction — nothing importable
from either bin entry reaches them.

**`PassState 'open'` is gone**, with the two `passStateLabel`/`passTone` cases that
served it and the `||` in `markPassesReady`'s guard. No test asserted it. The design
gallery had the inverse problem: `src/ui/gallery.ts` rendered
`['open', 'in-flight', 'ready', 'closed']`, naming a state no code can produce while
omitting `withdrawn`, which the surface does render as "Taken back". It now renders
the four real states.

**`design.md:272` was left as it stands, and my earlier reading of it was wrong.**
That line says the status line states "whether a Pass is open, in flight or ready". The
word `open` there is not `PassState` — it is `statusState`
(`src/ui/components.ts:137-151`), which returns the string `open` when the queue is
non-empty, meaning "there is something to send". It returns `string`, not `PassState`,
so the type change cannot reach it, and the word is real. The `findings.md` note
calling it "the one survivor" of the `PassState 'open'` decision is corrected below.

**`src/envelope/fixtures.ts` stays.** Its four importers are two test files and
`src/instrumentation/measure.ts`, so it is dev-only in practice, but it sits inside a
shipped module directory and 82 lines of exported fixture data are cheaper to carry
than a packaging exclusion inside `dist/envelope/`. Recorded as a decision rather than
left as an oversight.

**The gallery stays, and it was already documented.** `README.md:301-302` says the
gallery is at `/gallery`, is not part of the product's navigation, and that
`tests/gallery-snapshot.test.ts` pins it; `design.md` §9 relies on it to render the
token tables. Nothing further is needed, which is why this box is ticked rather than
repaired.

Verified: typecheck and 423 tests across 31 files, green.
