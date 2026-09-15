# 16: Validate the core loop on pi

**What to build:** The installable plugin runs the full Artifact Mode loop end to end through pi-mcp-adapter, proving Baseline Compatibility where it actually matters first.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent), 12 (Negotiate host capabilities with an honest browser fallback), 13 (Harden the local boundary and publish trust docs)

**Status:** ready-for-human

- [ ] The installable plugin (npm package plus MCP configuration and Skill) installs and runs the Artifact Mode loop end to end through pi-mcp-adapter
- [x] Browser fallback carries the complete V0 experience with steering labelled unsupported and the intent retained safely
- [x] Restarting the service, browser, or connection mid-loop loses no acknowledged intent and duplicates none

## Comments

Agent work in 8b70d52: installable plugin (npm package + mcp.json + skill), MCP protocol contract tests, stdio smoke script, browser fallback complete with steering labelled unsupported, restart recovery tested. Live checklist at docs/pi-validation.md needs a real pi session via pi-mcp-adapter. Moved to ready-for-human.

Verification note: fallback + restart boxes ticked on automated evidence (fallback suite, store restart/idempotency tests). Browser-restart safety follows from server-side state; the end-to-end live-pi box stays open for a real pi session.
