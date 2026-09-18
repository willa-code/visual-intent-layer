## Review

**(a) Missing or partial**

1. Spec outline item 2 requires "the global-install form". README never gives it: only "With the package installed globally, the entry's `command` is `visual-intent`" (README.md:53-55) and, under Update, "A global install updates with `npm install -g visual-intent-layer@latest`" (README.md:65). No install line for that form. P2.
2. D1: "'no prose location descriptions, no lost context' is dropped as a judgment rather than a fact." It survives verbatim at docs/guide.md:11. Partial — Out of Scope ("the sections move as they are") argues for keeping it, D1 is more specific. P2.

**(b) Scope creep / advisor-avoided claim**

3. README.md:61 "Restart the agent, or clear that cache, to force a fetch." D4 sanctioned only "npm resolves `@latest` when npx fetches, and a Harness that caches the resolved command may serve what it resolved." The restart claim is added and false: the adapter's cache is a disk file re-read on every resolution, keyed by spec string, 24 h TTL (npx-resolver.ts:9,57-65,433-435 → `~/.pi/agent/mcp-npx-cache.json`; live entry has `resolvedAt`, `packageVersion: "0.3.1"`). A restart reads the same entry. P1.

**(c) Implemented but wrong**

4. README.md:95 `visual-intent open --html ./checkout.html` is D7's "one no-agent recovery command", but the README's own path is npx and never asks for a global install, so `visual-intent` is not on PATH — it fails for exactly the stuck reader. Smallest fix: `npx -y --package visual-intent-layer@latest visual-intent open --html ./checkout.html` (package.json `bin`). P1.
5. docs/guide.md:208 names global `~/.config/opencode/opencode.json`; this machine's global file is `~/.config/opencode/opencode.jsonc` and no `opencode.json` exists. P2.
6. README.md:21 offers "the adapter's `/mcp` panel" in place of writing the entry; guided writes are `/mcp setup` (pi-mcp-adapter README:37,739); `/mcp` manages. P2.

**Correct:** pi paths, merge/scope warnings and `~/.config/mcp/mcp.json` match the adapter (README:35,56,60-61,821); `/mcp disable` matches (README:78); four tools (src/mcp/service.ts:613-666), env vars/defaults (src/cli.ts:31-38), data survival, registry name (server.json), Layout paths all check out. SKILL.md:52-55 gained the required Harness-CLI and adapter-version/cache checks.

**Supervisor must run (no shell here):** `codex mcp --help`, `codex mcp remove --help`, `opencode mcp --help`, `opencode mcp add --help` (verifies README:20 "then give it `npx` and the arguments above when it asks"), `pi --help`, and the README:92 by-hand command. `claude` is absent, so README:69 `claude mcp remove visual-intent-layer` stays unverified — as spec Comments already record.

**Merge verdict: OK with notes** — both P1s are false statements inside the deliverable; fix them in this change.