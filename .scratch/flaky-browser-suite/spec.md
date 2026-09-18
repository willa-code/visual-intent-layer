# The browser-driven test suite fails intermittently on CI

Status: done

## Problem Statement

Four CI failures in one afternoon, each in a different browser-driven test, none of
which reproduces locally, and one of which is a commit that passes on rerun without
changing a byte. A red CI that means "try again" is worse than no CI: it trains
everyone to rerun without reading, which is how a real failure gets waved through.

Observed, all on `ubuntu-latest` with the suite serialised:

| Commit | Failure |
| --- | --- |
| `fb0356e` | The pinned gallery render drifted past its 3% tolerance. **Real, and fixed**: the Pass-states panel changed, so the Linux baselines were re-recorded from the runner's own artifact. |
| `1dd30d1` | `[vitest-worker]: Timeout calling "onTaskUpdate"` — an unhandled error, all 341 tests passing. |
| `1dd30d1` (rerun) | `lever-contract` > the relation drive > ordering, exiting `4` — the Lever's own unreachable-path code. |
| `ae80dd5` | `browser-loop` > the proxied application never recorded the revision the artifact reported (`blake3:bbbb…`). |
| `ae80dd5` (rerun) | **Green.** |

## What is already ruled out

- **Not the gallery tolerance.** That was real, and it is fixed.
- **Not a slow runner.** The waits that failed allow 20 seconds and were waiting on a
  single DOM condition, not on a sequence of interactions.
- **Not the relation drag's selection precondition.** The ordering drive now asserts
  that both members carry an owned mark before it drags; that assertion passed on
  `ae80dd5`, and the failure moved to a different file.
- **Not reproducible here.** The suite has been green on this machine across many
  runs, in parallel and serialised, on the same lockfile CI uses.

## What is suspected, and why it is only suspicion

Contention. CI gives the suite two cores while `browser-loop` and `lever-contract`
each drive a real Chromium against a real service for the better part of a minute.
Serialising the files (`vitest.config.ts`) reduced one class of that, and is kept on
that reasoning — but a failure still occurred after it, so **it is not a demonstrated
fix** and removing it costs nothing but the extra minute.

## Solution

Not yet decided. The recommendation is to stop guessing and make the next occurrence
carry evidence: on failure, upload the Playwright trace and video for the failing
browser test, as `publish.yml` already does for the gallery render. A trace of a
20-second wait would say whether the page was inert, the frame detached, the service
stalled, or the interaction never landed — none of which the current failure message
can distinguish.

## Out of Scope

- Masking the flakiness with retries. A retry that hides a real failure is worse than
  the flake it hides; if retries are ever added, the run must report that it needed one.

## Comments

**2026-09-18 — root-caused two of the failures; the ordering drag was a real defect, not contention.**

Reading the run logs rather than the summary changed the picture. The table above is
incomplete and partly misattributed: runs `35343153020` (`fb0356e`), `35343369697`
(`30cfdcb`), `35343502288` (`f818572`), `35343812151` (`1dd30d1`), `35345849545`
(`97ed3f6`) and attempt 1 of `ae80dd5` each failed, and several carried more than one
failure. The gallery drift is real and was fixed by re-recording the Linux baselines.
Two failure modes were reproducible here and are fixed.

### 1. The ordering drag: the rail stole focus mid-drag (real defect)

Both `browser-loop > expresses an ordering relation …` and `lever-contract > records an
ordering relation …` failed the same way: the drag recorded nothing. The mechanism is
not contention and not geometry. `renderCard()` in `src/ui/app.ts` ends with
`textarea.focus()` and runs from `onSelection` after `createAnnotation` and `refresh()`
complete. The artifact frame holds focus after the frame clicks, so that focus move
blurs the frame, and the layer's `window` `blur` listener called `cancelRelationDrag()`.
Every drag that began while a card render was in flight died silently: the preview
stayed `""` in `browser-loop` (its 20s wait) and the lever polled 40 times before
exiting `4` with "The drag recorded no relation." On a fast machine the two HTTP
round-trips finish before the drag starts, which is why it never reproduced locally.

Reproduced deterministically (focus the card's textarea during the drag ⇒ preview
`""`), fixed by cancelling only when the page itself loses focus
(`src/ui/artifact/layer.ts`: the blur handler now checks the top document's
`hasFocus()` on a `setTimeout`), and guarded by
`browser-loop > keeps a relation drag alive when the rail pulls focus into the card`,
which fails with the exact CI message without the fix.

### 2. The proxied revision: the test raced its own push (test defect)

`browser-loop > drives a running application through the proxy …` asserts the initial
`adoptedRevision` before the advanced one, but `startDevServer` pushed the advanced
revision 250ms after the WebSocket upgrade. Under contention the two `fetch`es and the
policy read could take longer than that, so the first assertion could only ever observe
`blake3:bbbb…` and timed out. The push is now explicit (`dev.advance()`), so the initial
revision is read before the advance and both assertions are deterministic.

### Not root-caused

- `lever-contract > replaces a sent Annotation …` failed once (`30cfdcb`): the original
  carried `replacedBy`, but the snapshot had no Annotation with the successor's note.
  `store.amend` writes the successor and the link synchronously, and the drive waits for
  `replaced && steering`, so this needs the failing run's own trace, not another guess.
- `[vitest-worker]: Timeout calling "onTaskUpdate"` (`f818572`) is the vitest worker RPC
  timing out under load, not a product message. Serialising the browser files on CI
  (`vitest.config.ts`) is kept on that reasoning, still as mitigation rather than proven
  fix.
- The gallery baselines remain pinned per platform; a surface change must re-record them
  from the runner's own artifact, which `publish.yml` already uploads on failure.

### Verification

Lever run `.visual-intent-verify/runs/2026-09-18_13-21-14-ci-flake-relation` drove
`relate --from .d --to .e --dx 30 --expect after` and read back
`{"type":"ordering","operator":"after","targetIds":["t-2","t-1"]}` in `state`, with no
pixel field. Outcome `clean`, coverage `relational-intent` / `relation-ordering` +
`relation-stored`, `unreachable` empty. Full suite green in CI mode (342 passed).

**2026-09-18 (later) — advisor panel and a second acting-before-armed race.**

An independent panel (three fresh-context reviewers: minimalist interaction designer,
user advocate, precision and trust; POVs under `advisors/`) endorsed the layer fix and
unanimously asked for two changes, both now made:

- The guard was narrower than the gesture. Once the rail has focus the frame can no
  longer observe a later page loss, so the layer now also cancels an active relation
  drag when the top document reports itself hidden (`visibilitychange`).
- Nothing pinned the negative case. `browser-loop > cancels a relation drag when the
  page itself loses focus` now cancels a real drag twice: once through the frame-blur
  path with the page reporting no focus, and once through `visibilitychange`. Both
  assertions fail if their guard is removed. Headless Chromium keeps every page
  focused, so a second page brought to front cannot simulate departure; the test
  drives the signals directly instead.

The panel also recorded, and this spec keeps, two residuals it did not require:
`renderCard()` still moves the caret into the note mid-gesture (bounded, because a
surviving drag no longer loses intent), and a departure that only moves focus to
another application while the page stays visible is not observed.

The same panel review run surfaced a third instance of the acting-before-settled
class, in `browser-loop > states the one hole an Area could not read`: it clicked
`Box an area` and dragged in the same breath, so a slow run could draw before the
layer was armed for boxing and record nothing. Both that test and the sibling
minimum-size notice test now wait for the artifact body's crosshair, which is the
convention the frame-enclosing box test already used.

Full suite green twice consecutively in CI mode (343 passed each).

Re-verified on the final tree: Lever run
`.visual-intent-verify/runs/2026-09-18_13-42-34-ci-flake-final` drove
`relate --from .d --to .e --dx 30 --expect after`, read back
`{"type":"ordering","operator":"after","targetIds":["t-2","t-1"]}` with labels
`Member 4`/`Member 5`, outcome `clean`, no unreachable paths. The new
cancel-on-departure guards are not reachable through the Lever's own commands;
they are pinned by the two browser tests above.
