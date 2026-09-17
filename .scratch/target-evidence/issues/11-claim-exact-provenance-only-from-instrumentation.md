# 11: Claim exact provenance only from instrumentation

**What to build:** `exact` Source Provenance is claimed only when an instrumented
artifact stamped a source location on the Target's element, and every unreachable
provenance path is deleted.

**Status:** done

- [x] The React fiber `_debugSource` read is deleted from the adapter
- [x] The exported Vite plugin that pointed at a script nothing served is deleted
- [x] The product reads a build-time source-location stamp off the Target's element and records `file`, `line`, `column` and the instrument's identifier
- [x] The stamp contract is the product's own attribute, and a known working third-party stamp is also read rather than requiring the Builder-Reviewer to adopt our instrument
- [x] `exact` is reported only when a stamp was read; an artifact with no instrumentation reports `unavailable`
- [x] Stamped coverage is per-Target: an element with no stamp reads `unavailable` even when its siblings are stamped
- [x] The `stableRuntimeId` read, its resolution scoring anchor and the benchmark fixtures that supply it are deleted, because no producer writes it and the provenance stamp is the stronger anchor
- [x] The mutation benchmark measures the instrumented path's false-confidence rate, not only its hit rate
- [x] A Target resolution test proves that deleting the anchor does not change an outcome any reachable case depends on

## Comments

ADR-0021 records the decision and the rejected alternatives. The short version:
`_debugSource` was removed in React 19 (PR #28265), `_debugInfo` is `null` in
practice (issue #29092, closed as not planned), and `captureOwnerStack` is
unavailable at click time and cannot distinguish sibling elements — so the current
adapter cannot work on the product's own primary stack, and React states that the
structure it read breaks between releases.

The working mechanism is a dev-only build-time stamp. `zh-lx/code-inspector` is the
existence proof and is actively maintained: `data-insp-path="<file>:<line>:<col>:<tag>"`
(read from `packages/core/src/shared/constant.ts`), injected by a Vite plugin whose
`apply` hook is `return !options.close && isDev(options.dev, command === 'serve')`
with `enforce: 'pre'` and a warning that it must precede the framework plugin. It
covers eight bundlers; Next.js wiring differs by minor version. Reading its
attribute means the product owns the contract rather than the transform, and does
not tell the Builder-Reviewer to install a third-party plugin in order to get an
honest label.

Two honesty notes for whoever implements this. The plugin escapes a known set of
non-visual tags (`style`, `script`, `template`, `fragment`, `suspense`, `teleport`,
…), so coverage is per-element rather than per-application and the claim must not
be worded as though everything is stamped. And the benchmark's business is
false confidence, not coverage: the strategy's own gate is "under 1% confidently
wrong", and an `exact` label that is wrong is the exact failure this ticket exists
to stop.

Deleting `stableRuntimeId` follows Pass A's precedent that nothing is listed that is
not built. It is a resolution anchor with no producer, and unlike the provenance
stamp there is no mechanism on the horizon that would write it.
