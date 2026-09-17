# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue and spec file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Status vocabulary

Every `spec.md` and every issue file carries exactly one status from this closed set.
An unknown status is a defect: `scripts/check-records.js` fails CI on it.

| Status | Means |
| --- | --- |
| `needs-triage` | A maintainer has not decided whether or how this is done |
| `ready-for-agent` | Fully specified; an agent can land it |
| `ready-for-human` | Requires a human to implement or verify |
| `deferred` | Parked on purpose, with a named trigger and a date |
| `done` | Every acceptance box is ticked, or every unticked box is named in a `Deferred confirmation:` comment |
| `superseded` | A later spec or ticket replaced this one wholesale |
| `superseded in part` | A later spec amended part of this one, and the rest stands |
| `wontfix` | Decided against |

Rules the check enforces:

- **`done` has no silent gap.** Either every acceptance checkbox is ticked, or a `## Comments` entry begins `Deferred confirmation:` and names each unticked box with why it cannot be driven. `done` with an unticked box and no such entry is the defect this vocabulary exists to remove.
- **`deferred` names what unblocks it.** A `Trigger:` line near the status names the trigger and a date, for example `**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/` — 2026-09-17`.
- **A correction is appended, never rewritten.** Changing a status, a tick or a conclusion means a status change plus a new `## Comments` entry naming what changed and why. The box text and the argument around it stay as they were: the record is history.
- **An issue file is named `NN-<slug>.md`** under an `issues/` directory, numbered from `01`.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
