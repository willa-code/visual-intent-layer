# Visual Intent Layer verification map

This directory is the maintained source for verifying the user-facing behaviour of the Visual Intent Layer. Read this index before driving, then open the one feature file that matches the change.

The **Lever** is the skill's only executable. It launches the real built product, drives the Review Surface the way a Builder-Reviewer would, reads back what the product stored, captures evidence, and cleans up.

```sh
node .agents/skills/verify-visual-intent-layer/bin/lever.mjs <command> [flags]
```

## Baseline preconditions

- The repository is built. The Lever rebuilds before launch, so a stale `dist/` is corrected rather than trusted.
- A saved-HTML Artifact exists. The repository fixture is `fixtures/gallery.html`. It references `thumb-1.png`, `thumb-2.png` and `thumb-3.png`, which the repository does not ship, so `console` reports three 404s per load that are the fixture's own and not the product's; `network` reports no failed requests.
- Each run uses its own disposable lifecycle data directory under `.visual-intent-verify/runs/<run>/data` and an operating-system-chosen ephemeral port. The default port and the Builder-Reviewer's own lifecycle directory are never used.
- Exactly one browser exists per run; the product's automatic browser launch is suppressed.
- Run `health` before the first drive and again whenever anything looks surprising.
- Never drive an instance the run did not start. The Lever refuses on its own.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Treat every command literally. Keep quoted selectors and flags unchanged.
- The review page holds `/`, the artifact lives in `iframe.artifact-frame`. Pass `--frame artifact` for anything inside the artifact.
- The Lever keeps one browser alive across commands, so a select and the annotate that follows it share the same page.
- A command is one user act. If a recipe needs several acts, run several commands.
- Prefer the product's own visible handles (accessible names, class names in the fixture) over coordinates.
- Wait for the observable end state with `wait`, never with a fixed sleep in a recipe.
- Restore mutated fixtures after a mutation. Never remove evidence.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes a screenshot of the named state and, where structure matters, an accessibility snapshot.
- Every state-changing drive reads the stored state back with `state`; a screenshot alone is not proof a side effect happened.
- Record the feature id and entry point with every artifact.
- Report an unreachable path with the exact command attempted and the unmet precondition. `select` on a missing target exits `4` and records the path in the run record.
- Do not report a skipped entry point as verified through a different path.
- A driven approval is Mechanical Verification, never Verified Intent. The Lever proves the verdict path works; it does not complete an Annotation.

## Sweep order

A full sweep walks the tiers in order. Within a tier, follow the file order below.

1. Open an Artifact and render it faithfully (`open-artifact`).
2. Compose, queue and send an Annotation (`annotate-and-send`).
3. Relational Intent by direct manipulation (`relational-intent`).
4. Resolution and honest outcomes (`resolution-and-honesty`).
5. Verify each Annotation (`verify-each-annotation`).
6. Never discard writing (`never-discard-writing`).
7. Second tier: attachments, decision drawer, agent position, session and overflow, a proxied application, accessibility and keyboard.
8. Third tier: the MCP agent loop, Check-In.
9. Cross-surface journeys (`journeys`).

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short stable ids with one line each.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with the Lever` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and an observable result.
4. `Gotchas` lists traps that can waste or invalidate a run.

Keep implementation detail out of the map. Name user paths, stable handles, required state, commands and observable proof only. A file whose behaviours have not been driven live yet carries a `Not yet driven.` marker near the top; once a live drive confirms some of them, the marker becomes `Partly driven live` and names which; remove the marker only when the whole file has been driven.

## Features

First tier (driven live in the surface-refinement Verification Run; see each file for its coverage):

- [Open an Artifact](./open-artifact.md) covers launching a saved-HTML Artifact, health-checking the instance, rendering it faithfully, and capturing the resulting state.
- [Compose, queue and send an Annotation](./annotate-and-send.md) covers pointing at a target, writing a note, reordering, the one send action (with amend and stop as separate acts), and the drag threshold against an artifact that handles its own drags.
- [Resolution and honest outcomes](./resolution-and-honesty.md) covers re-resolving a target after the Artifact moves on, including ambiguity and deletion.
- [Reach within the class](./reach-within-the-class.md) covers pointing inside open shadow roots and same-origin frames, drawing an Area across them, the stated refusals, and the walk bound.
- [Verify each Annotation](./verify-each-annotation.md) covers the per-Annotation verdicts and the per-row before/after comparison.
- [Never discard writing](./never-discard-writing.md) covers a draft surviving a reload, a service restart and a browser restart.

Partly driven live (some sub-features confirmed; the rest are mapped):

- [Material and theme](./material-and-theme.md) — the rail/stage/artifact material, canvas versus surface, the two tile glyph forms and the light/dark theme choice were driven; the auto theme and the reload-persistence recipe are mapped.
- [The decision drawer](./decision-drawer.md) — the attention drawer, its leaving list including the Runtime State Evidence it names, and the closed-rows toggle were driven; the origin gate is mapped.
- [Agent position](./agent-position.md) — the stop request and Check-In channel were driven; the other positions are mapped.
- [Check-In](./check-in.md) — the call, contact, amendment and interruption were driven; the never-checked-in state is mapped.
- [Accessibility and keyboard](./accessibility-and-keyboard.md) — rail legibility, island pointer events, tile minimum size and `V` were driven; the remaining keys are mapped.

Second tier (mapped, not yet driven):

- [Attachments](./attachments.md)
- [A Captured View](./captured-view.md)
- [Session and overflow actions](./session-and-overflow.md)
- [A proxied application](./proxied-application.md)

Third tier (mapped, not yet driven):

- [The MCP agent loop](./mcp-agent-loop.md)

Driven:

- [Relational Intent by direct manipulation](./relational-intent.md) — a set is built with `Shift` and a drag on a selected target records one relation; the drive is `relate`.

Cross-surface:

- [Cross-surface journeys](./journeys.md) covers behaviour that spans several areas; it is the last file of a full sweep.