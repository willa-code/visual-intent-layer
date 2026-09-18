# Ship a standard MCP server, and let each Harness do its own installing

Status: done

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

## Comments

**Implemented, 2026-09-18.** Landed in four commits on top of `a3c5b7b`:

- `3dc90cd` — the install story: `cli-setup.ts`, `harness-registry.ts` and their tests
  deleted with the `setup` verb and its four flags, `skills/` with the `pi` key, the
  packaged `mcp.json` and `check-bins`' pin check. README's install table names each
  Harness's registrar, verified against `codex mcp add --help` and
  `opencode mcp add --help` rather than copied from the deleted writer. ADR-0031
  supersedes 0014 in full and 0002's Skill clause.
- `ee676f6` — `serverVersion` in every open result, read from `package.json`; the four
  triggers ported into `open_visual_review`'s description; `mcpName` and `server.json`
  for the registry; `maintain-visual-intent-layer` rewritten, with Publish refusing a
  pre-release rather than publishing it to `latest`.
- `6d804bd` — ticket 06's doc sync, including the Lever's own `setup` command and the
  feature file that described it.
- `1358b49` — ticket 08: `describeTarget`'s fallback reads as words the glossary
  permits, moved to `src/ui/target-label.ts` so a node test can reach it.

**Verification Run:** `.visual-intent-verify/runs/2026-09-18_11-31-30-standard-mcp-distribution/`
— outcome `clean` at revision `1358b49` on a clean tree, evidence intact after cleanup
(six screenshots, the recording, the trace, an ARIA snapshot and the stored-state
read-back). Driven: `open-artifact` [open-html, open-identity, open-isolation,
open-faithful, open-health], `annotate-and-send` [select-box, annotate-note, queue-add,
send-next-pass, read-back], `mcp-agent-loop` [mcp-open]. Proven live: box → annotate →
queue → send produced a delivered Annotation whose target is a `region`, and
`open_visual_review` carried `serverVersion: "0.3.0-next.3"`.

Two behaviours have no live drive by construction and are held by tests instead: the
Area's fallback words, because a Lever-run Area carries a label, and the
browser-cannot-open sentence, because a run suppresses the browser and always has a
host. `open-artifact.md`'s Gotchas states both.

**The review of this change is not done.** A two-axis review was dispatched over
`f555a4d..HEAD` and both lanes failed on a provider billing error — `402`, first
`openrouter_in_flight_budget_exhausted` then `openrouter_credits` ("requires more
credits, or fewer max_tokens"). No review artifact was produced. Per the delegation
rules this is a lane infrastructure blocker: the run is reported rather than rerouted
to a different agent or CLI without the owner's approval.

Checks I ran directly instead, which are not a substitute for the independent review:
no live file references `cli-setup`, `harness-registry`, `skills/visual-intent`,
`visual-intent setup` or `--no-skill` — the only hits are inside ADR-0014 and ADR-0031
naming what was deleted; every relative markdown link in the three documents touched
resolves; and `npm pack --dry-run` shows 179 files with both bin entries, four schema
files, and neither `skills/` nor `mcp.json`.

**Blocking the release, not the change:** `latest` on npm is still `0.2.1`, so the
README's documented `@latest` command installs a product older than the entire
review-surface rework. The release has to happen for that claim to be true.

**Review, 2026-09-18 (the retry after credits were added).** Both axes came back *OK
with notes*. The Standards lane reported honestly that it had no shell, so it could not
run `git diff` and reviewed the tree against the commits' own claims instead; the Spec
lane checked each claim against the code. Four findings, all mine, all fixed here:

- **P1 — the feature map contradicted the Verification Run it exists to record.**
  `mcp-agent-loop.md` still opened with `_Not yet driven._` while the run's report
  lists `mcp-agent-loop [mcp-open]` under Coverage. The marker now says `mcp-open` was
driven over stdio and names the rest as mapped, the index moves the file from "Third
tier" into "Partly driven live", and the now-empty tier heading is gone with the sweep
order naming the two features instead of a tier.
- **P1 — the README never said the Registry listing exists.** Issue 06 required the
  replaced Install section to name the official MCP Registry as the discovery path,
  and ADR-0031's user story 4 is the same requirement. The mechanics were in
  `server.json` and the maintain skill, but a Builder-Reviewer reading the README would
  never learn of it. The Install section now names
  `io.github.willa-code/visual-intent-layer` and says the registry lists where to get
  the server rather than hosting it.
- **P2 — `package.json`'s keywords still claimed a capability the change removed:**
  `agent-skills` and `pi-package` survived the Skill and the `pi` manifest key. Both
  dropped.
- The Standards lane also confirmed, independently, the three checks I had run myself:
  no live reference to the deleted modules, every relative link resolving, and the
  tarball carrying what the bin entries need with the excluded dev tooling unreachable
  from either entry point.

One commit in this span (`31a335c`, the README deduplication) sits **after** the
reviewed range `f555a4d..05fce92`; it was found while the review ran and is recorded
rather than folded in.

**Released as 0.3.0, 2026-09-18.** The whole change shipped, so this feature is closed.

- `latest` names `0.3.0` and nothing else: the retired `next` channel is gone from the
  package's dist-tags. The tarball is 179 files with no dev tooling, no Skill and no
  packaged snippet, and the server inside it reports `0.3.0`.
- The official MCP Registry lists `io.github.willa-code/visual-intent-layer` at `0.3.0`.
  A new `registry-listing.yml` publishes it over GitHub OIDC on every stable release,
  so the listing no longer depends on a manual step after npm — and `mcp-publisher
  validate` caught a real error the first time it ran, because the registry caps
  `description` at 100 characters and the one written for the listing was 158.
- Two CI failures followed the release and both were mine. Changing the gallery's
  Pass-states panel moved the pinned render past its 3% tolerance, so the Linux
  baselines were re-recorded from the CI runner's own `gallery-actual` artifact and the
  darwin pair on the machine that renders them; `tokens.json` was unchanged, so the
  render moved and the design did not. Then the suite failed differently on two runs of
  the same commit, which is contention rather than a defect: CI gives the suite two
  cores while `browser-loop` and `lever-contract` each drive a real browser for about a
  minute. Files now run one at a time under CI. That is a mitigation, not a proven root
  cause, and the commit says what to do if it recurs.

**What this feature deliberately did not do:** `npm dist-tag rm` needs a one-time
password and cannot be driven from a non-interactive shell — npm masks its own auth URL
when its output is not a terminal, and a GitHub OIDC token is minted for `npm publish`
and refused for `dist-tag` with `E401`. The maintainer ran it in their own terminal. The
maintenance skill records both facts so the next person does not rediscover them.
