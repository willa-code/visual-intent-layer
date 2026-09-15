# 03: Open saved HTML and select elements and text

**What to build:** A Builder-Reviewer invokes one entry tool, the saved HTML artifact opens in a review surface with Explore and Select modes, and hovering and selecting an element or exact text range shows the Rendered Grounding evidence the agent would receive.

**Blocked by:** 02 (Scaffold the TypeScript service and envelope schema)

**Status:** ready-for-agent

- [ ] Invoking the entry tool against a saved HTML artifact opens it in Explore mode with ordinary page interaction intact
- [ ] Entering Select mode is obvious and reversible, and application controls cannot be activated through it
- [ ] Hovered elements respond immediately with a trustworthy outline, and selecting an element or exact text range keeps the selection visually clear
- [ ] The visible Rendered Grounding evidence for the selection is shown before anything is sent

## Comments

Implemented (implemented in 8b70d52): entry tool opens saved HTML in review surface (src/service/http.ts, src/ui/shell.html) with Explore/Select/Direct modes (src/ui/review.ts modeMachine, keyboard 1/2/3, Escape), hover outline + element/text-range selection with Rendered Grounding shown pre-submit (src/ui/selection.ts, grounding in src/ui/review.ts). Never claims provenance from DOM alone.
