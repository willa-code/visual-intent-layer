# 12: Publish the Check-In convention, and report when it is honoured

**What to build:** Steering and interruption happen at a Check-In: the point between an agent's own steps where it reads new direction. That is a convention the product publishes rather than a host capability it detects, and it must be written where an agent will actually read it — the MCP tool descriptions, the shipped skill, and the README — naming the call from issue 14 that an agent makes to check in. The surface states when the agent last checked in, so a convention that is not being honoured is visible rather than assumed: a request that has not been collected says so, and says since when.

**Blocked by:** 14 (the Check-In call)

**Status:** ready-for-agent

- [ ] The tool descriptions state that an agent should read new direction between its own steps, and name the Check-In call explicitly — an agent that was not holding a call must be able to find it without an `envelopeId`
- [ ] The shipped skill tells an agent to check in between steps and what to do with an amendment or a stop request when it finds one
- [ ] The README describes Check-In as a convention, and never describes steering or interruption as a host capability
- [ ] Every MCP call for a session records agent contact, not only the call that opened the review
- [ ] The recorded contact survives the service restarting, so "last checked" is not lost with the process
- [ ] The surface states when the agent last checked in, in words a Builder-Reviewer can act on
- [ ] A request that has not been collected shows a not-collected-since state after a threshold, rather than implying it is being worked on
- [ ] When an agent has never checked in, the surface says that rather than showing a zero or an empty time
- [ ] The rejected alternatives are recorded where the convention is: that the nearest canvas-agent prior art refuses check-in outright and schedules later requests instead, and that polling through the MCP Tasks extension is the one push-free pattern the specification sanctions
- [ ] `CONTEXT.md`'s Check-In term matches what the descriptions and the skill tell an agent to do
- [ ] The documents that assert host steering as a capability — the ADR superseded by ADR-0018, the product strategy background and the pi validation note — are corrected or explicitly marked superseded

## Comments

Amended after independent review, which found this ticket's key criterion ungradeable: it required the descriptions to name the tool that reads new direction, and no such tool existed. It also found that `deliveryPlan`'s sentence about interruption being unavailable was the only honest copy on the subject, so it is re-homed on the Stop action rather than deleted with the file.