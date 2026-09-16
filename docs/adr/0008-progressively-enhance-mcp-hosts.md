# Provide baseline MCP compatibility and certify richer host experiences

> **Superseded in part by ADR-0018.** Active-turn steering is not a host
> capability this product negotiates or detects. Steering and interruption are
> seen at the agent's Check-In, a published convention. The negotiation seam for
> `embeddedUI` and `subscriptions` survives; the `steering` capability flag and
> the delivery plan that gated on it were deleted.

Ordinary MCP tools and Visual Intent Envelopes will form the portable baseline for any conforming host. Embedded MCP Apps, subscriptions, and other optional capabilities will progressively enhance the experience when negotiated. The project will publish a host-and-version certification matrix for richer behavior and provide a local-browser fallback rather than describing untested hosts as fully compatible.

**Consequences:** V0 (Personal Proof) defers the published matrix and validates baseline delivery on pi via pi-mcp-adapter; other conforming hosts remain supported by design, not by certification.
