# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

V0 is a local-first Proof Product. There is no hosted service, no account system,
and no automatic update channel.

## Reporting a vulnerability

Email the maintainer with "SECURITY" in the subject line, or open a private
security advisory on GitHub. Include:

- What you did, step by step, against which version and platform.
- What you expected the local boundary to do, and what it did instead.
- Whether any data left the machine, and what that data was.

We aim to acknowledge within 3 business days and to ship or schedule a fix within
30 days. Please do not publish exploit details before a fix is available.

## Threat model

**Trusted:** the Builder-Reviewer's own machine, their agent host, and the local
artifacts they choose to open.

**Untrusted:** the content of reviewed artifacts. An agent-produced HTML file may
contain hostile scripts, and Application Mode proxies a running local app whose
third-party code is not audited by this product.

**The local boundary promises:**

- The service binds to loopback (`127.0.0.1`) only and validates `Host` and
  `Origin` on every request, so random websites cannot drive it.
- Review, artifact, asset, and API routes require an unguessable per-session
  capability minted at open time and compared in constant time.
- Rendered artifacts run inside `sandbox` without top-navigation, with
  `connect-src 'none'` in Artifact Mode, so hostile markup cannot exfiltrate over
  the network or escape the frame by default.
- File access is confined to the artifact directory by canonical path. Symlinks
  that resolve outside are refused. Request bodies are capped at 1MB; served
  artifacts and assets are capped at 5MB.
- The default data plane is local. Nothing uploads implicitly. The review UI
  discloses exactly which evidence an envelope carries before delivery.

**Explicitly out of scope for V0:** SBOMs, reproducible builds, attestations,
fuzz testing, signed binaries, multi-user authentication, and protection against
a malicious local process running as the same user.

## Telemetry

There is none. No usage data, crash reports, or artifact content leaves the
machine unless the Builder-Reviewer explicitly delivers an envelope to their own
agent host. There is no telemetry flag because there is no telemetry.

## Dependency audit

Run `npm audit` before each release. V0 depends on the MCP SDK, a BLAKE3
implementation, Ajv for schema validation, and dev-only test tooling. Known
high or critical advisories in shipped dependencies block release.
