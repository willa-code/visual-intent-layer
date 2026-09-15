# 10: Tell the truth about the agent

**What to build:** The surface always says what the agent is actually doing: awaiting you, working, acknowledged, or stepped away with the Annotations queued durably. Where the host can hold the call the agent waits and sending is urgent; where the host cannot, the surface says so rather than implying anyone is listening. Acknowledgement never reads as completion.

**Blocked by:** 04 (One Annotation, end to end)

**Status:** done

- [x] The surface states the agent's position as a sentence, and the stepped-away state can never be read as working
- [x] Where the host can hold the call, the surface states that the agent is waiting
- [x] Where the host cannot hold the call, the surface states that the agent has stepped away and the Annotations are queued durably
- [x] Agent acknowledgement is presented as distinct from implementation and from verification
- [x] The workflow never requires the agent to be waiting