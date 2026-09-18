# 06: Sync the documents that describe the outgoing install story

Status: done

**What to build:** Every `STALE` item in `findings.md` §2, landed together with the
change so no document describes a command that has been deleted. Recorded here rather
than in the change spec because these are document edits with a fixed target: the
documents must end up describing the world the change creates.

- [x] `README.md` — replace the whole Install section, both tables, `### Transport` and
      `### Setup flags` with one install section: register the MCP server with your own
      Harness's registrar, the two transport forms to enter by hand, and the official MCP
      Registry listing as the discovery path. Delete the `+ Skill` cells, the `--no-skill`
      bullet, the Layout bullet for `skills/`, the packaged-`mcp.json` sentence, and the
      pre-release paragraph in "Maintaining this package".
- [x] `CONTEXT.md` — **Harness Detection** and **Harness Registration** lose their code
      footing. Either delete both terms or rewrite them to name the human act of
      registering with the Harness's own registrar, with no product-side detection or
      write. Whichever is chosen, say why in the Comments.
- [x] `SECURITY.md:11-14` — drop the `0.3.0-next.x` / `next` tag sentence.
- [x] `docs/pi-validation.md:14-15` — drop the `visual-intent setup` prerequisite; steps
      1–8 are unaffected because none of them depends on `setup`.
- [x] `docs/adr/0014` — mark superseded, naming what replaced it. `docs/adr/0002`'s Skill
      clause goes with ticket 03's header.
- [x] `docs/background/` — add a supersession header to `harness-mcp-setup-research.md`,
      `mcp-integration-research.md` §4 and its Skill recommendation,
      `release-and-prerelease-practices.md`'s recommendation section, and the Skill
      clause at `product-strategy.md:151,173`. Reference material stays; only the
      recommendation and the setup-behaviour sections become historical.
- [x] `verify-visual-intent-layer` — delete `references/features/setup-and-detection.md`,
      its two index entries in `references/features/README.md`, and the `$LEVER setup`
      line in `SKILL.md:141`; drop "the setup version and" from
      `mcp-agent-loop.md:37`.
- [x] `maintain-visual-intent-layer/SKILL.md` — remove the pre-release paths, the
      Promote section, the `-next.N` guidance, the `mcp.json`/`check-bins` pairing, and
      the `cli-setup`/`harness-registry` source bullet; add a registry-listing step once
      decision 6 has a mechanism.

**Acceptance:** no in-scope document names `visual-intent setup`, `--no-skill`, a `next`
dist-tag, the packaged root `mcp.json`, or a product-installed Skill.

**Evidence:** `audit/01-readme.md`, `audit/04`, `audit/06`, `audit/07`, `audit/08`.

## Comments

Landed with the change in `3dc90cd`, `ee676f6` and their documentation commit.

`README.md`'s Install section became a per-Harness command table, and the two
commands in it were verified against the real CLIs rather than our deleted writer:
`codex mcp add <NAME> -- <COMMAND>` from `codex mcp add --help`, and
`opencode mcp add [name]` from `opencode mcp add --help` (interactive, so the table
says to give it the command when it asks). The user-global and per-Harness budget
flags are gone from the README with the verb. `CONTEXT.md` lost **Harness Detection**
and **Harness Registration**; `SECURITY.md` lost the `next`-tag sentence;
`docs/pi-validation.md` lost the `setup` prerequisite and now says the entry goes in
through pi's own mechanism.

ADR-0014 carries a full supersession header and ADR-0002 gained the ADR-0031 header
beside its ADR-0018 one. The four background notes most affected gained headers rather
than rewrites, since `docs/background/README.md` already frames that directory as kept
for provenance: the Harness setup research now says its sections 1–9 remain useful
reference for a human registering by hand while sections 7, 10 and 11 analyse a command
that no longer exists, and the pre-release note says its recommendation was implemented
and is now withdrawn while the npm mechanics stand.

The Lever carried its own `setup` command, which would have failed against the deleted
verb. `commandSetup` and its three references — the feature id list, the help line and
the command map — are removed, and the executable still parses. The feature map lost
`setup-and-detection.md` with its two index entries and the `$LEVER setup` line, and
`mcp-agent-loop.md` no longer claims a setup version is recorded with a run.

Completion: no in-scope document names `visual-intent setup`, `--no-skill`, a `next`
dist-tag or a product-installed Skill — checked with a repository-wide search, whose
only remaining hits are inside the historical note and its supersession header.
