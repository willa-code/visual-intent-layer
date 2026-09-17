# 07: Prove the application path at the surface

**What to build:** The application branch of the one loop is driven end to end
through the real surface, so a green build means an application is operable and
pointable rather than that two unit assertions about URL validation passed.

**Status:** done

**Blocked by:** 03, 04

- [x] A minimal loopback development server is started inside the test rather than mocked
- [x] The surface opens an application session, renders the application inside the frame and can point at one of its elements
- [x] A form submission or other body-carrying request arrives at the application with its method and body intact
- [x] The served document carries the application policy, and the disclosure states what is permitted
- [x] The revision and update behaviour decided by ticket 05 is asserted at the surface
- [x] The test lives in the same primary seam as the saved-HTML drive rather than in a new harness, and a surface that cannot load its own scripts still fails CI
- [x] The existing proxy assertions in `src/service/http.test.ts:382` are re-cut rather than left asserting the permissive behaviour

## Comments

`tests/browser-loop.test.ts` drives `saved-html` only, and `react-vite-app` is
covered by roughly four shallow assertions across `src/service/http.test.ts` and
`src/mcp/service.test.ts`. That is why the dropped body, the absent policy and the
missing upgrade handler all shipped in a green build.

This ticket is named last but should be written alongside the repairs it proves,
per the spec's sequencing note.
