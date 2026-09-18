# 01: The surface never sees a second process's check-in

**What to build:** A check-in, and an interruption collection, made through the MCP server are visible to the process serving the Review Surface, so the surface stops claiming an agent has not collected something it has.

**Status:** done

**Found by:** Verification Run `.visual-intent-verify/runs/2026-09-18_07-09-24-whole-loop`, 2026-09-18, while driving `.scratch/surface-refinement/issues/13`.

## What the run observed

`lever mcp --tool check_in` ran the shipped call against the run's own data directory and returned the correct payload — the deliveries, the amendment, and the interruption request with its honest sentence. It also wrote the file:

```
sessions[session].lastContactAt                        = 2026-09-18T07:13:27.897Z
sessions[session].interruptions[0].collectedAt         = 2026-09-18T07:13:27.899Z
sessions[session].interruptions[0].requestedAt         = 2026-09-18T07:12:07.020Z
```

Seconds later, the surface's own read-back through `/api/sessions/:id/agent` still said the opposite:

```
evidence/state-after-check-in-*.json
  agent.lastCheckedInAt  = 2026-09-18T07:12:04.225Z   (unchanged, 83 seconds behind the file)
  agent.pendingInterruption = true                     (the file recorded collectedAt)
```

So the surface reports **the agent has not checked in** and **the stop request has not been collected** about a check-in and a collection that both happened. That is a claim the product cannot support, which is the failure `VISION.md` names under Honesty and which ADR-0024 exists to stop.

## Why it happens

`CheckInStore` reads its file once, in the constructor, and never reloads — `src/service/check-in.ts:33` sets `this.state = this.load()`, and every later read goes through the in-memory `session()` at `:77`. `SessionRecords` does the opposite: `get()` re-reads the file on every call (`src/service/sessions.ts:55-57`). So a second process holding the same data directory writes check-in state that the first process cannot see.

Two processes over one data directory is not a hypothetical. `src/mcp/stdio.ts` runs the MCP server and the local service in **one** process — so the ordinary harness path is fine — but when the port is already taken it logs *"start it with `visual-intent serve` so review URLs load"* and carries on with its own service. `visual-intent serve` is a documented command (`README.md`), so `serve` in one process plus `mcp` in another is an arrangement the product tells the user to create.

## What is not yet decided

Which of these is the fix, and that is why this is `needs-triage` rather than `ready-for-agent`:

- **Reload on read.** Make `CheckInStore` re-read like `SessionRecords.get` does. Smallest change, matches an existing sibling, and makes the two stores consistent; costs a file read per status poll.
- **One writer.** Refuse to serve from a second process and make the surface reach the first one, so the state has one home. Larger, and it changes what `visual-intent mcp` does when the port is busy.
- **Say so.** If two processes over one directory is deliberately unsupported, the surface must not read a stale file and report it as current; the refusal belongs where the arrangement is entered.

## Acceptance

- [x] The chosen fix is recorded, and the two arrangements it covers — one process, and `serve` plus `mcp` — are named
- [x] A check-in made in one process is reported by the surface served by the other, or the arrangement is refused in words
- [x] An interruption collected in one process stops reading as uncollected in the surface
- [x] The behaviour is driven live through a Verification Run with the exact commands, not asserted

## Comments

**Decided and landed 2026-09-18.** The section above is kept as the argument; this is the decision. The stores read through: every public read and every mutation re-reads its file before it looks at state, exactly as `SessionRecords.get` already did. That makes both arrangements work rather than refusing one of them — the ordinary single process, where the MCP server owns the service, and `serve` plus `mcp`, where the surface is served by one process and the agent's calls arrive in another.

**Two tests written first, and they failed.** `src/annotation/store.test.ts` gained *AnnotationStore, two instances over one data directory* and `src/service/check-in.test.ts` is new. They construct two stores over one temporary directory and assert what one writes the other reads. Five of the six failed before the fix. The sixth — that a later check-in wins over an earlier one — passed, because a freshly constructed store still loads the file; it is kept because it pins the precedence rather than the visibility.

**The annotation half was the same defect, so it was fixed with the check-in half.** The tests proved the surface was not the only reader affected: the agent's view of the queue was just as stale, which is the half that matters more, because an agent that cannot see a queued Annotation never receives it. The ticket's title is narrower than its fix.

**Two real hazards had to be handled, and the tests caught both.** A reload in the middle of an operation orphans whatever the operation already captured, because the reload replaces the state object: `anotherPass` captured its members and then called `closePass`, which reloaded, so the members it went on to mutate belonged to a discarded state and were never persisted; `withdrawPass` captured the Pass and then called `annotationsOfPass`, which reloaded, so its `withdrawn` state was written nowhere and a second delivery returned the withdrawn Pass. Both now read through private non-reloading helpers, and every mutation path was changed the same way, so no public method reloads beneath another. Each had a test that failed first.

**What was not changed.** Two processes still write whole files, so a concurrent write from each is last-write-wins. That is the store's pre-existing model on one process and is not made worse here; reads being current is what the surface's honesty needed, and the ticket's boxes are about reading. If two writers ever become real, that is a separate decision about locking, and it is not this ticket's.

**Verification Run.** `.visual-intent-verify/runs/2026-09-18_08-04-44-check-in-visibility` ended `clean` with no unreachable paths. It sent an Annotation so a Pass was in flight, asked the agent to stop from the browser, and then called the shipped `check_in` through the MCP server in a second process against the same data directory. The surface, served by the first process, read back `lastCheckedInAt` moved from `08:04:49.276` to `08:04:51.346` and `pendingInterruption` from `true` to `false`. Those are the two values this ticket was opened on, and each read-back is in the run's `evidence/` as a named `state-*.json`.
