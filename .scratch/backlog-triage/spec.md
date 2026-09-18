# Backlog triage: three honesty repairs, two boundary sentences

Status: done

The last unowned ideas were settled under an advisor panel on 2026-09-18. Almost all of
them were parked or refused, and three of the reasons turned out to be defects in the
shipped surface rather than missing features. This spec lands those defects, writes the
two documentation sentences the product owed, and retires `.scratch/backlog.md` by
absorbing it.

## Why it exists

`.scratch/backlog.md` held the ideas that were neither owned by a spec nor refused by an
ADR. Reviewing it turned up two different things:

**Four ideas are correctly parked**, each with a trigger that has not fired: a lock
between two browser sessions, declared state beyond the address, suggested re-points, a
fifth harness, and a multi-page saved site as a *capability*. Two were withdrawn
outright. One was decided: redaction stays absent, and disclosure is the whole, stated
mitigation.

**Three repairs are owed today**, and each was found by an advisor asked to justify the
*unbuilt* idea. The shipped surface already claims more than it knows:

- **A tab states a revision it is not showing.** `adoptedRevision` is one field on the
  shared session, and the poll copies it into whatever tab is looking
  (`src/ui/app.ts:1720-1721`). Tab A can render revision 1 while its rail reads
  "Revision under review: 2", and its next Annotation is stamped with revision 2 through
  `session.adoptedRevision` (`src/service/http.ts:338`) although the target evidence came
  from revision 1. `design.md` §5 makes the written revision part of what an Annotation
  means, so this is an honesty defect, not an inconvenience.
- **Reload marks Passes ready without a new revision.** `/reload` calls
  `markPassesReady` unconditionally (`src/service/http.ts:465-466`), where `/adopted`
  guards the same call on the revision actually changing (`:262-263`), and
  `markPassesReady` flips every open or in-flight Pass with no revision check
  (`src/annotation/store.ts:711-719`). The multi-page notice's own "Back to the reviewed
  document" drives this route, so following a link and coming back can say it is the
  Builder-Reviewer's turn while the agent is still working.
- **The disclosure claims more than it lists.** `SECURITY.md:51-52` says the review UI
  "discloses exactly which evidence an envelope carries", while the per-target line names
  label, role, accessible name, selector and box only (`src/ui/components.ts:604-621`).
  Runtime State Evidence leaves unnamed — and that includes the address with its query and
  fragment, which is precisely where a token would ride out of the machine.

## What it will build

- **The written revision follows the tab.** A tab stops adopting the session-global
  `adoptedRevision` from the poll, and states the revision it is showing when it composes,
  so an Annotation is stamped with the evidence's own revision rather than the last
  revision any tab reported.
- **`/reload` marks Passes ready only when the revision moved**, matching `/adopted`.
- **The disclosure names every axis it sends**, adding the address and scroll to the line
  the drawer already prints.
- **`README.md` states the boundary** in one sentence — a phone screen, a native window, a
  design file and a PDF are not browser-rendered artifacts — and **names the stamp
  contract** (`data-vis-source`, or `data-insp-path` written by `code-inspector-plugin`),
  which today appears in ADR-0021 and the source but in no reader-facing document, so
  exact Source Provenance cannot be reached by reading the front door.
- **`SECURITY.md` records the mitigation as deliberate**: the disclosure, plus the exits
  that already exist — an unsent Annotation is private, Take Back returns an uncollected
  delivery to the queue, and an attachment can be removed.

## Decided already

The panel's POVs are beside this spec under `advisors/`. Every verdict below was put to
the maintainer and accepted on 2026-09-18.

- **Multi-page saved site.** The shipped refusal is *accepted*; the multi-page capability
  stays *pending* with its trigger. No ADR refuses it, so it is not relabelled as refused.
- **Rule-out sentences.** Written, in `README.md`. The front door is where the question is
  asked; `docs/background/product-strategy.md` already carries the positive boundary.
- **Two tabs.** The lock stays parked. The revision-claim defect is repaired, because a
  tab that lies about which revision it is judging is not a missing feature.
- **Declared state beyond the address.** Parked. It wants a dogfood case, and the first
  response to one is to widen the derived reading, not to add a recorded field.
- **Suggested re-points.** Parked. The honest ceiling already ships — candidates marked on
  the artifact, `RepointAction` for the human's own next point — and §10 forbids the two
  shapes a suggestion could take.
- **Our own stamp transform.** Parked; ADR-0021's trigger stands. The reachability gap is
  documentation, not code.
- **Redaction.** Refused as an affordance; recorded as a deliberate limitation.

## Out of Scope

- **A lock, a revision history, or a conflict state between two browser sessions.** Pass A
  refused it by name (`surface-refinement-pass-a/spec.md:374`) and no lost write is
  recorded.
- **Multi-page review.** A second document gains no layer and no document-set identity.
- **Any redaction, crop or mask control.**
- **A recorded state family** — dialog, route, filter, form value.
- **A per-framework source-stamp transform.**
- **A fifth Harness.**

## Testing Decisions

`tests/browser-loop.test.ts` stays the primary seam. Two tabs is the one case the Lever
cannot drive, because it owns exactly one browser, so the revision-claim repair is proven
there by opening a second page against the same session.

- **Two tabs.** Tab A loads revision 1; tab B reloads to revision 2; tab A still reports
  revision 1, and the Annotation tab A composes is stored with revision 1.
- **Reload.** A reload with an unchanged revision leaves an open Pass open; a genuinely
  new revision marks it ready.
- **Disclosure.** `tests/browser-loop.test.ts` asserts the drawer names the address a Target recorded, driving a proxied application to its own route so a real address exists, and asserts the drawer prints the scroll axis for a saved-HTML Artifact, whose own top document records no address. `src/ui/components.test.ts` asserts the line carries the query and fragment and prints no placeholder when there is none.

## Further Notes

**The backlog is retired into this file.** `.scratch/backlog.md` is deleted; its remaining
content is recorded below, and git history keeps the original. References to it from other
records point here.

**Parked, waiting on a human.** Six items already owned by a spec, each `deferred` under
the Verification Run of `.scratch/several-targets-and-relations/` plus maintainer time:
live Harness detection on a machine carrying all four (`harness-detection/07`), live setup
verification on all four (`multi-harness-setup/06`), the screenshot-and-chat baseline
(`visual-intent-layer/01`), the core loop on a live pi session (`visual-intent-layer/16`),
the re-recorded dogfood (`review-surface/17`), and the three surface measurements
(`surface-refinement/13`). Nothing here moves them.

2026-09-18 — every one of the six is now closed, and `.scratch/` holds no `deferred` record.
`surface-refinement/13` was driven instead of parked and is `done`: its recorded blocker —
the Lever lacking `amend`, `stop`, `close-pass`, `compare`, `verify` and `decide` — was
removed by `.scratch/surface-refinement/issues/17`, so the run the ticket describes was
performed, with one box unticked and named in a `Deferred confirmation:`. The other five are
`wontfix` by maintainer decision: `harness-detection/07` and `multi-harness-setup/06` because
the maintainer intends a different approach to Harness evidence later, and
`visual-intent-layer/01`, `visual-intent-layer/16` and `review-surface/17` because none of
them is a visual verification. Two consequences are named where they belong rather than
here: closing `01` leaves the strategy's "recorded screenshot-and-chat baseline" clause
unproven, and the run that replaced `13` found a check-in visibility defect now filed as
`.scratch/check-in-visibility/issues/01` — since fixed and `done` the same day, so it is no
longer open either.

**Parked ideas with triggers.** A second reviewer or two sessions at once — a real second
session losing writing. Declared state beyond the address — a dogfood correction that
fails because the state, not the target, moved. Suggested re-points — re-pointing by hand
proving to be the friction. Our own stamp transform — relying on the third-party stamp
proving annoying (ADR-0021's own trigger). A fifth Harness — a Builder-Reviewer using one.
A multi-page saved site — dogfooding a real multi-page site makes the refusal the friction.

**Disregarded.** tldraw-class shapes and Excalidraw reachability, withdrawn 2026-09-18:
both belong to the canvas class the strategy's completion boundary does not carry.
Non-Chromium, Windows and Linux depth, withdrawn the same day: ADR-0022 already states the
capture boundary honestly and narrowly, and a second sentence restating it was not wanted.

## Comments

Landed 2026-09-18. All four tickets are `done`, with every acceptance box ticked.

**One deferred confirmation was withdrawn.** Ticket `03` first carried an unticked box under a `Deferred confirmation:`, on the argument that a saved-HTML Artifact's top document is its own base and records no address. That was true of the fixture and false about the product: a proxied application at its own route records a real address, so the box was driven and ticked the same day. The ticket keeps the withdrawn paragraph as the history of the correction.

**Verification Run.** `.visual-intent-verify/runs/2026-09-18_06-28-32-backlog-triage-repairs` ended `clean`. It drove `open-artifact` (`open-html`, `open-health`), `annotate-and-send` (`select-point`, `annotate-note`, `queue-add`, `send-next-pass`), `decision-drawer` (`drawer-leaving`) and `resolution-and-honesty` (`resolution-reload`, `resolution-adopted-revision`); `console`, `network` and the run record reported no failures. It read the drawer snapshot back with `… Selector: … · Box: 32,216 836×18 · Scroll: 0,0`, and read the Pass back as `in-flight` after a reload that brought no new revision and `ready` with the new `toRevision` after a reload that did. One path is recorded as unreachable with its precondition: the two-tab revision claim, because the Lever owns exactly one page. That path is proven by `tests/browser-loop.test.ts` instead, and the ticket says so.

**An earlier run was discarded, not hidden.** `.visual-intent-verify/runs/2026-09-18_06-13-24-backlog-triage` also ended `clean` and drove the same behaviours, but its record carries two self-inflicted `unreachable` entries from my own sequencing — a drawer opened from the More actions menu, which left the menu intercepting the later `reload` — and an `unreachable` entry that misdescribes the attention trigger. The second run replaced it so the record names one real gap rather than three. Both runs' evidence is on disk; the first was cleaned up.

**A real flake, fixed rather than papered over.** Adding three browser tests to `tests/browser-loop.test.ts` made *draws an Area that encloses content inside a same-origin frame* time out, and it passed in isolation. The cause was not the new tests: the proxied application's update channel advances the Adopted Revision about 250 ms after the document connects, and a revision change reconfigures the layer, which cancels a box drag in progress. Under the longer run the advance landed mid-drag. The test now waits for the update channel to settle before it arms the box tile, which is the real precondition. Removing the three new tests made the suite pass without that wait, which is why the fix is recorded here rather than left as an unexplained green.

**Two records were corrected rather than rewritten.** `precision.md` was truncated mid-sentence when the child's `output` path was re-used by a resume, which overwrote the file with its own tail; the full POV was reconstructed from the child's session transcript and the missing close is now in place. The feature map's `decision-drawer.md` carried a false precondition — that a queued Annotation creates the attention trigger — which the run disproved; that file and `resolution-and-honesty.md` now carry the verified preconditions and the two new recipes.
