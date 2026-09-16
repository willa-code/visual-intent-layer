# 19: Navigating one list: what I compare, in what order, and what is hidden

**What to build:** With one list in a fixed-width rail, three things keep it usable. Selecting a row sets the revision comparison from **that Annotation's** written revision to the revision its result came from, rather than one session-wide comparison that becomes false as soon as rows disagree. Unsent Annotations can be reordered, because their order is the order the agent receives them in. And closed Annotations stay out of the way behind one toggle rather than accumulating — one control, not a filter affordance.

**Blocked by:** 06 (the list)

**Status:** ready-for-agent

- [ ] Selecting a row sets the comparison pair from that Annotation's written revision to the revision its result came from
- [ ] Two rows written against different revisions do not share one comparison, and the surface never implies they do
- [ ] The before/after toggle appears on the stage only while the selected row has something to compare, and is absent otherwise
- [ ] Unsent Annotations can be reordered, the order survives a reload, and the delivered envelope carries that order
- [ ] Closed Annotations — verified, superseded, obsolete — are hidden by default behind a single toggle that states how many are hidden
- [ ] The toggle is one control: no query builder, no facets, no search box, no saved views
- [ ] The default view opens on what needs a decision
- [ ] Driven live: reordering is read back in the delivered order; the comparison is per row and differs between two rows; the toggle reveals and hides closed rows and reports its count
- [ ] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Added when issue 06 was split. The review's argument for filters was about an ever-growing list, and the maintainer's counter was that a filter affordance is a second question in a surface whose vision is one question at a time. The resolution is a single toggle plus ordering, not filters. Rail resizing was considered and rejected for this iteration: the width is fixed, and legibility at that width is measured in issue 13 rather than assumed.