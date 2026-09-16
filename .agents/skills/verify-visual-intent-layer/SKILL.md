---
name: verify-visual-intent-layer
description: "Drive the real Visual Intent Layer Review Surface and prove behaviour with a recording, screenshots and stored-state read-backs. Use when verifying a change to the Visual Intent Layer end to end, dogfooding a build, or producing a Verification Run."
---

# Verify the Visual Intent Layer

Use this skill to drive the shipped product the way a Builder-Reviewer does and to capture proof that the mechanism behaved as specified. The **Lever** is the only executable: it launches the real built product, keeps one browser alive, feeds it one command per user act, reads back what the product stored, and cleans up.

Run everything from the repository root:

```sh
LEVER="node .agents/skills/verify-visual-intent-layer/bin/lever.mjs"
```

## What a green run is and is not

A run produces **Mechanical Verification**: evidence that the mechanism behaved as specified. It is never **Verified Intent**. Driving an approval proves the verdict path works; it does not complete an Annotation, and it is not a judgement that the direction was good. Only a Builder-Reviewer, reviewing a resulting revision by hand, completes an Annotation. Never report a green run as an approval.

## Proof standard

- Drive the real user path through the Review Surface, not a test-only doorway or a state setter behind it.
- Start from a healthy instance. Run `health` before the first drive and again whenever anything looks surprising.
- Capture the action and the resulting state, not only the final screen.
- Verify the side effect as well as the pixels: read the stored state back with `state` after every state-changing drive.
- Report an unreachable path with the exact command attempted and the unmet precondition rather than counting it as covered through a different route.

## Launch

Launch rebuilds the product first, so the instance reflects the working tree. Each run gets its own directory under `.visual-intent-verify/runs/`, its own lifecycle data directory, and an operating-system-chosen ephemeral port. The product's own browser launch is suppressed; the Lever owns the only browser.

```sh
$LEVER launch --html fixtures/gallery.html --name open-artifact     # saved-HTML Artifact
$LEVER launch --app http://localhost:5173 --name running-app       # running local application
$LEVER launch --html path/to/page.html --headed                     # watch it happen
$LEVER launch --html path/to/page.html --dry-run                    # report the plan, change nothing
```

The output is one machine-readable launch record naming `baseUrl`, `reviewUrl`, `sessionId`, `artifact.revision`, `productPid`, `hostPid` and `dataDir`. The per-session capability appears only inside `reviewUrl`; keep it out of committed evidence.

## Health

Run this read-only check first. It reports whether the instance is alive, is owned by this run, reflects the working tree, and still authorises the session.

```sh
$LEVER health
```

A run whose source is newer than `dist`, or whose revision moved since launch, is reported `stale`. A stale instance is refused by every drive command: relaunch instead of driving it, so a stale bundle never produces a false failure.

## Drive

One command per user act. The Review Surface page holds `/`; the artifact lives in `iframe.artifact-frame`, so pass `--frame artifact` for anything inside the artifact. Commands accept `--run <name>` and default to the newest run.

Open and read:

```sh
$LEVER session                       # session identity and artifact
$LEVER state                         # every stored Annotation, its state, targets, resolutions and verdict
$LEVER screenshot --name opened      # a named state
$LEVER snapshot --name opened        # the accessibility structure
$LEVER record --name drag            # the run recording plus a screenshot of the result
$LEVER trace                         # a Playwright trace
$LEVER console                       # console entries and page errors
$LEVER network                       # failed and 4xx/5xx requests
$LEVER wait --target ".annotation-row" --frame artifact
```

One rail, two tiles:

```sh
$LEVER select --tool point --target ".checkout-submit"
$LEVER select --tool point --text ".gallery-note"                     # drag across exact words
$LEVER select --tool point --target ".gallery-note" --add              # a second target
$LEVER select --tool box --from ".gallery" --to ".checkout-submit"    # a drawn Area
$LEVER select --tool operate                                          # return to operating the artifact
$LEVER mode --to point|box|operate
$LEVER annotate --note "Make the Place order button impossible to miss."
$LEVER queue
$LEVER send --intent next-pass                                        # the one send action: Next-Pass Intent
$LEVER amend --note "Clearer wording." --match "Make the Place order"  # supersedes, Steering Intent
$LEVER stop                                                           # asks the agent to stop; Review Interruption
$LEVER attach --file /tmp/reference.png
$LEVER reload                                                         # adopt the changed Artifact revision
$LEVER review                                                         # return to operating the artifact
```

Judging a result where it sits:

```sh
$LEVER verify
$LEVER compare --mode before --row 0
$LEVER choose --node <nodeId> --target <targetId>
$LEVER decide --verdict approve --row 0                               # reject, another-pass, obsolete
$LEVER closed-rows                                                     # one toggle for verified, superseded and obsolete rows
```

Keyboard and surface navigation:

```sh
$LEVER press --key p                      # p, b and v arm and disarm the two tiles
$LEVER attention                          # open the "Needs you" drawer
$LEVER overflow --item "Copy artifact path"
$LEVER measure                            # rail width, head overflow, tile size, island pointer events
$LEVER unreachable --command "…" --precondition "…"   # record a path you could not reach, honestly
```

`measure` writes a measurement under `evidence/` and fails when the rail head
overflows its fixed width, a tile falls below the 24px floor, or the island does
not receive the pointer over the live iframe. `unreachable` records a gap with
its exact command and unmet precondition and exits `4`, so a sweep never has to
claim a path it did not reach.

`mcp --run <name>` shares the run's lifecycle data directory, so a batch the browser drive delivered is visible to the MCP loop. `amend` and `stop` deliver **Steering Intent** and **Review Interruption** through the same named delivery path; `check_in` is how an agent reads them without holding a call. Acknowledgement is not implementation and not verification.

Restart without losing the run:

```sh
$LEVER reload-surface        # reload the Review Surface page
$LEVER restart-service       # restart the built product on a new ephemeral port, same data directory
$LEVER restart-browser       # restart the browser, same run and evidence
```

Secondary product surfaces:

```sh
$LEVER setup --status --harness pi        # the built product's setup and Harness Detection under a sandboxed home
$LEVER mcp --run <name> --tool open_visual_review --args '{"kind":"saved-html","path":"fixtures/gallery.html","waitMs":1}'
$LEVER mcp --run <name> --tool get_intent_status --args '{"envelopeId":"<id from state>"}'
$LEVER mcp --run <name> --tool acknowledge_intent --args '{"envelopeId":"<id>","agentId":"lever"}'
```

Every command that can change or destroy state accepts `--dry-run` and performs no side effect. Errors are machine-readable on the same channel as success and name the next action. Exit codes: `0` success, `2` usage error, `3` unmet precondition, `4` unreachable path.

## Evidence

Every run writes to `.visual-intent-verify/runs/<stamp>-<name>/`:

- `evidence/` — screenshots, ARIA snapshots, the recording (`recording.webm`), and the trace.
- `state.json` — the operational run state, including coverage and unreachable paths.
- `run.json` — the run record: outcome, coverage, environment, launch, evidence index, unreachable paths.
- `report.md` — the same record for a human.
- `.visual-intent-verify/latest` — a stable pointer to the newest run.

The run record's outcome vocabulary is `clean`, `changed`, `blocked` or `aborted`. State the coverage line honestly: which mapped features and sub-features were driven, and which were not. The per-session capability never appears in evidence or the run record.

## Cleanup

```sh
$LEVER cleanup --dry-run    # report the plan
$LEVER cleanup              # remove the instance, the data directory, the browser session and the run lock
```

Cleanup terminates only the process identities the run recorded, never by name. It never removes evidence, and it re-reads the evidence at its declared location to prove the teardown did not consume it. Run it after every attempt, including failed ones, so a broken attempt does not strand a process or a port. Never point the run at the Builder-Reviewer's own lifecycle directory.

## Demonstrating a flow and turning it into a recipe

When a flow is easier to show than to describe, drive it by hand and let the recording become the recipe:

1. `$LEVER launch --html <path> --headed`.
2. Perform the flow in the browser yourself. The host records it.
3. `$LEVER record --name <flow>` to mark the resulting state and keep the recording.
4. `$LEVER state` to read back the side effect your demonstration produced.
5. Replay the same steps as Lever commands from a fresh run until they reproduce the demonstration without a human hand. The sequence of commands is the recipe; the recording is its proof.
6. Write the recipe into the matching feature file under `references/features/`, pairing each user action with the exact command and its observable result.

## The feature map

`references/features/README.md` is the index and the sweep order. Each feature file has exactly four sections — `Sub-features`, `How to get to it (user POV)`, `Driving it with the Lever`, `Gotchas`. A file whose behaviours have not been driven live yet carries a `Not yet driven.` marker. Read the index before driving, then the one file that matches the change.

## When not to use this

Keep reviewing in prose when a change is not user-facing, when the flow needs a human at the keyboard (installing into a live pi session), or when the question is a judgement rather than a mechanism. Adopting this harness does not force it onto every change.