# 03: The Lever — launch, health, evidence and cleanup

**What to build:** An agent working in this repository can launch the real built product for a saved-HTML Artifact, health-check it read-only, capture a screenshot of the resulting state, clean up, and find the evidence still there afterwards. This is the tracer bullet: isolation, the real product boundary, the browser, evidence capture and teardown all cut through at once, and the first mapped behaviour proves the whole path.

**Blocked by:** 01 (Concurrent Artifact sessions and a machine-readable launch record)

**Status:** done

- [x] A single executable ships with the verification skill; its help lists its command groups and flags, and every command returns machine-readable output
- [x] Launch starts the built product for a saved-HTML Artifact on a disposable lifecycle data directory and an operating-system-chosen ephemeral port, and suppresses the product's own browser launch so exactly one browser exists
- [x] Launch reports the session identity, base URL and review URL to the caller as structured data
- [x] The product is rebuilt before launch; the run records the revision, the dirty state, the package version, the build freshness and the tool versions it ran against
- [x] The health check is read-only, reports liveness, ownership, build freshness and capability authorisation, and changes nothing observable
- [x] The health check reports a stale build as stale rather than allowing it to be driven
- [x] A run refuses to drive an instance it did not start and names the owning process; a second run against a lifecycle data directory already owned by a live run is refused
- [x] Cleanup removes the instance, the lifecycle data directory, the browser session and the run lock, terminating only the recorded process identity and never killing by process name
- [x] The Builder-Reviewer's own lifecycle directory is never read or written
- [x] Evidence — a screenshot of the resulting state, a run record and a report — is written to the run's declared location, and the run re-reads it after cleanup to prove cleanup did not consume it
- [x] The per-session capability never appears in evidence or in the run record
- [x] A dry-run is available on every command that can change or destroy state, and a dry-run performs no side effect
- [x] Exit codes distinguish success, usage error, unmet precondition and unreachable path
- [x] The feature map index exists, carrying the baseline preconditions, the driving conventions, the proof and skip reporting rules, the sweep order and the four-section entry contract
- [x] The first feature file exists for opening and rendering a saved-HTML Artifact, and the index names it
- [x] The Lever's contract test runs in the repository's test suite, spawning the real executable and asserting on its output, its exit code and the evidence it wrote — never importing its internals

## Comments

The Lever is `.agents/skills/verify-visual-intent-layer/bin/lever.mjs` with a persistent browser host. The feature map index and `open-artifact.md` exist. `tests/lever-contract.test.ts` spawns the real executable and asserts launch records, read-only health, dry-run, refusal, exit-code classification, capability redaction and evidence surviving cleanup.
