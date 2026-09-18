# 07: Settle the six claims the audit could not decide

Status: ready-for-agent

**What to build:** Six claims in `findings.md` §6 are neither confirmed nor refuted.
Each is a small, bounded read; none is a rewording exercise, and each ends in either a
`MATCHES` entry in the findings register or a new WRONG finding with its own ticket.

- [ ] Does a `0.3` envelope still validate and get read as `0.4`, as
      `docs/adr/0030:9` and `README.md`'s schema section claim? Read
      `src/envelope/validate.ts` for a version-upgrade path and find the test that
      proves it. Two lanes flagged this independently, so it is the highest-priority
      one.
- [ ] Does `collectPass` run at exactly the four MCP sites ADR-0028 names — the held
      call, `check_in`, `get_intent_status` and `acknowledge_intent`? Enumerate the
      call sites in `src/mcp/service.ts`.
- [ ] Is every polled route a `GET`? ADR-0029's renewal rule turns on
      `authorize`'s `method !== 'GET'` guard, so a poll that is a `POST` would renew a
      session the ADR says cannot be renewed by polling.
- [ ] Do `design.md` §2–§3's token values match `src/ui/styles/**`? No lane read the
      CSS, so the whole visual-token half of `design.md` is unverified.
- [ ] Does `normalizeOutcome` (`src/annotation/store.ts:1008`) map the old outcome names
      ADR-0024 claims?
- [ ] Are `CONTEXT.md`'s **Certified Experience** and **Baseline Compatibility**
      deliberately forward-looking? `docs/background/product-strategy.md:148` says
      certification was deferred, which is corroboration but not code footing. If they
      are forward-looking, the glossary should say so where a reader meets them.

**Also worth a look while here:** the local data directory is created without an
explicit mode (`src/service/sessions.ts`, `http.ts:80`, `check-in.ts:31`,
`snapshots.ts:9`, `store.ts:87`), so it takes the umask default. `SECURITY.md` promises
nothing here, so nothing is wrong — but "local boundary" is a claim about a boundary
that is currently the operator's umask. Decide whether it becomes a promise.
