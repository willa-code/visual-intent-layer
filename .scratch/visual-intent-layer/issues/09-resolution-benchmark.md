# 09: Build the target-resolution mutation benchmark

**What to build:** Controlled artifact mutations measure whether Target Resolution recovers correctly or abstains honestly, with the research levels kept as local regression signals.

**Blocked by:** 08 (Support a local React/Vite application with Source Provenance)

**Status:** ready-for-agent

- [ ] Fixtures cover unique elements, repeated siblings, nested components, text ranges, responsive layouts, generated class names, and targets with and without Source Provenance
- [ ] Mutations cover sibling reorder, wrapper insertion, unrelated text edits, class changes, target movement, component replacement, responsive reflow, target deletion, and ambiguous duplication
- [ ] The report measures exact, recovered, correct-ambiguity, correct stale/deleted detection, confidently-wrong, and resolution latency, rewarding abstention over forced matches
- [ ] The 95% correct and under 1% confidently-wrong levels run as local regression signals, not release gates
