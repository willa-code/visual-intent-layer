# 07: Settle the six claims the audit could not decide

Status: done

**What to build:** Six claims in `findings.md` §6 are neither confirmed nor refuted.
Each is a small, bounded read; none is a rewording exercise, and each ends in either a
`MATCHES` entry in the findings register or a new WRONG finding with its own ticket.

- [x] Does a `0.3` envelope still validate and get read as `0.4`, as
      `docs/adr/0030:9` and `README.md`'s schema section claim? Read
      `src/envelope/validate.ts` for a version-upgrade path and find the test that
      proves it. Two lanes flagged this independently, so it is the highest-priority
      one.
- [x] Does `collectPass` run at exactly the four MCP sites ADR-0028 names — the held
      call, `check_in`, `get_intent_status` and `acknowledge_intent`? Enumerate the
      call sites in `src/mcp/service.ts`.
- [x] Is every polled route a `GET`? ADR-0029's renewal rule turns on
      `authorize`'s `method !== 'GET'` guard, so a poll that is a `POST` would renew a
      session the ADR says cannot be renewed by polling.
- [x] Do `design.md` §2–§3's token values match `src/ui/styles/**`? No lane read the
      CSS, so the whole visual-token half of `design.md` is unverified.
- [x] Does `normalizeOutcome` (`src/annotation/store.ts:1008`) map the old outcome names
      ADR-0024 claims?
- [x] Are `CONTEXT.md`'s **Certified Experience** and **Baseline Compatibility**
      deliberately forward-looking? `docs/background/product-strategy.md:148` says
      certification was deferred, which is corroboration but not code footing. If they
      are forward-looking, the glossary should say so where a reader meets them.

**Also worth a look while here:** the local data directory is created without an
explicit mode (`src/service/sessions.ts`, `http.ts:80`, `check-in.ts:31`,
`snapshots.ts:9`, `store.ts:87`), so it takes the umask default. `SECURITY.md` promises
nothing here, so nothing is wrong — but "local boundary" is a claim about a boundary
that is currently the operator's umask. Decide whether it becomes a promise.

**Decided, 2026-09-18:** the data directory keeps the operator's umask. Nothing in
`SECURITY.md`, `CONTEXT.md` or `VISION.md` promises a permission on it, and a product
choosing `0o700` would still be trusting a local account boundary it does not own. The
boundary actually enforced is the loopback bind plus the per-session capability.
Recorded as a decision so it stops reading as an oversight; if it ever becomes a
promise, the mode has to be set at every `mkdirSync` site listed above.

## Comments

Six claims settled, all from `src/**` reads. Full verdicts in
`audit/10-unverified-claims.md`; the consequences are:

- **REFUTED — `0.1` readability.** `src/envelope/validate.ts:30` sets
  `READABLE_VERSIONS = ['0.4', '0.3', '0.2']` and `validateEnvelope` walks only that
  list, so a `0.1`-shaped envelope is refused, not read. `README.md:256` had bundled
  `0.1` into the load-time mechanism; it now states that the schema is kept as a
  historical record while store files in the older model are migrated once at startup
  by `src/annotation/migrate.ts`. `README.md:317` said "0.2 current" and now names
  `0.4`. The `0.2` and `0.3` halves are CONFIRMED by
  `src/envelope/envelope.test.ts`'s two readability cases.
- **REFUTED — the visual-token contract.** Every hex value in §2 and every semantic
  surface pair matches `tokens.css` exactly, as do radius, elevation, motion, spacing
  and metrics. What did not match: `type.panel.title` named a token the CSS calls
  `--type-rail-title`; `type.body.strong` named a token no CSS defines; and `radius
  full` named a token no CSS defines (`shell.css` hardcodes `999px`, the same
  construction as `--radius-pill`). §3 now names the real token, describes the
  composition instead of inventing one, and folds icon buttons into `pill`. Two real
  tokens the contract never named, `--icon-size: 18px` and `--island-tile: 36px`, are
  now in the Metrics row.
- **CONFIRMED** — `collectedAt` is stamped at all five `collectPass` sites in
  `src/mcp/service.ts`, mapping onto ADR-0028's four named mechanisms; every polled
  route is a `GET`, so ADR-0029's renewal rule holds; and `normalizeOutcome` maps
  `answered`/`untouched`/`gone` exactly as ADR-0024 claims.
- **SPLIT** — **Certified Experience** is genuinely forward-looking (ADR-0008 and
  `product-strategy.md:148` confirm the deferral, and no matrix exists in `src/**`), so
  `CONTEXT.md` now says no combination is certified yet. **Baseline Compatibility** is
  not forward-looking at all: it is implemented and running, so its entry needed
  nothing.

Two of the six were real defects and four were sound, so §6 of the register is now
empty.

Verified: typecheck and 423 tests across 31 files, green.
