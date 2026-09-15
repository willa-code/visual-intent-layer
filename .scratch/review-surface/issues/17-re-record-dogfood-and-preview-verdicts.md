# 17: Re-record dogfood and the preview verdicts

**What to build:** Real corrections on real work are performed with the rebuilt Visual Direction Loop and measured against the recorded baseline, and the preview verdicts are recorded fresh. The previous dogfood record and its keep-or-kill verdicts are discarded rather than carried forward, because they were recorded against a Review Surface whose scripts never ran.

**Blocked by:** 16 (Make the documentation match the behaviour)

**Status:** ready-for-human

- [ ] Real corrections record time to accepted correction, clarification turns, targeting failures, rejected revisions and setup friction against the baseline
- [ ] A keep-or-kill verdict is recorded for direct-manipulation relation input against selection plus text
- [ ] Voluntary repeat use during dogfood is observed and written down
- [ ] The previous dogfood record and its preview verdicts are explicitly marked as discarded, with the reason