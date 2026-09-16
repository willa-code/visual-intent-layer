# Setup and Harness Detection

The product detects the Harnesses on a machine from their own configuration locations, reports a read-only status, previews what it would write, registers the MCP server with each configured Harness, repairs an outdated registration, and refuses an invalid configuration file.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `setup-detect` detects each configured Harness from its own configuration.
- `setup-status` reports registration without writing anything.
- `setup-preview` prints the plan without writing anything.
- `setup-register` writes the registration for each configured Harness.
- `setup-repair` rewrites an outdated registration.
- `setup-refuse` refuses an invalid configuration file rather than overwriting it.
- `setup-nondefault-home` detects a Harness configured at a non-default home.
- `setup-version` records the setup version alongside the evidence.

## How to get to it (user POV)

- Run `visual-intent setup --status` to see what is registered.
- Run `visual-intent setup --print-only` to preview the writes.
- Run `visual-intent setup` to register with the detected Harnesses.
- Set a Harness's own configuration-home variable to detect a non-default location.

## Driving it with the Lever

Preconditions:

- The Lever's `setup` runs the built product under a sandboxed `HOME` at `.visual-intent-verify/sandbox-home`; the real machine configuration is never touched.
- The sandbox home contains at least one Harness configuration, and a corrupt one for the refusal recipe.
- For a non-default home, the Harness's own variable (`PI_CODING_AGENT_DIR`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`) is set on the Lever's environment.

- **Read-only status.** Run `… lever.mjs setup --status --harness pi`. Exit `0`; JSON reports the detected Harnesses and each registration without writing. Compare the sandbox home before and after: unchanged.
- **Preview.** Run `… lever.mjs setup --print-only --harness pi`. Exit `0`; JSON reports the plan, still writing nothing.
- **Register.** Run `… lever.mjs setup --harness pi`. Exit `0`; the sandbox Harness configuration now contains the MCP server entry, and the run's `evidence/setup-output.txt` records the command output.
- **Re-register after a change.** Edit the registration so it is outdated, then run `… lever.mjs setup --harness pi` again. The command repairs it and reports the outdated registration it replaced.
- **Refuse an invalid file.** Corrupt the Harness's `mcpServers` field, then run `… lever.mjs setup --harness pi`. Exit `3`; the refusal names the invalid field and leaves the file untouched.
- **Non-default home.** Set the Harness's configuration-home variable to a second sandbox directory and run `… lever.mjs setup --status --harness pi`. The detection finds the registration there.
- **Record the version.** Run `… lever.mjs setup --status` and read `version` from the JSON. It matches `package.json`, so a stale installation and a detection gap stay distinguishable.
- **Proof.** Run `… lever.mjs setup --status` and read `evidence/setup-output.txt`. The output carries the detected matrix and the version; the sandbox home proves nothing in the real configuration changed.

## Gotchas

- Every `setup` runs against the sandbox home. Never run it in a way that reaches the real home; the Lever overrides `HOME`/`USERPROFILE` for exactly this reason.
- `--status` and `--print-only` are both read-only; `--status` reports registration, `--print-only` reports the plan.
- A refusal exits `3` and must leave the invalid file byte-for-byte unchanged.
- Detection is from Harness evidence, not from `PATH` alone; an executable on `PATH` without a configuration is reported as not configured.
- Listing the server inside a live pi session needs a human at a keyboard and is not claimed by this recipe.
- The setup version is evidence; a status from a stale installed package is not evidence about the working tree.