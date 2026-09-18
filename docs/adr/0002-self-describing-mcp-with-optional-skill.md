# Use a self-describing MCP surface with an optional thin Skill

> **Superseded in part by ADR-0018.** The model-visible surface is no longer one
> entry tool. `check_in` became a first-class tool when steering and interruption
> stopped being negotiated host capabilities, so the product publishes four tools
> — `open_visual_review`, `check_in`, `get_intent_status` and `acknowledge_intent`.
> The decision that interface mechanics stay app-only stands.

The product will expose one self-describing model-visible MCP entry tool and keep interface mechanics app-only. A thin optional Skill will add proactive trigger policy, the Visual Direction Loop, and host-specific fallbacks without duplicating tool schemas, so explicit use works in MCP hosts that do not support Skills while capable agents can still learn when to involve the human visually.
