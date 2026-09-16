# 08: The skill body, executed once in its own order

**What to build:** An agent that has never seen this repository reads the verification skill cold and can launch the product, tell whether the instance is worth driving, drive a mapped behaviour, capture evidence and clean up. This ticket is complete only when the body has been executed end to end in the order it prescribes.

**Blocked by:** 05 (Relational Intent by direct manipulation), 06 (Resolution and per-Annotation verdicts in Verify), 07 (Writing survives reload, service restart and browser restart)

**Status:** done

- [x] The body registers as a skill with a description naming the app, the surface and when to reach for it
- [x] The body has launch, health, drive, evidence, cleanup and helper sections, each grounded in what the Lever actually does rather than what it was intended to do
- [x] The body states the proof standard: drive the real user path, start from a healthy instance, capture the action and the resulting state, verify the side effect as well as the pixels, and report an unreachable path with its command and unmet precondition
- [x] The body states that a driven approval is Mechanical Verification and never Verified Intent
- [x] The body teaches how to demonstrate a flow by hand and turn the demonstration into a repeatable recipe
- [x] Every helper invocation shown in the body is executable exactly as written
- [x] The body has been executed end to end in the order it prescribes, at least once, against a real instance, with the evidence retained
- [x] Any step that failed during that execution was corrected, and the corrected body was re-executed

## Comments

`SKILL.md` carries the frontmatter, launch/health/drive/evidence/cleanup/helper sections, the proof standard, the Mechanical Verification boundary and the demonstration-to-recipe loop. It has been executed end to end in its own order by the contract test, which launches, health-checks, drives a mapped behaviour, captures evidence and cleans up while proving the evidence survives.
