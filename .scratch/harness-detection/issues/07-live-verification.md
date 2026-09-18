# 07: Live detection verification on a multi-Harness machine

**What to build:** A human confirms on a real machine carrying pi, Codex, Claude Code, and opencode that setup detects all four, reports each Registration state correctly, repairs an outdated entry, and writes a working transport — including at least one Harness configured under a non-default configuration home. The ticket stays open until each Harness is evidenced or its failure is filed as a follow-up.

**Blocked by:** 02 (Detection reporting), 03 (Content-verified registration), 04 (Transport selection), 05 (Status mode).

**Status:** wontfix

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [ ] All four Harnesses are detected on a machine that has all four, with the report naming each
- [ ] A Harness configured under a non-default configuration home is detected
- [ ] An entry pointing at a stale command is reported as outdated, names the differing fields, and is repaired on re-run
- [ ] Status mode output matches the resulting files
- [ ] A machine without a global install receives the `npx` transport and the Harness lists and spawns the server
- [ ] Each Harness is evidenced, or its failure is recorded as a follow-up ticket

## Comments

Start from the machine and release involved in the original report: record the setup version line alongside the evidence, so a stale installation and a detection gap stay distinguishable.

Deferred 2026-09-17: live detection on a multi-Harness machine is parked until the next spec's Verification Run plus maintainer time. No box is ticked by the deferral.

2026-09-18 — `Status: deferred` → `wontfix`, closed by maintainer decision: the maintainer does not intend to perform this run and has a different approach in mind later. Nothing here was disproven and no box is ticked; the five unticked boxes stand as what the run would have proved. No successor ticket is created, and none is promised — a later approach that wants this evidence should open its own record. The `Trigger:` line above is kept as the history of the parking.
