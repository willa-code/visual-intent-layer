# 06: One list, where nothing leaves the view when it is sent

**What to build:** The rail holds every Annotation the Builder-Reviewer has made — unsent and sent — in one ordered list, with the state pill carrying the difference so sending removes nothing from view. An Annotation that has been delivered shows its resolution, its candidate chooser when a resolution is ambiguous, and its verdict controls on its own row. Verdicts are approve, reject, request another pass and mark obsolete; supersession is reached only through Amend (issue 08), so one act has one control. Annotations that need a decision come first. Verify stops being a place: there is no second surface state, and an Annotation is judged where it sits.

**Blocked by:** 01 (one rail), 02 (one icon set)

**Status:** superseded

- [ ] The rail lists unsent and sent Annotations in one ordered list, and sending moves an Annotation's state without removing its row
- [ ] Each row states its own state as a label plus a non-colour cue, and never shows delivery and implementation as one state
- [ ] A row carries its verdict controls once delivered: approve, reject, request another pass, mark obsolete. `supersede` is not among them
- [ ] Approval is refused with the reason stated when a target is unresolved or a candidate is unchosen
- [ ] An ambiguous resolution shows its candidates on the row and selects none of them
- [ ] An unresolved target with no candidates is reported as deleted and states that approval is blocked
- [ ] A row marked "written before this revision" says so in those words, not as an error
- [ ] Annotations needing a decision are ordered before the rest, so a long session does not bury the work
- [ ] There is no second surface state: no Review/Verify switch, and nothing is unreachable because the surface is in the other one
- [ ] A resolution run happens when the artifact under review changes or a row must be re-resolved, the row states when it last ran, and issue 20 owns that flow
- [ ] A superseded Annotation shows what replaced it
- [ ] Driven live: an Annotation is composed, sent, resolved, judged and closed without the surface changing state, and each step is read back from stored state
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Split from a larger ticket after review and a maintainer decision. This ticket previously also carried per-row revision comparison, filters, reordering and resolution timing — fourteen acceptance criteria spanning seven concerns, which no agent lands cleanly in one pass. Comparison, ordering and what is hidden moved to issue 19; the resolution flow moved to issue 20.

Also amended: `supersede` appeared here as a row verdict *and* in issue 08 as the effect of Amend, so two tickets could claim one control. It now belongs to Amend alone.

Resolved 2026-09-17: superseded by `.scratch/surface-refinement-pass-a/spec.md`. The one-list rule shipped in `14a73a1`, but Pass A replaced the flat note list with a Pass ledger and re-cut the verdict controls: Approve and Reject on the row, Not Fixed and obsolete behind one overflow, and a blocked verdict stated on the row. The replacement is Pass A tickets 03 and 04. The boxes are left unticked because the shape they describe is no longer the shipped one.
