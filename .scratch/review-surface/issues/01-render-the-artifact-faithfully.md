# 01: Render the artifact faithfully, verified in a browser

**What to build:** Opening a saved HTML artifact shows it as its author built it — its own stylesheets, images and fonts load, and the fonts, stylesheets and images it loads from a CDN load too, after the Builder-Reviewer is told the artifact will contact a remote origin and before it happens. The artifact still cannot make runtime data requests. The suite can drive the real surface in a browser engine, and it fails when any asset the surface needs is unreachable.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A saved HTML artifact's own relative and root-relative stylesheets, images and fonts load in the review surface
- [x] The artifact's declared remote stylesheet, font and image origins load, while runtime data fetches remain blocked
- [x] A remote origin is disclosed to the Builder-Reviewer before the artifact contacts it
- [x] Every module reachable from the served surface loads, and the suite fails when one does not
- [x] The Visual Direction Loop is driven end to end in a real browser engine, and CI runs it

## Comments

Deferred confirmation: the remote-origin allowance is asserted through CSP/policy tests and the disclosure gate; the download of a real third-party CDN asset is not exercised in CI (no network fixture).
