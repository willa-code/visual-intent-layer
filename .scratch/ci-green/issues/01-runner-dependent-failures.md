# 01: Two CI failures that were not the code's fault

**What to build:** A CI run on `main` that gates the code rather than the runner. Neither failure below was caused by the commit that triggered it, and both had been red since `v0.3.0-next.1` was released.

**Status:** done

- [x] Harness detection tests stop reading the ambient environment
- [x] The gallery pass pins a screenshot per rendering platform and names its recorder when a platform has no baseline
- [x] CI uploads the render the runner produced, so a new platform's baseline can be recorded from a run
- [x] The workflow actions move off the deprecated Node 20 runtime
- [x] `main` is green

## Comments

**Harness detection read the ambient environment.** `machine()` and `options()` built a detection request without `env`, so `describeEvidence` fell back to `process.env`. On GitHub's runner `XDG_CONFIG_HOME` is set, which moved opencode's global path away from the temp home the test had prepared, and `detectHarnesses` returned `['pi','codex','claude-code']` where the test expected all four. Reproduced locally with `XDG_CONFIG_HOME=/home/runner/.config npx vitest run src/harness-registry.test.ts` before the fix. Both fixtures now supply a complete `DetectionRequest`.

**One screenshot baseline cannot gate two platforms.** The pass compared a macOS-recorded `gallery-<theme>.png` against the runner's render and reported "100.00% drift" — which was not a pixel measurement at all: `pixelDifference` returned `1` when the images differed in size, and they did, 1100x5121 against 1100x5240, because `system-ui` resolves to different fonts per platform and the metrics move the layout. The tolerance could not absorb that at any value. Baselines are now `gallery-<theme>-<platform>.png`; a platform without one fails, names the platform, and leaves the render this run produced in `.scratch/`, which CI uploads as the `gallery-actual` artifact. The Linux baselines in this change were taken from that artifact of run 35221436592, and the exact token baseline stays platform-independent. Ticket 14's "the tolerance absorbs cross-platform font rendering" is corrected there.

**The third failure was the code's.** One run failed `service.test.ts > returns an amendment as new direction` and the next passed: the same-millisecond cursor tie. See `.scratch/check-in-cursor/issues/01`.
