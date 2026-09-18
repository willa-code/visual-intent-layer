# Backlog: pending ideas with no owner

Status: living record, not a spec and not a ticket.

This file holds ideas that are **neither owned by a spec nor refused by an ADR**. It
exists so the gap between "we thought of it" and "someone owns it" is written down
rather than remembered.

An idea leaves this file in one of three ways:

- a spec takes it, and the spec's `spec.md` becomes its owner;
- an ADR refuses it, and the refusal is recorded in `docs/adr/`;
- evidence promotes it, and it becomes a ticket in the spec whose scope it fits.

An idea does not leave by being mentioned in conversation. Nothing here is a promise.

For the other two categories, see the ownership map in
`.scratch/truth-and-sync/spec.md` (owned work) and `docs/adr/` plus the parked list in
`.scratch/truth-and-sync/issues/06-park-verification-with-a-named-trigger.md` (refused
and parked work). The repo's outstanding work that no spec is actively building is listed
at the end of this file under **Parked, waiting on a human**.

---

## Trust

**Redaction before send.** A Captured View or a reference image can carry a token, a
secret or someone else's data into an envelope, and the decision drawer discloses what
will leave without offering to change it.
*Not owned because:* the disclosure shipped with the Captured View and nothing has asked
for the affordance since; it was raised in planning and never taken by a spec.
*Promotes when:* a maintainer decides the affordance is owed rather than disclosed — the
only item in this file whose absence is already consequential, because pixels ship today.
*From:* the audit of 2026-09-17; `design.md` §5, `SECURITY.md:51-52`.

**A second reviewer, or two sessions at once.** Two browser sessions against one
artifact are last-write-wins, and nothing detects or reports the conflict.
*Not owned because:* one Builder-Reviewer is the stated user, and Pass A deferred it
explicitly.
*Promotes when:* a real second session loses writing, or a hosted/multi-machine path is
wanted.
*From:* `surface-refinement-pass-a/spec.md` Out of Scope.

**Non-Chromium browsers, and Windows and Linux depth.** A Captured View is
Chromium-desktop only by ADR-0022, and nothing states what a Firefox or Safari
Builder-Reviewer still gets. CI runs Linux, so the tests are proven there; the capture is
not.
*Not owned because:* ADR-0022 made the limitation honest and narrow, which was the whole
decision.
*Promotes when:* someone reviews on Firefox or Safari and the product needs a sentence,
or a platform claim needs making.
*From:* ADR-0022; `.github/workflows/ci.yml`.

## Reach

**A multi-page saved site artifact.** One reviewed document is the contract, and a
navigation off it is refused by name rather than served as a page the product cannot
point at.
*Not owned because:* `target-evidence` named it as a later feature and no spec took it.
*Promotes when:* dogfooding a real multi-page saved site makes the refusal the friction.
*From:* `.scratch/target-evidence/spec.md` Out of Scope.

**tldraw-class shapes.** tldraw's default shape wrapper carries `data-shape-id` on the
shape's own DOM element, so those apps are addressable with no cooperation from the app
— the research calls it the one cheap exception in the canvas class.
*Not owned because:* the 30-minute experiment that decides whether a real tldraw app
keeps the attribute has not been run, and no spec has taken the result.
*Promotes when:* the experiment is run and passes; then it becomes a ticket in whichever
spec owns addressability at that time, likely `reach-within-the-class`.
*From:* `.scratch/target-evidence/research.md` verdicts and next-step 4.

**An explicit rule-out for mobile, native desktop, design files and PDFs.** These are
excluded by the strategy's boundary in general terms but never named, so the exclusion
reads as an omission.
*Not owned because:* it is a sentence in a boundary, not a capability.
*Promotes when:* someone asks whether the product works on a phone, a native app or a
Figma file — then the answer should already be written.
*From:* `docs/background/product-strategy.md` completion boundary; the audit of
2026-09-17.

**A fifth harness.** pi, Codex, Claude Code and opencode are registered and detected
today; the matrix is closed at four.
*Not owned because:* no harness beyond those four has been asked for.
*Promotes when:* a Builder-Reviewer uses one.
*From:* `src/harness-registry.ts`.

## Evidence

**Declared state beyond the address.** Runtime State Evidence records the address the
artifact was showing, plus viewport and scroll. It does not record an open dialog, a
route, a filter or a form value, so a target that only made sense in one of those states
cannot say so.
*Not owned because:* the maintainer's own note was that this wants a dogfood case before
it is designed.
*Promotes when:* a dogfood correction fails because the state, not the target, is what
moved.
*From:* `.scratch/target-evidence/spec.md`; the audit of 2026-09-17.

## Resolution UX

**Suggested re-points.** When a target cannot be matched, the Builder-Reviewer re-points
it by hand. The product could propose where it thinks the target moved.
*Not owned because:* `design.md` §10 forbids a ranked candidate list and a numeric
confidence, and no unranked, honest form has been designed.
*Promotes when:* re-pointing by hand proves to be the friction in real use.
*From:* the audit of 2026-09-17; `design.md` §5, §10.

## Provenance

**Our own source-location stamp transform.** The product owns the stamp contract and
reads its own attribute plus `data-insp-path`, but ships no transform that writes one,
so `exact` needs a third-party plugin to be reachable.
*Not owned because:* ADR-0021 refused owning per-framework transforms "for now", on the
grounds that maintaining other people's compilers is not this product's job.
*Promotes when:* relying on the third-party stamp proves annoying — the trigger ADR-0021
itself names.
*From:* ADR-0021; `src/adapters/source-stamp.ts`.

---

## Cheap, and need no spec

Two of these are 30-minute experiments the research file already names as its own
next steps. Neither needs a spec, and the first decides whether tldraw becomes a ticket
or a note.

- **Does a real tldraw app keep `data-shape-id`?** Run it and record the answer here.
- **Is any Excalidraw global reachable from outside the app?** The research found the
  object model behind an in-app React prop; confirm nothing else exposes it.
- **Write the rule-out sentences** for mobile, native desktop, design files and PDFs,
  once someone decides where they belong.

---

## Parked, waiting on a human

Not ideas with no owner: each of these already has an owner spec and a `Trigger:` line.
They are listed here because they are the whole of what the product still owes and is not
building, and because a maintainer about to dogfood should know what dogfooding closes.

All six are `deferred` under the same trigger — the Verification Run of
`.scratch/several-targets-and-relations/`, plus maintainer time for the parts only a human
can do. That run happened twice on 2026-09-17 and was `clean`; the maintainer half has not
happened, so each is still owed and correctly parked rather than stale. The decision that
parked them is `.scratch/truth-and-sync/issues/06-park-verification-with-a-named-trigger.md`.

- **Live detection on a machine carrying all four Harnesses.** pi, Codex, Claude Code and
  opencode each detected, an outdated entry reported and repaired, at least one Harness
  configured under a non-default configuration home, and the `npx` transport used on a
  machine with no global install.
  *Waiting on:* a human at that machine. *From:* `.scratch/harness-detection/issues/07`.
- **Live setup verification on all four Harnesses.** Each Harness lists the server after
  project and global setup. Codex-global and opencode were evidenced automatically on
  2026-09-15; the interactive confirmations were not.
  *Waiting on:* a human with the Harness applications installed. *From:*
  `.scratch/multi-harness-setup/issues/06`.
- **The screenshot-and-chat baseline.** Three real corrections performed the old way, with
  honest numbers, before product enthusiasm can bias them. The recording template is
  already written beside it.
  *Waiting on:* the builder doing work they care about. *From:*
  `.scratch/visual-intent-layer/issues/01`.
- **The core loop validated on a live pi session.** The installable plugin runs the loop
  end to end through pi-mcp-adapter; browser fallback and restart recovery are already
  evidenced, so only the live session is owed.
  *Waiting on:* a real pi session. *From:* `.scratch/visual-intent-layer/issues/16`.
- **Dogfood re-recorded against the baseline.** Real corrections measured against the
  baseline, voluntary repeat use observed, and the old dogfood record marked as discarded.
  The Intent-Preview verdicts this used to ask for are gone with the `preview` object,
  which left the wire at `schema/envelope-v0.2.schema.json`.
  *Waiting on:* the builder. *From:* `.scratch/review-surface/issues/17`.
- **The three measurements only a running surface settles.** Rail legibility at its fixed
  width reported rather than asserted, every semantic surface/ink pair checked in both
  themes on its own surface, and drag-versus-text-selection behaviour exercised against an
  artifact with its own drag interactions. The parked whole-loop run that owned them is
  superseded by per-iteration Verification Runs, but these three are not owned anywhere
  else.
  *Waiting on:* a Verification Run that measures rather than asserts. *From:*
  `.scratch/surface-refinement/issues/13`.

One item of the outstanding work is **agent** work rather than human work, and is
`ready-for-agent` rather than parked: **`.scratch/verification-skill/issues/05`**. The Lever
drives four of the six relation families — alignment, equal spacing, ordering and
containment — and drives neither equivalence (`shared-property`) nor comparative size
(`same-width` / `same-height`). The browser loop covers all six, so the capability is
evidenced; the instrument is what is short. It shares that gap with
`.scratch/reach-within-the-class/issues/08`, which extends the same Lever.
