# 07: Delivery stops pretending, and the intent follows the act

**What to build:** Delivery stops asking the Builder-Reviewer to pick an intent and stops pretending to know what a host can do. **Only the dead parts are deleted**: `deliveryPlan`, `DeliveryPlan` and the `steering` capability flag, because the strategy was computed, returned and never branched on anywhere, so the flag gated nothing. `HostCapabilities` and `detectCapabilities` survive for `embeddedUI` and `subscriptions`, which ADR-0008 deliberately deferred rather than refused, and the declaration becomes reachable through the tool schema so the seam is live rather than dead. The intent an agent receives follows from which Annotation the Builder-Reviewer acted on — sending a queue is Next-Pass Intent, amending a delivered Annotation is Steering Intent (issue 08), asking an agent to stop is Review Interruption (issue 09), and ADR-0018 records why steering is a convention rather than a capability. The `draft` intent stops being able to mark anything delivered.

**Blocked by:** 06 (the list the action lives in)

**Status:** ready-for-agent

- [ ] `deliveryPlan` and `DeliveryPlan` are gone, and no replacement reintroduces a plan whose outcome nothing reads
- [ ] The `steering` capability is gone from `HostCapabilities` and from anywhere that describes what a host can do
- [ ] `HostCapabilities` still carries `embeddedUI` and `subscriptions`, `detectCapabilities` still exists, and a host can actually declare them through the MCP tool schema rather than through an argument no caller passes
- [ ] `src/host/capabilities.ts`'s test is updated rather than deleted, and asserts the surviving declaration path
- [ ] The `?cap=` session token in `src/service/http.ts` is untouched: it is session authorisation, not host capability, and the two meanings of "capability" are not conflated anywhere in this change
- [ ] There is no delivery-intent selector in the surface, and no user-facing control whose label promises a delivery behaviour the code does not perform
- [ ] Sending the queue delivers with Next-Pass Intent
- [ ] The one send action states what will happen to the Annotations, and whether the agent is holding the call right now, beside the action rather than in a separate paragraph
- [ ] A delivery whose intent is `draft` creates no batch and moves no Annotation out of draft or queued
- [ ] The envelope's intent values remain `draft`, `steering`, `next-pass` and `review-interruption`: the published contract is unchanged by this ticket
- [ ] The surface never asks the Builder-Reviewer to choose an intent, and `design.md` §10's anti-pattern is asserted by a test rather than by review
- [ ] Driven live: sending produces a stored batch whose intent is `next-pass`, and the surface states the agent's position from the same read
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Amended after independent review, which found the ticket over-reaching. Deleting the whole capability type discards ADR-0008's *deferred, not refused* negotiation path silently, and ADR-0008 recorded that path as a deliberate choice. The review also caught that the review URL's `?cap=` is a session auth token — `src/service/sessions.ts` — entirely unrelated to host capability, so a careless deletion could break authorisation. ADR-0018 now records what was retired and why.
