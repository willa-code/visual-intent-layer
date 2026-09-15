# 02: Scaffold the TypeScript service and envelope schema

**What to build:** A runnable repository whose MCP server skeleton and versioned envelope schema give every later ticket something real to build against.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A fresh checkout installs dependencies and connects the MCP server over stdio with the entry tool listed and described
- [ ] The versioned experimental envelope schema validates a representative envelope fixture and rejects malformed input
- [ ] Generated TypeScript types compile and round-trip the fixture without hand-written drift
- [ ] Optional canvas-, host-, browser-, and framework-specific records survive validation as extensions without becoming required semantics
