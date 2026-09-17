# A proxied application

A Builder-Reviewer reviews a running local application through the same Review Surface and the same loop, with Source Provenance available only where an instrumented artifact stamped a source location. An application is an artifact type, not a mode: the same rail, the same Annotation card and the same point/box controls. The proxy opens loopback development origins only, forwards a client's method, body, headers and redirects, proxies the application's update channel, and serves it a content policy that permits the application's own requests and nothing else.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `app-open` opens a running local application by loopback URL.
- `app-rewrite` rewrites the app's assets through the review proxy.
- `app-loopback-only` refuses a non-loopback or authenticated production origin, including redirect targets.
- `app-forward` delivers a form submission with its method and body intact.
- `app-policy` serves the application policy and states the permitted origins in the disclosure.
- `app-update-channel` proxies an upgrade request so the application's own updates arrive.
- `app-stamp-provenance` reports `exact` Source Provenance only where an instrumented artifact stamped a source location, per Target.
- `app-revision` records the revision the artifact reports, and states when a revision is derived from files rather than the running document.

## How to get to it (user POV)

- Run `visual-intent open --app http://localhost:<port> [--source-root <path>]` against a local dev server.
- Use the same Review Surface rail, annotation card and island as any other Artifact.

## Driving it with the Lever

Preconditions:

- A local development server is listening on a loopback `http` origin.
- The origin is not an authenticated production deployment; the proxy refuses anything but loopback.

- **Open the running app.** Run `… lever.mjs launch --app http://localhost:5173 --name running-app`. Exit `0` and a launch record whose `artifact.kind` is `react-vite-app`.
- **Render faithfully.** Run `… lever.mjs wait --target ".app-root" --frame artifact`, then `… lever.mjs screenshot --name running-app` and `… lever.mjs snapshot --name running-app --frame artifact`. The frame shows the live app, not a saved copy.
- **Refuse a production origin.** Run `… lever.mjs launch --app https://prod.example.com --name prod-refused`. Exit `3`; the refusal names the loopback-only scope and no session is minted.
- **Submit a form.** Point at a form control, submit it, and `… lever.mjs state`. The application received the method and body it sent, not a coerced GET.
- **Read the policy.** `… lever.mjs state` or the disclosure names the application's own proxied origin as the only permitted one; the served document carries the application policy, not the saved-HTML one.
- **Source Provenance is per Target.** `… lever.mjs state`. Where an instrumented artifact stamped a source location, the target is `exact` with the instrument's identifier; an unstamped sibling is `unavailable`.
- **Observe a revision change.** Edit a file in the source root, then `… lever.mjs reload` and `… lever.mjs state`. `currentRevision` changes, `changed` becomes true, and the surface states whether the revision came from the running document or from files.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name running-app`. The state names the artifact kind, the policy and each target's evidence.

## Gotchas

- The proxy opens loopback origins only. A production hostname, an origin requiring authentication, or a redirect to either is refused before the frame can move.
- The dev server must already be running; the Lever does not start it.
- A form submission reaches the application with its own method and body; a proxy that coerces it to GET is a defect, not a fixture detail.
- Source Provenance is unavailable for an unstamped artifact; that is `unavailable`, not a failure, and it is decided per Target.
- Rendered Grounding and Source Provenance never share the word "exact" in the surface.
- The application's revision is file-level when it is derived from a source root: it can report a change the page has not applied and can miss a change outside the watched set. The surface states this, and it states that a revision is adopted only when the artifact reports it. An application that forwards its own update events through the page (`visual-intent:applied-revision`) advances the Adopted Revision; one that does not stays at the revision it was served, and the surface says so.
