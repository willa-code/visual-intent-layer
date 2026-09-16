> **Dispositioned 2026-09-16.** This review is closed. Every finding below has been accepted, rejected, or deferred, and the dispositions are at the foot of this file under `## Disposition`. Read that before acting on anything here — nothing in this file is open advice, and two findings were rejected after the parent checked them against the code.

# Research: is the "Check-In" convention deliverable?

## BLOCKING

**B1 — Check-In has no MCP affordance to check in with.** `listTools()` in `src/mcp/service.ts` exposes exactly three tools: `open_visual_review`, `get_intent_status(envelopeId)`, `acknowledge_intent(envelopeId, agentId)`. `get_intent_status` requires an `envelopeId` minted server-side at send time (`sendQueue` → `markDelivered`) and returned only to an in-flight `open_visual_review` call. When the hold times out (`waitForSend`, `DEFAULT_WAIT_MS = 15 * 60 * 1000`), the tool description tells the agent "read them with `get_intent_status`" — with no id, and `listBatches()` is not a tool. So the amendment deletes the capability flags and adds no call an agent could make to collect new direction. **Change:** add `check_in(sessionId)` (or accept `sessionId` in `get_intent_status`) returning new direction, supersessions and pending interruptions, and define "Check-In" in `design.md` §4/§6 as that call, not as prose.

**B2 — The one host-guaranteed channel is the held call, and the iteration never names it.** MCP spec: "Requests are sent from the client to the server, to initiate an operation"; "Servers **MUST NOT** send `notifications/cancelled` for any other purpose"; servers "**MAY** ignore cancellation notifications if … the request cannot be cancelled"; the Tasks extension states "Cancellation is cooperative — the server acknowledges the intent but is not obligated to stop the work." A server can therefore never inject anything into a running turn. Delivery exists in exactly two forms: (a) returning the in-flight tool call early — which the surface already implements (`resolveWaiters`), is guaranteed, and is what every host does with tool results; (b) an agent-initiated call, which is a convention. `design.md` §4 asserts "the agent reads new direction at its next Check-In" without saying which. **Change:** split the two cases in §4/§6 and gate the Stop copy on whether a call is currently held — `agentPosition()` already computes `hostCanHold` (`src/mcp/service.ts`).

## SIGNIFICANT

**S1 — Deleting the capability flags deletes the only honest interruption copy.** `deliveryPlan()` (`src/host/capabilities.ts`) is the sole place that says "Interruption is not available on this host, so this request stays an explicit local draft. Nothing was stopped." It is true that nothing branches on `strategy`, and nothing renders `label` either (`renderSendControls`, `src/ui/app.ts`, shows only `snapshot.agent.sentence` and a three-option select with no interruption entry). But user story 20 then has no carrier. **Change:** re-home that sentence on the Stop action rather than discarding it with the file.

**S2 — "Next Check-In" is under-specified because the boundary differs per host.** Cursor: "Send a follow-up now and it steers the active turn at the agent's next tool call." Claude Code: "Claude Code queues the message instead of interrupting the turn… Claude Code passes them to Claude when that turn's tool calls finish." pi: Enter "queues a steering message, delivered after the current assistant turn finishes executing its tool calls." Codex: "Press Tab while Codex is working to queue a follow-up prompt… for the next turn." GitHub Copilot SDK documents two modes, `immediate` — "Injected into the current LLM turn" — and queueing. The boundary is next-tool-call, end-of-turn, or next-turn depending on host. **Change:** the surface states the boundary it relies on ("delivered when a tool call returns"), never "the agent will see this soon".

**S3 — Queued input is host-TUI input; an MCP server cannot feed the host's queue** (researcher inference, from the docs below plus the MCP message patterns). pi's steer queue, Cursor's immediate send, Codex's Tab queue and Claude Code's queue are all filled by typing in the host. So Check-In cannot piggyback on the host's existing steering primitive; it must be an agent-initiated tool call (B1).

**S4 — Prior art labels unread requests; it does not promise interruption.** Devin: queued messages "default to sending immediately when Devin becomes available". Codex names the boundary in the UI: "Messages to be submitted after next tool call". Linear marks an agent "unresponsive" if the first response is >10s late and the session "stale" after 30 minutes. Claude Code lists queued entries above the input "until it sends them"; anthropics/claude-code#56995 documents messages lost or queued mid-run "without UI indicator". **Change:** copy "queued until the agent next calls in" plus a "not collected since <time>" state after a threshold, modelled on Linear's staleness.

**S5 — The nearest canvas-agent prior art refuses check-in outright.** tldraw's agent starter kit throws `'Agent is already prompting. Please wait for the current prompt to finish.'` and offers `schedule` for later requests (`TldrawAgent.ts`). Record this as the explicit alternative the iteration rejects.

## CONTRADICTIONS

Vendor docs disagree with their own products. Claude Code documents `Esc` as interrupting but Enter as queueing, while anthropics/claude-code#36326 reports "Docs say Enter interrupts mid-task, but it only queues the message"; #16905 reports `Esc` doing nothing when queued messages exist. Cursor's docs describe queued-then-dispatch, while forum reports show queued items firing at once, resolved by the "Queue Messages" setting. Do not treat any host's boundary semantics as stable.

## MISSING EVIDENCE

No host documents a check-in driven by an MCP server; MCP's only sanctioned push-free pattern is Tasks (poll via `tasks/get`, input via `tasks/update`). `source_check` on the mid-turn claim returned **unclear (0.30)** — validated instead by direct fetches of the spec pages cited below. Unverified: whether any real agent will call a check-in tool between steps; that is what issue 13's Verification Run must settle (drive a real agent through `open_visual_review` plus a check-in tool with a queued direction and a stop request).

## SOURCES

- MCP spec, message patterns / cancellation / Tasks — modelcontextprotocol.io/specification/2026-07-28/basic/index, .../basic/utilities/cancellation, modelcontextprotocol.io/extensions/tasks/overview — normative, primary.
- Claude Code, *Interactive mode* — code.claude.com/docs/en/interactive-mode — queue vs Esc.
- pi, *Using Pi* — github.com/badlogic/pi-mono `packages/coding-agent/docs/usage.md` — steering queue.
- Cursor, *Agent overview* — cursor.com/docs/agent/overview — next-tool-call steering.
- Codex CLI reference — developers.openai.com/codex/cli/reference.md; GitHub Copilot SDK *steering and queueing* — docs.github.com.
- Devin release notes, Linear *agent-interaction* / *agent-best-practices*, tldraw `templates/agent` (`TldrawAgent.ts`) — prior art.
- Rejected: stagewise docs — prompt composer only, no mid-run steering documented; learncursor.dev, Cursor forum and claude-code issues — kept only as evidence of doc/behaviour drift.

## Disposition

| Finding | Outcome | Where it landed |
| --- | --- | --- |
| B1 Check-In has no MCP affordance to check in with | **Accepted** | 14: a session-scoped call that needs no `envelopeId`, returned by a durable cursor, recording contact atomically. 08, 09 and 12 are all blocked on it |
| B2 The held call is the only host-guaranteed channel; name which case applies and gate the Stop copy on it | **Accepted** | `design.md` amendment 3 records the host contract: delivery has exactly two forms, and the surface states which applies. 09 carries the criteria and `agentPosition`'s `hostCanHold` is the signal |
| S1 Deleting the capability flags deletes the only honest interruption copy | **Accepted** | 09 re-homes that sentence on the Stop action rather than discarding it with the file |
| S2 The boundary differs per host — next tool call, end of turn, or next turn | **Accepted** | 09 requires the surface to state the channel it relies on and never to say the agent will see it soon; 12 states the convention |
| S3 Queued input is host-TUI input; an MCP server cannot feed the host's queue | **Accepted** | recorded in 14's comment as the reason Check-In must be an agent-initiated call |
| S4 Prior art labels unread requests; it does not promise interruption | **Accepted** | 12 requires a not-collected-since state after a threshold, rather than implying the request is being worked on |
| S5 The nearest canvas-agent prior art refuses check-in outright | **Accepted as the recorded rejected alternative** | 12's criterion and ADR-0018 |
| Contradictions: vendor docs disagree with their own products | **Accepted as a caution** | ADR-0018 states that no host's boundary semantics are stable, so nothing depends on one |
| Missing evidence: no host documents a server-driven check-in; `source_check` returned unclear (0.30) | **Noted and deferred to evidence** | 13 settles it by driving a real agent rather than by argument, and reports the exact call an agent failed to make if the convention is not honoured |
