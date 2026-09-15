# 02: Scaffold the TypeScript service and envelope schema

**What to build:** A runnable repository whose MCP server skeleton and versioned envelope schema give every later ticket something real to build against.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A fresh checkout installs dependencies and connects the MCP server over stdio with the entry tool listed and described
- [x] The versioned experimental envelope schema validates a representative envelope fixture and rejects malformed input
- [x] Generated TypeScript types compile and round-trip the fixture without hand-written drift
- [x] Optional canvas-, host-, browser-, and framework-specific records survive validation as extensions without becoming required semantics

## Comments

Implemented (implemented in 8b70d52): package scaffold (package.json, tsconfig, vitest), versioned schema schema/envelope-v0.1.schema.json with generated types (scripts/generate-envelope-types.js), Ajv validation (src/envelope/), MCP stdio server with entry tool open_visual_review plus submit/get/acknowledge tools (src/mcp/), stdio smoke (scripts/stdio-smoke.js). Fresh checkout: npm install && npm run build, entry tool listed over stdio.
