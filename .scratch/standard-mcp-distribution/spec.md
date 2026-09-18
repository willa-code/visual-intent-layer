# Ship a standard MCP server, and let each Harness do its own installing

Status: ready-for-agent

## Problem Statement

The product's install path is its most drift-prone code and its least honest surface.
`visual-intent setup` hand-verifies and hand-writes a per-Harness configuration matrix
— two specs' worth of paths, entry shapes and merge rules, plus ADR-0014's
content-verified registration — while every Harness that can register an MCP server
already ships its own registrar, and those registrars are always more current than our
copy. The audit found the concrete cost: `opencode` has `opencode mcp add`, and we
ignored it and hand-wrote `opencode.json` instead, with a refuse-and-print-snippet
fallback for comments.

Alongside it the product ships a Skill that carries trigger policy. Nobody has ever
measured whether it earns its place: `npm run eval:invocation` scores ten canned
strings against a regex in `src/eval/invocation.ts`, and its own output says it "checks
the documented routing policy, not live agent judgment", while the dogfood that would
have observed real behaviour is recorded as "closed — not performed".

The result is a product whose installation teaches the Builder-Reviewer to run our
command, and whose Skill claims a capability we have not shown is needed — at a moment
when the ecosystem provides the install channel itself: per-Harness registrars, the
official MCP Registry, and the Agent Plugins package format.

## Solution

The product becomes a standard local MCP server with a documented install line per
Harness and nothing else. `visual-intent setup` and the Harness Registry are deleted
with their tests and flags; the pi Skill is deleted, with `pi.skills` and `--no-skill`;
the packaged repo-root `mcp.json` is deleted with its release-time check. The
Builder-Reviewer registers the server using their own agent's mechanism, from a
documented command, and the product records which version is running so a report about
behaviour can name a build. Releases become official only — no `-next.N` versions, no
`next` dist-tag, no promotion step — and users install `@latest`. The server is listed
in the official MCP Registry so a client that queries it can offer us.

## User Stories

1. As a Builder-Reviewer, I want to register the server with my own agent's mechanism,
   so that I am not learning a second install tool.
2. As a Builder-Reviewer, I want the exact command to paste for my Harness, so that I
   do not have to derive it from a transport description.
3. As a Builder-Reviewer, I want the product to stop writing my Harness's config, so
   that my agent's own configuration is mine.
4. As a Builder-Reviewer, I want to find the server where clients look for MCP servers,
   so that discovering it does not depend on reading this repository.
5. As a Builder-Reviewer, I want the running build to say what version it is, so that a
   report about odd behaviour can name a release.
6. As a Builder-Reviewer on a machine that cannot show me a browser, I want to be told
   so in words, so that I know the review URL is the way in.
7. As a Builder-Reviewer, I want one version channel, so that "update" means the same
   thing as "install" and neither surprises me with a pre-release.
8. As a maintainer, I want the release process to stop carrying a pre-release branch, a
   promotion step and a packaged-snippet check that no longer measure anything.
9. As an agent, I want the tool surface to be self-describing, so that no Skill is
   needed for an explicit request and none can go stale against it.

## Implementation Decisions

- **Delete the install machinery.** `src/cli-setup.ts`, `src/harness-registry.ts`, their
  test files, the `setup` verb in `src/cli.ts`, the `--harness`/`--status`/`--print-only`/
  `--no-skill` flags, and the packaged-skill target. `src/service/browser.ts`'s
  `autoOpenSuppressed` survives; it belongs to `open`.
- **Delete the Skill.** `skills/`, `pi.skills` in `package.json`, and the Skill install
  in `files`.
- **Delete the packaged `mcp.json`** and `scripts/check-bins.js`'s pin check against it.
  What remains is checked for the two bin entries only.
- **Document, do not implement, per-Harness install.** `README.md` gains a short table
  naming the registrar for the Harnesses we can name today — Claude Code, Codex,
  opencode, and pi with `pi-mcp-adapter` — and one line saying any host that can launch
  a local stdio server works. No matrix of configuration paths survives anywhere in the
  product.
- **List in the official MCP Registry** under `io.github.willa-code/visual-intent-layer`,
  metadata only, pointing at the npm package.
- **Self-report the version.** The running server version appears in every
  `open_visual_review` result, so it travels with every review. The panel was unanimous
  here, and the reason is Honesty: a version that appeared only on failure would make
  its presence a judgment, and most odd behaviour never throws.
- **Official releases only.** `package.json` leaves the `-next.N` line at the next
  release; `publish.yml` loses its pre-release step; `maintain-visual-intent-layer` loses
  the pre-release, promote and dist-tag sections and the `mcp.json` pin check.
- **One ADR**, superseding ADR-0002's Skill clause and ADR-0014 in full, recording why
  install belongs to the Harness and why the product ships no Skill. It states the
  measurement that settled the Skill: the invocation eval tests a regex, and the dogfood
  was never performed, so the Skill is removed on the absence of evidence rather than
  against it.
- **`CONTEXT.md`'s vocabulary.** **Harness Detection** and **Harness Registration** lose
  their code footing and must either be deleted or rewritten to name the human act of
  registering with the Harness's own registrar. The panel is asked which.
- **The map and the docs follow.** `verify-visual-intent-layer`'s
  `setup-and-detection.md` is deleted with its index entries and the `$LEVER setup` line;
  `.scratch/ground-in-code/issues/06` carries the full doc-sync list.
- **Local-only is stated.** The README says to install on the machine where the screen
  is, now that no setup command can warn anyone. The detection half already landed.
- **`open --html` is kept and demoted** to the no-agent route rather than the headline
  path, and it stops being presented as if an agent were waiting for the envelope.

## Decisions, settled by the maintainer after the panel

| | Decision |
| --- | --- |
| **D1** | Delete **Harness Detection** and **Harness Registration** from `CONTEXT.md` and name no replacement. A Registration was current when its entry matched what the product would write — a property only the deleted writer could carry, so the word goes rather than being re-pointed. **Harness** itself stays. |
| **D2** | The running version appears in every `open_visual_review` result. |
| **D3** | Fix `describeTarget`'s fallback for `region` **and** `text-range`, in its own ticket — `CONTEXT.md:117` lists _Region_ under _Avoid_ for **Area**, so the card currently shows the Builder-Reviewer a word our glossary forbids, and a half-fix would ship a mixed voice. Filed as `.scratch/ground-in-code/issues/08`. |
| **D4** | Port the Skill's four trigger heuristics into `open_visual_review`'s description, which becomes the only trigger surface once the Skill is gone. |
| **D5** | Accept the loss of `--status` as a diagnostic, and document the workaround: the README says the Harness's own MCP panel is where a server that failed to start is explained. |

## Open decisions put to the advisor panel

1. **Which term, if any, replaces Harness Detection and Harness Registration** in
   `CONTEXT.md` — delete both, or name the human act?
2. **`describeTarget`'s last-resort fallback.** The card falls through to the bare kind
   word when the artifact offers no label, accessible name or semantic role. Should it
   read as human words, and does that belong to this change or its own?
3. **The four trigger heuristics in the Skill.** `skills/visual-intent/SKILL.md` carries
   four concrete triggers that no tool description states — naming a thing by location,
   comparing visible things, a prose correction that already missed, and wanting to
   verify a visual result rather than read a diff. `open_visual_review`'s description
   keeps only the compressed conclusion, "use this when pointing beats prose". Deleting
   the Skill drops the heuristics: port them into the description, or drop them knowingly?

## Advisor panel

The three lenses were asked three questions and answered them; the maintainer's
resolutions are in the table above.

- **Minimalist** (`advisors/minimalist.md`): delete both glossary terms and name no
  replacement, because nothing in the shipped surface says "Registration" any more and a
  proper noun for another tool's act is documentation about a fact we cannot verify.
  Version on every result. **Leave `describeTarget` alone** — "an area you drew" is a
  judgment wearing a fact's clothes, and "a fact and a judgment never share a word".
  Its concern: with the Skill gone the tool descriptions become the only trigger-policy
  surface, and nobody has measured that prose either.
- **Advocate** (`advisors/advocate.md`): delete both. Version on every result, because a
  Builder-Reviewer reports odd behaviour rather than errors. **Fix the fallback, and
  wider than the spec frames it** — `region` is on `CONTEXT.md`'s _Avoid_ list for
  **Area**, so the card shows the Builder-Reviewer the exact word our glossary forbids,
  and `text-range` falls through the same way. Its concerns: deleting the Skill must not
  take the four triggers with it, and `--status` leaves no way to diagnose a first
  attempt that did not work.
- **Precision and trust** (`advisors/precision-and-trust.md`): delete both, and do not
  rename — **Harness Registration**'s definition is "current when its entry matches what
  the product would write", a property only the deleted mechanism could carry, so
  reusing the word invites a warranty we no longer give. Version on every result. The
  fallback is two kinds, not one, and belongs to its own change. Its concerns: the
  registry listing is not a distribution surface for the four Harnesses we name, and the
  new ADR must say the version identifies the server process rather than certifying that
  the registration is current.

Verified while reading their claims: `CONTEXT.md:117` lists _Region_ under _Avoid_ for
**Area**; `labelOf` (`src/ui/artifact/layer.ts:164-167`) always seeds an element target's
label, so `element` never reaches the fallback while `region` and `text-range` do; and
`open_visual_review`'s description carries the conclusion but not the four triggers. The
panel's claims held up, and one line of this spec was self-contradictory: it stated the
version decision as settled and then re-posed it as open. That is fixed above.

## Testing Decisions

- Deleting install machinery removes tests with their subject; the replacements assert
  behaviour the Builder-Reviewer can see, not implementation: the version appears in the
  open result, and the browser-failure sentence appears in both the CLI output and the
  tool result.
- The Lever can certify the loop, the surface and the tool result. It cannot certify an
  install performed by a third-party registrar: every Lever run starts the product
  itself. A fresh-install check on each named Harness is therefore a named human step,
  recorded as such rather than implied.
- The registry listing is checked by hand once, against the registry's own validator.

## Out of Scope

- Agent Plugins manifests, `.mcpb` bundles, and per-Harness plugin packaging. The
  registry listing is a discovery listing, not a distribution surface: the four
  Harnesses named above install through their own registrars, and no evidence yet shows
  any of them consulting the registry. A plugin format can come later, on evidence that
  a client we care about needs one.
- A CLI-verb-driven loop as a second product surface. Considered and deferred: the MCP
  surface is self-describing and the CLI already opens a review, so no second loop is
  built until a host that cannot reach MCP is a real case.
- Compatibility with a pre-existing `visual-intent setup` Registration. The product no
  longer reads or repairs one, and the release notes say so.
- Windows-specific configuration paths, which the deleted registry was the only place
  to name.
