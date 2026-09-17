# 07: Record the aborted target-evidence runs honestly

**What to build:** The repository says that `target-evidence` has no completed
Verification Run, because three attempts were stopped, and ticket 10's acceptance gap
stops being a silent one.

**Status:** done

**Blocked by:** 01

- [x] `target-evidence/spec.md` records that the three runs at `.visual-intent-verify/runs/2026-09-17_14-35-05-target-evidence`, `…_14-36-31-proxied-app` and `…_14-36-52-proxied-app-2` ended `aborted`/`stopped`, and that no completed run exists for the iteration
- [x] `target-evidence/10`'s unticked box — a Verification Run that proves the control, the permission request and the stored evidence and reports the capture as undriven — is either driven, or named in a `Deferred confirmation:` with the reason
- [x] The three run directories, their `run.json` outcome and their `report.md` are left byte-identical: the record of an aborted run is evidence, not a mistake to clean
- [x] The verification skill's feature map keeps its honest markers; `captured-view.md` already states which parts were driven and that the capture itself is undriven
- [x] No document states or implies that `target-evidence` is verified

## Comments

The three runs did drive something, and the feature map reflects it: `opened`,
`select-point`, `annotate`, `queue`, the overflow, the app disclosure, the running
application and the proxied update channel appear in the run records' coverage, and
`captured-view.md` and `proxied-application.md` say so. What never happened is a run
that reached its own end. The spec's Testing Decisions already accept this shape — "the
capture is proved as far as a script can ... and reports the capture itself as
undriven" — so ticket 10 can be closed either by a run that completes and reports that,
or by a `Deferred confirmation:` naming exactly that box.

Done 2026-09-17. `target-evidence/spec.md` records the three aborted runs and that no completed run exists; `target-evidence/10`'s unticked box is named in a `Deferred confirmation:`. The three run directories, their `run.json` and their `report.md` are byte-identical, and `captured-view.md` keeps its honest markers.
