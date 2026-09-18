# Precision and Trust — Advisor Review: Standard MCP Distribution

## 1. Which term replaces Harness Detection / Harness Registration

Delete both; don't rename. CONTEXT.md's current entry for **Harness Registration** encodes a verifiable claim — "current when its entry matches… outdated when it differs" — that only exists because the product wrote and re-read the config (ADR-0014). Once that mechanism is deleted, no replacement definition can carry that property; renaming the *same term* to mean "the human act of registering with the Harness's own registrar" reuses a word whose defining feature (verifiability) is gone, inviting readers of prior docs/ADRs to import a warranty the product no longer gives. CONTEXT.md's glossary is for things the product tracks and can state something about. A human running someone else's registrar on their own machine is nothing the product observes — it earns plain prose ("run pi's own registration command"), not a reified term.

## 2. Where the version self-report belongs

Every result — and the spec should stop presenting this as open. Implementation Decisions already states "the running server version appears in the `open_visual_review` result, so it travels with every review," while Open Decisions re-poses the identical question as unresolved (spec.md lines 33–34 vs. 105–107). That's an internal contradiction to fix regardless. On the merits: conditioning the field's presence on "something going wrong" makes its mere presence a judgment, violating VISION's "a fact and a judgment never share a word." Worse, the browser-open check the spec ties failure to (`browserOpened`) can't detect every "odd behavior" a report might later need a build number for — so *absence* of a version field would be misread as "nothing to report," a claim the product doesn't own. An always-present, purely descriptive field carries no judgment and costs the operator nothing (Effort axis).

## 3. describeTarget's fallback

I traced `describeTarget` (src/ui/app.ts:2102) and its only two real trigger paths: `region` targets from `selectEnclosed` (src/ui/artifact/layer.ts:366) with no enclosed-element labels, and `text-range` targets (src/ui/artifact/layer.ts:698), whose grounding (`grounding.ts:54-84`) never sets `accessibleName` and only sometimes sets `semanticRole`. Both fall through to the bare kind word today. `element` never does — `makeTarget` always seeds `label` with the tag name (layer.ts:164-166). The spec frames this as a one-word ("region") problem; it's actually two, and the second is undiscussed. Humanizing only "region" ships an inconsistent, half-fixed voice. This belongs to its own change: no other Implementation Decision here touches `app.ts`, and the fix needs both kinds handled together to be a real precision improvement rather than a partial one.

## (a) Another decision I'd reverse

"The registry listing is the distribution surface" (Out of Scope) overreaches. The same spec's actual install path for the four named Harnesses is their own registrars (`opencode mcp add`, etc.), not registry queries — no evidence shown that any of the four consult the official MCP Registry today. State it as "listed, adoption by clients unverified," not as the distribution surface for the Harnesses we name.

## (b) Silent on

The new ADR should say explicitly that the reported version identifies the *server process that answered this call*, not that the Harness's registration is current — a check the product can no longer make once Registration's verified state is deleted. Without that line, a version string in a bug report can be misread as proof the whole chain is correctly wired.