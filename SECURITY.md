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
  capability minted at open time and compared in constant time. The capability
  is set as a scoped, `HttpOnly`, `SameSite=Strict` cookie when the shell is
  served, and is also accepted as a query parameter or header.
- Rendered artifacts run inside `sandbox` without top-navigation and with
  `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` and
  `frame-src 'none'`, so hostile markup cannot exfiltrate over the network or
  escape the frame by default.
- File access is confined to the artifact directory by canonical path. Symlinks
  that resolve outside are refused. Request bodies are capped at 1MB; served
  artifacts and assets are capped at 5MB; attachments are capped at 5MB.
- The default data plane is local. Nothing uploads implicitly. The review UI
  discloses exactly which evidence an envelope carries before delivery.

**Remote-origin policy (amendment to the local data plane).** A saved HTML
artifact keeps its own relative and root-relative assets and may load the remote
stylesheet, font and image origins it *declares*. Those origins are collected by
inspecting the artifact and its local stylesheets, disclosed to the
Builder-Reviewer before the artifact loads, and added only to the relevant
content-policy directives (`style-src`, `font-src`, `img-src`). Runtime data
requests stay blocked: `connect-src` remains `'none'`, scripts may not load from
a remote origin, and a declared stylesheet origin cannot be turned into a data
channel. No screenshot is ever captured implicitly; screenshot evidence remains
out of scope for V0.

**Reverse-proxy scope (amendment to ADR-0003).** Application Mode proxies a
running local development server through the review service's own origin so the
application's DOM is selectable rather than cross-origin and opaque. Proxy scope
is restricted to loopback development origins (`localhost`, `127.0.0.1`, `::1`)
and re-validated on every proxied request, including redirect targets. Anything
else is refused, so authenticated production applications remain out of scope.

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
