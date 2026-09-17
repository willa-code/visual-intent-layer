# 02: Name a navigation off the reviewed document

**What to build:** A saved HTML Artifact is one document. Navigating away from it
must not silently produce a page the product cannot point at.

**Status:** done

- [x] A link in a saved HTML artifact that leads to another local HTML document does not produce an un-instrumented page the Builder-Reviewer can point at without noticing
- [x] The surface names the situation in words and offers the product's own way back to the reviewed document
- [x] The reviewed document's own in-page anchors, same-document hash navigation and ordinary interaction are unaffected
- [x] No local HTML page other than the reviewed document gains the artifact layer: one document means one document
- [x] The behaviour is asserted through the surface, not by asserting a route's status code

## Comments

`serveArtifactAsset` (`src/service/http.ts:1106`) returns raw bytes with no
`rewriteHtml` and no `injectArtifactLayerScript`, so the second page of a saved
site is served without the layer. A multi-page saved site is a real feature and is
out of scope here; this ticket makes the boundary visible instead of silent.
