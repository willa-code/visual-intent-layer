# 17: Re-record dogfood and the preview verdicts

**What to build:** Real corrections on real work are performed with the rebuilt Visual Direction Loop and measured against the recorded baseline, and the preview verdicts are recorded fresh. The previous dogfood record and its keep-or-kill verdicts are discarded rather than carried forward, because they were recorded against a Review Surface whose scripts never ran.

**Blocked by:** 16 (Make the documentation match the behaviour)

**Status:** deferred

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the first feature spec after `.scratch/truth-and-sync/`, plus maintainer time for the parts only a human can do — 2026-09-17

- [ ] Real corrections record time to accepted correction, clarification turns, targeting failures, rejected revisions and setup friction against the baseline
- [ ] A keep-or-kill verdict is recorded for direct-manipulation relation input against selection plus text
- [ ] Voluntary repeat use during dogfood is observed and written down
- [ ] The previous dogfood record and its preview verdicts are explicitly marked as discarded, with the reason

## Comments

Deferred 2026-09-17: re-recording dogfood and the preview verdicts is parked until the next spec's Verification Run plus maintainer time. The keep-or-kill verdict for direct-manipulation relation input belongs to `.scratch/several-targets-and-relations/`, which owns the relation gesture; the preview verdicts cannot be recorded as written because the `preview` object left the wire at `schema/envelope-v0.2.schema.json`.
