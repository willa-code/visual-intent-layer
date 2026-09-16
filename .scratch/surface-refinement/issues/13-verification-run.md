# 13: A Verification Run over the whole loop

**What to build:** One Verification Run drives the refined surface the way a Builder-Reviewer would, from opening the artifact to closing an Annotation, and measures the things this iteration could not settle by reading: whether an agent following the shipped descriptions honours the Check-In convention, whether the rail is legible at its fixed width, whether the island receives pointer events over the live iframe, whether a drag-versus-text-selection threshold is predictable, and whether every semantic pair passes contrast in both themes. The run produces Mechanical Verification only — a recording, screenshots, accessibility snapshots and read-backs of stored state — and reports what it could not reach with the command it attempted and the precondition that was unmet.

**Blocked by:** 01–12, 14, 15, 16, 17, 19, 20

**Status:** ready-for-agent

- [ ] `health` is clean at launch and the instance is not stale when any drive command runs
- [ ] The run drives: open the artifact; arm point and box and return to operating; point at an element; point at a text range; box an area; compose and queue; send; amend the sent Annotation; ask the agent to stop; toggle closed rows; compare a row's revisions; judge the result in place
- [ ] Every state-changing drive is followed by a stored-state read-back, and the read-back appears in the evidence
- [ ] The recording covers the whole loop, and screenshots name each resulting state
- [ ] The accessibility structure of the mode island, the annotation rows, the verdict controls and the Stop action is captured, and each control states its position and meaning
- [ ] Keyboard operation is driven: `P`, `B`, `V`, `Escape` unwinding one level, `Enter` and `Cmd/Ctrl+Enter`
- [ ] Mode tiles meet the 24×24 floor in every state, including at rest, and tile states are distinguishable without colour
- [ ] Rail-head legibility at the fixed rail width is measured and reported, not asserted
- [ ] The island is confirmed to receive pointer events over the live iframe, under the artifact's own scroll and layers
- [ ] Drag-versus-text-selection threshold behaviour is exercised against an artifact with its own drag interactions, and false activations are recorded
- [ ] Every semantic surface/ink pair is checked in both themes on its own surface
- [ ] The Check-In question is answered from the run: whether an agent following the shipped descriptions checked in between steps, and if it did not, the exact call it failed to make
- [ ] Any path that could not be reached is reported with its exact command and unmet precondition, and the coverage line says so
- [ ] Feature files under the verification skill's `references/features/` are updated with the recipes this run produces, and files not yet driven keep their `Not yet driven.` marker
- [ ] Cleanup runs, and the evidence at its declared location is intact afterwards
- [ ] The run record's outcome and coverage line are stated honestly, and the run is not reported as an approval

## Comments

Amended after independent review: the drives this ticket originally listed could not be reached, because the Lever still clicks a `Review` button that issue 01 deletes, whitelists `element|text|region|arrange`, excludes `review-interruption`, and has no amend or stop command. Issue 17 updates the drive surface first. Several claims this iteration relies on are settleable only by running, and the review listed them — the review's own words — rather than letting them pass as assertions.