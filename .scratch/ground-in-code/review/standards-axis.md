## Review

**Correct** — Verified against source:
- `SECURITY.md:76-79` now lists exactly the directives `applicationContentSecurityPolicy` sets (`src/artifact/fidelity.ts:229-246`), including `manifest-src 'self'`, `base-uri 'self'`, `object-src 'none'`, and the `unsafe-inline`/`unsafe-eval`/`blob:` script-src — matches code line for line.
- `CONTEXT.md:47-49` drops the `supersedes` wire-field claim entirely (ticket 01) — no contradiction remains.
- `design.md:172,174,175,284,287,293` — Pass states, Resolution vocabulary (`state-only, blocked`), the retired `rejected`, and `describeTarget`'s label→accessibleName→semanticRole→kind fallback all match `src/ui/app.ts:2102-2107` and `src/annotation/store.ts`.
- ADR-0002, 0012, 0019 — each gained a marker (blockquote for 0002/0012, `**Corrected 2026-09-18:**` paragraph for 0019) that appends rather than rewrites the original body, following the 0008/0024/0025 convention. Satisfies `docs/agents/issue-tracker.md`'s "a correction is appended, never rewritten."
- Issue files 01-03: status `done`, every acceptance box ticked, `## Comments` entries added — satisfies the `done`-has-no-silent-gap and status-change-needs-a-comment rules.
- `annotate-and-send.md` "No note" (matches `src/ui/app.ts:460`); `maintain-visual-intent-layer/SKILL.md` Preflight now runs `check-records.js` between typecheck and test, matching `.github/workflows/ci.yml:20`'s order.

**Finding (P1):** `reach-within-the-class.md:13` — feature-map coverage marker is untruthful under the SKILL.md contract.
> `_Driven live: the runs pointed into an open shadow root ... The two refusals are driven in the browser loop (closed shadow root, policy-blocked frame); the cross-origin refusal has a unit seam. The frame-that-has-not-loaded refusal is stated by the same code and is not yet driven._`
The diff adds `reach-refusal-unloaded` (line 34) and appends "...is not yet driven" to this paragraph, but leaves the marker's lead word `Driven live`, not `Partly driven live`. `.agents/skills/maintain-visual-intent-layer/SKILL.md:62` requires "a truthful coverage marker (`Not yet driven.`, `Partly driven live`, or none)"; the file's own comparator `material-and-theme.md:5` uses the literal `_Partly driven live:` lead for exactly this situation (some sub-features driven, some mapped). Here two named sub-features (cross-origin, unloaded-frame) are admittedly undriven, so "Driven live" is not one of the three sanctioned markers and is no longer true. Smallest fix: change the lead to `Partly driven live:`.

**Finding (P2, judgment call):** the same paragraph's "Driven live" framing was already borderline before this diff (the cross-origin refusal "has a unit seam" only); the diff's added clause makes the mismatch concrete and diff-caused, which is why it's raised as P1 rather than pre-existing debt.

No Fowler-baseline smells (duplication, envy, primitive obsession, etc.) apply to prose-only diffs of this shape.

Merge verdict: **OK with notes** — one documented-standard marker-vocabulary breach to fix before calling the feature map truthful; everything else checked against `src/**` is accurate and the ADR/ticket record-keeping rules are followed correctly.