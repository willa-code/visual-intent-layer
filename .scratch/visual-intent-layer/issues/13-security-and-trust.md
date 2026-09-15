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

Superseded: the artifact's declared remote stylesheet, font and image origins are now permitted while runtime data fetches remain blocked, and a local development server is reverse-proxied through the review service's origin (ADR-0015). Loopback binding, scoped capabilities, Host/Origin validation, canonical path confinement, bounds and the malicious fixtures are unchanged. SECURITY.md must record the proxy scope and the remote-origin policy, and the surface must disclose remote-origin contact before it happens.

See `.scratch/review-surface/spec.md`.
