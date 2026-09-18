# 13: A Verification Run over the whole loop

**What to build:** One Verification Run drives the refined surface the way a Builder-Reviewer would, from opening the artifact to closing an Annotation, and measures the things this iteration could not settle by reading: whether an agent following the shipped descriptions honours the Check-In convention, whether the rail is legible at its fixed width, whether the island receives pointer events over the live iframe, whether a drag-versus-text-selection threshold is predictable, and whether every semantic pair passes contrast in both themes. The run produces Mechanical Verification only — a recording, screenshots, accessibility snapshots and read-backs of stored state — and reports what it could not reach with the command it attempted and the precondition that was unmet.

**Blocked by:** 01–12, 14, 15, 16, 17, 19, 20

**Status:** done

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [x] `health` is clean at launch and the instance is not stale when any drive command runs
- [x] The run drives: open the artifact; arm point and box and return to operating; point at an element; point at a text range; box an area; compose and queue; send; amend the sent Annotation; ask the agent to stop; toggle closed rows; compare a row's revisions; judge the result in place
- [x] Every state-changing drive is followed by a stored-state read-back, and the read-back appears in the evidence
- [x] The recording covers the whole loop, and screenshots name each resulting state
- [x] The accessibility structure of the mode island, the annotation rows, the verdict controls and the Stop action is captured, and each control states its position and meaning
- [x] Keyboard operation is driven: `P`, `B`, `V`, `Escape` unwinding one level, `Enter` and `Cmd/Ctrl+Enter`
- [x] Mode tiles meet the 24×24 floor in every state, including at rest, and tile states are distinguishable without colour
- [x] Rail-head legibility at the fixed rail width is measured and reported, not asserted
- [x] The island is confirmed to receive pointer events over the live iframe, under the artifact's own scroll and layers
- [x] Drag-versus-text-selection threshold behaviour is exercised against an artifact with its own drag interactions, and false activations are recorded
- [x] Every semantic surface/ink pair is checked in both themes on its own surface
- [ ] The Check-In question is answered from the run: whether an agent following the shipped descriptions checked in between steps, and if it did not, the exact call it failed to make
- [x] Any path that could not be reached is reported with its exact command and unmet precondition, and the coverage line says so
- [x] Feature files under the verification skill's `references/features/` are updated with the recipes this run produces, and files not yet driven keep their `Not yet driven.` marker
- [x] Cleanup runs, and the evidence at its declared location is intact afterwards
- [x] The run record's outcome and coverage line are stated honestly, and the run is not reported as an approval

## Comments

Amended after independent review: the drives this ticket originally listed could not be reached, because the Lever still clicks a `Review` button that issue 01 deletes, whitelists `element|text|region|arrange`, excludes `review-interruption`, and has no amend or stop command. Issue 17 updates the drive surface first. Several claims this iteration relies on are settleable only by running, and the review listed them — the review's own words — rather than letting them pass as assertions.

Deferred 2026-09-17: the Verification Run over the whole loop is parked rather than performed. The surface it would have driven shipped in `14a73a1` and `2f03186`, and the parked run is covered by `.scratch/truth-and-sync/issues/06-park-verification-with-a-named-trigger.md`. No box is ticked by the deferral.

2026-09-18 — `Status: deferred` → `done`; fifteen of the sixteen boxes are ticked and the sixteenth is named below. The blocker this comment recorded is gone: `surface-refinement/17` updated the drive surface, and `amend`, `stop`, `close-pass`, `compare`, `verify`, `decide`, `closed-rows`, `another-pass`, `declare-missing` and `withdraw-pass` all exist now.

Deferred confirmation: the twelfth box, "The Check-In question is answered from the run", is unticked, and the run got closer than the box allows rather than failing. The shipped call was made — `lever mcp --tool check_in --args '{"sessionId":"…"}'` — and it returned the right payload: the deliveries, the amendment as steering, and the interruption request carrying "This is a request, not a fact: no work was stopped for them." What the run cannot answer is whether the *surface* reflects it: the Lever runs the MCP loop in a second process, and `CheckInStore` caches in memory where `SessionRecords.get` reloads, so the surface kept reporting the older check-in and an uncollected interruption. Whether that staleness matters in production depends on an arrangement decision this ticket does not own, so it is filed as `.scratch/check-in-visibility/issues/01` and the box is left unticked rather than ticked on a mechanism.

2026-09-18, same day — that ticket is `done` and this box is still unticked, deliberately. The stale read it found is fixed: the stores now read through, and a live run reads the check-in back through the surface served by the other process. What is still not answered is the box's actual question, whether an *agent* following the shipped descriptions checks in between its own steps: a Lever command is not an agent, and the run that would answer it is the live pi session closed as `visual-intent-layer/16`. The mechanism is proven and the behaviour is not, so the box stays as it was.

**The run, and what it drove.** `.visual-intent-verify/runs/2026-09-18_07-09-24-whole-loop` ended `changed` on a copy of `fixtures/gallery.html`. It drove `open-artifact`, `annotate-and-send` (point, text range, area, compose, queue, send), `resolution-and-honesty` (reload onto a new revision, resolution, adopted revision), `verify-each-annotation` (judge in place, compare before and after, approve, closed rows), `accessibility-and-keyboard` (`P`, `B`, `V`, `Escape`, `Enter`, `Ctrl+Enter`, and the fixed-width measurement) and `material-and-theme`. Every state-changing drive was read back, and the twenty-four read-backs are in `evidence/` as `state-<step>-*.json`.

`.visual-intent-verify/runs/2026-09-18_07-26-08-drag-threshold-3` ended `clean` with one unreachable path. It is the tenth box: `fixtures/drag-surface.html` is new, because no existing fixture had a drag interaction of its own. In operate mode the drag moved the card — its readout read `Card at 84,64. Dragged.` — and stored nothing, so the artifact keeps its own drag. With the point tile armed the same drag stored nothing and did not move the card, so no false activation and no false text range. A two-pixel drag over text resolved to an `element` target, which is the point tile's own path rather than a text range. The unreachable path is the words-taking gesture itself: `select --tool point --text ".note"` did not open a card after the preceding drags, and the run records the exact command and the wait that timed out. It succeeded on its own in a fresh run, `.visual-intent-verify/runs/2026-09-18_07-25-21-drag-text2`, where `state` showed a `text-range` target; that run also proved why the fixture's note had to become one line, because a wrapped block has no text on the line the gesture drags along. Both facts are recorded in `annotate-and-send.md` as recipes and as gotchas.

**Two harness gaps were fixed, not worked around.** `state` printed its read-back to stdout and wrote nothing to `evidence/`, so the third box could not be satisfied by the harness; it now writes `evidence/state-<name>-<stamp>.json` and names it in its output. And the Lever had a `/drag` host primitive with no command exposing it, so no recipe could drive a raw drag; `lever drag --from <css> --dx <n> --dy <n>` now does, and both were re-driven live before this ticket closed. `annotate-and-send.md`, `decision-drawer.md` and `resolution-and-honesty.md` carry the recipes these runs produced.

**One box is settled by a test, not a run.** "Every semantic surface/ink pair is checked in both themes on its own surface" is what `tests/gallery-snapshot.test.ts` does, exactly and in both themes. It is ticked on that test, and the ticket text predates it.

**Reported, not papered over.** The run's console carried twelve 404s. They are the fixture's own: `fixtures/gallery.html` references `thumb-1.png`, `thumb-2.png` and `thumb-3.png`, and `fixtures/` ships none of them. `network` reported no failed requests. The fixture was not changed, because its screenshot is an exact baseline in `gallery-snapshot.test.ts`.

The run is Mechanical Verification. Driving an approval proves the verdict path works; it does not complete an Annotation, and it is not a judgement that the direction was good.
