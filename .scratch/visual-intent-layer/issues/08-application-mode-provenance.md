# 08: Support a local React/Vite application with Source Provenance

**What to build:** Application Mode opens a running local React/Vite app in its realistic state, exact source evidence arrives only from real instrumentation, and anything weaker abstains visibly.

**Blocked by:** 05 (Observe revisions, re-resolve targets, verify by hand)

**Status:** done

- [x] A local running React/Vite application opens in the review surface in its realistic interactive state
- [x] Exact Source Provenance resolves to file, line, column, and component through the instrumented adapter
- [x] Rendered Grounding and Source Provenance are labelled distinctly everywhere they appear
- [x] Weak or absent source evidence abstains visibly instead of promoting an inferred location as fact

## Comments

Implemented (implemented in 8b70d52): Application Mode open via entry tool (react-vite-app URL), exact provenance from React fiber debug source with abstention on non-React/production DOM (src/adapters/react-provenance.ts), Vite plugin injecting runtime marker, distinct Rendered Grounding vs Source Provenance labels in evidence cards.
