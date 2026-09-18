# User advocate — readme-front-door

## 1. How short is the identity paragraph

One paragraph, and it keeps two of the four claims: the loop (`README.md:3-5`) and
the browser-rendered boundary (`README.md:14-16`). The other two — the Annotation as
unit of work and multi-target relations — answer questions only a committed reader
asks, so they belong in `docs/guide.md`. The boundary sentence stays because it is a
*go/no-go* fact: a reader with a native window, a design file or a PDF decides here
whether this product can ever serve them. Removing it moves that judgment into the
guide, i.e. into the reader's head after they have already installed.

## 2. Do uninstall facts belong in the README

Yes, and as act plus verb, with the file named where no verb exists. The reader asking
is the one whose first attempt failed, at their lowest patience. I verified
`opencode mcp --help`: `add`, `list`, `auth`, `logout`, `debug` — no remove, and no path
printed. So opencode's removal act is editing `opencode.json`/`opencode.jsonc`
(project) or `~/.config/opencode/opencode.json`
(`.scratch/multi-harness-setup/issues/03-opencode-registration.md:18`). Codex does
have `remove` (verified `codex mcp --help`). pi's `/mcp disable <server>` "persist[s]
only the `disabled` field in the project-local `.pi/mcp.json`" and "the source file is
never rewritten" (`pi-mcp-adapter` README:78) — that is not removal, so say plainly
that the entry must be deleted from the file you added it to. "Your Harness owns the
verb" sends a stuck reader to another doc at the worst moment.

## 3. Contributor material

Out of the README, into the *same* guide file, not a second `docs/development.md`. A
reader who does not know this repository cannot guess which of two docs holds the
answer; one file costs a scroll, two cost a wrong turn.

## 4. The no-agent CLI route

Guide — with one clause left in the README's troubleshooting section, because
`visual-intent open --html ./checkout.html` (`README.md:62`) is the only way a reader
whose registration failed can see the product work today. That clause turns a dead end
into a next step.

## 5. `docs/` index

Fold to one link plus `SECURITY.md`, but name what is inside it ("the product manual:
surface, tools, data, develop"). A bare `docs/` is a directory to explore; today's
list (`README.md:319-326`) says what is there.

## (a) Decisions I would reverse

**The pi entry is not paste-ready as specified.** Spec §4 says the block goes in
"project `.mcp.json` (shared) or a Pi-owned override" (`spec.md:39`) — "a Pi-owned
override" is not a filename. The adapter names two: `<Pi agent dir>/mcp.json`
(`~/.pi/agent/mcp.json`) and `.pi/mcp.json` (`pi-mcp-adapter` README:60-61, file-layout
table 113-114). Print the path. Also say the block is *merged* into `mcpServers` — this
repository's own `.mcp.json:1-7` already holds `context7`, so a reader who replaces the
file loses a server — and say that project scope means the server exists in that
project only. That is the exact place a real reader stops: they paste into `.mcp.json`,
run pi in another directory, see no tools, and call the install broken.

**The failure section is missing its cheapest test.** Spec §7 rests on the Harness's own
MCP panel (`spec.md:47`), which for pi presupposes the adapter is installed. Add: run
the exact command by hand. `npx -y --package visual-intent-layer@latest
visual-intent-mcp` prints `visual-intent review service on http://127.0.0.1:3742` to
stderr (`src/mcp/stdio.ts:14-18`). One paste separates "Node/npm" from "my Harness",
which the panel cannot.

## (b) What the spec is silent on

**Which build they have.** `serverVersion` rides `open_visual_review` results — the
call that never arrives when a reader is stuck. `visual-intent --help`
(`src/cli.ts:9-22`) names no version and there is no `--version`. Give the check in
Update: `npm ls -g visual-intent-layer` or `npm view visual-intent-layer version`. Not
hypothetical: `npm ls -g` here reports `visual-intent-layer@0.1.0` against a 0.3.1
`latest`, and `.scratch/multi-harness-setup/issues/06-live-verification.md:26` records a
Harness reporting `failed`/`ENOEXEC` for exactly that stale global bin.

**Uninstall leaves data behind.** `README.md:221` puts the data directory at
`~/.visual-intent-layer/data` and `README.md:222-223` says Annotations, sessions,
attachments and snapshot bytes live there. Removing the entry and the global package
leaves every reviewed artifact's annotations on disk. Either say it or the uninstall
is not complete.

**The global-install form has no JSON shape.** `README.md:37` gives a shell command;
pasted into pi's or opencode's JSON it is a broken entry. The JSON is
`{"command": "visual-intent", "args": ["mcp"]}`.
