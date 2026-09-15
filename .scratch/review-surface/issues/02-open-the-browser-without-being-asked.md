# 02: Open the browser without being asked

**What to build:** Starting a review session opens the review surface in the default browser on the machine running the service, whether the session came from the operator command or from the agent-facing entry tool. The review URL is still printed. Headless use never launches a browser. Reopening the same artifact revision reuses the tab where the platform allows it.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Starting a session from the operator command opens the review surface in the default browser
- [x] Starting a session from the agent-facing entry tool opens the review surface in the default browser
- [x] The review URL is printed in both cases
- [x] Automatic opening is suppressed by a flag and by an environment variable, and neither launches a browser
- [x] Reopening the same artifact revision reuses an existing tab where the platform allows it

## Comments

Deferred confirmation: reopening the same revision reuses the session and its URL; literal focus of an already-open browser tab is delegated to the platform and is not asserted.
