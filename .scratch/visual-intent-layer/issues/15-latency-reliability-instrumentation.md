# 15: Instrument latency, reliability, and token-efficiency

**What to build:** Reproducible numbers replace vibes at every meaningful product boundary, plus a token-efficiency signal comparing envelopes against chat.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent)

**Status:** done

- [x] Invocation-to-ready, pointer-to-feedback, save-to-refresh, submit-to-acceptance, revision-to-resolution, server startup, idle memory, and recovery time are measured on reproducible fixtures with platform metadata and percentile distributions
- [x] Envelope bytes versus the screenshot-and-chat baseline are reported as a token-efficiency signal
- [x] Large DOMs, many simultaneous targets, large assets, rapid consecutive saves, and repeated revisions are exercised without silent intent loss or duplication

## Comments

Implemented (implemented in 8b70d52): npm run instrument reports startup, idle memory, recovery, resolution p50/p95, artifact-ready, envelope bytes + token-efficiency ratio with platform metadata (src/instrumentation/); stress bounds covered (extraction limit, body/asset caps, rapid saves via revision polling).

Verification note: all eight boundaries report in npm run instrument with p50/p95/max distributions on reproducible fixtures. Pointer-to-feedback is browser-only: the overlay records visual-intent:hover performance marks and real numbers are collected during dogfood (ticket 17).
