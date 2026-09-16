# Running-application mode

A Builder-Reviewer reviews a running local application through the same Review Surface, with Source Provenance available as a separate axis from Rendered Grounding. Application Mode only opens loopback development origins.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `app-open` opens a running local application by loopback URL.
- `app-rewrite` rewrites the app's assets through the review proxy.
- `app-loopback-only` refuses a non-loopback or authenticated production origin.
- `app-source-provenance` reports Source Provenance where the app exposes it.
- `app-rendered-grounding` reports Rendered Grounding independently.
- `app-revision` observes the running app's revision change.

## How to get to it (user POV)

- Run `visual-intent open --app http://localhost:<port>` against a local dev server.
- Use the same Review Surface tools, cards and Verify state as Artifact Mode.

## Driving it with the Lever

Preconditions:

- A local development server is listening on a loopback `http` origin.
- The origin is not an authenticated production deployment; Application Mode refuses anything but loopback.

- **Open the running app.** Run `… lever.mjs launch --app http://localhost:5173 --name running-app`. Exit `0` and a launch record whose `artifact.kind` is `react-vite-app`.
- **Render faithfully.** Run `… lever.mjs wait --target ".app-root" --frame artifact`, then `… lever.mjs screenshot --name running-app` and `… lever.mjs snapshot --name running-app --frame artifact`. The frame shows the live app, not a saved copy.
- **Refuse a production origin.** Run `… lever.mjs launch --app https://prod.example.com --name prod-refused`. Exit `3`; the refusal names the loopback-only scope and no session is minted.
- **Refuse an authenticated origin.** Run `… lever.mjs launch --app http://localhost:5173 --name with-auth` only when the origin needs no authentication; an authenticated origin is refused at the same boundary.
- **Source Provenance.** Run `… lever.mjs state`. Each target reports `provenanceConfidence`; where the adapter found a source span it is `exact`, otherwise `inferred` or `unavailable`.
- **Rendered Grounding stays separate.** The same `state` reports selectors and boxes as Rendered Grounding, independently of the source span.
- **Observe a revision change.** Rebuild the running app, then `… lever.mjs reload` and `… lever.mjs state`. `currentRevision` changes and `changed` becomes true.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs screenshot --name running-app`. The state names the artifact kind and each target's two evidence axes; the screenshot shows the live app.

## Gotchas

- Application Mode opens loopback origins only. A production hostname, or an origin requiring authentication, is a precondition failure before any session exists.
- The dev server must already be running; the Lever does not start it.
- A rebuild changes the app revision; the change banner appears only after the app's own revision is fetched.
- Source Provenance is unavailable for a plain HTML app; that is `unavailable`, not a failure.
- Rendered Grounding and Source Provenance never share the word "exact" in the surface.