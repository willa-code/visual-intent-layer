# The browser-driven test suite fails intermittently on CI

Status: needs-triage

## Problem Statement

Four CI failures in one afternoon, each in a different browser-driven test, none of
which reproduces locally, and one of which is a commit that passes on rerun without
changing a byte. A red CI that means "try again" is worse than no CI: it trains
everyone to rerun without reading, which is how a real failure gets waved through.

Observed, all on `ubuntu-latest` with the suite serialised:

| Commit | Failure |
| --- | --- |
| `fb0356e` | The pinned gallery render drifted past its 3% tolerance. **Real, and fixed**: the Pass-states panel changed, so the Linux baselines were re-recorded from the runner's own artifact. |
| `1dd30d1` | `[vitest-worker]: Timeout calling "onTaskUpdate"` — an unhandled error, all 341 tests passing. |
| `1dd30d1` (rerun) | `lever-contract` > the relation drive > ordering, exiting `4` — the Lever's own unreachable-path code. |
| `ae80dd5` | `browser-loop` > the proxied application never recorded the revision the artifact reported (`blake3:bbbb…`). |
| `ae80dd5` (rerun) | **Green.** |

## What is already ruled out

- **Not the gallery tolerance.** That was real, and it is fixed.
- **Not a slow runner.** The waits that failed allow 20 seconds and were waiting on a
  single DOM condition, not on a sequence of interactions.
- **Not the relation drag's selection precondition.** The ordering drive now asserts
  that both members carry an owned mark before it drags; that assertion passed on
  `ae80dd5`, and the failure moved to a different file.
- **Not reproducible here.** The suite has been green on this machine across many
  runs, in parallel and serialised, on the same lockfile CI uses.

## What is suspected, and why it is only suspicion

Contention. CI gives the suite two cores while `browser-loop` and `lever-contract`
each drive a real Chromium against a real service for the better part of a minute.
Serialising the files (`vitest.config.ts`) reduced one class of that, and is kept on
that reasoning — but a failure still occurred after it, so **it is not a demonstrated
fix** and removing it costs nothing but the extra minute.

## Solution

Not yet decided. The recommendation is to stop guessing and make the next occurrence
carry evidence: on failure, upload the Playwright trace and video for the failing
browser test, as `publish.yml` already does for the gallery render. A trace of a
20-second wait would say whether the page was inert, the frame detached, the service
stalled, or the interaction never landed — none of which the current failure message
can distinguish.

## Out of Scope

- Masking the flakiness with retries. A retry that hides a real failure is worse than
  the flake it hides; if retries are ever added, the run must report that it needed one.
