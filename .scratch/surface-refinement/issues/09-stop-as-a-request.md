# 09: Stopping is a request the surface can make

**What to build:** A Builder-Reviewer can ask an agent to stop from the Review Surface instead of going back to the harness. A stop request carries no target, so it is **not** a Visual Intent Envelope — the envelope requires at least one Annotation — and it is carried instead by a session-scoped interruption record that the Check-In call from issue 14 returns. The surface presents it as a request rather than a control: it says which delivery channel applies, and when the agent last checked. The action is offered while the agent is working or has acknowledged an Annotation, and is absent at other times rather than present and inert.

**Blocked by:** 07 (the delivery vocabulary), 14 (the Check-In call and the interruption record), 15 (delivery by a named set)

**Status:** done

- [x] A stop action exists in the surface and records a session-scoped interruption request
- [x] The interruption is not carried in a Visual Intent Envelope, and the envelope's `review-interruption` value is documented as reserved and never emitted rather than left as a value nothing can produce
- [x] The request is returned by the Check-In call, and is visible to an agent that was not holding a call when it was made
- [x] The wording and the sentence beside the action state that this asks the agent to stop, and never that work was stopped
- [x] The action is offered only while the agent is working or has acknowledged an Annotation, and is absent otherwise
- [x] The surface states which channel applies: a call currently held, or the agent's next Check-In. It never says the agent will see it soon
- [x] The surface states when the agent last checked, and when it has never checked in it says so and says the request will wait
- [x] The honest sentence from the deleted capability plan — that interruption is not available and nothing was stopped — is re-homed on this action rather than discarded with the file
- [x] No Annotation state is changed by the request, and nothing in the surface claims an interruption happened
- [ ] Driven live: the request is stored, the Check-In call returns it, and the surface's sentence matches what actually happened
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review. The envelope's `minItems: 1` on `annotations` (`src/annotation/envelope.ts:25`, `schema/envelope-v0.2.schema.json`) made the original acceptance criterion unsatisfiable: a stop has no target, so no envelope can carry it. The review also established, from the MCP specification, that a server cannot put anything into an agent's running turn, so the boundary must be stated as "delivered when a tool call returns" rather than "the agent will see this soon" — hosts differ on whether that is the next tool call, the end of the turn, or the next turn.

Resolved 2026-09-17: done. The stop request is session-scoped and returned by `check_in`; `src/mcp/service.ts` and the interruption route in `src/service/http.ts`.

Deferred confirmation: the `Driven live` box is parked with the iteration's Verification Run.
