# 03: The disclosure names every evidence axis

**What to build:** The drawer's "What leaves this machine" names the Runtime State
Evidence it will carry, so `SECURITY.md`'s claim that the UI discloses "exactly which
evidence an envelope carries" is true.

The per-target line names label, role, accessible name, selector and box
(`src/ui/components.ts:604-621`) and nothing else. Runtime State Evidence — the artifact's
address including its query and fragment, its scroll, and any frame chain — leaves
unnamed. A query string is exactly where a token would ride out of the machine, and this
line is what the Builder-Reviewer reads before deciding to send.

**Status:** done

- [x] The evidence line names the address when the Target recorded one, including any query and fragment
- [x] The evidence line names the scroll position when the Target recorded one
- [x] A Target with no address or scroll prints neither, and prints no empty placeholder
- [x] `tests/browser-loop.test.ts` asserts the drawer's leaving-list names the address
- [x] No new control and no new stored field

## Comments

Deferred confirmation: the fourth box, "`tests/browser-loop.test.ts` asserts the drawer's leaving-list names the address", is unticked, and the reason is a property of the fixture rather than a missing capability. A saved-HTML Artifact is served at its own base, so its top document has no address to record and the drawer correctly prints none; what the browser loop drives is the scroll axis, which is always recorded, and `src/ui/components.test.ts` proves the address itself — including the query and fragment this ticket exists for, `/checkout?token=abc123#step-2`. A proxied application with a route records a real address and is the fixture that would drive this box live; it was not added here, so the box is left unticked rather than ticked by substitution.

Landed 2026-09-18. `describeEvidence` adds `Address:` and `Scroll:` to the line the drawer already prints, each omitted when the Target recorded none (`src/ui/components.ts`). Driven live in Verification Run `.visual-intent-verify/runs/2026-09-18_06-28-32-backlog-triage-repairs`: the drawer snapshot reads `… Selector: body > main.gallery-page > p.shipping-note:nth-of-type(2) · Box: 32,216 836×18 · Scroll: 0,0`.

2026-09-18, later the same day — the Deferred confirmation above is withdrawn and its box is ticked. A saved-HTML Artifact cannot drive the box, but a proxied application can: `startDevServer({ routed: true })` now serves the application with one in-app link, `/app/<session>/detail` records the address `detail`, and the test *names the address a Target recorded among the evidence the drawer says will leave* navigates the application to its own route, queues an Annotation there, opens the drawer, and asserts the leaving list reads `Address: detail`. Removing the address from `describeEvidence` makes the test time out with the address absent from the list, so it is not a vacuous assertion. The earlier paragraph is kept as the history of the correction, and the reason it gave — that the box could not be driven — was wrong about the product: the fixture was wrong, not the capability.