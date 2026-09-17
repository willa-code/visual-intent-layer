# 01: The Check-In dropped direction that arrived in the same millisecond

**What to build:** A Check-In returns every Pass and every Replacement that landed after the previous Check-In, whatever the clock resolution. The cursor is a position in the delivery order, not a wall-clock instant, so direction is never lost to a timestamp tie.

**Status:** done

- [x] A Replacement delivered in the same millisecond as the previous Check-In is returned by the next Check-In
- [x] The cursor is a store-level delivery position; `at` and `checkedInAt` stay truthful wall-clock stamps
- [x] A cursor this build does not recognise reads everything rather than less
- [x] A store written before Passes carried a position loads, and its passes and amendments are ordered
- [x] The open_visual_review tool descriptions still describe the surface honestly

## Comments

Found while making CI green. `src/mcp/service.test.ts > check-in and interruption > returns an amendment as new direction` failed on one CI run and passed on the next: the Check-In compared `pass.at > since` and `event.at > since`, where `since` was the previous `checkedInAt`. Both are ISO strings with millisecond resolution, so a Replacement delivered in the same millisecond as the previous Check-In was filtered out, and the agent was told there was nothing new while a Replacement existed. Reproduction is deterministic with a frozen clock, and is now a test (`keeps a replacement delivered in the same millisecond as the previous check-in`) rather than a coincidence of runner speed.

The fix gives every delivery an order: `Pass.sequence` and the `amended` event's `sequence` are stamped from a counter persisted with the store, the cursor is `String(sequenceNow)`, and both streams filter on `sequence > position`. `annotations.json` keeps version 2 because the fields are additive — the loader stamps positions onto a store written without them, ordering the unstamped items by `at`, which is exactly the order the old cursor could see. A cursor that is not a position (a timestamp from an older build) is treated as "nothing collected yet", which re-reads direction instead of dropping it.

Evidence: `npm run typecheck`, `npm test` (269 passing), `npm run build`, `npm run benchmark`, `node scripts/check-bins.js`.
