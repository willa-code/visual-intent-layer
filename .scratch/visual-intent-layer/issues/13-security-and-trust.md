# 13: Harden the local boundary and publish trust docs

**What to build:** The local-first claim holds up under hostile artifacts, and every envelope's off-machine evidence is disclosed before delivery.

**Blocked by:** 04 (Submit written direction and deliver the envelope)

**Status:** done

- [x] The local service binds to loopback with unguessable scoped capabilities plus Host and Origin validation
- [x] Rendered artifacts run sandboxed with bounded assets, canonical path confinement, explicit symlink handling, and observable remote egress
- [x] The UI discloses exactly what evidence leaves the machine before any envelope is delivered
- [x] Malicious artifact fixtures exercise the boundary; SECURITY.md publishes disclosure process, threat model, and supported versions; telemetry defaults to off; dependencies are audited

## Comments

Implemented (implemented in 8b70d52): loopback-only + unguessable caps + Host/Origin validation, sandboxed artifact CSP (no top-nav, connect-src none), canonical path confinement + symlink refusal, 1MB/5MB bounds, pre-delivery evidence disclosure UI, malicious fixtures (fixtures/malicious/) with boundary tests, SECURITY.md published, telemetry none, npm audit clean (0 vulns).
