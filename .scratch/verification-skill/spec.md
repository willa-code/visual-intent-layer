# Verification skill: the Lever, the feature map, and mechanical proof

Status: done

## Problem Statement

A coding agent working in this repository can only verify its own work through seams that were built for the test suite rather than for the product. The primary browser seam constructs the review service in-process, so the shipped entry point — the command a Builder-Reviewer actually runs — is exercised by nothing. `npm test` never spawns it; CI only asks it for `--help`. An agent that wants to know whether a feature it just built works therefore has three bad options: write a throwaway browser script from scratch (slow, token-expensive, different every time, and its own bugs are invisible on the next run), read the source and reason about it, or hand the Builder-Reviewer a change and ask to be believed.

The Builder-Reviewer's side of the same problem is that proof arrives as prose. "The loop works" is an assertion; there is no screenshot of the action, no recording of the resulting state, no read-back of what the product actually stored, and no statement of which user paths were tried. Reviewing an agent's work means reconstructing what it claims to have seen.

Nothing in the repository knows which user-facing behaviours exist. The surfaces, states and entry points live in the README, the design contract, the CLI help text and the source, and every agent re-derives them by reading. As the product grows, the cost of that re-derivation grows with it, and the set of behaviours that no one has driven since the last refactor grows silently alongside.

The maintainer's side is that release confidence rests on a human dogfood pass whose coverage is neither recorded nor repeatable. A dogfood verdict answers "did this feel right", not "which mapped behaviours were exercised, and which were skipped for a stated reason".

## Solution

Every serious product needs a scripted way to drive the real app and prove behaviour. This builds that for the Visual Intent Layer as a **verification skill**: a project-local skill that launches the shipped product, exercises a mapped behaviour the way a Builder-Reviewer would, and captures evidence an agent and a human can both inspect.

The skill is three things and nothing more.

**The Lever** — a small command-line utility that owns the parts of driving this product that are messy: isolating an instance, launching the real service, minting a session and its review URL, operating the Review Surface in Review and in Verify, reading back what the product stored, capturing evidence, and cleaning up. An agent runs one command per user act instead of writing a script per task. It is a deep module: a small composable surface that hides launch, isolation, the Review Surface's internal DOM and frame protocol, the loopback API, and the MCP handshake.

**The feature map** — a behaviour-level inventory of what a user can do, one file per feature area, each answering the same four questions: what exists, how a user reaches it, how to drive it with the Lever, and what usually lies in wait. It is the repository's maintained verification source and an agent's compact memory of the product.

**The proof bar** — a stated standard for what counts as evidence. Drive the real user path; start from a healthy instance; capture the action and the resulting state, not just the final screen; verify the side effect as well as the pixels; report an unreachable path with the command attempted and the precondition that was not met rather than counting it as covered through a different route.

A **Verification Run** produces evidence under a named, gitignored location: a recording, screenshots, accessibility snapshots, product-state read-backs, and a run record that states the outcome honestly, including the coverage line of features driven against features mapped. Evidence survives cleanup.

**Mechanical Verification** is what a Verification Run establishes: evidence that the mechanism behaved as specified. It is never **Verified Intent**. A run that drives an approval proves the verdict path works; it does not make an intention verified, because only a Builder-Reviewer completes an Annotation. The skill states this boundary in its own body so that a green run is never read as a judgement.

## User Stories

### The coding agent driving the product

1. As a coding agent working in this repository, I want a single command that launches the real product with a disposable data directory and an ephemeral port, so that I can exercise a change without reasoning about isolation or colliding with the Builder-Reviewer's own state.
2. As a coding agent, I want the launched session's review URL and identity handed back to me in machine-readable form, so that I can drive the Review Surface without reconstructing the URL from stdout.
3. As a coding agent, I want a read-only health check that reports whether the instance is alive, is mine, runs the expected build, and answers with the capability I hold, so that I can tell a genuine failure from a stale bundle or a foreign process before I blame the change.
4. As a coding agent, I want the health check to run first whenever anything looks surprising, so that I do not spend a run diagnosing an instance that was never worth driving.
5. As a coding agent, I want to open a saved-HTML Artifact and a running application by the same two entry points the product offers, so that my verification matches a real user's path rather than a test-only one.
6. As a coding agent, I want to select a target in Review the way a Builder-Reviewer does — element, text, region, or several targets at once — so that my drive goes through the product's own targeting rather than setting state behind it.
7. As a coding agent, I want to compose an Annotation by writing a note onto a selected target, so that the Annotation I create is the product's own durable object.
8. As a coding agent, I want to express Relational Intent by manipulating targets rather than by prose, so that a relation is driven the way a user expresses it and I do not have to synthesise one.
9. As a coding agent, I want to attach a reference image by the supported path, so that the attachment path is exercised rather than assumed.
10. As a coding agent, I want to queue and send the Annotation Queue, choosing the delivery timing, so that I can verify each delivery intent the product supports.
11. As a coding agent, I want to enter Verify and decide individual Annotations — approve, reject with another pass, supersede, mark obsolete — so that every verdict path can be exercised.
12. As a coding agent, I want to choose among an ambiguous Target Resolution's candidates, so that I can drive the decision the product deliberately refuses to make for itself.
13. As a coding agent, I want to toggle before and after in place, so that the comparison the Builder-Reviewer performs is the one I drive.
14. As a coding agent, I want to read back what the product actually stored — Annotations, their states, resolutions and verdicts — as structured data, so that I can verify side effects instead of only the visible result.
15. As a coding agent, I want to wait for an observable end state rather than a fixed sleep, so that a run is not flaky because the product is asynchronous.
16. As a coding agent, I want to capture a screenshot of a named state, so that my evidence shows what was on screen at the moment it mattered.
17. As a coding agent, I want to capture a recording of the action and the resulting state together, so that a reviewer can see the trigger and the outcome in one artifact.
18. As a coding agent, I want to capture an accessibility snapshot and a performance trace without leaving the tool, so that the surface's structure and its cost are both observable.
19. As a coding agent, I want the secondary surfaces — the setup and detection commands, and the MCP entry tools — reachable through the same tool, so that one harness covers the product's agent-facing path too.
20. As a coding agent, I want the tool's own subcommands to be discoverable from its help text, so that I do not have to read its source to learn its surface.
21. As a coding agent, I want every command to return machine-readable output, so that I can assert on results without parsing prose.
22. As a coding agent, I want an error to name the next action instead of stating a failure, so that a failed command tells me how to recover.
23. As a coding agent, I want exit codes that distinguish usage error, unmet precondition, and unreachable path, so that I can branch on the class of failure.
24. As a coding agent, I want a dry-run on every command with a side effect, so that I can confirm what a command would do before it does it.
25. As a coding agent, I want the tool to clean up only the instance it started, so that a run never kills the Builder-Reviewer's own service.
26. As a coding agent, I want the tool to refuse to drive an instance it did not start, so that a shared or stale instance cannot silently corrupt my run's evidence.
27. As a coding agent, I want run state and evidence to be written where a later agent can find them, so that my work is inspectable after my context ends.

### The coding agent reading the map

28. As a coding agent, I want an index of every user-facing feature with a one-line description, so that I can pick the file that matches my change instead of reading the whole product.
29. As a coding agent, I want one file per feature area, so that I open only the behaviour I am touching rather than the whole inventory.
30. As a coding agent, I want each feature file to use the same four sections, so that I can read it predictably and know where to look for the drive recipe.
31. As a coding agent, I want each feature file to list every user entry point, so that I do not prove a behaviour through one convenient path while others go untried.
32. As a coding agent, I want each drive step to pair a user action with an exact command and an observable result, so that I can run it literally rather than interpret it.
33. As a coding agent, I want each feature file to name its preconditions, so that I know what state the recipe requires before I start it.
34. As a coding agent, I want each feature file to list its gotchas, so that I avoid the traps that have already wasted someone's run.
35. As a coding agent, I want sub-feature identifiers on each behaviour, so that a run can report coverage at the granularity of a single behaviour.
36. As a coding agent, I want the map to hold user paths, stable handles, required state and observable proof and nothing else, so that it stays short and does not drift with implementation detail.
37. As a coding agent, I want a dedicated journeys file for behaviours that span several areas, so that cross-surface paths have one home.
38. As a coding agent, I want a stated sweep order, so that a broad regression pass has a defined beginning and end.

### The Builder-Reviewer

39. As a Builder-Reviewer, I want the skill's proof bar stated in one place, so that I can hold an agent to the same standard every time.
40. As a Builder-Reviewer, I want a recording and screenshots as proof rather than a claim, so that I can see the action and the resulting state for myself.
41. As a Builder-Reviewer, I want the side effect verified as well as the screen, so that a change that looks right but did not persist is caught before I review it.
42. As a Builder-Reviewer, I want an unreachable path reported with its command and its unmet precondition, so that a gap is visible rather than silently omitted.
43. As a Builder-Reviewer, I want a run to say which mapped features it did and did not drive, so that partial coverage never reads as complete.
44. As a Builder-Reviewer, I want a run's evidence to survive its cleanup, so that proof is not destroyed by the tool that produced it.
45. As a Builder-Reviewer, I want a stable location I can open to see the latest run, so that proof is one action away rather than a search.
46. As a Builder-Reviewer, I want the skill to state plainly that a driven approval is not Verified Intent, so that a green run is never mistaken for my own judgement.
47. As a Builder-Reviewer, I want to drive the product myself with the same harness when a flow is easier to demonstrate than to describe, so that a drag or a gesture becomes a repeatable proof instead of an anecdote.
48. As a Builder-Reviewer, I want the recording the tool produces to be faithful to what I did, so that my demonstration becomes the recipe.
49. As a Builder-Reviewer, I want to keep reviewing in prose when the skill is not appropriate, so that adopting the harness does not force it onto every change.

### The maintainer

50. As the maintainer, I want the skill's own code to be exercised by the repository's test suite, so that the tool agents depend on cannot rot unnoticed.
51. As the maintainer, I want the skill's contract to be a black-box boundary, so that its tests survive internal refactoring.
52. As the maintainer, I want the interface an agent depends on — its commands, its machine-readable output, its dry-run and its exit codes — to be the thing under test, so that the test protects the contract rather than the implementation.
53. As the maintainer, I want proofs that must hold forever promoted into the existing test suite, so that the repository has one test strategy rather than two.
54. As the maintainer, I want Verification Runs kept out of the test suite, so that a run reports honestly on coverage instead of being reduced to a pass or a fail.
55. As the maintainer, I want the feature map to be maintainable by a separate periodic pass, so that drift is corrected in a bounded loop rather than opportunistically.
56. As the maintainer, I want the tool to rebuild the product before launching it, so that a stale build never produces a false failure.
57. As the maintainer, I want a run to record the revision, the dirty state and the build freshness it ran against, so that evidence can be dated.
58. As the maintainer, I want the tool's own contract to run in continuous integration while full runs remain local, so that the harness is guarded without making the pipeline drive the app.
59. As the maintainer, I want the release preflight to depend on the skill only after it has proven itself, so that confidence is earned rather than declared.

## Implementation Decisions

### What is built

Three components, versioned together inside one project-local verification skill.

**The Lever.** A command-line utility that is the skill's only executable. It owns the product's semantics, instance isolation, and evidence capture. It does not reimplement generic browser primitives that an agent can obtain elsewhere, and it does not expose the product's internals as commands.

**The skill body.** The instructions an agent reads cold: how to launch, how to tell whether an instance is worth driving, how to drive, what counts as evidence, how to clean up, and how to use the Lever's helpers.

**The feature map.** A behaviour-level inventory under a reference directory that sits alongside the skill body, with an index that is also the sweep order, and one file per feature area.

### The Lever's surface

Commands are grouped so the interface discloses itself gradually, and every category is reachable from the tool's own help text.

- **Health and lifecycle:** health check, launch, cleanup, session identity.
- **Opening:** a saved-HTML Artifact or a running application, by the same two entry points the product offers.
- **Review-state driving:** select a target with a named tool, annotate a selected target, express a relation, attach a reference, queue, send with a delivery timing, reload the Artifact, and enter Verify.
- **Verify-state driving:** decide one Annotation, choose among ambiguous resolution candidates, and toggle the in-place comparison.
- **Observation:** product-state read-back, accessibility snapshot, screenshot, recording, trace, console and network inspection, and a settle wait.
- **Secondary surfaces:** pass-through to the setup and detection commands, and to the MCP entry tools.

Flags are uniform across commands: machine-readable output, a dry-run, a named run, a headless switch, and help.

**Design rules adopted as interface, not preference:**

- The command surface composes; each command does one thing and reports one result.
- Every command that can change state or destroy something supports a dry-run. This includes sending, deciding a verdict, expressing a relation, attaching, reloading, opening, and cleaning up.
- Errors name the action to take next rather than restating the failure.
- Errors and dry-run reports are machine-readable on the same channel as success.
- Exit codes classify failure: success, usage error, unmet precondition, unreachable path.
- A command that needs an instance refuses to act on one it did not start, naming the owning process.
- No command exposes a test-only or internal entry point of the product.

### Isolation contract

Non-negotiable, and the same for every command that touches an instance.

- A run owns a fresh lifecycle data directory, unique to the run.
- The service binds to an ephemeral port chosen by the operating system; the product's default port is never used.
- The product's automatic browser launch is always suppressed; the harness owns the browser, and there is exactly one.
- The Builder-Reviewer's own lifecycle directory is never read or written.
- The Lever rebuilds the product before launching it, so the instance under drive reflects the working tree.
- A run records the process it started and terminates only that process, by identity. Nothing is ever killed by process name.
- A run is refused while another live run owns the same lifecycle data directory, and the refusal names the owning process.
- The health check is read-only and reports whether the instance is alive and owned by the run, whether the build is fresh, and whether the capability held by the run authorises the session.

### The run and its evidence

A Verification Run is a first-class, named artifact.

- A run owns an append-only directory named for the moment it started and the feature or change under test.
- The run directory holds a machine-readable run record and a human-readable report, plus the captured evidence.
- The run record states: the outcome, the coverage of features and sub-features driven against those mapped, the environment it ran against (revision, dirty state, package version, build freshness, tool versions), the launch record (process identity, base URL, session identity), the evidence index, and every unreachable path with the command attempted and the unmet precondition.
- The outcome vocabulary is the same one the periodic maintenance pass already uses — clean, changed, blocked — extended with an aborted outcome for a run that did not finish.
- Evidence includes, at minimum, a recording of the action and its resulting state, screenshots of the named states, accessibility snapshots, and structured read-backs of what the product stored.
- The per-session capability is a secret. It is never written into evidence or a run record; read-backs are captured through authorised requests and stored without it.
- A stable pointer names the newest run, so a human or agent has one path to the latest proof.
- Cleanup removes the instance, the lifecycle data directory, the browser session and the run lock. It never removes evidence, and the run's own completion step re-reads the evidence at its declared location to prove that cleanup did not consume it.
- Runs are append-only. Nothing prunes an older run automatically.

### The feature map

- The index states the baseline preconditions, the driving conventions, the proof and skip reporting rules, the sweep order, and the entry contract that every feature file obeys.
- Each feature file has exactly four second-level sections in a fixed order: the sub-features, how a user gets to them, how to drive them with the Lever, and the gotchas.
- The drive section begins with the feature's preconditions and then pairs each user action with an exact command and its observable result.
- Sub-feature identifiers are short and stable, so a run can report coverage per behaviour rather than per file.
- The map holds user paths, stable handles, required state, commands and observable proof. It holds no implementation detail, no source structure and no design rationale.
- Behaviours that span several areas live in one journeys file, which is the last file of a full sweep.

### Coverage tiers

The map is authored in full as an index, but proof is earned in tier order. The first tier is driven live while the skill is created; later tiers are mapped with recipes and marked as not yet driven, and the periodic maintenance pass advances them.

- **First tier:** opening a saved-HTML Artifact and rendering it faithfully; annotating and sending; Relational Intent by direct manipulation; Target Resolution and its honest outcomes after the Artifact changes; verifying each Annotation; never discarding writing across a reload, a service restart and a browser restart.
- **Second tier:** attachments and their refusal; the decision drawer and remote-origin disclosure; agent position; session lifecycle and overflow actions; running-application mode with Source Provenance; the accessibility floor and keyboard interaction.
- **Third tier:** the setup and Harness Detection matrix including status and outdated-entry repair; and the MCP agent loop.

The design gallery is excluded: it is a development surface with no Review Surface user path, and it is already pinned by the existing design-token pass.

### Secondary surfaces

- The setup and detection surface is driven through the product's own command with its own flags, under a sandboxed home so a run cannot touch the real machine configuration.
- The MCP surface is driven through a real standard-input transport connected to the built server, not an in-memory pair, so the shipped transport is what is exercised.
- The Lever's pass-throughs invoke the built product, never the source tree.

### Vocabulary and records

- `CONTEXT.md` gains **Verification Run** and **Mechanical Verification**. Mechanical Verification is the evidence a Verification Run produces that the mechanism behaved as specified; it is explicitly not Verified Intent.
- **Verify** and **Verified Intent** keep their existing definitions unchanged. The boundary between them and Mechanical Verification is stated once in the glossary and once in the skill body.
- A decision record is added titled as the new failure mode: an automated Verification Run is not Verified Intent. It is recorded because the choice is hard to reverse, surprising without context, and a genuine trade-off.

### Corrections deferred, not made

The generator skill's body and the maintenance skill's body both name the map directory as a direct child of the skill, while the working reference implementation and the tool's own guidance place it under a reference directory. The verification skill follows the working reference implementation. The drift in the two generator skills is recorded here and corrected separately, so that this work does not silently rewrite tooling that other projects may already depend on.

## Testing Decisions

### What a good test is here

A good test drives the thing from outside and asserts on what a caller can observe. For the Lever that means spawning the real executable and asserting on its machine-readable output, its exit code, and the evidence it wrote — never importing its internals, never reaching into its modules, never asserting on an intermediate value that a refactor is free to change. The Lever's commands, output shape, dry-run behaviour and exit codes are its contract, and the contract is what the tests protect.

### The seam

One new seam, at the highest point available: the Lever's own process boundary. The Lever is spawned as a child process against a disposable run directory and an ephemeral port, and it spawns the real product underneath. No test-only doorway is added to the product, and the product's existing entry points are reused as they ship.

Everything the feature adds is tested at that single seam. The feature map is data, not code, and is verified by the runs it describes.

### What the Lever's contract test covers

- The health check is read-only: it reports the expected identity, build freshness and capability fields, and changes nothing.
- A launch followed by a cleanup leaves the run's evidence intact at its declared location.
- A dry-run performs no side effect, proven by reading the product's stored state before and after.
- One first-tier product drive succeeds against the repository's existing saved-HTML fixture, exercising selection, annotation, queueing, sending, re-resolution and a verdict, and asserting on the product state read back as well as the visible result.
- A refusal is issued when a second run targets a lifecycle data directory already owned by a live run.
- The exit-code classification distinguishes usage error from unmet precondition from unreachable path.
- Evidence contains no per-session capability.

### Prior art

- The primary browser seam already drives the Review Surface end to end through a real browser engine against a running service, asserting on both the product's DOM and its stored state. The Lever's contract test is the same shape, one process boundary further out.
- The existing standard-input smoke script already drives the built MCP server as a real process. The Lever's MCP pass-through follows that precedent.
- The existing protocol contract test asserts on tool output as a contract rather than on internals; the Lever's output assertions follow it.
- The existing design-token pass establishes that the repository is willing to promote a behavioural guarantee into a committed, asserted test rather than a manual pass.

### What is deliberately not tested

Feature-map coverage is not a test-suite assertion. A Verification Run records which mapped behaviours it drove and which it did not, with reasons; it reports rather than passes or fails. Any guarantee discovered during a run that must hold forever is promoted into an existing test file at the appropriate seam, not frozen into the Lever.

## Out of Scope

- Promoting the skill into the release preflight, and any amendment to the release-maintenance skill. Deferred until the skill has produced a run of honest full-map passes.
- Cloud or remote execution of runs, parallel runs, and worktree-based isolation. Runs are local and serial.
- Wiring full Verification Runs into continuous integration. Only the Lever's contract test joins the existing pipeline.
- Correcting the map-directory drift in the two generator skills, beyond recording it here.
- Driving Harness installations that require a human at a keyboard: listing the server inside a live pi session, and any Harness not installed on the machine.
- Real dogfood judgement — voluntary repeat use, keep-or-kill verdicts, time-to-accepted-correction — which remains a human activity recorded elsewhere.
- A performance workflow that takes a baseline trace, applies a fix and confirms a win, beyond the trace capture the Lever offers as an observation primitive.
- Verified Intent, its completion semantics, and the Review Surface's own behaviour. This work observes the product; it does not change it.
- The design gallery as a verification target.
- Publishing or distributing the skill as part of the installed package.
- Any change to the product's own shipped agent Skill, or to the ruler by which user-facing intent is judged.

## Further Notes

### Why the Lever is the load-bearing decision

Scripts and markdown would have been enough to prove a behaviour once. They are not enough to prove it repeatedly under an agent's hand, because every agent would rewrite the same messy launch path and pick its own brittle selectors. Putting that mess behind one composable command surface is what makes the proof cheap enough to be routine, and what makes the interface stable enough to be tested. If the Lever is not maintained, the skill degrades into documentation; that is the failure mode the periodic maintenance pass exists to prevent.

### The two-vocabulary risk

This repository now uses "verification" for two different actors: the Builder-Reviewer who completes an Annotation in Verify, and the agent that proves a mechanism works. Confusing them is the most likely way this work damages the product's credibility, because a green run looks exactly like an approval. The glossary terms and the decision record exist for that reason, and the skill body restates the boundary where an agent will read it.

### What "done" looks like for this spec

The skill body exists and has been executed end to end at least once, in the order it prescribes; the Lever answers its own help, its health check and its dry-runs; one first-tier mapped feature has been driven live with evidence captured and then verified to still exist after cleanup; the feature map's index and first-tier files are written against real entry points; and the Lever's contract test runs in the repository's test suite. A generated skill that has never been executed is a draft, not a deliverable.

### Working order

The Lever first, with its health check and lifecycle, so that a launch can be trusted before anything depends on it. Then one first-tier feature driven through it end to end, to prove the drive path against the real surface before mapping the rest. Then the skill body, written against what the Lever actually does rather than what it was intended to do. Then the feature map's index and first-tier files, then the remaining tiers as an honest backlog. Then the evidence and run-record contract, then the vocabulary and the decision record. The contract test is written alongside the Lever rather than after it, because the dry-run and exit-code rules are easiest to get right while the surface is still changing.

## Comments

Corrected 2026-09-17: `Status: done`. The Lever, the feature map and the skill body shipped, and the mapped first-tier drive ran live. Two tickets carried gaps their own boxes made visible: `05` is now `deferred` and `06` names its two unticked boxes in a `Deferred confirmation:`; see `.scratch/truth-and-sync/issues/05-mark-the-regressed-and-superseded-capabilities.md`. Parked verification does not reopen an iteration whose behaviour shipped.
