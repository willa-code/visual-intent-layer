# Ship a front-door README, and move the product manual under `docs/`

Status: done

## Problem Statement

`README.md` is both the front door and the whole product manual: 337 lines under
9 H2 headings and 7 H3 subheadings. A Builder-Reviewer who wants to register the
server reads four paragraphs of interaction design before reaching the install
table, and someone who wants to understand the Review Surface has to know the
manual lives in the README at all. The cost is paid in both directions: every
install-page reader pays for the manual, and every manual reader pays for the
install page.

Two things the front door needs are also missing. There is no **uninstall** —
the README never says how to take the server back out, which is the first
question after a first attempt that did not work. There is no **update** action
worth the name; the README says only that `@latest` means nothing to do. And the
**pi** row is the only Harness row with no concrete entry to paste, even though
pi is the Harness this repository is developed and dogfooded on.

## Solution

`README.md` becomes the front door and nothing else: what this is in one short
paragraph, requirements, install per Harness with the pi entry written out,
update, uninstall, the two facts that decide whether it can work at all, and one
pointer into `docs/`. The product manual moves to a single Markdown file under
`docs/`. A later split into `docs/guide/` is anticipated and deliberately not
done now: one file is enough until a section outgrows it.

### Proposed README outline

Four headings, ~90 lines. Update, uninstall and troubleshooting are `###`
subheadings of **Install** rather than top-level sections: the user asked for
them to stay, and each is one fact that does not earn a heading of its own.

1. **`# Visual Intent Layer`** — two sentences: the loop (point at what you see,
say what should change, verify by hand) and the artifact boundary, which is the
reader's go/no-go fact. No proper nouns at the door.
2. **`## Install`** — Node 20+, no hosted account; the per-Harness table as it
is today; the `pi` entry spelled out; the global-install form; the MCP Registry
listing; the two facts that decide whether it can work at all (install on the
machine where you look at the screen, and restart the agent).

   - **`### The pi entry`** — the `mcpServers` block for the published package
     and where it goes, by filename: project `.mcp.json` (shared; merged into
     `mcpServers`, never replacing the file) or `.pi/mcp.json` (the Pi project
     override), with `~/.config/mcp/mcp.json` for every project. Names
     `pi-mcp-adapter` and its version, and says project scope means that project
     only. The adapter's `/mcp` panel is the no-hand-editing route.
   - **`### Update`** — npm resolves `@latest` when npx fetches; a Harness that
     caches the resolved command may serve what it resolved
     (`pi-mcp-adapter` caches for 24 hours); pinning means editing the entry; a
     global install means `npm install -g visual-intent-layer@latest`. Checking
     what is current: `npm view visual-intent-layer version`.
   - **`### Uninstall`** — the act, plus the verbs a Harness actually ships
     (`codex mcp remove visual-intent-layer`, `claude mcp remove
     visual-intent-layer`), plus the two facts we own: `npm uninstall -g
     visual-intent-layer`, and that uninstalling deletes no data — Annotations
     and attachments stay in `~/.visual-intent-layer/data` until you remove that
     directory. No per-Harness config matrix; the guide carries the detail.
   - **`### If the tools do not appear`** — restart the agent; run the exact
     command by hand, which separates Node and npm from the Harness; the
     Harness's own MCP panel names the server and why it failed; and the no-agent
     recovery, `visual-intent open --html …`.
3. **`## Documentation`** — one line naming what is in `docs/guide.md` (the
surface, the tools, the data, develop) plus `SECURITY.md`, and a short explicit
list of the records that qualify the front door: the ADRs and
`docs/pi-validation.md`.
4. **`## License`** — one line.

### Proposed `docs/` target

One file, `docs/guide.md`, holding what leaves the README, in its order: the
loop and the no-agent CLI route; the surface (rail and tiles); the Annotation
model; resolution and honesty; Check-In as a convention; the four MCP tools;
environment and data, with the per-Harness uninstall detail; the envelope schema;
security and privacy; develop; layout; the `docs/` index (which otherwise has no
index file, so `docs/adr/` and `docs/agents/` would become unreachable); and
`Maintaining this package`. Contributor material moves because it serves someone
working in this repository, not someone registering the server. Nothing is
deleted except `Layout`'s tree restatement, which the tree already says.

## Open decisions put to the advisor panel

1. **How short is the identity paragraph?** One paragraph against today's four,
   and which of the four claims (the loop, the Annotation as unit of work,
   several targets and relations, the browser-rendered boundary) survives the
   front door if the rest moves.
2. **Do uninstall facts belong in the README at all?** The last feature
   (`.scratch/standard-mcp-distribution/`) removed per-Harness configuration
   facts as the most drift-prone surface in the product, and removal commands
   are Harness-owned in the same way: `codex mcp remove <name>` and
   `claude mcp remove <name> --scope <scope>` are verbs those Harnesses ship,
   `opencode mcp` has no remove verb at all, and pi has `/mcp disable` rather
   than a removal. State a command per Harness anyway, or state the act and let
   the Harness own the verb?
3. **Contributor material: move or stay?** `Develop` and `Layout` serve someone
   working in this repository, not someone registering the server. Do they
   belong in the same `docs/` file, in the README below the fold, or in their
   own `docs/development.md` (which breaks the one-file plan)?
4. **The no-agent CLI route** — `visual-intent open` / `serve` — is a real
   second entry to the loop. Front door, or guide?
5. **Does the README keep a `docs/` index** (today's `Documentation` section
   lists `docs/adr/`, `docs/background/`, `docs/pi-validation.md`,
   `docs/agents/`), or fold to one link and let the directory index itself?

## Panel findings that change this proposal

Each was verified against the file or command named, not accepted on assertion.

- **pi is the least verified Harness and would have been the most elaborated
  one.** `docs/pi-validation.md:8` reads `awaiting-human` and
  `docs/background/harness-mcp-setup-research.md:58` calls the adapter
  unverified. What *is* first-party: `pi-mcp-adapter` 2.34.0 loads project
  `.mcp.json` with `mcpServers` entries (`config.ts:20,318`;
  `README.md:35,43-49`), and `.pi/mcp.json` is its project override
  (`README.md:60-61`). The README's pi block therefore ships with the adapter
  named and its version recorded, and `docs/pi-validation.md` stays
  `awaiting-human` for the loop itself.
- **The `@latest` update promise is false where the Harness caches.**
  `pi-mcp-adapter` caches a resolved bin for 24 hours keyed by the spec string
  and skips the version check for a non-exact spec (`npx-resolver.ts:9,56-66`),
  and `~/.pi/agent/mcp-npx-cache.json` currently records
  `packageVersion: "0.3.1"`. npm resolves the current release when npx fetches;
  a Harness that caches a resolved command may serve what it resolved.
- **The failure path needs the cheapest test.** One paste separates "Node and
  npm" from "my Harness", which a Harness's own panel cannot:
  `npx -y --package visual-intent-layer@latest visual-intent-mcp` prints
  `visual-intent review service on http://127.0.0.1:<port>` to stderr
  (`src/mcp/stdio.ts:14-18`). Run here: it printed the line on port 3742.
- **Uninstall is one act plus two facts we own, not a matrix.** `opencode mcp`
  has no remove verb (`opencode mcp --help`: add, list, auth, logout, debug) and
  its live config here is `~/.config/opencode/opencode.jsonc`; pi's
  `/mcp disable` persists a `disabled` flag and never removes the entry. The
  facts the product owns are `npm uninstall -g visual-intent-layer` and that
  uninstalling deletes no data — `~/.visual-intent-layer/data` survives, and
  `package.json` has no uninstall hook (`src/cli.ts:38`).
- **The moved manual needs a maintainer path.** `maintain-visual-intent-layer`
  names the documents its Docs sync corrects (`SKILL.md:56`); `docs/guide.md`
  joins that list in this change, and the removal and update facts join the
  verification the skill already requires (`SKILL.md:52-55`).
- **`## Maintaining this package` had no home** in the outline or the target
  list. It moves to the guide's tail with `Develop` and `Layout`.
- **Nothing owns the hand link check.** No link checker exists in `scripts/`,
  so the one hand check is recorded in the Comments rather than implied.

## Constraints

- The maintainer skill's Docs sync reads `README.md` and must still pass: every
  behaviour a current doc names matches its environment source, no current doc
  carries vocabulary the build removed, and every internal link resolves. No
  link checker exists in `scripts/`, so this is checked by hand.
- `docs/background/harness-mcp-setup-research.md`'s preamble says "the README's
  install table points at it". If the install table stays but the pointer moves,
  that sentence is corrected rather than left false.
- Nothing here changes the running product. The Lever cannot drive a README, so
  verification is the Docs sync, a hand link check, and a rendered read of both
  files rather than a Verification Run.

## Out of Scope

- Creating `docs/guide/` or splitting the manual into per-topic files.
- Rewriting what the manual says. The sections move as they are, with stale
  claims fixed in the same sweep and nothing else.
- The `docs/adr/`, `docs/background/` and `docs/agents/` trees.

## Advisor panel

Three lenses were asked the five questions above, each reading `VISION.md` and
this spec, working independently and in parallel. Their POVs are kept beside
this file under `advisors/`.

- **Minimalist interaction designer** (`advisors/minimalist.md`): one sentence,
  not a paragraph — keep the loop and fold the browser boundary into
  Requirements as a clause. **No per-Harness uninstall table**; removal lives in
  the Harness's own config and a table ships a wrong word at best. `Develop` and
  `Layout` go to the same guide file, trimmed. The CLI route is guide material.
  One link at the door. Its reversals: the ten-item outline is itself the
  overwhelm — fold to six headings, ~80 lines — and uninstall does not deserve a
  top-level heading.
- **User advocate** (`advisors/advocate.md`): one paragraph, keeping the loop and
  the browser-rendered boundary, because the boundary is the reader's go/no-go
  fact. **Yes to uninstall, as act plus verb**, with the file named where no verb
  exists: "your Harness owns the verb" sends a stuck reader to another doc at the
  worst moment. One guide file, not two; the CLI route leaves one recovery clause
  behind. Its reversals: the pi entry is not paste-ready without real filenames,
  a merge warning and a scope warning; and the failure section is missing the
  by-hand command test.
- **Precision and trust** (`advisors/precision-and-trust.md`): one paragraph,
  dropping "no prose location descriptions, no lost context" as a judgment
  wearing a fact's clothes. **No removal matrix** — ADR-0031 made a Harness's
  config its own business — with `codex mcp remove <NAME>` as the one verified
  verb, plus the two facts we own. Move the contributor material, but the
  maintain skill's Docs-sync list must gain the new file in the same change. Keep
  a short explicit `docs/` list, because it is the route to the records that
  qualify the front door's own claims. Its reversals: do not elaborate the pi row
  while `docs/pi-validation.md` says `awaiting-human`; and the `@latest` update
  promise is false where a Harness caches the resolved command.

## Comments

**2026-09-18 — panel run, and the checks behind its claims.** All three advisors
completed and wrote their own POV files. Verified while reading them: `README.md`
is 337 lines under 9 H2 and 7 H3 (this spec's "seventeen H2" was wrong and is
fixed); `src/mcp/stdio.ts:14-18` prints the service line to stderr and the command
printed it on port 3742; `src/cli.ts:9-22` has no `--version`; `package.json` has
no uninstall hook; `npm ls -g` here reports `visual-intent-layer@0.1.0` against
`0.3.1` as `latest`; `~/.pi/agent/mcp-npx-cache.json` records
`packageVersion: "0.3.1"`; `opencode mcp --help` has no remove verb and the live
config is `opencode.jsonc`. Reported unverified rather than assumed: the `claude`
CLI is not installed on this machine, so `claude mcp remove <name> --scope
<scope>` rests on Claude's own documentation, the same standing as the install
table's Claude row; "restart the agent" is unverified for codex and opencode; and
the 24-hour npx cache was read from source, not reproduced with a release in
flight.

**Decisions taken by the maintainer.**

| | Decision |
| --- | --- |
| **D1** | The README opens with two sentences — the loop and the artifact boundary. The Annotation, the multi-target model and the honesty prose move to the guide; "no prose location descriptions, no lost context" is dropped as a judgment rather than a fact. |
| **D2** | Uninstall is the act plus the verbs that exist, plus the two facts we own: `codex mcp remove visual-intent-layer`, `claude mcp remove visual-intent-layer`, `npm uninstall -g visual-intent-layer`, and that uninstalling deletes no data. No per-Harness removal matrix at the door; the guide names the file each Harness keeps its entry in. |
| **D3** | The pi entry is spelled out in the README with real filenames, the merge warning and the project-scope warning. `pi-mcp-adapter` is named; its version is recorded in this spec rather than the README, because a live document claiming a verified adapter version goes stale silently — the maintain skill now checks it during Docs sync. `docs/pi-validation.md` stays `awaiting-human` for the loop itself. |
| **D4** | Update is stated honestly: npm resolves `@latest` when npx fetches, and a Harness that caches the resolved command may serve what it resolved. |
| **D5** | Contributor material and `Maintaining this package` move to the guide's tail, and the guide keeps the `docs/` index, because `docs/` has no index file of its own. |
| **D6** | One guide file, not a `docs/guide/` tree. A split is anticipated, not done. |
| **D7** | The troubleshooting section leads with the by-hand command, which was run and prints the service line, and keeps one no-agent recovery command. |
| **D8** | `Layout` moves whole. The gallery-procedure paragraph and the module list both say things the file tree does not, so neither is trimmed in this change. |
| **D9** | `docs/guide.md` ships in the package: `package.json`'s `files` names it, so the README's Documentation link resolves for someone reading the installed tarball, who has no repository to fall back on. `docs/` still ships as one file, not the tree. |

**D1 clarified, not rewritten.** D1 says the judgment sentence "no prose location
descriptions, no lost context" is dropped. It is dropped from the front door and
kept in the manual, where the argument is set out and `CONTEXT.md` and `VISION.md`
govern its wording. The door is a door; the manual is where a reader goes to read
the thesis.

**2026-09-18 (later) — the two-axis review over `ce5c551..56a9841`, and what it
changed.** Both lanes ran and both returned, with their reports kept at
`review/standards-axis.md` and `review/spec-axis.md`. The corrections are a second
commit rather than an amendment, because the reviewed revision is a record.

- **Two false statements, both fixed.** The README said a restart clears the cached
  command; `pi-mcp-adapter` reads its cache from disk, so a restart re-reads the
  same entry (`npx-resolver.ts:503-507`). It now names
  `~/.pi/agent/mcp-npx-cache.json` as the thing to delete. And the recovery command
  was `visual-intent open …`, a bin the README never installs; it is now the npx
  form, run here, which printed a review URL for `fixtures/gallery.html`.
- **Vocabulary corrected to what the surface ships.** "reject with another pass" and
  "snapshot bytes" named words `CONTEXT.md` lists under _Avoid_; they now read
  Approve / Not Fixed / Mark obsolete — the labels in `src/ui/components.ts:366-387`
  — and Captured View bytes. A lowercase "review surface" became **Review Surface**.
- **One fact, one place.** The guide's opener repeated the front door's location,
  which the guide's own Documentation section states, so the clause is gone, and the
  README's recovery command no longer repeats the guide's block verbatim.
- **Filenames and claims a reader can act on.** The global opencode config can be
  `opencode.jsonc`; the pi route is `/mcp setup` rather than the `/mcp` panel; the
  global-install form is given as a command; the boundary sentence mirrors the
  guide's ("generated", "mobile build"); and the claim about the guide naming each
  Harness's entry file is now "the Harnesses that keep one", because Claude Code's
  config is not a file the guide can name without asserting something unverified.
- **The maintain skill's outside-facts rule extends to the guide's removal section**,
  not only the README, so Docs sync still covers what the product does not own.

**2026-09-18 (later) — the manual ships, because the link was dead without it.**
Asked whether the version moves: it does not. No shipped behaviour changed, and a
release is a deliberate act here, so `0.3.1` stands until a release is cut. But the
question surfaced a real gap: `npm pack --dry-run` showed 179 files with no `docs/`
entry, so the README's Documentation link was dead for anyone reading the installed
package, and npm's page keeps the previous README until the next publish, since
`README.md` always travels in the tarball.

D9 was taken in response: `package.json`'s `files` now names `docs/guide.md`, the
tarball is 180 files carrying exactly one `docs/` entry, and the maintain skill's
Preflight asserts it (`npm pack --dry-run --ignore-scripts 2>&1 | grep -q
"docs/guide.md"`) with Docs sync holding the rule behind it: what the README points
at ships.

**Released as 0.3.2, 2026-09-18.** Tag `v0.3.2` at `d282749`, the release commit;
the tarball is built from it. Verified after the workflows went green: npm's `latest`
names `0.3.2`; the packed tarball is 180 files carrying `README.md` and
`docs/guide.md` and no `dist/benchmark`, `dist/eval` or `dist/instrumentation`; an
installed copy reports `SERVER_VERSION` `0.3.2` (`src/mcp/server.ts:74`); and the
registry lists `0.3.2` active beside `0.3.1` and `0.3.0`.

Three things this release measured, now recorded in the maintain skill rather than
re-learned:

- **`gh release create --target <short sha>` is refused** — `tag_name is not a valid
tag`, `Release.target_commitish is invalid`. The working path is a lightweight tag at
the release commit, pushed, then `gh release create --verify-tag`, and the tag is also
the ref the Publish workflow checks out.
- **The Preflight tarball check I added could never pass**: `npm pack` writes its file
list to stderr, so `| grep -q` read nothing. Fixed in `e248033` with `2>&1`, verified
in both forms before and after the change.
- **The listing retry carried a release on its own for the first time.** npm reported
`+ visual-intent-layer@0.3.2` while the packument still served `latest: 0.3.1` for
about ninety seconds; the listing workflow retried into that window and went green
with no hand dispatch, which is the fix 0.3.1 needed by hand.
