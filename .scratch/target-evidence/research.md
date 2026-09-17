# Research: target-evidence

*Addressing substrate, revision identity, pixel evidence, and the `exact` provenance promise.*

**Scope note.** This brief answers the four assigned questions from primary sources only: specs, first-party
docs, framework/protocol source, and the issue trackers of the projects that own the claim. Where a fact came
from a search-result summary rather than the owning source, it is either omitted or listed in **Could not
verify**. Every claim is labelled **direct evidence** (quoted or read from the owning source) or
**interpretation**/**inference** (my reasoning over that evidence).

**One framing fact that shapes everything below.** The product opens the user's own default browser and does
not control it. That means the product's capability boundary is *page JavaScript + same-origin*, plus whatever
a cooperating dev-server plugin injects. Chrome DevTools Protocol (CDP), closed shadow-root piercing,
cross-origin frame internals, and `Page.captureScreenshot` are all available **only if the product itself
launches and owns the browser process**, or if the user relaunches their browser with specific switches. This
distinction is load-bearing for A and C.

---

## A. How is a target addressed in each artifact class?

### A1. A locally served web app (DOM substrate)

**Substrate we can point at:** elements, text ranges, and geometry in the document the review surface can
reach. What we cannot address is anything the page JavaScript is not allowed to see, anything not rendered,
and anything that is not a DOM node.

| Case | Addressable by page JS in our surface? | Evidence |
|---|---|---|
| Open shadow root | Yes — `element.shadowRoot` returns the root, traversal works | MDN `attachShadow()`: with `{mode:"open"}` "the host element's `shadowRoot` property can subsequently be used to get the attached shadow root" (**direct**) |
| Closed shadow root | **No** — `element.shadowRoot` is `null`; only the code that called `attachShadow` holds the reference | MDN `attachShadow()`: with `{mode:"closed"}` "the Element's `shadowRoot` property is set to `null`"; "JavaScript can still access a closed shadow root by storing the value returned by the function" (**direct**) |
| Same-origin nested iframe | Yes — `iframe.contentDocument` reachable | Same-origin policy: "if it comes from the same origin, then we have full access to that window" (MDN) (**direct**) |
| Cross-origin nested iframe | **No DOM access at all** — only the `<iframe>` element itself | Same-origin policy (MDN); confirmed operationally in our own asset-extraction code paths, e.g. html-to-image's `cloneIFrameElement` falls back to `iframe.cloneNode(false)` when `contentDocument.body` is unavailable (**direct**) |
| Virtualized / windowed list | Only the rows currently rendered. Off-screen items **do not exist as nodes** | TanStack Virtual is a "headless UI utility for virtualizing long lists of elements" (TanStack Virtual docs) — it computes what to render; the consequence that off-screen items have no DOM is **inference** from how windowing works, not a quoted statement from the library. See **Could not verify** |
| `<canvas>` / WebGL | The `<canvas>` element and its box. **No DOM children.** | Excalidraw's interactive canvas is literally one element: `<canvas className="excalidraw__canvas interactive" …>{t("labels.drawingCanvas")}</canvas>` — the only text content is an aria label (`packages/excalidraw/components/canvases/InteractiveCanvas.tsx`) (**direct**) |

**What CDP adds, if we own the browser.** The DevTools Protocol has an explicit pierce concept:

- `DOM.getDocument` / `DOM.describeNode` / `DOM.requestChildNodes` take `pierce`: "Whether or not iframes and
  shadow roots should be traversed when returning the subtree (default is false)."
- `Node.shadowRootType` is typed `ShadowRootType = user-agent | open | closed`, and `Node` exposes
  `ShadowRootType shadowRootType` and `array of Node shadowRoots`.
- `DOM.getOuterHTML` has `includeShadowDOM` ("Include all shadow roots").
- `DOM.getNodeForLocation` returns `backendNodeId` + `frameId` for a coordinate, with
  `includeUserAgentShadowDOM` and `ignorePointerEventsNone`.
  All quoted from `pdl/domains/DOM.pdl` in `ChromeDevTools/devtools-protocol` (**direct**).

So: closed shadow roots and cross-origin frames are hard limits for the *browser-page* architecture, and are
solvable only by owning the browser (CDP) — or by asking the artifact app to cooperate.

### A2. Canvas / WebGL-heavy web apps (Excalidraw, tldraw, Figma-like)

This is the class where the substrate question has a different answer per app, because each app ships its own
object model and (sometimes) mirrors it into the DOM.

**Excalidraw — object model yes, DOM mirror no, external access no.**

- The scene is plain JSON with a per-element `id`: the `.excalidraw` schema stores `"elements": [{ "id": "pologsyG-tAraPgiN9xP9b", "type": "rectangle", … }]` (Excalidraw developer docs, *JSON Schema*) (**direct**).
- Rendering is a single `<canvas>`; there is no per-element DOM (**direct**, source above).
- The object model is reachable only from **inside** the app, through the imperative `excalidrawAPI` prop:
  `getSceneElements(): NonDeleted<ExcalidrawElement[]>`, `getSceneElementsIncludingDeleted()`,
  `getAppState()`, `scrollToContent(target)` (Excalidraw developer docs, *excalidrawAPI*) (**direct**).
  `excalidrawAPI` is a React prop, so an external tool cannot obtain it without the app exposing it.
- No accessibility layer over canvas contents. Their own tracker: "Excalidraw's support for screen readers
  presently seems limited mainly to the interface, not the canvas contents"
  (excalidraw/excalidraw issue #5759) (**direct**, first-party issue).

**tldraw — this is the surprising one: shapes *are* DOM elements carrying their stable id.**

- tldraw's default shape container renders
  `<div ref={ref} data-shape-type={shape.type} data-shape-is-filled={…} data-shape-id={shape.id} draggable={false} … className={classNames('tl-shape', …)}>`
  (`packages/editor/src/lib/components/default-components/DefaultShapeWrapper.tsx`) (**direct**).
- Shape ids are stable branded strings: `TLShapeId = RecordId<TLShape>`; `createShapeId()` yields
  `"shape:abc123"`, and custom ids are allowed (`createShapeId("my-rectangle")`) (tldraw docs,
  *TLShapeId* / *createShapeId*) (**direct**).
- The object model is in-app only: `editor.getShape(shapeId)`, `editor.getCurrentPageShapes`,
  `editor.getShapeAtPoint` (tldraw docs, *Editor* / *Shapes*) (**direct**).
- Accessibility exists over shapes (selection is announced via a live region; `getAriaLiveText` is an
  overridable hook), and tldraw deliberately marks SVG/text `aria-hidden` to avoid double announcement
  (tldraw docs *Accessibility* / *Screen reader accessibility*; PR #6437) (**direct**).

**Consequence (inference).** For tldraw, an external tool can read the *exact shape id* straight off the DOM with
no app cooperation — because the id is an attribute on the shape's own `<div>`. That is a materially better
addressing story than any other canvas engine examined here. It depends on the app not replacing
`DefaultShapeWrapper`, which is `@public` and therefore overridable.

**Figma — ids exist and are first-class, but the object model is remote/sandboxed.**

- "Every node has an `id` property, which is unique within the document"; `figma.getNodeByIdAsync(id)`
  (Figma plugin API docs) (**direct**).
- Figma's own MCP server addresses work by node id — design URLs are
  `https://figma.com/design/:fileKey/:fileName?node-id=1-2`, "`1-2` is the node ID", and the tool
  `get_code_connect_map` "Retrieves node ID to code component mappings" (Figma developer docs, *Tools and
  prompts* and *Skill: Implement Design*) (**direct**).

**Bottom line for A2 (inference).** There is no generic answer. What exists is: (a) an object model you can only
reach from inside the app, (b) sometimes a DOM mirror (tldraw: yes, id included; Excalidraw: no), (c) sometimes
an accessibility layer that is at least partially shape-aware (tldraw: yes; Excalidraw: no). A product that does
not own these apps can only address them by (i) hit-testing pixels and (ii) asking the app for its object model
through a bridge the app must provide.

### A3. A desktop shell around a web UI (Electron, Tauri)

Attaching an external process to the webview is possible in principle for both, but each requires either a
launch switch or an app-side opt-in.

**Electron.**

- The Chromium switch is documented and supported: `--remote-debugging-port=<port>` — "Enables remote debugging
  over HTTP on the specified `port`" (Electron *Supported Command Line Switches*) (**direct**).
- Electron documents enabling it from inside the app too:
  `app.commandLine.appendSwitch('remote-debugging-port', '8315')` before the `ready` event (**direct**).
- Main-process (not renderer) debugging is a different switch: `--inspect` / `--inspect-brk`, default port
  9229, and "You will need to use a debugger that supports the V8 inspector protocol" (Electron *Debugging the
  Main Process*) (**direct**).

**Tauri.**

- Devtools are **opt-in**: "By default, the inspector is only enabled in development and debug builds unless
  you enable it with a Cargo feature"; `tauri build --debug` produces a build with the development console
  enabled (Tauri v2 docs, *Debug*) (**direct**).
- The Cargo feature is explicit about the cost: "`devtools`: Enables the developer tools (Web inspector) …
  Enabled by default on debug builds. **On macOS it uses private APIs, so you can't enable it if your app will
  be published to the App Store**" (docs.rs `tauri` feature list) (**direct**).
- On Windows/Tauri (WebView2) the documented path is a Chromium flag in an environment variable:
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222"` (Microsoft Learn, *Remote debugging
  desktop WebView2 apps*; MicrosoftDocs/edge-developer VS Code how-to); WebView2 also lists a
  `msEdgeDevToolsWdpRemoteDebugging` browser flag (**direct**).
- On macOS/Tauri (WKWebView) the platform requires the app to opt in:
  `WKWebView.isInspectable` "Defaults to `false`. Set to `true` at any point in the view's lifetime to allow
  Safari Web Inspector access" (Apple Developer docs), and WebKit's own post says apps must explicitly opt in
  for this (WebKit blog, *Enabling the Inspection of Web Content in Apps*) (**direct**).

**Answer to the "does it require the app to opt in?" question (inference).** Yes, in every practical case:
Electron requires the app or launcher to pass a switch; Tauri requires a Cargo feature (debug builds only, and
a private-API/App-Store tradeoff on macOS) or a platform-level inspectability opt-in. There is no documented,
unprivileged, app-cooperation-free way to attach a DevTools client to a packaged Tauri app's webview.

### A — Could not verify

- **Virtualized lists.** I could not find an owning source that *states* "off-screen items are not in the DOM."
  The claim is inference from the definition of virtualization (TanStack Virtual docs describe only the
  utility, not the consequence). A precise citation should come from the specific library the user's app uses
  (e.g. `@tanstack/react-virtual` or `react-window` API docs on `overscan`).
- **Whether the product's own page-JS surface can address an OOPIF.** Cross-origin frames are same-origin-policy
  blocked (verified); the specific claim that *nothing* short of CDP/`postMessage` contract can reach an OOPIF's
  internals is standard but I did not read it from a spec sentence in this pass.
- **`data-*` mirroring in Excalidraw.** I verified there is no per-element DOM in `InteractiveCanvas.tsx`. I did
  not audit the whole Excalidraw tree for other DOM mirrors (text-editor overlay, a11y helpers) or for any
  `window` global exposing the scene.
- **Figma node-id stability across edits / duplication.** The plugin docs say the id is "unique within the
  document"; they do not state stability across file versions in the text I read.
- **Electron + Chrome 136's remote-debugging hardening.** Chrome 136 stops honouring
  `--remote-debugging-port` against "the default Chrome data directory" (Chrome blog, 2025-03-17). Whether
  Electron's app-scoped user-data-dir is treated as "default" is **not verified**; the Chromium source path
  (`kDebuggingRequestedWithDefaultUserDataDir` in `remote_debugging_server.cc`) suggests the check is keyed on
  Chrome's own default profile, but I did not confirm Electronic's behaviour experimentally or in Electron docs.
- **`--remote-allow-origins`.** Chrome 111 began rejecting DevTools WebSocket connections that send a
  non-allowlisted `Origin` header unless `--remote-allow-origins` is passed. The Chromium commit states "This CL
  should not affect non-browser clients such as Puppeteer and WebDriver", so a Node client should be unaffected —
  but I did not test this against an Electron or Tauri webview.

---

## B. What is a revision for a running app?

**The current mechanism is wrong for the stated reason.** Hashing the bytes of the dev server's root HTML
response is stable across a component edit, because an unbundled dev server serves an HTML shell that
references modules, not the modules themselves. Vite's own backend-integration guidance is explicit that in
development you inject scripts rather than serve a built artifact:

```html
<script type="module" src="http://localhost:5173/@vite/client"></script>
<script type="module" src="http://localhost:5173/main.js"></script>
```

(Vite *Backend Integration*) (**direct** — this is why the root HTML is byte-identical while the app changed.)

### Candidate mechanisms, with the boundary that decides them

**1. Build manifest — requires a build step. Not available in dev.**

- Vite `build.manifest`: "Whether to generate a manifest file that contains a mapping of non-hashed asset
  filenames to their hashed versions, which can then be used by a server framework to render the correct asset
  links" (Vite *Build Options*) (**direct**).
- The manifest is produced at build time: "For production, after running `vite build`, a `.vite/manifest.json`
  file will be generated alongside other asset files" (Vite *Backend Integration*) (**direct**).
- The manifest plugin is a no-op unless configured: `if (!environment.config.build.manifest) return false`
  (`packages/vite/src/node/plugins/manifest.ts`) (**direct**).
- And it does not exist in dev, by design: in vitejs/vite issue #10745 ("Manifest.json is not created in
  dev-mode") the response is "Yes, this is by design." (**direct**, maintainer response in the owning tracker).

**2. Next.js build id / deployment id — requires a build step, and is a constant in dev.**

- "Next.js generates an ID during `next build` to identify which version of your application is being served."
  (Next.js docs, `generateBuildId`) (**direct**).
- `deploymentId` / `NEXT_DEPLOYMENT_ID` "is used for version skew protection and cache busting during rolling
  deployments" (Next.js docs, `deploymentId`) (**direct**).
- In dev, the Turbopack hot reloader hard-codes it: `const dev = true; const buildId = 'development'`
  (`packages/next/src/server/dev/hot-reloader-turbopack.ts`) (**direct**). So the build id is *useless* as a
  revision in `next dev` — worse than useless, since it looks like an identifier.

**3. Dev-server HMR events — viable for unbundled dev servers.**

Vite's HMR types give a per-change identifier that a plugin (server side) or the artifact page (client side)
can observe:

```ts
export interface Update {
  type: 'js-update' | 'css-update'
  path: string
  acceptedPath: string
  timestamp: number
  …
}
export interface HotPayload { … | UpdatePayload | BundledDevUpdatePayload | FullReloadPayload | … }
```

(`packages/vite/types/hmrPayload.d.ts`) (**direct**).

Server side, that timestamp is minted per file change and handed to plugins:

```ts
const timestamp = monotonicDateNow()
const contextMeta = { type, file, timestamp, read: () => readModifiedFile(file), server }
…
export interface HotUpdateOptions {
  type: 'create' | 'update' | 'delete'
  file: string
  timestamp: number
  modules: Array<EnvironmentModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}
```

(`packages/vite/src/node/server/hmr.ts`) (**direct**). It is strictly increasing by construction
(`monotonicDateNow`), which is exactly the property a revision counter needs, and the `read()` hook means a
plugin can hash the changed module's contents alongside it.

Client side, the events available to code running in the artifact page are documented:
`vite:beforeUpdate`, `vite:afterUpdate`, `vite:beforeFullReload`, `vite:beforePrune`, `vite:invalidate`,
`vite:error`, `vite:ws:disconnect`, `vite:ws:connect` (Vite *HMR API*) (**direct**).

Vite also has a dev-server-provided per-client monotonic counter in its experimental bundled-dev mode:
`BundledDevUpdatePayload { changedIds: string[]; url: string; seq: number }` — "Per-client sequence number"
(`hmrPayload.d.ts`) (**direct**).

Next.js's dev HMR socket likewise exists but was renamed: the HMR WebSocket path moved from
`/_next/webpack-hmr` to `/_next/hmr` "to better reflect that this endpoint is bundler-agnostic"
(vercel/next.js PR #91415) (**direct**). Its payload is not a documented revision identifier.

**4. TanStack Start — inherits Vite.** TanStack Start is a Vite plugin: `start-plugin-core` ships
`vite/dev-server-plugin/plugin.ts` and `vite/start-manifest-plugin/plugin.ts`, the latter building
`buildStartManifest` / `serializeStartManifest` via `manifestBuilder` (TanStack/router source) (**direct**).
So Start has a *build* manifest and Vite's *dev* HMR semantics — the same split as plain Vite.

**5. Source-tree hash — works for unbundled dev servers, at a cost.**
No build step is required: hash the watched root. The costs are real and must be stated honestly: it needs a
watcher, a decision about what is in scope (node_modules, generated files, build outputs, `.env`), and it is
*not* the same thing as "what the browser has executed". It can therefore report a change the page has not yet
picked up (mid-HMR), or miss a change caused by something outside the watched set (a server-side response, a
remote data change, a random seed). This is **inference**, but it follows directly from the fact that the hash
describes files, not the running document.

### Which options work where (direct, summarised)

| Mechanism | Unbundled dev server | Requires build step | Notes |
|---|---|---|---|
| Vite `build.manifest` | No | Yes | No-op unless `build.manifest` is set; absent in dev by design |
| Next `buildId` / `deploymentId` | No | Yes | In `next dev` it is the constant `'development'` |
| Vite HMR `timestamp` (plugin hook) | **Yes** | — | `monotonicDateNow()`, per change, with `read()` for content |
| Vite HMR `timestamp` (client event) | **Yes** | — | via `vite:beforeUpdate` / `vite:afterUpdate` |
| Vite `bundled-dev-update.seq` | Yes (experimental bundled dev) | — | per-client sequence number |
| TanStack Start manifest | No | Yes | Vite-plugin build artifact |
| Source-tree hash | **Yes** | — | needs a watcher + scope decision; describes files, not the running page |

### The honesty problem no mechanism solves by itself (inference)

None of the above is "the revision the human saw." A server-side revision tells you the server changed; it does
not tell you the browser applied it. The only way to record the revision identity of the artifact the human
was actually looking at is for **the page to report which revision it holds**, and for the Annotation to store
that report. Concretely: the surface should record a revision on load, update it from `vite:afterUpdate` /
`vite:beforeFullReload` (or the equivalent for other dev servers), and refuse to treat the server's current
revision as the Annotation's revision. Otherwise target resolution silently compares against the wrong
baseline.

### B — Could not verify

- Whether Vite's client module appends `?t=<timestamp>` to updated module URLs in the *current* source (a
  widely repeated detail I did not confirm in this pass; I checked `packages/vite/src/shared/hmr.ts` and it was
  not there). The `Update.timestamp` field itself is verified.
- Whether any Vite version exposes a dev-time manifest under a different name (an "experimental dev manifest"
  is sometimes claimed). I found no such thing in Vite's build-options docs or the manifest plugin.
- Next.js dev HMR payload shape. I did not read `hot-reloader-types` / `HMR_ACTIONS_SENT_TO_BROWSER`.
- Whether a dev-server-provided revision could be countersigned cryptographically. Out of scope; unverified.

---

## C. How could we capture what the human saw (pixel evidence)?

The framing matters: **a client-side rasterizer produces a re-render, not a screenshot; only a browser-level
capture produces what the human saw.** These are different evidence classes and should not share a label.

### C1. Client-side rasterizer in a same-origin iframe (html-to-image, html2canvas)

**Mechanism.** html-to-image clones the subtree, copies computed styles, inlines resources, and asks the
browser to rasterize an SVG `foreignObject`. Its own limits are readable from its source
(`src/clone-node.ts`) (**direct**):

- **Canvas:** `cloneCanvasElement` calls `canvas.toDataURL()`; if the result is the empty string it returns
  `canvas.cloneNode(false)` — i.e. a **blank** canvas. So any canvas whose pixels cannot be read renders empty.
- **WebGL:** by default this is exactly the common case. `WebGLContextAttributes.preserveDrawingBuffer`
  defaults to `false`, and the WebGL spec says: "If false, once the drawing buffer is presented … the contents
  of the drawing buffer are cleared to their default values", and "attempting to perform operations using this
  context as a source image after the rendering function has returned can lead to undefined behavior. This
  includes `readPixels` or `toDataURL`" (Khronos WebGL 1.0 spec) (**direct**). So a WebGL/tldraw/Excalidraw-style
  view captures **blank** unless the app opted into `preserveDrawingBuffer` (and pays its documented performance
  cost).
- **Iframes:** `cloneIFrameElement` reads `iframe.contentDocument.body`, falling back to a bare
  `iframe.cloneNode(false)` in a `catch`. **Cross-origin iframes therefore capture as an empty box**, and the
  same-origin path only works because of the same-origin policy discussed in A1 (**direct**).
- **Shadow DOM:** children are gathered from `(nativeNode.shadowRoot ?? nativeNode)`. `shadowRoot` is `null`
  for closed roots (A1), so **closed-root content captures as nothing** (**direct**).
- **Video:** frames are drawn from the live element into a 2D canvas, so the same taint/CORS constraints apply.
- **Cross-origin images and fonts:** resources are fetched and inlined; the README documents the failure mode
  as a default: `imagePlaceholder` "Defaults to an empty string and will render empty areas for failed images."
  (**direct**). Their tracker carries the matching reports (#40 "image CORS problem", #36 "It's not working with
  Iframes") (**direct**, first-party issue tracker).
- Licence: MIT (repository README badge/LICENSE) (**direct**).

**html2canvas** is worse for fidelity and is honest about it in its own docs:

- "The screenshot is based on the DOM and as such may not be 100% accurate to the real representation as it
  does not make an actual screenshot, but builds the screenshot based on the information available on the page"
  (html2canvas documentation) (**direct**).
- Cross-origin content taints: "All the images that the script uses need to reside under the same origin for it
  to be able to read them without the assistance of a proxy. Similarly, if you have other `canvas` elements on
  the page, which have been tainted with cross-origin content, they will become dirty and no longer readable";
  `allowTaint` defaults to `false`, `useCORS` defaults to `false`, `proxy` defaults to `null` (**direct**).
- Unsupported CSS (their own list) includes `box-shadow`, `filter`, `mix-blend-mode`, `background-blend-mode`,
  `border-image`, `object-fit`, `writing-mode`, `zoom`, `repeating-linear-gradient()`, `font-variant-ligatures`,
  `box-decoration-break`, and `background-clip: text` (**direct**).
- Iframe capture is limited in practice: their issue #487 is exactly "is there a way to capture iframe content ?"
  (**direct**).

**Assessment (inference).** This path can produce a *useful* image for simple same-origin DOM, and it is cheap
(npm-only, no download). It cannot honestly be labelled "what the human saw": it is a second rendering that
diverges on canvas/WebGL, cross-origin iframes, closed shadow roots, cross-origin images/fonts, and a listed set
of CSS features. For exactly the artifact classes that motivate this iteration (canvas-heavy, cross-origin dev
servers), it fails in the most visible way.

### C2. Screen Capture API / `getDisplayMedia`

**Requirements, from MDN and the spec** (**direct**):

- **Secure context required.** `MediaDevices` is a secure-context API. `http://localhost` qualifies — MDN's
  Secure Contexts page marks `http://localhost` as ✅ Secure ("`localhost` URL") (**direct**). A non-localhost
  HTTP origin does not.
- **Transient activation required.** `getDisplayMedia()` throws `InvalidStateError` "if the call … was not made
  from code running due to a transient activation, such as an event handler" (**direct**).
- **Permission cannot be persisted.** "The go-ahead permission to use `getDisplayMedia()` cannot be persisted for
  reuse. The user must be prompted for permission every time." (**direct**).
- **A picker is always shown, and options cannot restrict it.** "The specified options can't be used to limit the
  choices available to the user. Instead, they must be applied after the user chooses a source" (**direct**).
- **Iframe permission.** In a frame you need the Permissions Policy directive: `<iframe allow="display-capture" …>`;
  "The default allowlist for both directives is `self`", and the API is a *powerful feature*, so permission is
  still prompted even when policy allows it (**direct**).
- **It is a tap, not a crop.** `MediaTrackSettings.displaySurface` is `browser | monitor | window`; `preferCurrentTab`
  is a hint, and Chrome only offers the "This tab" option when it is set (**direct**).

**Narrowing the capture to the artifact (this is the interesting part).** Element Capture and Region Capture both
ship, both are Chromium-only and desktop-only:

- `RestrictionTarget.fromElement(element)` restricts the track to that element and its descendants; the element
  must form a stacking context, be flattened in 3D, be rendered, and contain only one box fragment, or the
  promise rejects. Critically: "the element will not be captured if the track being restricted has clones … or
  is captured from a different tab to the current user's tab" (**direct**).
- `CropTarget.fromElement(element)` crops to the element's bounding box instead (**direct**).
- Browser support: `RestrictionTarget` — Chrome **132+**, `chrome_android: false`, Firefox/Safari `false`.
  `CropTarget` — Chrome **104+**, `chrome_android: false`, Firefox/Safari `false` (mdn/browser-compat-data
  `api/RestrictionTarget.json`, `api/CropTarget.json`) (**direct**).
- MDN also states plain "Element Capture and Region Capture are only supported on desktop browsers, and
  off-screen content is not captured" (**direct**).
- Fidelity caveats from MDN: "any alpha-channel value set on it is not included. If the restriction target
  element is semi-transparent, it will end up completely opaque" (**direct**).

**What this means for our architecture (inference).** Because the capture source must be the *current tab*, the
artifact must be rendered in the same tab as the capturing page — i.e. our review surface must host it
(same-origin iframe or same document) rather than living in a separate window. Where that holds, Region/Element
Capture gives a genuine browser-composited image of exactly the artifact region, with a per-session user
permission prompt and no dependency on the artifact's own cooperation. Costs: Chromium desktop only, one
permission prompt per capture session, and no capture of off-screen content.

### C3. A headless browser we ship or download

**Cost, from Playwright's own documentation** (**direct**):

```
du -hs ~/Library/Caches/ms-playwright/*
281M  chromium-XXXXXX
187M  firefox-XXXX
180M  webkit-XXXX
```

- Browsers are downloaded to `%USERPROFILE%\AppData\Local\ms-playwright` (Windows),
  `~/Library/Caches/ms-playwright` (macOS), `~/.cache/ms-playwright` (Linux).
- Playwright ships "a regular Chromium build for headed operations and a separate chromium headless shell for
  headless mode"; `npx playwright install --only-shell` avoids the full Chromium when headless-only, and
  `--with-deps` installs OS dependencies.
- Download host and proxy are configurable (`PLAYWRIGHT_DOWNLOAD_HOST`, `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT`).

**Packaging implication for an npm-distributed Node CLI** (**direct**):

- The `playwright` package no longer downloads browsers during install:
  PR #26672, *"feat: make `playwright` package not install browsers automatically"*, merged 2023-08-27, was
  renamed from "introduce `@playwright/browser-<browser>` packages" (**direct** — this is the change that
  separates "install the library" from "download the browser").
- Two supported postures: (a) the user runs `npx playwright install` themselves (a several-hundred-MB download
  plus possible `install-deps`), or (b) the product takes an optional dependency on
  `@playwright/browser-chromium` so npm pulls the browser for it.
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` exists but has a documented history of confusing behaviour (issues #10489,
  #24607) (**direct**).
- Codec/licence nuance, from the same page: "Chromium does not have all the codecs that Google Chrome or
  Microsoft Edge are bundling due to various licensing considerations and agreements." Playwright's Chromium is
  an open-source Chromium build; branded Chrome/Edge are *not* redistributable (**direct** for the codec
  statement; **interpretation** for the redistribution statement).
- Minimum honest framing for a "local-first, one npm install" product (**inference**): shipping a browser by
  default contradicts the product's own install promise; making it an explicit, documented `npx`-style step
  keeps the default install cheap at the cost of an extra setup step, and headless-shell-only reduces but does
  not eliminate the download.

**CDP alternative without shipping a browser.** `Page.captureScreenshot` is well-specified:
`format` (`jpeg | png | webp`), `quality`, `clip`, `fromSurface` (defaults true), `captureBeyondViewport`
(defaults false), `optimizeForSpeed`; returns base64 image data (`pdl/domains/Page.pdl`) (**direct**). But
driving it needs a browser started with a debugging port, and **Chrome 136 changed that**:

> "from Chrome 136 we're making changes to the behavior of `--remote-debugging-port` and
> `--remote-debugging-pipe`. These switches will no longer be respected if attempting to debug the default
> Chrome data directory. These switches must now be accompanied by the `--user-data-dir` switch to point to a
> non-standard directory." — Chrome for Developers blog, 2025-03-17, with the recommendation to use Chrome for
> Testing for automation.

So "attach to the user's existing default browser over CDP" is no longer available behaviour.

### C4. Other first-party browser APIs actually shipped and usable today

| API | Shipped? | Usable for our case? |
|---|---|---|
| **Region Capture** (`CropTarget`) | Chrome 104+, desktop only (BCD) | Yes, for a same-tab artifact; crops to an element's box |
| **Element Capture** (`RestrictionTarget`) | Chrome 132+, desktop only (BCD) | Yes, same-tab, with eligibility rules (stacking context, flattened, single box fragment) and opacity caveat |
| **`getDisplayMedia` + `preferCurrentTab`** | Chrome offers the "This tab" option only with this hint (MDN) | Yes; this is what makes the C2 path ergonomic |
| **`HTMLCanvasElement.captureStream()`** | Shipped | Only for canvases *we* create/own — not for capturing someone else's rendered page |
| **Captured Surface Control** (`forwardWheel`/zoom) | Chrome, gated by `captured-surface-control` permission | Adjacent nicety, not a capture path |

**No first-party API exists that lets page JavaScript screenshot the rendered tab (or another page) without a
user-granted capture permission.** Every honest "pixel evidence" path is therefore one of: (a) a permissioned
browser-composited capture (C2), (b) a browser we run (C3), or (c) a re-render that we label as a re-render (C1).
(Item (c)'s framing is **inference** from the evidence above.)

### C — Could not verify

- **Exact download size of the Chromium headless shell.** Playwright's page gives 281M/187M/180M for full
  builds and documents `--only-shell`, but I did not find a published size for the shell.
- **Playwright's licence.** Commonly Apache-2.0; I did not read the LICENSE file from the repository in this
  pass.
- **Whether Element/Region Capture are usable when the artifact is inside a cross-origin iframe in our tab.**
  MDN's constraint is about the *tab*, and `fromElement` takes an element from our document; whether a
  cross-origin iframe element (rather than an element inside it) is an eligible restriction/crop target is not
  something I verified. This is decision-relevant if the product proxies the dev server onto a different origin.
- **Whether `html-to-image`'s current release still exhibits the iframe bug** or whether the fix PRs (#346,
  #351) landed; the source I read does handle same-origin iframes and falls back for others, so the *limit* is
  verified even if the issue history is stale.
- **Safari/Firefox equivalents for per-element capture.** None found; BCD reports `false` for both on
  `RestrictionTarget` and `CropTarget`. Whether Safari's `WKWebView`-level capture APIs are usable from a plain
  page is unverified and out of scope.
- **`MediaStreamTrackProcessor`/`ImageCapture` extraction quality.** Not evaluated.

---

## D. Is `exact` source provenance reachable on current frameworks? (verdict required)

### D1. The current adapter is dead on React 19 — confirmed by React's own maintainers

- The removal is PR #28265 / commit `37d901e`, *"Remove `__self` and `__source` location from elements"*:
  "Along with all the places using it like the `_debugSource` on Fiber." (**direct**).
- Issue #29092 reports the consequence precisely: "In **React 18**, Fiber exposed `_debugSource`. In **React 19**
  … this was changed to `_debugInfo` but the value is **always `null`**." React's response (rickhanlonii):
  "This was removed in #28265, see that PR for the reasoning. **The internal fiber structure is internal and
  will break between any release.**" The issue is `CLOSED (NOT_PLANNED)` (**direct**).
- What replaced it is *not* per-element: DevTools now defines `source` for a Fiber lazily from component stacks
  (PR #28351), with symbolication in PR #28471 (**direct**). The reported effect in #29092 is that the source now
  points into a build chunk — `chunk-OITURYR5.js?v=29ba3b73:1389` — rather than the JSX site, and a maintainer
  (hoxyq) acknowledges the JSX-location loss is a real UI problem (**direct**).

### D2. Owner stacks cannot substitute

`React.captureOwnerStack` returns `string | null`, exists only in development ("`captureOwnerStack` will always
return `null` outside of development"), and is available only inside component render, Effects, React event
handlers, and React error handlers. The documentation's own troubleshooting section describes our exact case:

> "The call of `captureOwnerStack` happened outside of a React controlled function e.g. in a `setTimeout`
> callback, after a `fetch` call or in **a custom DOM event handler**."

(react.dev, `captureOwnerStack`) (**direct**). A human clicking a `<div>` in our surface *is* a custom DOM event
handler. Additionally, a stack is a component-level stack — it does not identify *which* of several sibling
elements at the same callsite was clicked. This is also the gap the requesting team named in #31981: "all
approaches using stack traces and similar will not work as they only contain the line number and not exact
location in the source file. Take for instance the JSX code … `<span>Hello</span>` ×3 and it is quite difficult
to know which element a `<span>` from the DOM maps to" (**direct**). The request to reintroduce `__debugSource`
(issue #31981) is **still OPEN**, last activity a stale-bot cycle with "still relevant" (2026-06-28) and the
initiating author stating "Nothing has changed here" (**direct**).

### D3. What does work today: build-time attribute stamping, per framework, dev-only

This is a real, shipped, maintained mechanism — not a proposal.

**`code-inspector-plugin` (zh-lx/code-inspector) is the concrete existence proof.** Verified from its source:

- The attribute names are constants: `PathName = 'data-insp-path'` (plus `data-insp-row`, `data-insp-col`,
  `data-insp-node`) in `packages/core/src/shared/constant.ts` (**direct**).
- The browser client reads it off the clicked element:
  ```ts
  interface CodeInspectorHtmlElement extends HTMLElement { 'data-insp-path': string }
  …
  getSourceInfo = (target: HTMLElement): SourceInfo | null => {
    let paths = target.getAttribute?.(PathName) || (target as CodeInspectorHtmlElement)[PathName];
    if (!paths) return null;
    … // split on ':' → name, column, line, path
  }
  ```
  (`packages/core/src/client/index.ts`) (**direct**).
- The server side is a set of **per-framework source transforms**: `transform-jsx.ts`, `transform-vue.ts`,
  `transform-vue-node.ts`, `transform-vue-pug.ts`, `transform-svelte.ts`, `transform-astro.ts`,
  `transform-mdx.ts`, plus `scan-html-tag.ts` (`packages/core/src/server/transform/`) (**direct**).
- The Svelte transform is the cleanest proof of the exactness claim — it writes file, line, column and tag
  name into the element's own source:
  ```ts
  const line = countLines(content, node.start) + 1;
  const column = node.start - content.lastIndexOf('\n', node.start);
  const addition = ` ${PathName}="${filePath}:${line}:${column}:${node.name}"…`;
  s.prependLeft(insertPosition, addition);
  ```
  (`transform-svelte.ts`) (**direct**).
- The JSX transform injects attributes and additionally *propagates* the path into component roots through props
  ("React 不会像 Vue 一样把组件调用点上的 attrs 自动透传到根 DOM，这里改写组件根节点，让它优先读取
  `props[data-insp-path]`" — React does not forward attrs from the call site to the root DOM the way Vue does, so
  the component root is rewritten to prefer `props[data-insp-path]`) (**direct**).
- It is applied **dev-only**: the Vite plugin's `apply` hook is
  `return !options.close && isDev(options.dev, command === 'serve')` (`packages/vite/src/index.ts`) (**direct**).
- Coverage is broad and its own README is the source: bundlers webpack / vite / rspack / rsbuild / farm /
  esbuild / turbopack / mako; frameworks vue2/vue3/nuxt, react/nextjs/umijs, preact, solid, qwik, svelte, astro
  (**direct**).
- Maintenance: last commit `2bae210a`, `release: 2.0.9`, 2026-09-12 (GitHub API) (**direct**) — actively
  maintained.

**What a user would install and configure (this is the "if a mechanism works, say exactly what" answer):**

1. `npm i -D code-inspector-plugin`
2. Add `codeInspectorPlugin({ bundler: 'vite' })` to `vite.config.ts` plugins — **and it must come before the
   framework plugin**: the plugin itself warns "You need to put `code-inspector-plugin` before
   `@vitejs/plugin-react` (or `vite-plugin-solid`, `qwikVite`, `@preact/preset-vite`,
   `@sveltejs/vite-plugin-svelte`, `@vitejs/plugin-react-swc`, `@vitejs/plugin-react-oxc`)" (**direct**).
3. For webpack/rspack/rsbuild/esbuild/farm/mako/Nuxt/umi there is a separate wiring snippet per bundler; for
   Next.js it is per-version: `<= 14.x` via `next.config.js` `webpack()`, `15.0.x–15.2.x` via
   `experimental.turbo.rules`, `>= 15.3.x` via top-level `turbopack.rules` (**direct**).
4. Framework version support is per-framework, not universal in one transform.

**The second real mechanism: patching React's dev runtime.** `vite-plugin-react-click-to-component`
(ArnaudBarre) rewrites React's `jsx-dev-runtime` in dev so that the `_debugInfo` property is initialised to the
`source` object, restoring per-element source objects:

```ts
// Fix React 19 not injecting source in jsxDEV
const defineIndex = code.indexOf('"_debugInfo"')
const valueIndex = code.indexOf("value: null", defineIndex)
let newCode = code.slice(0, valueIndex) + "value: source" + code.slice(valueIndex + 11)
…
// React 19.2: we need to inject source jsxDEV -> jsxDEVImpl -> ReactElement
newCode = newCode.replaceAll(/maybeKey,\s*isStaticChildren/gu, "maybeKey, isStaticChildren, source")
newCode = newCode.replaceAll(/(\w+)?,\s*debugStack,\s*debugTask/gu, …)
```

(`src/index.ts`) (**direct**). Its own code documents the fragility: it branches on the presence of
`function ReactElement(type, key, self, source,` and needs a special case for React 19.2's argument threading;
it only runs `if (!isServe) return`. The author states in React #31981: "I'm still doing manual patching to keep
the DX working with React 19" (**direct**).

**Successors to locator.js / react-dev-inspector / code-inspector:**

| Project | Last commit | What it actually does | Status |
|---|---|---|---|
| `zh-lx/code-inspector` | 2026-09-12 (v2.0.9) | Dev-only build-time attribute stamping across 8 bundlers / 7+ frameworks; client reads `data-insp-path`; posts to a local server that opens the IDE | **Maintained** (direct) |
| `infi-pc/locatorjs` | 2026-03-01 | Browser extension + library; install modes are explicitly split: "React DevTools based" and "React data-id based", plus separate SolidJS/Preact/Svelte/Vue installs; README directs Next.js 15+ with Turbopack/SWC to `@locator/webpack-loader` instead of the direct babel plugin | **Maintained** (direct) |
| `ArnaudBarre/vite-plugin-react-click-to-component` | (npm-published; reviewed at `main`) | Dev-only Vite plugin; monkey-patches `jsx-dev-runtime` so `_debugInfo = source`; injects a client script | **Maintained but explicitly a hack** (direct) |
| `zthxxx/react-dev-inspector` | **2025-01-05** | Babel plugin `<Inspector />` + dev-server middleware that opens the local IDE | **Effectively stale** (direct) |

### D4. Source-map reverse mapping — necessary but not sufficient

Source maps can map a *generated* position to an original file/line/column. The unsolved half is obtaining the
generated position of the *clicked* DOM node. React 19 removed the runtime link (D1), and no framework examined
here exposes a "which generated call produced this DOM node" API to page JavaScript. So source maps are the
second half of a solution whose first half is the stamp (D3) — they close the gap between "attribute says
`src/Card.tsx:12:5`" and "that column is really the opening `<div`, and here is the enclosing component".
(**This paragraph is inference**, built on D1 + D3; no source states it in these terms.)

**One unverified lead worth a spike.** CDP has `DOM.setNodeStackTracesEnabled` and
`Node.getNodeStackTraces`, documented as "Gets stack traces associated with a Node. As of now, only provides
stack trace for **Node creation**." If the renderer's node-creation stack points into the app's modules, and
source maps symbolicate it, this could recover provenance from CDP without any build-time stamp — at the cost of
owning the browser. I did not verify that the stack is populated for React-generated DOM nodes, nor how deep it
goes. Listed as missing evidence, not as a recommendation.

### D5. Verdict

**No — the unconditional promise of `exact` source provenance cannot be kept.**

Reason, stated plainly: the mechanism the product currently relies on was removed by React, React has closed the
issue as not planned, no replacement that works at click time exists, and no framework-agnostic runtime API
exists. Keeping the promise would mean claiming something that is false for every React 19 app, which is the
product's own stated primary stack ("V0 deeply supports one stack—React with Vite"). The product's own strategy
document already anticipates this: "The UI must not silently promote a likely file or component into exact
provenance", and `Source Provenance` in `CONTEXT.md` is already conditional ("carries Source Provenance only
when an adapter can supply it").

**But do not delete the capability — delete the *promise*.** A verified mechanism does exist, and it is
installable today:

- **Mechanism:** a dev-only, build-time source-location stamp (`data-insp-path="<file>:<line>:<col>:<tag>"`),
  injected by a configured bundler plugin, read off the clicked element at runtime.
- **What the user installs and configures:** `npm i -D code-inspector-plugin`, plus one bundler-specific plugin
  entry (`codeInspectorPlugin({ bundler: 'vite' })` placed *before* the framework plugin; different wiring for
  webpack/rspack/rsbuild/esbuild/farm/mako/Turbopack/Next-per-version) — or a product-owned equivalent plugin
  with the same shape.
- **What it yields:** exact `file:line:column` for stamped host elements, dev only, for supported
  bundler×framework combinations.
- **What it does not yield:** locations for every DOM node (the plugin escapes a fixed tag list and propagates
  through component roots), production builds, unsupported stack combinations, or canvas-internal objects
  (A2 — those are not DOM nodes and can never carry a DOM attribute).
- **Honest product wording (proposal, not sourced):** replace `exact` with something like
  *Exact (instrumented)*, keep `Inferred` and `Unavailable` as peers, and state the setup requirement in the
  claim itself. `CONTEXT.md` already separates `Provenance Confidence` from `Target Resolution` and forbids
  sharing the word "exact" between them; the same discipline needs to apply inside `Provenance Confidence` — an
  unconditional "exact" label is itself a confidently-wrong claim, which the strategy document's optional
  research gate explicitly targets ("under 1% confidently wrong").

---

## Could not verify (consolidated)

Listed once here; per-section disclosures above carry the detail.

1. **Virtualized lists** — no owning source states the "off-screen rows have no DOM" consequence; only
   inference from the definition of virtualization.
2. **Any DOM mirror in Excalidraw** beyond the single interactive canvas, and any `window` global exposing its
   scene.
3. **Figma node-id stability** across file versions or duplication (docs state only "unique within the
   document").
4. **Electron vs Chrome 136's default-user-data-dir remote-debugging block** — untested.
5. **`--remote-allow-origins` for a Node CDP client talking to Electron/Tauri** — untested; the Chromium commit
   says it "should not affect non-browser clients such as Puppeteer and WebDriver".
6. **Chromium headless shell download size** and Playwright's licence file (not read this pass).
7. **Element/Region Capture eligibility for a cross-origin iframe element** in our tab — not found in MDN/spec.
8. **Whether html-to-image's released version fully fixed the iframe issue** (PRs #346/#351) — issue history not
   traced to release.
9. **Vite client `?t=<timestamp>` module-URL suffix** — not confirmed in current source.
10. **Next.js dev HMR payload shape** (`hot-reloader-types`, `HMR_ACTIONS_SENT_TO_BROWSER`) — not read.
11. **Whether any Vite dev-time manifest exists** beyond `build.manifest` — found nothing.
12. **CDP `Node.getNodeStackTraces` populating creation stacks for React DOM nodes** — a lead, unverified.
13. **Whether code-inspector guarantees an attribute on *every* clickable node** — its escapes and prop
    propagation make this a per-case question I did not test.
14. **The current date relative to the evidence.** Latest evidence dates observed: code-inspector commit
    2026-09-12, React issue activity 2026-06-28. Treat any "current" statement as of that window.

---

## Verdicts

### (A) Which artifact classes are addressable, and how

| Class | Substrate | Addressable | Not addressable |
|---|---|---|---|
| **Local web app (DOM)** | node identity + box | Elements, text ranges, open shadow roots, same-origin frames, currently-rendered rows | Closed shadow roots; cross-origin frame interiors; unrendered virtualized rows; canvas/WebGL contents (one element, no children) |
| **Canvas/WebGL app** | pixels + the app's own object model | Geometry/boxes; **tldraw: the exact `shape:` id, straight from `data-shape-id` on the shape's own div** | Excalidraw: nothing per-element from outside the app (its ids live in JSON, reachable only via the in-app `excalidrawAPI`); Figma: node ids exist but the model is remote/sandboxed, reachable via plugins/REST/MCP, not from page JS |
| **Desktop shell** | webview DOM | Electron: full DOM + CDP **when launched with `--remote-debugging-port`** (or the app appends it). Windows/Tauri (WebView2): CDP via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` | Packaged apps without a switch; Tauri release builds without the `devtools` Cargo feature; macOS/WKWebView unless the app sets `isInspectable = true` (default `false`) |

**Practical conclusion (inference):** DOM apps are addressable with the architecture already chosen. tldraw-class
apps are addressable *if* they use the default shape wrapper — a real, cheap win. Everything else in the canvas
class needs a per-app bridge the app must expose, and should be scoped as an adapter, not as a promise.

### (B) Which revision mechanism is viable

- **Not viable as a dev-time revision:** Vite `build.manifest` (build-only, by design), Next `buildId` /
  `deploymentId` (build-only; literally `'development'` in dev), TanStack Start's manifest (build artifact).
- **Viable without a build step:** the dev server's per-change, strictly-increasing HMR `timestamp`, available
  both to a plugin (`HotUpdateOptions.timestamp`, with `read()` for content) and, in Vite, to the page
  (`vite:beforeUpdate` / `vite:afterUpdate` payload `Update.timestamp`); plus the experimental bundled-dev
  per-client `seq`.
- **Recommended shape (inference):** a small dev-server plugin that maintains a monotonically increasing
  revision, seeds it from an initial source-tree hash, advances it on every `hotUpdate`/HMR update using that
  timestamp plus a hash of the changed module's contents, and exposes it over a loopback endpoint; the page
  records the revision it loaded and every revision it advanced to, and **the Annotation stores the page's
  report, not the server's current value.** Report both when they disagree — that disagreement is the
  "revision advanced before delivery" case the strategy document already requires.
- **Fallback:** source-tree hash for dev servers with no HMR protocol, disclosed as a file-level, not
  document-level, identity.

### (C) Which capture path is the cheapest honest option

- **Cheapest honest option: `getDisplayMedia({ preferCurrentTab: true })` + `CropTarget`/`RestrictionTarget` on
  the artifact element, in the same tab.** It is the only path that yields genuine browser-composited pixels
  with zero shipped binaries and no per-element fidelity caveats, and `http://localhost` satisfies the secure
  context requirement. Costs, all of which must be disclosed in the UI: one user permission prompt per session
  that cannot be persisted; Chromium desktop only (Chrome 104+/132+, no Firefox, no Safari, no Android); the
  artifact must be rendered in the capturing tab; off-screen content is not captured; alpha is forced opaque.
- **Cheap but must be relabelled: client-side rasterization (html-to-image).** npm-only, MIT, no download — but
  it is a **re-render**, and it returns blank for WebGL/canvas (WebGL's `preserveDrawingBuffer` defaults false),
  blank for cross-origin iframes, blank for closed shadow roots, and empty areas for cross-origin images/fonts.
  Label it Rendered Reconstruction, not pixel evidence.
- **Most faithful, most expensive: a browser we launch.** Owns CDP, so `Page.captureScreenshot`
  (`fromSurface`, `captureBeyondViewport`, `clip`) and DOM piercing work. Costs: 281M for Chromium (or
  `--only-shell`, size unpublished), browsers no longer auto-installed by the `playwright` package, possible OS
  dependency installation, and a contradiction with the product's one-`npm install` promise unless gated behind
  an explicit user step.
- **Explicitly closed off: attaching to the user's own default Chrome over CDP.** Chrome 136 stopped honouring
  `--remote-debugging-port` against the default data directory.

### (D) Keep the `exact` provenance promise? — **No**

Delete the unconditional claim. Replace it with an **opt-in, instrumented, dev-only** exact mode:

- **Do not claim** `exact` for React 19 by default. `_debugSource` was removed (PR #28265), `_debugInfo` is
  always `null` (issue #29092, closed not planned), `captureOwnerStack` is unavailable at click time and is
  component-level, and no per-element runtime API exists.
- **Do claim, conditionally:** "Exact (instrumented) — available for stamped elements when the project has
  installed and configured a source-location plugin and is running a dev build." The proven mechanism is
  build-time attribute stamping, shipped today by `code-inspector-plugin`
  (`data-insp-path="<file>:<line>:<col>:<tag>"`, dev-only, 8 bundlers × 7+ frameworks, last release 2026-09-12),
  with `locatorjs` (maintained to 2026-03-01) and `vite-plugin-react-click-to-component` (React-only, Vite-only,
  monkey-patches React's dev runtime, explicitly fragile) as alternatives.
- **What the user installs/does:** `npm i -D code-inspector-plugin`, one bundler-specific plugin entry placed
  before the framework plugin (Next.js wiring differs by minor version), and nothing else.
- **Also delete from the adapter:** the React fiber `_debugSource` read. It cannot work, and a fallback that
  silently returns nothing is indistinguishable from "no provenance available" — which is the honest state and
  should be reported as `Unavailable`, not as a weak guess.
- **Do not attempt to fix this by trying harder at runtime.** React's position is that the internal fiber
  structure "will break between any release"; a product that reads it is promising stability it cannot have.

---

## Sources

**Kept (primary / owning sources).**

React / provenance

- facebook/react commit `37d901e` — *Remove `__self` and `__source` location from elements (#28265)* — https://github.com/facebook/react/commit/37d901e2b81e12d40df7012c6f8681b8272d2555 — the removal itself.
- facebook/react issue #29092 — *[React 19] Fiber is missing a debug information* — https://github.com/facebook/react/issues/29092 — `_debugInfo` always `null`; maintainer's "internal … will break between any release"; CLOSED (NOT_PLANNED).
- facebook/react issue #31981 — *[React 19] Reintroduce debugSource in some kind of opt-in way* — https://github.com/facebook/react/issues/31981 — still open; the exact "three identical `<span>`s" argument; the ongoing manual-patching workaround.
- facebook/react PR #28351 — *refactor[devtools]: lazily define source for fiber based on component stacks* — https://github.com/facebook/react/pull/28351 — what replaced it.
- react.dev — `captureOwnerStack` — https://react.dev/reference/react/captureOwnerStack — dev-only; `string | null`; "custom DOM event handler" caveat.
- react.dev / react.dev search snippet for `captureOwnerStack` availability contexts.
- zh-lx/code-inspector — https://github.com/zh-lx/code-inspector (+ `packages/core/src/shared/constant.ts`, `packages/core/src/client/index.ts`, `packages/core/src/server/transform/transform-svelte.ts`, `packages/core/src/server/transform/transform-jsx.ts`, `packages/vite/src/index.ts`) — the working stamp mechanism and its exact wiring.
- ArnaudBarre/vite-plugin-react-click-to-component — `src/index.ts` — the React dev-runtime patch, and its fragility.
- infi-pc/locatorjs — https://github.com/infi-pc/locatorjs — maintained successor; split install modes.
- zthxxx/react-dev-inspector — https://github.com/zthxxx/react-dev-inspector — stale (last commit 2025-01-05).

Vite / revisions

- Vite — *HMR API* — https://vite.dev/guide/api-hmr — client events list.
- Vite — *Backend Integration* — https://vite.dev/guide/backend-integration — dev serves scripts, not the built artifact; `.vite/manifest.json` is a build output.
- Vite — *Build Options* — https://vite.dev/config/build-options — `build.manifest` definition.
- vitejs/vite issue #10745 — *Manifest.json is not created in dev-mode* — https://github.com/vitejs/vite/issues/10745 — "Yes, this is by design."
- vitejs/vite — `packages/vite/types/hmrPayload.d.ts` and `packages/vite/src/node/server/hmr.ts`, `packages/vite/src/node/plugins/manifest.ts`.

Next.js / TanStack

- Next.js — `generateBuildId` — https://nextjs.org/docs/app/api-reference/config/next-config-js/generateBuildId.
- Next.js — `deploymentId` — https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId.
- vercel/next.js — `packages/next/src/server/dev/hot-reloader-turbopack.ts` (`const buildId = 'development'`) and PR #91415 (HMR path rename).
- TanStack/router — `packages/start-plugin-core/src/vite/start-manifest-plugin/plugin.ts`, `…/dev-server-plugin/plugin.ts`.

DOM / addressing

- MDN — `Element.attachShadow()` — https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow — open vs closed.
- DOM Standard — https://dom.spec.whatwg.org/#interface-shadowroot — normative shadow-root definition.
- MDN — *Same-origin policy* — https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy.
- ChromeDevTools/devtools-protocol — `pdl/domains/DOM.pdl`, `pdl/domains/Page.pdl` — `pierce`, `ShadowRootType` incl. `closed`, `getNodeForLocation`, `Page.captureScreenshot` parameters.

tldraw / Excalidraw / Figma

- tldraw — `DefaultShapeWrapper.tsx` (`data-shape-id={shape.id}`), `Shape.tsx`, `DefaultCanvas.tsx`; docs *TLShapeId*, *createShapeId*, *Editor*, *Shapes*, *Accessibility*, *Screen reader accessibility*; PR #6437.
- Excalidraw — docs *JSON Schema* (element `id`) and *excalidrawAPI* (`getSceneElements`); `packages/excalidraw/components/canvases/InteractiveCanvas.tsx`; issue #5759 (screen-reader scope).
- Figma — plugin API docs (`figma.getNodeByIdAsync`, "unique within the document"); Figma developer docs, *Tools and prompts* (`get_code_connect_map`) and *Skill: Implement Design* (node-id URL form).

Desktop shells

- Electron — *Supported Command Line Switches* (`--remote-debugging-port=<port>`), *Debugging the Main Process* (`--inspect`, port 9229).
- Tauri v2 docs — *Debug* (`tauri build --debug`; inspector dev-only unless a Cargo feature) and docs.rs `tauri` feature list (`devtools`; macOS private APIs / App Store).
- Microsoft Learn — WebView2 remote debugging; `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222"`; `webview-features-flags` (`msEdgeDevToolsWdpRemoteDebugging`).
- Apple Developer — `WKWebView.isInspectable` (defaults to `false`); WebKit blog — *Enabling the Inspection of Web Content in Apps*.

Pixel evidence

- html-to-image — `src/clone-node.ts` (canvas/iframe/shadow-root handling), README (`imagePlaceholder` default, MIT); issues #36, #40.
- html2canvas — *Features* (unsupported CSS list), *documentation* (same-origin requirement), *faq* (taint), *configuration* (`allowTaint`, `useCORS`, `proxy` defaults); issue #487.
- Khronos — WebGL 1.0 spec — https://registry.khronos.org/webgl/specs/latest/1.0/ — `preserveDrawingBuffer` semantics incl. `toDataURL`/`readPixels` undefined behaviour.
- MDN — *Screen Capture API*, `MediaDevices.getDisplayMedia()`, *Using the Element and Region Capture APIs*, `RestrictionTarget.fromElement()`, *Secure Contexts*.
- mdn/browser-compat-data — `api/RestrictionTarget.json` (Chrome 132+), `api/CropTarget.json` (Chrome 104+).
- Playwright — *Browsers* (281M/187M/180M, `--only-shell`, headless shell, download hosts, codec licensing); PR #26672 (browsers no longer auto-installed).
- Chrome for Developers blog, 2025-03-17 — *Changes to remote debugging switches to improve security* — Chrome 136 + default data directory; recommends Chrome for Testing.

**Rejected / deprioritized.**

- `qaskills.sh`, `hyperping.com/learn/playwright`, `desplega.ai`, `modern-framework-accessibility.com`,
  `accessible-data-interfaces.com`, `web-accessibility-a11y.com`, `sujeet.pro` — SEO/aggregator content on
  shadow DOM, virtualization and Playwright limits; every substantive claim was re-sourced to MDN, the DOM
  spec, the WebGL spec, or project source instead.
- Stack Overflow / javascript.info on cross-origin frames — replaced by MDN's same-origin policy page.
- `yotam.net/posts/piercing-the-shadow-root-using-cdp` — good but secondary; replaced by the protocol PDL.
- `npmx.dev`, `registry.npmjs.org` tarball listings describing one-off source-location plugins
  (`vite-plugin-dom-source`, `swc-plugin-source-tracker`, `nextjs-locator-swc`, `@metagptx/vite-plugin-source-locator`,
  `unplugin-jsx-source`, `react-source-inspector`) — could not verify maintenance or provenance from a primary
  repository in this pass; `code-inspector-plugin` is the maintained one with verifiable source.
- Generic "Chrome >= v136 no longer supports CDP with default profile" issues in third-party trackers
  (browser-use, chrome-devtools-mcp) — superseded by Google's own blog post and the Chromium source.
- `show-component`, `ugly-app` data-source plugin, `rafiusks/reDesigner` — interesting but unmaintained or
  undocumented relative to the accepted mechanism.

---

## Next steps (bounded)

1. **Decide the capture contract, then build to it.** The cheapest honest path (C2) requires the artifact to be
   rendered in the capturing tab. If the product's architecture places the artifact in a separate window, that
   decision — not the API choice — is the blocker. Verify Element/Region Capture eligibility for a cross-origin
   iframe in the product's actual origin layout before committing.
2. **Spike the revision endpoint.** A Vite plugin that exposes `{ revision, timestamp, changedPaths }` over
   loopback, advanced from `hotUpdate` and seeded by a source-tree hash; plus the page-side record from
   `vite:afterUpdate`. Confirm the two agree and that disagreement is surfaced, not smoothed.
3. **Replace the provenance adapter before claiming anything.** Delete the `_debugSource` read. Implement a
   `data-insp-path` reader (or the product's own attribute) and record `Exact (instrumented)` vs `Unavailable`
   honestly. Then run the mutation benchmark specifically to measure the false-confidence rate of the
   instrumented path.
4. **Verify the two open tldraw/Excalidraw questions** (does a real tldraw app keep `data-shape-id`; is there any
   externally reachable Excalidraw global) with a 30-minute experiment each rather than more reading.
5. **Do not spend budget on:** a generic canvas object model, a universal provenance claim, or shipping a browser
   by default.
