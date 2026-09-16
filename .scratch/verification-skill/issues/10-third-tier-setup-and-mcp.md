# 10: The third tier — setup, Harness Detection and the MCP agent loop

**What to build:** The product's agent-facing and installation surfaces are mapped with recipes, so that one harness covers how the product reaches a Harness and how it reaches an agent. These are recorded honestly as not yet driven.

**Blocked by:** 08 (The skill body, executed once in its own order)

**Status:** done

- [x] The setup and Harness Detection recipe runs under a sandboxed home and never touches the real machine configuration
- [x] It covers detection across the Harnesses the product knows, including a non-default configuration home
- [x] It covers the read-only status report, the print-only preview, the repair of an outdated registration, and the refusal of an invalid configuration file
- [x] The recipe records the setup version alongside its evidence, so a stale installation and a detection gap stay distinguishable
- [x] The MCP agent loop is driven over a real standard-input transport against the built server, not an in-memory pair
- [x] It covers opening a review through the entry tool, reading intent status, and acknowledging a delivered batch
- [x] It records that acknowledgement is not implementation and not verification
- [x] It states which confirmations require a human at a keyboard, and does not claim them
- [x] Every file has the four required sections, its preconditions, exact commands and observable results, and carries the not-yet-driven marker
- [x] Every command in every recipe is accepted by the Lever

## Comments

`setup-and-detection.md` and `mcp-agent-loop.md` written with the four sections and the `Not yet driven.` marker. Setup runs under the Lever sandbox home; the MCP loop runs over the real stdio transport against the built server via `lever mcp`, which shares the run lifecycle data directory. Human-required confirmations are stated and not claimed.
