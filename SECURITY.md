# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.3.x   | Yes       |
| 0.2.x   | Security fixes only |
| ≤ 0.1.x | No        |

V0 is a local-first Proof Product. There is no hosted service, no account system,
and no automatic update channel. `0.3.0-next.x` builds are pre-releases: they
publish to the `next` npm tag and are supported the same way while they are the
current line.

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
contain hostile scripts, and a proxied running application ships third-party code
that is not audited by this product.

**The local boundary promises:**

- The service binds to loopback (`127.0.0.1`) only and validates `Host` and
  `Origin` on every request, so random websites cannot drive it.
- Review, artifact, asset, and API routes require an unguessable per-session
  capability minted at open time and compared in constant time. The capability
  is set as a scoped, `HttpOnly`, `SameSite=Strict` cookie when the shell is
  served, and is also accepted as a query parameter or header.
- Rendered artifacts run inside `sandbox` without top-navigation, so hostile
  markup cannot escape the frame by default. The exact content policy differs by
  artifact type and is stated below.
- File access is confined to the artifact directory by canonical path. Symlinks
  that resolve outside are refused. Request bodies are capped at 1MB; served
  artifacts and assets are capped at 5MB; attachments are capped at 5MB.
- The default data plane is local. Nothing uploads implicitly. The review UI
  discloses exactly which evidence an envelope carries before delivery.

**Remote-origin policy for a saved HTML artifact.** A saved HTML artifact keeps
its own relative and root-relative assets and may load the remote stylesheet,
font and image origins it *declares*. Those origins are collected by inspecting
the artifact and its local stylesheets, disclosed to the Builder-Reviewer before
the artifact loads, and added only to the relevant content-policy directives
(`style-src`, `font-src`, `img-src`). Runtime data requests stay blocked:
`connect-src` remains `'none'`, `form-action` remains `'none'`, `base-uri`
remains `'none'`, `frame-src` remains `'none'`, scripts may not load from a remote
origin, and a declared stylesheet origin cannot be turned into a data channel.
This is the policy for a saved document, and it is deliberately not the policy
for a served application.

**Content policy for a proxied application.** A running local application is
served through the review origin so its DOM is selectable rather than
cross-origin and opaque. It cannot work with `connect-src 'none'`: it needs its
own requests, its own forms and its own update channel. The proxied document
therefore carries a separate policy that permits `'self'` for `connect-src`,
`form-action`, `script-src`, `style-src`, `img-src`, `font-src`, `media-src`,
`worker-src` and `frame-src`, and permits nothing else: `default-src` is
`'none'`, and no remote origin is added. Everything the application reaches must
travel back through the proxied origin, where it is confined to the loopback
development server and re-validated on every request. The Builder-Reviewer sees
this permit list in the disclosure. A request outside it fails closed.

**Reverse-proxy scope (amendment to ADR-0003).** The service proxies a running
local development server through its own origin. Method, body, request headers
and redirects reach the application as a client would send them, with hop-by-hop
headers and the review capability removed on the way out and absolute upstream
redirects rewritten back to the proxy origin. An upgrade request on the same
origin is forwarded too, so the application's own update channel can pass
through. Proxy scope is restricted to loopback development origins (`localhost`,
`127.0.0.1`, `::1`) and re-validated on every proxied request, including redirect
targets. Anything else is refused, so authenticated production applications
remain out of scope.

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
