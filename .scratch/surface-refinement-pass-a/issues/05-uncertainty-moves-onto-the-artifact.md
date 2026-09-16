# 05: Uncertainty moves onto the artifact

**What to build:** Where Target Resolution cannot match a target, its candidates are **marked on the artifact itself**, each with a numeral, and the row says in words that the target could not be matched. No list of candidates is rendered anywhere, and no percentage, score or confidence figure appears in chrome.

Today a Builder-Reviewer is shown five near-identical labels each badged `55% evidence`. That figure is the resolution scorer's own recovered-threshold constant applied to an uncalibrated weight sum, and the labels are drawn from the same evidence the scorer already weighted — so when two candidates scored within the ambiguity margin, their labels are usually the same string. The list is unusable exactly when it is needed.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every candidate of an unresolved target is marked on the artifact with a numeral, in a style distinct both from a target the artifact owns and from a drawn Area
- [x] The row states, in words, that the target could not be matched, and names which target
- [x] No rendered surface shows a candidate list, a radio group of candidates, or any percentage, score or confidence figure
- [x] A resolution that is ambiguous states that approval is blocked; a resolution with no candidates states that the target is deleted
- [x] The marks clear when the Annotation is repaired or the target is deleted
- [x] The marks are named programmatically, so they are not pointer-only and not colour-only
- [x] A resolution still reports matched, recovered or unresolved in words, so how much to trust a match remains visible
- [x] The gallery renders the candidate-mark state in both themes, and the screenshot baseline is regenerated deliberately

## Comments
