# 12: Make a running application selectable

**What to build:** A running local application is reviewed through the same surface as saved HTML, and its own DOM can be selected and annotated because it is served through the review service's own origin rather than as an opaque cross-origin frame. Only loopback development origins are proxied.

**Blocked by:** 01 (Render the artifact faithfully, verified in a browser), 04 (One Annotation, end to end)

**Status:** done

- [x] A running local development application is reviewed in the same surface as saved HTML
- [x] Elements of the running application can be selected and annotated
- [x] Proxy scope is restricted to loopback development origins and refuses anything else
- [x] An authenticated production application is still refused