# 07: Live detection verification on a multi-Harness machine

**What to build:** A human confirms on a real machine carrying pi, Codex, Claude Code, and opencode that setup detects all four, reports each Registration state correctly, repairs an outdated entry, and writes a working transport — including at least one Harness configured under a non-default configuration home. The ticket stays open until each Harness is evidenced or its failure is filed as a follow-up.

**Blocked by:** 02 (Detection reporting), 03 (Content-verified registration), 04 (Transport selection), 05 (Status mode).

**Status:** ready-for-human

- [ ] All four Harnesses are detected on a machine that has all four, with the report naming each
- [ ] A Harness configured under a non-default configuration home is detected
- [ ] An entry pointing at a stale command is reported as outdated, names the differing fields, and is repaired on re-run
- [ ] Status mode output matches the resulting files
- [ ] A machine without a global install receives the `npx` transport and the Harness lists and spawns the server
- [ ] Each Harness is evidenced, or its failure is recorded as a follow-up ticket

## Comments

Start from the machine and release involved in the original report: record the setup version line alongside the evidence, so a stale installation and a detection gap stay distinguishable.