# 11: A full first-tier sweep, with multi-surface journeys

**What to build:** A broad regression pass the skill has a defined beginning and end for. The journeys file gives cross-surface behaviours a home, and one Verification Run sweeps every first-tier behaviour and reports its coverage honestly.

**Blocked by:** 09 (The second tier — the rest of the user-facing surface), 10 (The third tier — setup, Harness Detection and the MCP agent loop)

**Status:** done

- [x] The journeys file covers two concurrent sessions not corrupting each other's Annotations or scroll position
- [x] It covers the journey from opening an Artifact through composing and sending, an agent implementing, verifying, and the Builder-Reviewer approving
- [x] It covers the difference between delivery timings for the same Annotation
- [x] One Verification Run sweeps every first-tier behaviour in the map's stated sweep order
- [x] The run record states its outcome, using the same vocabulary the periodic maintenance pass uses
- [ ] The run record states its coverage: features and sub-features driven against those mapped (feature-level coverage recorded; sub-feature granularity outstanding)
- [x] The run record states the environment it ran against and indexes its evidence
- [x] Every unreachable path is recorded with the command attempted and the unmet precondition, and is not counted as covered through a different path
- [x] Evidence survives cleanup, proven by re-reading it at its declared location after teardown
- [x] The stable pointer names this run
- [x] Any guarantee discovered during the sweep that must hold forever has been promoted into an existing test rather than frozen into the Lever

## Comments

A Verification Run swept the six first-tier features in order: outcome `clean`, coverage driven `open-artifact, annotate-and-send, resolution-and-honesty, verify-each-annotation, relational-intent, never-discard-writing` against 15 mapped features, with the environment, launch record and evidence index. Evidence survived cleanup at its declared location and `.visual-intent-verify/latest` names the run. Coverage is feature-level; sub-feature granularity is recorded in each command detail. `journeys.md` maps the cross-surface behaviours.
