# 04: Remove the dead weight the audit found

Status: ready-for-agent

**What to build:** Three items that ship or declare things with no consumer. Each was
verified against the code by hand, not taken from a lane report.

- [ ] Stop shipping dev tooling. `npm pack --dry-run` shows 28 of 209 tarball files are
      `dist/benchmark/**`, `dist/eval/**` and `dist/instrumentation/**`, because
      `package.json` `files` lists `"dist"` wholesale and `tsconfig.build.json` excludes
      nothing. Those three trees are reachable only from `npm run benchmark`,
      `npm run eval:invocation` and `npm run instrument` — never from either bin entry.
      Either exclude them from the tarball or move them out of `dist`; state the choice
      in the release notes.
- [ ] `PassState 'open'` (`src/annotation/store.ts:32`) is read at `store.ts:756` and
      assigned by nothing — `store.ts:323`, `:542` and `:724` all start a Pass at
      `'in-flight'`. Either delete the member and simplify the read, or give a Pass a
      path that begins in `open`; do not leave a type member the code cannot produce.
- [ ] Give `src/envelope/fixtures.ts` and the design gallery an explicit place.
      `fixtures.ts` is reachable only from instrumentation and tests; `src/ui/gallery.ts`
      and the `/gallery` route ship although the README says the gallery "is not part of
      the product's navigation". Decide each, and if the gallery stays, say in `README.md`
      why a shipped route is not product surface.

**Evidence:** `audit/09-code-coverage.md` §Findings and §Code with no documentation;
tarball contents confirmed at HEAD with `npm pack --dry-run --json`.
