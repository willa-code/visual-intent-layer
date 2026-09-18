# 16: Validate the core loop on pi

**What to build:** The installable plugin runs the full Artifact Mode loop end to end through pi-mcp-adapter, proving Baseline Compatibility where it actually matters first.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent), 12 (Negotiate host capabilities with an honest browser fallback), 13 (Harden the local boundary and publish trust docs)

**Status:** wontfix

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [ ] The installable plugin (npm package plus MCP configuration and Skill) installs and runs the Artifact Mode loop end to end through pi-mcp-adapter
- [x] Browser fallback carries the complete V0 experience with steering labelled unsupported and the intent retained safely
- [x] Restarting the service, browser, or connection mid-loop loses no acknowledged intent and duplicates none

## Comments

Agent work in 8b70d52: installable plugin (npm package + mcp.json + skill), MCP protocol contract tests, stdio smoke script, browser fallback complete with steering labelled unsupported, restart recovery tested. Live checklist at docs/pi-validation.md needs a real pi session via pi-mcp-adapter. Moved to ready-for-human.

Verification note: fallback + restart boxes ticked on automated evidence (fallback suite, store restart/idempotency tests). Browser-restart safety follows from server-side state; the end-to-end live-pi box stays open for a real pi session.

Deferred 2026-09-17: live validation of the core loop on pi is parked until the next spec's Verification Run plus maintainer time. Nothing here was driven by this iteration, and no box is ticked by the deferral.

2026-09-18 — `Status: deferred` → `wontfix`, closed by maintainer decision: the live-pi confirmation is not going to be performed. The two ticked boxes above stand on their automated evidence and are untouched. The unticked box stays unticked — the installable plugin's end-to-end run through a real pi session is not proven by this closure, and `docs/pi-validation.md` keeps its `awaiting-human` status and its checklist so the run remains startable by hand.
