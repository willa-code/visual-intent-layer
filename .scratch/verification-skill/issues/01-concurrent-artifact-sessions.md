# 01: Concurrent Artifact sessions and a machine-readable launch record

**What to build:** A Builder-Reviewer can open a second Artifact while one is already open. Today `open` binds the default port unconditionally and has no failure path when that port is taken, so a second terminal does not report a conflict — it hangs. `open` gains the same port selection `serve` already has, fails loudly when a port is unavailable, and both commands emit a launch record an agent can consume without parsing human prose.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `open` selects its own port through the same mechanism `serve` already uses, and never binds the default port when another instance holds it
- [x] A port already in use produces a clear failure that names the port and the next action, instead of hanging
- [x] Two Artifacts open at once each get a working review URL, in the same lifecycle data directory and in different ones
- [x] `open` and `serve` emit a launch record naming the base URL, the review URL, the session identity and the artifact revision
- [x] The per-session capability is exposed only inside the review URL, and a launch record can be consumed by an agent without prose parsing
- [x] The human-readable output a Builder-Reviewer already sees is unchanged when the record is not requested
- [x] `npm test` and `npm run typecheck` stay green

## Comments

Implemented on the branch: `open` takes `--port` (default 0, OS-chosen), an occupied port fails with the port and next action named, and `open`/`serve` emit a one-line `--json` launch record via `src/service/launch.ts`. Covered by `src/service/launch.test.ts` and the new port tests in `src/service/http.test.ts`, plus the Lever contract test which spawns `open --json`.
