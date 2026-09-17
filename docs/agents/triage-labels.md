# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Status vocabulary

The two documents carry the same closed set, so they cannot disagree. `scripts/check-records.js` fails CI on any status outside it.

| Status | Means |
| --- | --- |
| `needs-triage` | Maintainer needs to evaluate this issue |
| `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | Requires human implementation or verification |
| `deferred` | Parked on purpose, with a named trigger and a date |
| `done` | Every acceptance box is ticked, or every unticked box is named in a `Deferred confirmation:` comment |
| `superseded` | A later spec or ticket replaced this one wholesale |
| `superseded in part` | A later spec amended part of this one, and the rest stands |
| `wontfix` | Will not be actioned |

`needs-triage`, `ready-for-agent`, `ready-for-human` and `wontfix` are triage roles. `done`, `deferred`, `superseded` and `superseded in part` are lifecycle states: a file may be triaged and then moved to one of them. `done` means the criteria are implemented and evidenced, with every gap named in a `Deferred confirmation:` comment. `deferred` means parked with a `Trigger:` line naming what unblocks it and a date.

Edit the right-hand column to match whatever vocabulary you actually use, and update `issue-tracker.md` in the same change.
