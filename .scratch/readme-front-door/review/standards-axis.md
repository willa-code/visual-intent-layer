## Review

Reviewed at HEAD (`56a9841`) against AGENTS.md, VISION.md, CONTEXT.md, `.agents/skills/writing-for-agents/SKILL.md`, and `spec.md`. I had no shell access, so the diff itself could not be read; every finding below is verified against the files as they now stand, and each is text the diff owns (README rewrite, new `docs/guide.md`, the skill and research edits); I flag the one place where I cannot rule out carry-over.

**Correct**
- README→`docs/guide.md` and guide→`../README.md` resolve; `docs/adr/`, `docs/agents/`, `docs/pi-validation.md`, `SECURITY.md`, `docs/background/` exist; guide.md:302-312's index matches its claim.
- Skill's Docs-sync list now names `docs/guide.md` (SKILL.md:56 region); the research-doc correction is the sanctioned "corrected" pattern, not Divergent Change. No Speculative Generality: the guide and its sections are each named in the spec's target list.
- `docs(repo)` is an allowed commitlint scope; body unverifiable without git — run `npm run lint:commits`.

**Findings**

1. **P1 — VISION.md, "Concise… A fact lives in one place" (normative).** `docs/guide.md:5` ("Installing, updating and uninstalling is [`README.md`](../README.md)") and `docs/guide.md:303` ("The front door — install, update, uninstall — is [`README.md`](../README.md)") state the same fact 300 lines apart. Both are new text; the old README could not have said either. Fix: drop the line-5 clause.

2. **P2 — Duplicated Code (baseline, judgement).** `README.md:94` and `docs/guide.md:45` carry the same fenced command **and** the same trailing comment ("# opens the browser, prints the review URL"). The panel only promised "one recovery clause behind" (spec.md, minimalist). Fix: keep the command, drop the comment, or point at the guide.

3. **P2 — two files asserting one fact differently.** `README.md:4-6` bounds it as "a saved HTML document, or a web app running on this machine" (excluding native window, design file, PDF); `docs/guide.md:23-25` says "a saved or generated HTML document, or a local running web application" and also excludes a mobile build. The door's go/no-go fact silently drops "generated" and "mobile build". Fix: mirror the guide's wording.

4. **P2 — CONTEXT.md vocabulary.** `docs/guide.md:62`: "approve, reject with another pass" uses the retired word `Rejected` (CONTEXT.md **Not Fixed**: "_Avoid_: … rejected"). If carried from the old README, the move is when it should have been fixed. Same class: `docs/guide.md:196` "snapshot bytes" names what `:97` correctly calls a **Captured View** (CONTEXT.md _Avoid_: "Snapshot"); `:9` lowercases the domain term "review surface".

5. **P2 — path convention contradicts the file's own link.** `docs/guide.md:304` declares "Paths in this file are from the repository root", but the file's only Markdown links are file-relative `../README.md` (`:5`, `:303`); following the declared convention breaks them.

6. **P2 — claim the reader cannot act on.** `README.md:76` says "`docs/guide.md` names the file each Harness keeps its entry in"; the guide (`:200-212`) names opencode/`opencode.jsonc`, `.mcp.json`, `.pi/mcp.json`, `~/.config/mcp/mcp.json` — never Claude Code's `~/.claude.json` (its local/user scope; `docs/background/harness-mcp-setup-research.md` §2). Fix: name it or soften the claim.

7. **P2 — the maintain skill now under-covers outside facts.** SKILL.md: "The install, update and uninstall lines in `README.md` are the one docs whose facts come from outside this repository" — after this move `docs/guide.md:200-212` carries Harness-owned removal facts (`opencode mcp` has no remove verb, `pi-mcp-adapter`'s `/mcp disable`). Extend that sentence to the guide's removal section, or Docs sync drops the verification its own completion criterion demands.

**Merge verdict:** OK with notes — fix 1; 2-7 are judgement calls the maintainer may take as follow-ups.