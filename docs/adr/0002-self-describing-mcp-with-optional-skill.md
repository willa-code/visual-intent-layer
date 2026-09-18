# Use a self-describing MCP surface with an optional thin Skill

> **Superseded in part by ADR-0018.** The model-visible surface is no longer one
> entry tool. `check_in` became a first-class tool when steering and interruption
> stopped being negotiated host capabilities, so the product publishes four tools
> — `open_visual_review`, `check_in`, `get_intent_status` and `acknowledge_intent`.
> The decision that interface mechanics stay app-only stands.
>
> **Superseded in part by ADR-0031.** The product ships no Skill. It was removed on the
> absence of evidence rather than against it: the invocation eval scores canned strings
> against a regular expression, the dogfood that would have observed live judgment was
> never performed, and explicit invocation from the tool description alone is proved by
> the protocol tests. The four triggers the Skill carried now live in
> `open_visual_review`'s description.

The product will expose one self-describing model-visible MCP entry tool and keep interface mechanics app-only. A thin optional Skill will add proactive trigger policy, the Visual Direction Loop, and host-specific fallbacks without duplicating tool schemas, so explicit use works in MCP hosts that do not support Skills while capable agents can still learn when to involve the human visually.
