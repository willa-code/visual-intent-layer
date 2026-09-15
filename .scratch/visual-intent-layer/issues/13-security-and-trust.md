# 13: Harden the local boundary and publish trust docs

**What to build:** The local-first claim holds up under hostile artifacts, and every envelope's off-machine evidence is disclosed before delivery.

**Blocked by:** 04 (Submit written direction and deliver the envelope)

**Status:** ready-for-agent

- [ ] The local service binds to loopback with unguessable scoped capabilities plus Host and Origin validation
- [ ] Rendered artifacts run sandboxed with bounded assets, canonical path confinement, explicit symlink handling, and observable remote egress
- [ ] The UI discloses exactly what evidence leaves the machine before any envelope is delivered
- [ ] Malicious artifact fixtures exercise the boundary; SECURITY.md publishes disclosure process, threat model, and supported versions; telemetry defaults to off; dependencies are audited
