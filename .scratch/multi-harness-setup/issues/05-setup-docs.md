# 05: Multi-harness setup docs

**What to build:** The Builder-Reviewer reads the install docs and understands setup for all four harnesses without guessing: what gets written where per scope, how to restrict with the harness filter, how to preview, what the packaged snippet is for on machines without a global install, and what stays manual. The current pi-only setup section is replaced, with no certification claims added for the new harnesses.

**Blocked by:** 02 (Codex registration), 03 (opencode registration), 04 (Claude Code registration).

**Status:** done

- [x] Install docs describe per-harness, per-scope setup behavior matching the implementation
- [x] Harness filter, preview mode, and the stays-manual list are documented
- [x] Packaged snippet is documented as the fallback for machines without a global install
- [x] No host certification claims are added; setup support is described as Baseline Compatibility

## Comments

- Replaced the pi-only setup section in `README.md` with a per-harness/per-scope table, merge/idempotency/refusal/comment behavior, the `--global`/`--harness`/`--print-only`/`--no-skill` flags, the packaged `npx` snippet as the no-global-install fallback, and the stays-manual list.
- Support is described as **Baseline Compatibility**, with no host certification claims.
