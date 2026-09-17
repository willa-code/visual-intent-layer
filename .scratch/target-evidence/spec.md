# Target evidence — one loop, honest targets

Status: done

Amends `CONTEXT.md` (Artifact Mode and Application Mode deleted; `Target`,
Runtime State Evidence, Captured View and Adopted Revision added) and records
ADR-0020, ADR-0021 and ADR-0022. It follows the vision that the product has one
loop — point at a Target, write an Annotation, verify the revision — and that
artifact types differ only in how much evidence their targets can carry and in how
their revision is identified.

`.scratch/target-evidence/research.md` answered the four questions this iteration
had left open, and **Settled by research** records each verdict with the decision
taken from it. The verdicts that narrow the product matter as much as the ones that
extend it: the reachable artifact class stays the one already shipped, the pixel
record is a permissioned capture rather than a shipped browser, and `exact`
provenance becomes conditional on instrumentation.

## Problem Statement

An audit of the shipped product found that the loop is one loop, but the evidence
a Target carries and the honesty of the served artifact are not.

**The state a Target was pointed in is not recorded.** `describeElement`,
`describeTextRange` and `describeRegion` record viewport and scroll
(`src/ui/artifact/grounding.ts:29-91`), but nothing records the address the
artifact was showing. A Builder-Reviewer who opens a dialog, routes to a detail
view, or filters a table and then points at what appeared produces a Target whose
evidence cannot distinguish that state from the default one. When the artifact
later returns to its default state the Target resolves as Ambiguous or Deleted
although nothing about the intent changed, and the agent is given no way to know
the Target only ever made sense in the state it was pointed in.

**A navigation off the reviewed document silently removes the ability to
point.** `/artifact/:session/:rest` is served by `serveArtifactAsset`
(`src/service/http.ts:1106`), which returns raw bytes with no
`injectArtifactLayerScript` and no `rewriteHtml`. A link to a second page of a
saved site produces a page with no layer, no selection, no notice, and no way
back that the product owns.

**The application proxy does not forward what a real client sends.**
`serveAppProxy` calls `fetch(upstream, { redirect: 'manual' })`
(`src/service/http.ts:1066`) — no method and no body. The router accepts POST
(`src/service/http.ts:200`) but forwards it as a GET, while the artifact frame
grants `allow-forms` (`src/ui/app.ts:112`). A form submission in a running
application is silently converted into a different request.

**The proxied application is served with no content policy at all.** The
`text/html` branch sets only `content-type` and `nosniff`
(`src/service/http.ts:1078-1084`), while `SECURITY.md:44-48` states that rendered
artifacts run with `connect-src 'none'` and `form-action 'none'`. The claim is
true of saved HTML and false of a proxied application.

**Live updates are not proxied.** The service installs no `upgrade` handler, and
no websocket is proxied anywhere in `src/service/http.ts`. A development server's
live-update channel therefore has no path through the review origin.

**A running application's revision cannot respond to an edit.**
`fetchAppRevision` hashes the bytes of the dev server's root response
(`src/mcp/service.ts:700-712`). An unbundled dev server serves an HTML shell that
references modules rather than the modules themselves, so a component edit leaves
those bytes identical, `changed` stays false (`src/service/http.ts:919-925`), no
Pass ever moves to ready, and the comparison control can never show a difference.
The mechanisms that look like the answer do not work in development: Vite's
manifest is a build output that is a no-op unless configured, and Next.js
hard-codes its dev build id to the constant `'development'`.

**The stored revision is the source's, not the page's.** No mechanism reports what
the browser has actually applied, so the surface's own notion of "the revision
under review" can disagree with the document in front of the Builder-Reviewer
without saying so.

**`exact` Source Provenance is unreachable on the product's own primary stack.**
The adapter reads React fiber `_debugSource`
(`src/adapters/react-provenance.ts:39`), removed in React 19; its replacement
`_debugInfo` is `null` in practice and the removal is closed as not planned. The
exported Vite plugin points at `/@visual-intent/provenance.js`, which no route
serves, and `data-visual-intent-id` is read but written by nothing in the repo. So
`provenanceConfidence: 'exact'` is reachable only from test and benchmark fixtures
(`src/benchmark/matrix.ts:115,119`), and every real user reads `unavailable`.

**The docs still describe two modes.** `README.md`, `SECURITY.md`,
`docs/background/product-strategy.md` and the verification skill's feature map
(`.agents/skills/verify-visual-intent-layer/references/features/running-application-mode.md`)
still name Artifact Mode and Application Mode, and the strategy brief promises
screenshot evidence that `SECURITY.md:63` excludes. ADR-0022 settles that in favour
of a Captured View rather than leaving the two documents in disagreement.

## Solution

**Every Target carries Runtime State Evidence.** A Target records the address the
artifact was showing when it was pointed at. The surface never invents a state
claim, and at resolution it states honestly when a Target that cannot be found is
being looked for in a different state than the one it was pointed in.

**A saved HTML Artifact is one document, and leaving it is named.** The contract
is one reviewed document. Navigation away from it is refused or stated, never
silently served as a page the product cannot point at.

**A running application is served faithfully enough to operate.** Method, body,
headers and redirects reach the application as a client would send them, and the
served document carries a content policy that permits the application to work
while still bounding what an unreviewed artefact can reach.

**Live updates are proxied or declared.** Either the application's update channel
passes through the review origin, or the surface says plainly that it does not.

**Every Annotation is stamped with the Adopted Revision.** The artifact reports the
revision it is holding, the surface records that report, and a source's current
revision is never substituted for it. A running application's revision advances
from its own source and update events, and the surface says plainly when it is
derived from files rather than from the running document.

**A Target may carry a Captured View.** The Builder-Reviewer can attach a
browser-composited image of the artifact as they saw it, by an explicit capture in
the tab that shows it. It is never taken implicitly, never cropped to the product's
own chrome, and never replaced by a re-render.

**Provenance says what it can actually prove.** `exact` is claimed only where an
instrumented artifact stamped a source location, and everything unreachable is
deleted rather than left looking supported.

**The documents describe one loop.** Every mode reference is swept, and the
strategy brief's screenshot claim is reconciled with `SECURITY.md` by ADR-0022's
Captured View rather than left as a contradiction.

## Implementation Decisions

**Runtime State Evidence is one new portable field, because viewport and scroll
already exist.** All three grounding builders already record viewport, device
pixel ratio and scroll position through `boxOf`, and a drawn Area records revision
and scroll through `regionEvidence`. The only fact that is missing is the address,
so the envelope gains exactly one field on the Target rather than a second copy of
what it already carries.

**The envelope takes a minor bump to 0.3.** `renderedGrounding` and `target` are
`additionalProperties: false`, so a new Target field is a wire change. The schema
already declares that minor additions are backward compatible (`0.2` schema
description), and a read path for `0.2` envelopes is required rather than
optional. The published enum values `saved-html` and `react-vite-app` do not
change: a wire name is a compatibility surface rather than a word a
Builder-Reviewer reads (ADR-0020).

**The address is recorded as the artifact sees it, not as the proxy serves it.**
A running application is visible at `/app/<session>/…`, which is a fact about this
product rather than about the application. The recorded address is the path
relative to the artifact's own base, so the evidence means the same thing whether
the artifact is reviewed through the proxy or served directly.

**"Exists only in that state" is derived, never stored.**
`CONTEXT.md` and ADR-0016 already establish that Ambiguous, Deleted and Stale are
derived display labels rather than stored outcomes. A Target that is unresolved
while the artifact revision is unchanged since the Annotation was written is
reported as possibly existing only in a state no longer on screen. The product
states that possibility; it never asserts it.

**The proxy forwards like a client, within the existing bounds.** Method, body,
request headers and redirects are forwarded, with hop-by-hop headers and the
review capability cookie removed on the way out and absolute upstream-origin
redirect locations rewritten back to the proxy origin. The existing body and asset
caps (`MAX_API_BODY_BYTES`, `MAX_ASSET_BYTES`) apply to what is forwarded, so
forwarding bodies does not create an unbounded channel.

**The application policy is its own policy, not the saved-HTML one.** A running
application needs its own requests and its own update channel to work, so
`connect-src 'none'` cannot be its policy. The policy permits the application's
own proxied origin and is stated in the surface's disclosure, so what a reviewed
application may reach remains visible to the Builder-Reviewer. `SECURITY.md` is
corrected to describe the saved-HTML and proxied-application policies separately.

**One document means one document.** `serveArtifactAsset` does not begin injecting
the layer into local HTML pages: that is a site artifact, not this fix. A
navigation off the reviewed document is refused visibly where it can be
intercepted, and the surface names it where it cannot.

**The Adopted Revision is the artifact's report, never the source's offer.** A
server-side revision says the source changed, not that the browser applied it, so
the surface records the revision the artifact reports and stamps Annotations with
that. Where the two disagree the disagreement is stated, and the Annotation keeps
the artifact's report. This is a correctness rule under every mechanism, which is
why it is ticket 08 and the mechanism that feeds it is ticket 09.

**A running application's revision takes no build step.** It is derived from the
application's source root, which the agent can supply when it opens the review,
advanced by the development server's monotonic per-change update timestamp where
the channel carries one. The scope of what is hashed is stated, and the surface
says when a revision is file-level rather than document-level, because a file hash
can report a change the page has not applied and can miss a change made outside the
watched set.

**A captured image is cropped to the artifact, permissioned, and stored as bytes.**
The capture is taken in the tab that shows the artifact and cropped to it, one
permission prompt is spent per capture and cannot be persisted, the image is
content-addressed like an attachment and refused above the existing size, and the
drawer discloses it before the queue leaves. A re-render is never substituted, not
even where the capture is unavailable: the control states its reason instead.

**The provenance contract is ours; the transform is not.** The product reads a
build-time source-location stamp off a Target's element — its own attribute, and a
known working third-party stamp as well so the Builder-Reviewer is not told to
adopt our instrument — and reports `exact` only when one was read. The React fiber
read, the Vite plugin aimed at a script nothing served, and the `stableRuntimeId`
read and its scoring anchor are deleted, because none of them has a producer and a
claim with no producer is what this iteration exists to remove.

**The reachable artifact class stays the one already shipped.** A locally served
web application is already this loop; everything beyond it needs the target's
cooperation, so canvas-object apps and desktop shells are adapter opportunities
rather than promises. tldraw-class applications are the one cheap exception worth
recording: their shapes carry a stable id in the DOM, so they are addressable
without app cooperation if a dogfood case asks for it.

## Settled by research

`.scratch/target-evidence/research.md` answers the four questions the audit could
not settle from the code, from primary sources. Each verdict and the decision taken
from it:

**Addressability.** Elements, text ranges and geometry are reachable, along with
open shadow roots, same-origin frames and currently-rendered rows. Closed shadow
roots, cross-origin frame interiors, unrendered virtualized rows and canvas
internals are hard limits of a product that does not own the browser. Canvas-object
applications need the target's cooperation, with the recorded exception that
tldraw-class shapes carry a stable id in the DOM, and desktop shells need an
explicit opt-in from the app or its launcher. **Decision:** the reachable class
stays what is already shipped, and the rest is named rather than promised.

**Revision.** The build-manifest family is build-only — Vite's is a no-op in dev by
design, and Next.js hard-codes its dev build id. What survives without a build step
is a source-root hash advanced by the development server's monotonic per-change
update timestamp, and the deeper point that only the page can report the revision
it holds. **Decision:** tickets 08 and 09 as specified below.

**Capture.** A client-side rasterizer is a re-render and returns blank for canvas
and WebGL, cross-origin frames, closed shadow roots and cross-origin images.
Shipping a browser costs roughly 281 MB and contradicts the one-install promise.
Attaching to the Builder-Reviewer's own browser over the DevTools protocol is closed
since Chrome 136. A permissioned capture in the reviewing tab is browser-composited,
needs no shipped binary, and its precondition — the artifact rendered in the tab — is
already guaranteed by ADR-0015's framed shell. **Decision:** ADR-0022 and ticket 10.

**Provenance.** `_debugSource` was removed in React 19, `_debugInfo` is `null` in
practice, and the removal is closed as not planned, so the promise cannot be kept on
the product's own primary stack. A dev-only build-time stamp does work and is
maintained in the wild. **Decision:** ADR-0021 and ticket 11 — delete the promise
and the unreachable paths, read a stamp when one is present, report `unavailable`
otherwise.

**Also settled:** the update channel is proxied rather than declared unsupported,
because the page-side revision ticket 08 depends on arrives through it (ticket 05).

## Testing Decisions

The primary seam stays `tests/browser-loop.test.ts`, and this iteration extends
the same seam to the application branch rather than adding a second harness: the
proxy, the policy, the forwarded method, the navigation notice and the
resolution hint are all asserted through the surface.

**`tests/browser-loop.test.ts` — the loop.** A Target pointed in a state records
the address, and after the artifact returns to its default state the row states
that the Target may exist only in a state no longer on screen rather than
presenting a bare Deleted. A navigation off the reviewed document is named and
pointing is not silently lost.

**A new application seam, in the same file.** A minimal loopback development
server is started in the test, and the surface drives it: a POST with a body
arrives at the application with its method and body intact, the served document
carries the application policy, the revision the artifact reports is the Adopted
Revision, and the proxied update channel advances it.

**`src/envelope/envelope.test.ts` and `src/annotation/migrate.test.ts` — the
wire.** A `0.2` envelope without the new field loads, and a `0.3` envelope
round-trips Runtime State Evidence. The generated types are rebuilt from the
schema, not hand-edited.

**`src/resolution/resolve.test.ts` — provenance honesty.** A stamped element
reports `exact` with its instrument's identifier, an unstamped sibling reports
`unavailable`, and deleting the `stableRuntimeId` anchor leaves every reachable
resolution outcome unchanged.

**The capture is proved as far as a script can.** A Verification Run proves the
control's availability, the permission request and the stored evidence, and reports
the capture itself as undriven, because no script can grant the permission. That
limit is stated in the run's report rather than papered over.

**Re-cut in the same change.** Any seam that asserts the old vocabulary or the
permissive proxy: the proxy tests in `src/service/http.test.ts:382`, and the
gallery and token baselines if a row gains a state label.

## Out of Scope

- **Relational Intent.** No relation is built and none is promised.
- **A shipped browser.** The capture is the Builder-Reviewer's own tab. A browser of
  our own is the most faithful path and is refused as the default, because a
  Chromium download is roughly 281 MB on a product promising one install.
- **A re-render in place of a capture.** Never produced, and never labelled as a
  Captured View.
- **A second artifact class beyond a locally served web application.** Canvas-object
  apps, desktop shells and native targets each need the target's cooperation, so
  they are adapter opportunities rather than promises — with tldraw-class apps
  recorded as the cheap exception worth naming.
- **A generic canvas object model and a universal provenance claim.** Unbounded, and
  both were explicitly advised against by the research.
- **Live updates as a push channel to the agent.** The Check-In convention remains
  the only steering mechanism; this iteration concerns the artifact's own updates.
- **Multi-page saved sites.** One document is the contract; a site artifact is a
  later feature.
- **An `unreachable` artifact frame, session expiry, and a real end-session
  call**, still absent as recorded in Pass A.
- **A style-value editor, a ranked candidate list, a numeric confidence, or any
  other `design.md` §10 anti-pattern.**

## Further Notes

**Where this came from.** A full audit of the shipped product against its own
documentation, recorded in the conversation that produced this spec. The findings
it rests on: the missing address in Target evidence, the un-instrumented asset
route, the dropped request body, the absent application policy, the missing
`upgrade` handler, and the surviving mode vocabulary. Each is cited with a
`file:line` in the Problem Statement above so the tickets do not inherit an
assumption. The four questions the audit could not settle from the code —
addressability, revision identity, pixel capture and provenance reachability — are
answered in `.scratch/target-evidence/research.md` from primary sources, with its
own disclosures of what it could not verify.

**Sequencing.** Runtime State Evidence is the vision's core and goes first,
independently of the application branch. Ticket 08's rule — the Adopted Revision is
what the artifact reports — is a correctness fix that costs nothing and belongs
before the mechanism that feeds it (ticket 09). The proxy repairs follow in the
order the surface depends on them: forwarding, then policy, then the update channel
that ticket 09 needs. The capture (10) and the provenance repair (11) are
independent of all of it. The docs sweep lands last so it describes behaviour that
exists.

**Where the application branch actually stands.** A locally served application is
already the same loop, with the same surface, the same Annotations and the same
tools. What was missing was never a mode: it was a revision that responds to an
edit, a client whose requests arrive intact, an update channel, and a policy that
admits the application's own traffic. Those are tickets 03–05 and 08–09, and the
application seam test (07) proves them.

## Comments

Corrected 2026-09-17: `Status: done`. Every ticket landed and the behaviour shipped. The iteration has no completed Verification Run: the three attempts at `.visual-intent-verify/runs/2026-09-17_14-35-05-target-evidence`, `…_14-36-31-proxied-app` and `…_14-36-52-proxied-app-2` ended `aborted`/`stopped`, so this iteration is done and unverified. `issues/10` names its unticked capture-proof box in a `Deferred confirmation:`. The three run directories, their `run.json` outcome and their `report.md` are left byte-identical: the record of an aborted run is evidence, not a mistake to clean.
