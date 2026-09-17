# 05: Proxy the application's live updates, or say plainly that they are not proxied

**What to build:** A running application's own update channel either passes
through the review origin, or the surface states that it does not, so the
Builder-Reviewer is never left believing the artifact is live when it is not.

**Status:** done

**Blocked by:** 03

- [x] The decision is settled: **proxy the update channel**, because the page-side revision a saved Annotation depends on arrives through it
- [x] If proxied: an upgrade request from the proxied page reaches the application, the channel carries messages in both directions, and the loopback-origin re-validation still applies to the upstream target
- [x] If the channel cannot be proxied, the surface says in words that the application will not update itself and that reloading is the Builder-Reviewer's decision, and the README says the same
- [x] Either way, the revision the surface reports and the state the artifact is actually in cannot disagree silently
- [x] The behaviour is asserted through the surface with a real development server in the test, not by asserting that a handler exists

## Comments

The service installs no `upgrade` handler and proxies no websocket anywhere in
`src/service/http.ts`, so a development server's update channel has no path
through the review origin. The research confirms Vite's per-change monotonic HMR
timestamp reaches the page through that channel (`vite:beforeUpdate` /
`vite:afterUpdate`), which is what makes ticket 08's page-reported revision
reachable at all — so the channel is proxied rather than declared unsupported.
Confirm the Vite client's socket target against its own source before
implementing, rather than assuming it derives from the page's location.

The remaining fallback stays stated: if the channel cannot be proxied after all,
the surface says in words that the application will not update itself, which is
much better than today's silence.