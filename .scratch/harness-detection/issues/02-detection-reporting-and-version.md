# 02: Detection reporting and the version line

**What to build:** The Builder-Reviewer reads setup output and knows exactly what was found and what was not. Every run prints the running package version, then names each detected Harness, each known-but-absent Harness with the evidence that was checked, and states plainly when nothing was detected and the shared `.mcp.json` default is being written. "pi only" stops being ambiguous between a detection result and a fallback.

**Blocked by:** 01 (Harness registry and union detection).

**Status:** done

- [x] Every setup run prints the running package version before the plan or result
- [x] The report names every detected Harness
- [x] The report names every known-but-absent Harness with the locations and commands that were checked
- [x] When nothing is detected, the report states that explicitly alongside the shared default being written
- [x] The harness filter narrows the report to the requested Harnesses without hiding that others were detected
- [x] Preview mode shows the same detection and version information as apply
- [x] Report formatting is covered by assertions on the printed text

## Comments

This ticket is what makes the original report self-dating: a machine behaving differently can be described by the version that produced the output.
### Implementation notes

`SetupPlan` gained `version`, `transport`, `presence`, and `filtered`.
`formatPlan` and `formatResult` now share one detection header: package version,
scope, configured harnesses, transport, detected harnesses, an explicit line
when nothing was detected, then one `absent:` line per known-but-absent harness
with the evidence checked. `formatResult` takes the plan so the applied report
carries the same header, which keeps preview and apply consistent.

The no-detection line distinguishes the cases instead of defaulting to one
sentence: nothing to register, the shared `.mcp.json` default, or the harnesses
named by an explicit `--harness` filter (this last case was a real contradiction
found in the CLI smoke run, where `--harness opencode` on an empty machine wrote
a file while reporting "nothing to register").

Evidence: the header is rendered identically by preview and apply for the same
plan, and the version comes from the package manifest rather than a constant —
the test reads `package.json` independently and compares.

### Code-review follow-up

The spec axis found the no-detection header could print "nothing to register"
while apply still wrote the pi Skill. The header now distinguishes four cases:
no targets at all, harnesses named by `--harness`, the shared `.mcp.json`
default, and "installing the pi Skill only". Test added for the skill-only case.
