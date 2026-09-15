# 04: Transport selection

**What to build:** Setup chooses the transport it registers instead of assuming a global install. When `visual-intent` resolves on `PATH`, entries keep the current binary form; when it does not, entries carry the packaged `npx` form pinned to the running package version. The plan and the report state which transport was chosen, so the Builder-Reviewer knows what the Harness will actually run.

**Blocked by:** 01 (Harness registry and union detection).

**Status:** done

- [x] Transport is decided during planning, using the same command check as Harness detection
- [x] A resolvable `visual-intent` produces `command: "visual-intent"` with args `["mcp"]`
- [x] An unresolvable `visual-intent` produces the packaged `npx --package visual-intent-layer@<version> visual-intent-mcp` form, with the version read from the running package
- [x] The transport appears in preview, in the result report, and in status output
- [x] Transport tests cover both cases through an injected `PATH`, asserting exact entry content
- [x] The packaged `npx` snippet in the repository stays consistent with the generated form

## Comments

Spec decisions on the entry shape live in `.scratch/multi-harness-setup/spec.md`; this ticket keeps the documented `npx` form as the no-global-install fallback.
### Implementation notes

`selectTransport` probes the same `resolveCommand` used for detection: a
resolvable `visual-intent` yields `{command: 'visual-intent', args: ['mcp']}`,
otherwise the packaged
`npx -y --package visual-intent-layer@<version> visual-intent-mcp` form with the
version read from the running package manifest. Every entry builder (shared
JSON, Codex table and its delegation arguments, opencode, Claude payload) takes
the resolved transport, so all four harnesses stay consistent.

The generated form matches `mcp.json`, which `scripts/check-bins.js` already
pins against the package version. Evidence: the binary form is asserted on the
written file and in the report line, the npx form is asserted field-by-field
against the manifest version, and the CLI smoke run with an isolated `PATH`
printed `transport: npx -y --package visual-intent-layer@0.3.0-next.0
visual-intent-mcp` and wrote the matching entry.
