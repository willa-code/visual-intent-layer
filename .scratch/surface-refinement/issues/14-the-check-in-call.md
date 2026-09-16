# 14: The Check-In call

**What to build:** An agent can read new direction without holding a call and without an `envelopeId`. A session-scoped Check-In call returns what has arrived since the agent last asked — amendments delivered as Steering Intent, pending interruption requests, and the state of everything it was previously given — and records the contact atomically, so "when the agent last checked" becomes a fact the surface can state. Contact is durable rather than in-memory, so restarting the service does not erase it. The same ticket owns the session-scoped interruption record that a stop request needs, because an interruption carries no target and so cannot be a Visual Intent Envelope.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A session-scoped call returns new direction since a cursor, and does not require an `envelopeId`
- [ ] The call returns, at minimum: newly delivered Annotations with their intent, amendments that superseded something, pending interruption requests, and the current state of Annotations the agent was given before
- [ ] The call records agent contact as part of the same operation, so a read-back and a check-in cannot disagree
- [ ] Contact is durable across a service restart, and the surface can state when the agent last checked
- [ ] A pending interruption request is stored session-scoped, is returned by the call, and is never carried in a Visual Intent Envelope
- [ ] An agent that was not holding a call when the Builder-Reviewer acted can retrieve what arrived, using only what the shipped tool descriptions tell it
- [ ] The tool description tells an agent when to check in, and the call is discoverable without prior state
- [ ] The envelope's `review-interruption` value is documented as reserved and never emitted, or removed by a recorded schema decision; no value in the published schema can be one the product is unable to produce
- [ ] Driven live: a direction batch, an amendment and a stop request are each retrieved by the call after the original hold has expired, and the contact time read back from stored state matches
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Added after independent review, and it is the most consequential addition in this pass. Three lanes found the same gap: the iteration deleted the capability flags, published a Check-In convention, and added no call an agent could make to check in with. `get_intent_status` needs an `envelopeId` that only an in-flight `open_visual_review` ever returns, and `listBatches` is not a tool. Issues 08, 09 and 12 are all decorative until this exists. The review also established from the MCP specification that a server cannot inject anything into a running turn, and that polling through the Tasks extension is the only push-free pattern the specification sanctions, which is a form of Check-In rather than an alternative to one.
