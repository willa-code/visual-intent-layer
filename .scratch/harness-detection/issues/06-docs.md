# 06: Detection and registration documentation

**What to build:** The Builder-Reviewer reads the docs and understands what setup looks for, what each report line means, how to read status output, which transport is used when, and what stays manual — with the per-Harness detection evidence recorded in the background research note so the spec does not become the only source.

**Blocked by:** 02 (Detection reporting), 03 (Content-verified registration), 04 (Transport selection), 05 (Status mode).

**Status:** done

- [x] README documents the detection signals per Harness, including configuration-home overrides and command aliases
- [x] README documents the report lines: version, detected, absent with evidence, and the no-harness default
- [x] README documents the Registration states and that outdated entries are repairable
- [x] README documents status mode, the harness filter, preview mode, and the transport selected by default
- [x] The background Harness MCP setup research note gains per-Harness detection evidence and environment overrides, with its sources
- [x] No host certification claims are added; support stays described as Baseline Compatibility

## Comments

The existing pi-only setup section was already replaced by the multi-harness table in `.scratch/multi-harness-setup`; this ticket extends that table rather than rewriting the install story.
### Implementation notes

README's install section now documents the per-harness detection table
(configuration location with env override, command, extra locations), the
executable-file rule, the report lines, the five registration states with
repair, the transport rule, the `--status` flag, and an expanded stays-manual
list (harnesses beyond the four, no interactive selection, Windows config paths
out of scope but Windows command shims supported).

`docs/background/harness-mcp-setup-research.md` gained addendum 11 with the
detection evidence table and its two first-party sources (herdr
`src/integration/registry.rs`, vercel-labs/skills `src/agents.ts`), and marks
section 7's coarser detection recommendation as superseded by ADR-0014. No
certification claims were added; support stays Baseline Compatibility.
