# 02: Repair the feature map and our own skills

Status: done

**What to build:** The feature map is supposed to describe the surface as it actually
is, and `maintain-visual-intent-layer` is the skill a maintainer follows literally.
Both contradict the code in ways that are wrong independent of distribution.

- [x] `annotate-and-send.md` — the empty-note placeholder is `No note`
      (`src/ui/app.ts:460`), not `No note yet`.
- [x] `maintain-visual-intent-layer/SKILL.md:70-77` — add
      `node scripts/check-records.js` to the Preflight block, in the position
      `.github/workflows/ci.yml:20` runs it (after typecheck, before test). The skill
      currently presents itself as the CI gate while omitting a gate CI runs.
- [x] `reach-within-the-class.md` — document the fourth boundary refusal,
      `unloaded-frame` (`src/ui/artifact/boundary.ts:4`, copy at `src/ui/app.ts:2156`),
      as a sub-feature with a drive recipe, distinct from the three policy/security
      refusals it already lists.
- [x] `maintain-visual-intent-layer/SKILL.md` — name `scripts/stdio-smoke.js`, which
      works today and is mentioned by nothing: no `package.json` script, no CI step,
      no skill.
- [x] Once the above land, narrow the Upkeep bullet on ticket statuses to what
      `scripts/check-records.js` does not already automate (evidence in Comments), since
      the skill's own stated preference is to automate a check rather than list it.

**Evidence:** `audit/07-feature-map.md`, `audit/08-our-skills.md`.

## Comments

Landed. Preflight now runs `node scripts/check-records.js` between typecheck and
test, matching `.github/workflows/ci.yml`'s order, so the skill stops presenting
itself as the CI gate while skipping a gate CI runs. The Upkeep bullet narrows to
the one thing that check does not automate — evidence in Comments.

`scripts/stdio-smoke.js` is documented as a manual check and deliberately **not**
added to the gated block: it opens a browser and calls `open_visual_review` without
`waitMs`, so it holds for the service's wait window and cannot run unattended. The
skill says to set `VISUAL_INTENT_NO_WAIT=1` and `VISUAL_INTENT_NO_OPEN=1` for a
headless run. Wiring it into CI would need those flags added to the script itself,
which is a separate change.

`reach-refusal-unloaded` is recorded as a sub-feature with its user entry point and
its exact sentence, and the coverage sentence now says it is not yet driven — because
it is not. An unloaded frame is a race, so no honest drive recipe exists yet; writing
one would have been a claim rather than a record (ADR-0017).

Ran: `npm run typecheck`, `node scripts/check-records.js` and `npm test`
(414 passed, 30 files) — all green.

**Correction, 2026-09-18, from the code review's Standards axis.** The coverage
marker in `reach-within-the-class.md` still led with `_Driven live:` while the same
sentence admitted two named sub-features are undriven, and
`maintain-visual-intent-layer/SKILL.md` sanctions only `Not yet driven.`,
`Partly driven live` or no marker. It now leads with `_Partly driven live:`.

The same defect existed in `decision-drawer.md`, which predates this commit and also
admitted an undriven sub-feature under `_Driven live:`. Fixed there too, since the map
now has one marker vocabulary instead of two.
