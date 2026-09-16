# 04: One line answers whose turn it is

**What to build:** The rail head carries **one status line of at most eight words** saying whose turn it is, derived from the open Pass's state, the number of Annotations not yet sent, and the agent position report. It replaces the agent paragraph, the send footer paragraph, and the heading that restated the attention count. The attention badge counts only Annotations needing a decision.

**Blocked by:** 03 — A Pass is a thing

**Status:** done

- [x] The rail head shows exactly one status line, and it is at most eight words
- [x] It reads `Your turn` with the count of unsent Annotations when a Pass is open with work to send
- [x] It reads `Agent's turn` with the Pass number when a Pass is in flight
- [x] It reads `Your turn` with the Pass number and that it is ready when a Pass is ready
- [x] It states whether a call is being held right now, because the delivery channel is a fact about this moment
- [x] It never reads as working when the agent has stepped away
- [x] It never states that a revision addressed anything
- [x] The agent paragraph, the send footer paragraph and the duplicated count heading are absent in every state, including in flight and ready
- [x] When the agent last checked is reachable in one disclosure and is not a second sentence in the rail head
- [x] The attention badge counts only Annotations needing a decision, is hidden at zero, and is never summed with Annotations written before the current revision or with a non-empty queue
- [x] A test drives open, in-flight and ready and asserts the rendered line in each

## Comments
