## Review

**Methodology note:** This subagent has no shell/git tool — only `read`/`grep`/`find`/`ls`. `git diff f555a4d...HEAD` and `git log` could not be executed. Findings below are evidence from the current tree (file:line, quoted), cross-checked against the five commits' own claims in `.scratch/standard-mcp-distribution/spec.md`'s Comments section and the cited Verification Run. Where the spec's own "Checks I ran directly" claims were independently re-verified, they held.

### Standards compliance (AGENTS.md: no comments)
- Correct: every file plausibly touched by this diff is comment-free — `src/ui/target-label.ts`, `src/version.ts`, `scripts/check-bins.js`, `src/mcp/server.ts`, `src/mcp/service.ts`'s `listTools()`, `src/cli.ts`, `src/mcp/stdio.ts`. No violation found.

### Doc-sync invariants (maintain-visual-intent-layer/SKILL.md)
- Correct: `cli-setup`/`harness-registry`/`skills/visual-intent`/`visual-intent setup`/`--no-skill`/`pi.skills` have zero live hits outside historical ADRs and background notes carrying supersession headers (verified via repo-wide grep). `docs/background/*.md` all carry the promised supersession headers (`harness-mcp-setup-research.md:5`, `mcp-integration-research.md:5`, `product-strategy.md:5`, `release-and-prerelease-practices.md:5-6`). `README.md`'s anchor link `#the-same-server-without-an-agent` resolves to its own H3. `CONTEXT.md` has no "Harness Detection"/"Harness Registration" (D1 honored) and lists `Region` under Avoid (`CONTEXT.md:109`), matching `target-label.ts`'s three glossary-safe labels, wired at `src/ui/app.ts:2108`. `publish.yml` and `maintain-visual-intent-layer/SKILL.md` match the no-pre-release claims; `server.json`/`package.json` mcpName pairing exists.
- **Finding P1 — feature file contradicts the Verification Run it's supposed to record.** `.agents/skills/verify-visual-intent-layer/references/features/mcp-agent-loop.md` opens: `"_Not yet driven. Recipes are mapped; no live drive has confirmed them._"` But `.visual-intent-verify/runs/2026-09-18_11-31-30-standard-mcp-distribution/report.md` states under Coverage: `"Driven: ... mcp-agent-loop [mcp-open]"`. The feature-entry contract requires: *"once a live drive confirms some of them, the marker becomes `Partly driven live` and names which."* The marker was not updated. The index at `references/features/README.md:92` still files it under `"Third tier (mapped, not yet driven)"` rather than the `"Partly driven live"` section (line 77). Smallest fix: change the marker to `Partly driven live: mcp-open was driven; the rest are mapped.` and move the entry.

### Package/tarball (bin entries vs `files`)
- Correct: `package.json:24-30` excludes `dist/benchmark`, `dist/eval`, `dist/instrumentation`. Neither bin target (`dist/cli.js`, `dist/mcp/stdio.js`) nor their import graphs (`cli.ts`→`mcp/service.js`, `service/browser.js`, `service/http.js`, `service/launch.js`; `mcp/stdio.ts`→`../service/http.js`, `./server.js`, `./service.js`) reach the excluded dirs — only `instrumentation/measure.ts:8-9` imports `benchmark`, and nothing on the bin path imports `instrumentation`. `envelope/validate.ts:35` resolves `schema/` two levels up from `dist/`, matching the top-level `"schema"` files entry. No gap found.

### Issue tracker (docs/agents/issue-tracker.md)
- Correct: tickets 06 and 08 are `Status: done` with populated `## Comments` sections describing what landed; no rewritten history observed.

### Baseline smells
- None found that are new/reachable via this diff with evidence.

**Merge verdict: OK with notes** (one P1: stale coverage marker on `mcp-agent-loop.md` / its README index entry, contradicting the cited Verification Run).