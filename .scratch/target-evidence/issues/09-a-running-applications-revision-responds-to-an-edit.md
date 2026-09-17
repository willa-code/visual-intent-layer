# 09: A running application's revision responds to an edit

**What to build:** Editing a running application's source produces a new Adopted
Revision, so the review loop can tell that the artifact changed and the surface
can say what changed.

**Status:** done

**Blocked by:** 05, 08

- [x] The application's source root is known to the product without a build step, and the agent can supply it when it opens the review
- [x] A revision is derived from that source root and advances when a file in scope changes
- [x] What is in scope is stated, and excludes dependencies, build output and generated files
- [x] The page advances its Adopted Revision from the application's own update events where they are available, and ticket 05 supplies them
- [x] Where the update events are unavailable, the surface says the revision is derived from files rather than from the running document
- [x] A revision reported by the source but not applied by the page does not become the Adopted Revision
- [x] The existing mutation benchmark and the resolution path still pass on the new revision identity
- [x] The behaviour is asserted through the surface with a real development server in the test

## Comments

The research rules the build-manifest family out, and it is worth recording why so
nobody reintroduces it: Vite's `build.manifest` is a build output ("For production,
after running `vite build`") and is a no-op in dev by design, and Next.js hard-codes
`const buildId = 'development'` in its dev server — an identifier that looks
authoritative and means nothing.

The mechanism that survives without a build step is a source-root hash seeded from
a path the agent already knows, advanced by the dev server's monotonic per-change
HMR timestamp where the update channel carries it. The honest cost, which the
surface must state, is that a file-level hash describes files rather than the
running document: it can report a change the page has not yet applied, and it can
miss a change caused by something outside the watched set.

This is the mechanism behind ticket 08's rule; ticket 08 is the rule itself.

**Implementation note.** The source-root revision, the file-level scope and its
disclosure, and the page-side adoption all ship, and the application seam drives
a real loopback development server whose update frame travels the proxied
upgrade channel to the page and advances the Adopted Revision. The page-side
contract is the `visual-intent:applied-revision` event, which an application
forwards from its own update events; an application that forwards nothing stays
at the revision it was served, and the surface says so rather than inferring an
applied revision from a source's offer.
