# 06: Sync the documents that describe the outgoing install story

Status: ready-for-agent
**Trigger:** the `standard-mcp-distribution` spec is written and the setup deletion lands — 2026-09-30

**What to build:** Every `STALE` item in `findings.md` §2, landed together with the
change so no document describes a command that has been deleted. Recorded here rather
than in the change spec because these are document edits with a fixed target: the
documents must end up describing the world the change creates.

- [ ] `README.md` — replace the whole Install section, both tables, `### Transport` and
      `### Setup flags` with one install section: register the MCP server with your own
      Harness's registrar, the two transport forms to enter by hand, and the official MCP
      Registry listing as the discovery path. Delete the `+ Skill` cells, the `--no-skill`
      bullet, the Layout bullet for `skills/`, the packaged-`mcp.json` sentence, and the
      pre-release paragraph in "Maintaining this package".
- [ ] `CONTEXT.md` — **Harness Detection** and **Harness Registration** lose their code
      footing. Either delete both terms or rewrite them to name the human act of
      registering with the Harness's own registrar, with no product-side detection or
      write. Whichever is chosen, say why in the Comments.
- [ ] `SECURITY.md:11-14` — drop the `0.3.0-next.x` / `next` tag sentence.
- [ ] `docs/pi-validation.md:14-15` — drop the `visual-intent setup` prerequisite; steps
      1–8 are unaffected because none of them depends on `setup`.
- [ ] `docs/adr/0014` — mark superseded, naming what replaced it. `docs/adr/0002`'s Skill
      clause goes with ticket 03's header.
- [ ] `docs/background/` — add a supersession header to `harness-mcp-setup-research.md`,
      `mcp-integration-research.md` §4 and its Skill recommendation,
      `release-and-prerelease-practices.md`'s recommendation section, and the Skill
      clause at `product-strategy.md:151,173`. Reference material stays; only the
      recommendation and the setup-behaviour sections become historical.
- [ ] `verify-visual-intent-layer` — delete `references/features/setup-and-detection.md`,
      its two index entries in `references/features/README.md`, and the `$LEVER setup`
      line in `SKILL.md:141`; drop "the setup version and" from
      `mcp-agent-loop.md:37`.
- [ ] `maintain-visual-intent-layer/SKILL.md` — remove the pre-release paths, the
      Promote section, the `-next.N` guidance, the `mcp.json`/`check-bins` pairing, and
      the `cli-setup`/`harness-registry` source bullet; add a registry-listing step once
      decision 6 has a mechanism.

**Acceptance:** no in-scope document names `visual-intent setup`, `--no-skill`, a `next`
dist-tag, the packaged root `mcp.json`, or a product-installed Skill.

**Evidence:** `audit/01-readme.md`, `audit/04`, `audit/06`, `audit/07`, `audit/08`.
