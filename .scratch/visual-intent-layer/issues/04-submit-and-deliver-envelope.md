# 04: Submit written direction and deliver the envelope

**What to build:** Written direction plus optional references attach to the selected targets, submit emits a versioned envelope through ordinary MCP tools, and the Builder-Reviewer sees exactly where the intent stands.

**Blocked by:** 03 (Open saved HTML and select elements and text)

**Status:** ready-for-agent

- [ ] Written direction plus optional references attach to the selected target set and submit as one versioned envelope
- [ ] Delivery through ordinary MCP tools works from pi via pi-mcp-adapter, and the agent receives targets, evidence, revision identity, and uncertainty without reverse-engineering a screenshot
- [ ] The UI distinguishes locally queued, host-accepted, and agent-acknowledged states without implying acceptance means action
- [ ] Repeated delivery of the same envelope is idempotent and cannot create silent duplicates

## Comments

Implemented (implemented in 8b70d52): composer builds versioned envelope (src/ui/composer.ts), submit via POST /api/intents and MCP submit_visual_intent (src/mcp/service.ts); UI distinguishes draft/queued-local/host-accepted/agent-acknowledged; idempotent on idempotencyKey (src/lifecycle/store.ts).
