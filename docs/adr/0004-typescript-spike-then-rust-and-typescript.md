# Validate interaction in TypeScript before establishing a Rust local authority

**Status:** superseded by ADR-0013

The first feasibility spike will use TypeScript to validate MCP App rendering, visual capture, and host messaging. The product architecture will then retain TypeScript at browser boundaries and introduce a Rust daemon for MCP serving, local files and assets, revision state, persistence, and secure native distribution; this preserves iteration speed without using Rust where browser-native tooling is stronger.
