# Ship a standard MCP server, and let each Harness register it

**Supersedes ADR-0014 in full, and supersedes ADR-0002's Skill clause.**

The product publishes a standard local MCP server and nothing that installs it. The
Builder-Reviewer registers the server with their own Harness's own mechanism, from a
documented command. There is no `setup` command, no Harness detection, no configuration
the product writes, and no Skill in the published package. The one thing the product
still says about itself is its own version, which travels with every review.

**Why the install machinery goes.** Every Harness that can register an MCP server ships
a registrar that is more current than our copy of its format, and our copy was the most
drift-prone code in the repository: two specs' worth of hand-verified configuration
paths, entry shapes and merge rules, each of which moves when the Harness moves. The
audit that produced this decision found the cost in a single line of code — `opencode`
ships `opencode mcp add`, and we ignored it and hand-wrote `opencode.json` instead, with
a refuse-and-print-snippet fallback for files carrying comments. A writer we own can
only ever be a worse version of a writer the Harness already has.

ADR-0014's guarantee dies with the writer. A Registration was *current* when its entry
matched what the installed product would write, and *outdated* when it differed — a
comparison only the writing product can make. Nothing replaces it, because nothing can:
what a Harness's configuration holds is now that Harness's business and the product
observes none of it. The replacement is a documented command per Harness and the
Harness's own panel as the place a failure is diagnosed.

**Why the Skill goes.** Not against evidence, but on its absence. `src/eval/invocation.ts`
scores ten canned strings against a regular expression, and its own output says it
"checks the documented routing policy, not live agent judgment"; the dogfood that would
have observed live judgment is recorded in `.scratch/visual-intent-layer/dogfood.md` as
"closed — not performed". What *is* proven is that explicit invocation works from the
tool description alone, which the protocol tests assert with no Skill installed. A
published artifact carried on intuition rather than measurement is the thing this
decision removes.

The Skill did carry one thing worth keeping: four concrete triggers — naming a visible
thing by location, comparing visible things, a prose correction that already missed, and
wanting to verify a visual result rather than read a diff. Those move into
`open_visual_review`'s description, because after this the description is the only
surface that can trigger the loop, and a description that says only "use this when
pointing beats prose" does not get an agent there.

**Distributing.** npm carries the package; the official MCP Registry carries a listing.
The listing is discovery, not a distribution surface: the four Harnesses this product
names install through their own registrars, and nothing yet shows any of them consulting
the registry. The listing points at the npm package and nothing else.

**The version the server reports** identifies the process that answered the call. It is
not a statement that the Harness's configuration is correct, and it must never be read
as one — that check does not exist any more.

**Consequences.** `src/cli-setup.ts`, `src/harness-registry.ts` and their tests are
deleted, with the `setup` verb and its flags; `skills/`, the `pi` manifest key and the
packaged `mcp.json` leave the published package. The CLI keeps `mcp`, `serve` and `open`.
The Builder-Reviewer's cost moves from running our command to pasting their Harness's,
which is one action either way and does not teach a second tool. Diagnosing a first
attempt that did not work becomes the Harness's job, so the README says where to look.
Releases become official only: with no promotion step to validate, there is no
pre-release channel to promote from, and `latest` always names the newest release.

**Considered options.** A generic writer driven by Harness descriptors was rejected as
the same drift with less correctness. An Agent Plugins manifest (`plugin.json`,
`skills/`, `mcp.json`) was deferred rather than rejected: clients are beginning to load
it, but no Harness this product names needs one, and adopting a package format nobody
reads yet is the speculative work this decision exists to avoid. Keeping the Skill and
measuring it later was rejected because the measurement is exactly what was skipped.
A CLI-driven loop as a second product surface was deferred: the MCP surface is
self-describing, the CLI already opens a review, and no host that cannot reach MCP has
been reported.
