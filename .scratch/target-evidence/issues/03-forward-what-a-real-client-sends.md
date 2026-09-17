# 03: Forward what a real client sends through the application proxy

**What to build:** A request from a running application reaches that application
as a client would have sent it: method, body, headers and redirects intact.

**Status:** done

- [x] A POST with a body arrives at the application with its method and body intact
- [x] Other methods a browser sends are forwarded rather than coerced to GET
- [x] Request headers are forwarded, minus hop-by-hop headers and the review capability cookie
- [x] An absolute redirect location pointing at the upstream origin is rewritten back to the proxy origin, so a redirect cannot move the frame to the application's own origin
- [x] Forwarding a body is bounded by the existing body and asset caps and never creates an unbounded channel
- [x] An upstream error still reports as an upstream failure rather than as a successful empty response
- [x] The loopback-origin re-validation on every proxied request is preserved, including on redirect targets

## Comments

`serveAppProxy` calls `fetch(upstream, { redirect: 'manual' })`
(`src/service/http.ts:1066`) with no method and no body, while the router accepts
POST (`src/service/http.ts:200`) and the artifact frame grants `allow-forms`
(`src/ui/app.ts:112`). A form submission in a running application is currently
converted into a different request.

This ticket is a precondition for the live-update ticket, because a proxied update
channel is one more thing the proxy has to carry rather than discard.
