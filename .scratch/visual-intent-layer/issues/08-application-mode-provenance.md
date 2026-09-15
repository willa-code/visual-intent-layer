# 08: Support a local React/Vite application with Source Provenance

**What to build:** Application Mode opens a running local React/Vite app in its realistic state, exact source evidence arrives only from real instrumentation, and anything weaker abstains visibly.

**Blocked by:** 05 (Observe revisions, re-resolve targets, verify by hand)

**Status:** ready-for-agent

- [ ] A local running React/Vite application opens in the review surface in its realistic interactive state
- [ ] Exact Source Provenance resolves to file, line, column, and component through the instrumented adapter
- [ ] Rendered Grounding and Source Provenance are labelled distinctly everywhere they appear
- [ ] Weak or absent source evidence abstains visibly instead of promoting an inferred location as fact
