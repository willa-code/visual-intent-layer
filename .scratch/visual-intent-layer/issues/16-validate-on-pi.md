# 16: Validate the core loop on pi

**What to build:** The installable plugin runs the full Artifact Mode loop end to end through pi-mcp-adapter, proving Baseline Compatibility where it actually matters first.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent), 12 (Negotiate host capabilities with an honest browser fallback), 13 (Harden the local boundary and publish trust docs)

**Status:** ready-for-agent

- [ ] The installable plugin (npm package plus MCP configuration and Skill) installs and runs the Artifact Mode loop end to end through pi-mcp-adapter
- [ ] Browser fallback carries the complete V0 experience with steering labelled unsupported and the intent retained safely
- [ ] Restarting the service, browser, or connection mid-loop loses no acknowledged intent and duplicates none
