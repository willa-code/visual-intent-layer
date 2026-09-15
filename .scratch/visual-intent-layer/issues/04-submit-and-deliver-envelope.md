# 04: Submit written direction and deliver the envelope

**What to build:** Written direction plus optional references attach to the selected targets, submit emits a versioned envelope through ordinary MCP tools, and the Builder-Reviewer sees exactly where the intent stands.

**Blocked by:** 03 (Open saved HTML and select elements and text)

**Status:** done

- [x] Written direction plus optional references attach to the selected target set and submit as one versioned envelope
- [x] Delivery through ordinary MCP tools works from pi via pi-mcp-adapter, and the agent receives targets, evidence, revision identity, and uncertainty without reverse-engineering a screenshot
- [x] The UI distinguishes locally queued, host-accepted, and agent-acknowledged states without implying acceptance means action
- [x] Repeated delivery of the same envelope is idempotent and cannot create silent duplicates

## Comments

Implemented (implemented in 8b70d52): composer builds versioned envelope (src/ui/composer.ts), submit via POST /api/intents and MCP submit_visual_intent (src/mcp/service.ts); UI distinguishes draft/queued-local/host-accepted/agent-acknowledged; idempotent on idempotencyKey (src/lifecycle/store.ts).

Verification note: the pi checkbox is ticked on MCP-protocol evidence (real stdio transport + contract tests prove ordinary-tools delivery of the structured envelope); live deployment confirmation rides with ticket 16.

Superseded: written direction no longer attaches to a target set as one envelope. An Annotation is the unit and carries its own note, references and identity; a Visual Intent Envelope is the delivery batch (ADR-0016). Idempotent delivery and the queued / host-accepted / agent-acknowledged distinction this ticket established still hold.

See `.scratch/review-surface/spec.md`.
