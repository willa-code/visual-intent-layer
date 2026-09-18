# Truth and sync: the record matches the build

Status: done

Corrects every status under `.scratch/`, writes the status and deferral rule into
`docs/agents/issue-tracker.md` with a script that enforces it, reconciles `README.md`
and the verification skill with the shipped surface, and gives the machine a real end
session because the surface already offers that control. It parks seven verification
tickets and two templates with a named trigger instead of leaving them `awaiting-human`,
and records the three aborted `target-evidence` Verification Runs so no document implies
that iteration is verified.

No domain term changes. `CONTEXT.md` gains nothing and `docs/adr/` gains nothing.
`design.md` is not amended: every promise this iteration cannot make true is filed into
the spec that owns it, and the ownership map is in Further Notes.

## Problem Statement

The product's own rule is that it never claims more than it can prove, and the record
of the work now breaks that rule in six ways.

**Every spec still says it is open.** Seven of the eight `spec.md` files carry
`Status: ready-for-agent` although the iterations they describe shipped:
`target-evidence`, `surface-refinement-pass-a`, `surface-refinement`, `review-surface`,
`verification-skill`, `harness-detection`, `multi-harness-setup`. Only
`visual-intent-layer/spec.md` records anything, and what it records is
`superseded in part by .scratch/review-surface/spec.md`, which is now two iterations
stale.

**Nineteen tickets describe an iteration that finished two iterations ago.**
`.scratch/surface-refinement/issues/01`–`17`, `19` and `20` are all `ready-for-agent`
with every box unticked, while the behaviour they describe shipped in `14a73a1` and
`surface-refinement-pass-a` then re-cut part of it. Any pass that scans for open work
reads them as a backlog; the planning that produced this spec did exactly that.

**Three tickets are `done` with an acceptance box unticked.**
`target-evidence/10` (a Verification Run proves the capture control),
`verification-skill/05` (every relation kind expressible) and `verification-skill/06`
(an ambiguous resolution is never chosen automatically; a blocked verdict states its
reason) each say `done` while a box they declare necessary is empty.
`docs/agents/issue-tracker.md` defines `done` as every acceptance checkbox ticked.

**Three capabilities the record calls shipped are unreachable.**
Multi-target composition shipped and then disappeared: `0f2a16f` carried
`selectElement(element, event.shiftKey)` with
`targets = additive ? [...targets.filter((entry) => entry.element !== element), target] : [target]`,
and `14a73a1` replaced every selection path with a one-element assignment
(`src/ui/artifact/layer.ts:207,237,340`) without an amendment recording it. Yet
`review-surface/08` and `visual-intent-layer/06` are `done` with "Several targets can be
selected into one Annotation" ticked. Relational Intent was deferred by `design.md` §11
amendment 4, and `verification-skill/05` still carries it as a done drive. An Intent
Preview existed only in `schema/envelope-v0.1.schema.json:110` and is absent from the
`0.2` and `0.3` schemas and from `src/ui`, while `visual-intent-layer/10` is `done` and
`dogfood.md` still asks for preview verdicts.

**Two documents describe a surface the build cannot produce.** `README.md:8` and
`README.md:121` say several targets can be gathered into one Annotation, and the
verification skill's Lever offers `select --add`
(`.agents/skills/verify-visual-intent-layer/bin/lever.mjs:57`) by injecting a Shift
modifier (`:919`) and records `select-multiple` coverage (`:932`) — a modifier the
artifact layer never reads. The relational-intent feature file is honest
("Not yet driven, and deferred"); these two are not.

**Parked work is not recorded as parked, and an aborted run reads as a finished one.**
`.scratch/visual-intent-layer/baseline.md` and `.scratch/visual-intent-layer/dogfood.md`
say `awaiting-human` with no trigger, and seven tickets
(`visual-intent-layer/01,16,17`, `review-surface/17`, `multi-harness-setup/06`,
`harness-detection/07`, `surface-refinement/13`) sit `ready-for-human` or
`ready-for-agent` with no statement that verification is parked. `target-evidence`'s
three Verification Runs are `aborted`/`stopped`
(`.visual-intent-verify/runs/2026-09-17_14-35-05-target-evidence`,
`…_14-36-31-proxied-app`, `…_14-36-52-proxied-app-2`) and nothing in the spec or in a
ticket says so.

**One control makes a claim it does not implement.** `design.md` §5 puts "end session"
in the overflow menu, and `src/ui/app.ts:1524` shows a notice and calls `window.close()`.
The server session and its capability stay valid — `src/service/sessions.ts` has no way
to end a record and every route authorizes through `authorizedOrRefuse` — so a stored
review URL still authorizes after the session was "ended".

## Solution

**Write the rule down, then enforce it.** `docs/agents/issue-tracker.md` gains the
status vocabulary and the deferral rule, and `scripts/check-records.js` fails CI when a
file's status is unknown, when a `done` issue has an unticked box and no
`Deferred confirmation:` comment, or when a `deferred` file names no trigger.

**Correct every status to its boxes, and every box to its evidence.** Specs become
`done` or `superseded in part`. The nineteen `surface-refinement` tickets resolve by
inspecting the shipped surface, ticket by ticket: shipped → `done`, replaced by Pass A
→ `superseded`, and `18` stays `needs-triage`. No ticket's text or acceptance boxes are
rewritten; corrections append under `## Comments`, because the record is history.

**Mark what regressed instead of leaving it ticked.** `review-surface/08` and
`visual-intent-layer/06` keep `done` and gain a Comment naming `14a73a1` and pointing at
the spec that will restore multi-target. `verification-skill/05` becomes `deferred`
with that same spec as its trigger. `visual-intent-layer/10` gains a Comment recording
that the preview field left the wire in `0.2` and that the capability folded into the
relation gesture.

**Park verification with a name and a date.** The seven tickets and the two templates
become `deferred`, each naming the Verification Run of the first feature spec after this
one (`.scratch/several-targets-and-relations/`) and maintainer time as the trigger, per
the maintenance skill and consistent with ADR-0017. This iteration runs no
Verification Run: it changes records and one control, and its own proof is
`scripts/check-records.js`.

**Say plainly that `target-evidence` is unverified.** The spec records that no completed
run exists, and ticket 10's box is either driven or declared in a
`Deferred confirmation:`. The three aborted records stay exactly as they are.

**Reconcile the two documents with the surface.** `README.md` and the Lever describe
what ships today — one target per selection, until the relations spec restores the set.
The `--add` flag is removed rather than silently ignored, and its `select-multiple`
coverage claim with it.

**Make "End session" true.** A session can be ended server-side, the capability stops
authorizing, and the overflow action calls it before closing. If the server-side end is
judged too large for this iteration, the alternative is to rename the control to what it
does and record the deferral — the one outcome this iteration forbids is leaving a false
label in place.

## Implementation Decisions

**`done` means every box ticked, or the gap named.** A `Deferred confirmation:` comment
naming each unticked box and why it cannot be driven is the second acceptable form,
because `review-surface/08`, `review-surface/14` and `verification-skill/05` already use
it. What is not acceptable is `done` with a silent gap, which is the defect this
iteration exists to remove. The rule lives where a maintainer reads it, not only inside
the check script.

**Corrections are appended, never rewritten.** `docs/agents/issue-tracker.md` already
treats an issue as history, and the maintenance skill already says a changed behaviour
marks the old record superseded or corrected rather than rewritten. The sync follows
that rule for every file it touches, including its own.

**The status vocabulary is closed.** `needs-triage`, `ready-for-agent`,
`ready-for-human`, `deferred`, `done`, `superseded`, `superseded in part`, `wontfix`.
`superseded in part` is already in use by `visual-intent-layer/spec.md` and is kept
because it is exactly the state `review-surface` is in. `deferred` already appears as
prose in several tickets; naming it as a status is what lets the check require a named
trigger.

**A spec's status describes the iteration, not its last commit.** `surface-refinement`
is `done` even though nineteen of its tickets needed resolving, because the behaviour it
delivered shipped. `review-surface` is `superseded in part` because both
`surface-refinement` and `surface-refinement-pass-a` amended it.

**The check reads records, not prose.** It asserts status lines, acceptance boxes and
deferral triggers. It does not try to detect a document whose sentence is false: that is
what a maintainer and a review are for, and a check that guessed would manufacture the
confident falsehood the product refuses.

**`README.md` describes the shipped surface; the relations spec restores the sentence.**
The model keeps "one or more targets" in `CONTEXT.md` and in the envelope, because that
remains true of the Annotation and the schema. README and the Lever state what a
Builder-Reviewer can do today.

**The end session is a revocation, not a notice.** `SessionRecords` gains the ability to
end a record; because the routes already authorize through `authorizedOrRefuse`, ending
the record is what makes every later request 401. The shell calls it before closing, and
the feature map and the overflow label are reworded to what happens.

## Testing Decisions

Most of this iteration is prose, and the seam that catches its recurrence is a script
rather than a browser.

**`scripts/check-records.js` — the record's own gate.** Asserted against the real
`.scratch/` tree: an unknown status fails, a `done` issue with an unticked box and no
`Deferred confirmation:` fails, a `deferred` file with no named trigger fails, and the
corrected tree passes. A fixture directory proves each failure mode without depending on
the live tree staying wrong. Prior art is `scripts/check-bins.js`, which already fails
on a disagreement between two records.

**`src/service/http.test.ts` — the end session.** After a session is ended, a request
carrying its valid capability receives 401, and a request to a session that was never
ended still succeeds. Prior art is the existing authorization cases in the same file.

**`tests/browser-loop.test.ts` — the action a Builder-Reviewer takes.** The overflow
action ends the session, the surface states what happened, and reopening the stored
review URL is refused rather than silently authorizing. Prior art is the existing
session-and-overflow drive in the same file.

**No test asserts a document.** The corrected specs, tickets, README and feature map are
reviewed by reading them against the shipped surface. A test that pattern-matched their
prose would fail on every honest rewording.

## Out of Scope

- **Restoring multi-target composition and Relational Intent.** Owned by
  `.scratch/several-targets-and-relations/`. This iteration only stops the record
  claiming they ship.
- **Declared Missing, Another Pass, the `unreachable` frame, pass-outcome marks,
  anchor-level comparison, reopen, undo and reassign.** Owned by
  `.scratch/closing-the-loop/`.
- **Open shadow roots, same-origin frames and virtualized rows.** Owned by
  `.scratch/reach-within-the-class/`.
- **The screenshot-and-chat baseline, the dogfood log, token efficiency and the five
  Builder-Reviewers.** Parked by maintainer decision; this iteration records the parking
  rather than performing it.
- **Running a Verification Run for any iteration.** Parked until the next spec.
- **Redaction, a second reviewer, concurrency, Windows and Linux depth, host-embedded
  UI, subscriptions, and every coverage item.** Triggered later or refused by an ADR.
- **Rewriting `docs/background/product-strategy.md`.** It is history. Its section banner
  already corrects the steering half, and the preview half is corrected by the relations
  spec that decides what a preview is.
- **Rewriting the aborted run directories or any historical evidence.** They are the
  record.

## Further Notes

**Where this came from.** A maintenance pass over the repository against its own
records, in the conversation that produced this spec. Every claim above cites a file, a
line or a commit so the tickets do not inherit an assumption, and the one claim that is
an inference — that `surface-refinement`'s nineteen tickets need judging rather than
bulk-closing — is left to ticket 04 to settle by inspection.

**The ownership map.** Each promise with no build path, and the spec that owns it:

| Promise | Source | Owner |
| --- | --- | --- |
| Relational Intent and the multi-target set it needs | `design.md` §11 amendment 4; ADR-0016; `surface-refinement/18` | `several-targets-and-relations` |
| Declared Missing | `design.md:231,386,414` | `closing-the-loop` |
| Another Pass | `CONTEXT.md` | `closing-the-loop` |
| `ArtifactFrame.unreachable` | `design.md` §6 | `closing-the-loop` |
| Pass-outcome marks on the artifact | `design.md` §5 diagram, §6 `OverlayMark` | `closing-the-loop` (build them, or amend the contract) |
| Anchor-level comparison, reopen, undo, reassign | `surface-refinement-pass-a/spec.md` Out of Scope | `closing-the-loop` |
| Shadow roots, same-origin frames, virtualized rows | `target-evidence/research.md` verdicts | `reach-within-the-class` |

**Ideas with no owner.** The items that are neither owned above nor refused by an ADR —
redaction, a second reviewer, non-Chromium honesty, a multi-page site artifact,
tldraw-class shapes, declared state beyond the address, suggested re-points, our own
stamp transform, a fifth harness — are collected in `.scratch/backlog.md`, so the gap is
recorded rather than remembered.

**Sequencing.** The rule and the check first, so every later correction is verified by
the same gate. Then the status corrections, then the cross-file corrections, then the
two behaviours. A maintainer reading this iteration's diff should see the record change
and one control become true.

**What the next Verification Run must prove.** That the overflow action ends a session
and the stored URL is refused afterwards. Everything else in this iteration is verified
by `check-records.js` and by reading the corrected records against the shipped surface.

## Comments

Landed 2026-09-17: `Status: done`. Every correction in this iteration is in the tree and `scripts/check-records.js` passes, which is this iteration's own proof. No Verification Run was performed.

The nineteen `surface-refinement` tickets keep their criteria text and argument. Shipped acceptance boxes were corrected to `[x]` against the shipped surface — what `## Solution` calls "every box to its evidence" — and every remaining gap is named in a `Deferred confirmation:` where it could not be driven. `06` is `superseded` by `.scratch/surface-refinement-pass-a/spec.md` and its boxes are left unticked, because the shape it describes is no longer the shipped one.

2026-09-18 — the sentence above places the ideas with no owner in `.scratch/backlog.md`. That file is retired; its remaining content, the parked list, every trigger and the withdrawn ideas now live in `.scratch/backlog-triage/spec.md` under **Further Notes**. The reference is left as written.
