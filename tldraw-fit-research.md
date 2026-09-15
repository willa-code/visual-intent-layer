# tldraw fit for a Visual Intent Layer

_Research date: 15 September 2026. Sources are official documentation and first-party repositories._

## Bottom line

tldraw is a strong **interaction prototyping platform** for the proposed product, especially for freeform planning, multi-object manipulation, relational layout, and agent-readable canvas state. It is not a safe default foundation for an open-source-first production product: the SDK is source-available rather than permissively open-source, and production users need their own trial, commercial, or discretionary hobby license.

The best architecture is therefore not “build the product in tldraw.” It is:

1. build the core around a product-owned Visual Intent Envelope and adapter boundary;
2. use a purpose-built DOM overlay for reviewing a live web application in place;
3. evaluate tldraw in a time-boxed prototype for richer canvas interactions;
4. allow tldraw as an optional licensed canvas adapter later; and
5. evaluate Excalidraw or a small custom canvas for the permissively licensed default where freehand and diagram interaction are needed.

This protects the product's proposed breakthrough—portable, trustworthy translation of visual intent—from becoming coupled to one rendering library or canvas object model.

## What tldraw would give us

tldraw is a React infinite-canvas SDK rather than only a drawing widget. Its documented capabilities map unusually well to a high-quality visual-intent experience:

- native selection, translation, resize, rotation, snapping, alignment, distribution, stacking, and reordering;
- freehand drawing, text, arrows, images, frames, and custom shapes;
- custom tools and custom state machines;
- interactive and non-interactive overlay primitives;
- geometric hit testing and bindings among shapes;
- local persistence, snapshots, events, undo/redo, and multiplayer primitives;
- coordinate conversion among browser screen, editor viewport, and infinite-canvas page space; and
- extensive UI replacement and theming hooks.

The [official example catalogue](https://tldraw.dev/examples) includes custom overlays, lasso selection, selection bounds, dimensions HUDs, alignment and distribution, bindings, drag-and-drop containers, comment anchors, region comments, drawn reactions, image annotation, and PDF editing. Those are not peripheral demos; together they cover many of the interaction primitives needed to test whether visual gestures carry more intent than text annotations.

The [overlay system](https://tldraw.dev/sdk-features/overlay-utils) can render fast ephemeral selection, snapping, brush, handle, and custom interaction UI and can optionally expose hit-test geometry. The [coordinate-system example](https://tldraw.dev/examples/coordinate-system) explicitly supports converting between DOM screen coordinates, editor viewport coordinates, and canvas page coordinates. This would reduce the work needed for a polished canvas-native prototype.

The [Agent starter kit](https://tldraw.dev/starter-kits/agent) is also strong prior art. Its agent can read the visible canvas and current selection, create/update/delete shapes, draw, resize, align, distribute, stack, reorder, move its viewport, and schedule follow-up work. This validates the idea that human selection and manipulation can form structured agent context rather than a flattened screenshot.

## What tldraw does not solve

tldraw provides an excellent canvas object model. Our central problem is different: translating intent expressed over someone else's rendered artifact into a trustworthy change to its editable source.

It does not by itself provide:

- rendered DOM element to source file/span provenance;
- revision identity for the underlying application;
- target recovery after React/Vue/Svelte output changes;
- confidence, ambiguity, or abstention semantics;
- a host-neutral Visual Intent Envelope;
- Draft / Steer now / Next pass / Stop-and-review delivery semantics;
- verification against a later application revision; or
- access through cross-origin iframe boundaries.

A tldraw shape that visually surrounds a button knows about its own geometry. It does not automatically know which DOM element, component instance, source file, or code span produced the button. We would still need to build and own that provenance and resolution layer.

## Live application versus canvas: the key distinction

“Application support” means supporting the web application the individual user is currently building or reviewing. Both a saved HTML artifact and a React application eventually render HTML/DOM in a browser, but they are not equally difficult.

### Artifact mode

The reviewed file is itself the source of truth—for example, a saved or generated HTML file. The visible DOM can often be mapped directly back to that document. There may still be mutations and unstable generated markup, but source provenance is comparatively direct.

### Application mode

The reviewed DOM is an output produced by application source, routing, data, state, assets, and a framework build. A visible element may have come from a component in another file, a repeated list item, a design-system primitive, generated CSS, or server-rendered markup. Authentication, browser state, responsive breakpoints, overlays, iframes, and hot reload add further complexity.

This is why “HTML supports everything” is true only at the rendering layer. It does not make source targeting or safe revision automatically easy.

## How visual manipulation should work

Direct manipulation should initially be a **proposal mechanism**, not a second source editor.

The interaction loop should be:

1. The user selects one or more visible targets.
2. The system captures semantic identity, geometry, surrounding evidence, artifact revision, and available source provenance.
3. The user moves, resizes, aligns, groups, reorders, or sketches against lightweight visual proxies.
4. The product translates the gesture into relational or transformational intent—for example, “make A the same width as B,” “place C between A and B,” or “move this group below the hero while preserving spacing.”
5. The original artifact remains unchanged; the user sees a ghost preview and confirms the intent.
6. The agent changes the authoritative source.
7. The app reloads, resolves the targets in the new revision, compares the result to the intent, and asks the user to verify it.

This avoids pretending that a pixel displacement is always equivalent to a valid source change. A 40-pixel drag might mean changing margin, grid tracks, flex ordering, DOM order, a design token, or a parent container. The agent should decide the implementation; the product should preserve the human's desired visible relationship and constraints.

### Interaction modes

A live application needs explicit modes because both the application and annotation layer may want the same pointer events:

- **Explore:** the page behaves normally; links, inputs, scrolling, and application controls work.
- **Select:** pointing identifies DOM targets and exposes source/provenance evidence.
- **Direct:** drag/resize/align operates on ghost proxies and produces intent.
- **Draw:** freehand marks, arrows, regions, and text express looser spatial intent.
- **Review:** compare proposed or completed changes and approve/reject each item.

These should be modes in one coherent interaction model, not five independent tools.

## Why a tldraw overlay is not automatically the live-app overlay

Putting a full infinite canvas above a live page creates real integration costs:

- the canvas and page compete for pointer and keyboard events;
- page scroll and responsive reflow must continuously update anchors;
- browser, viewport, document, and canvas coordinate systems must be reconciled;
- native page focus, text selection, drag-and-drop, and accessibility can be obstructed;
- the canvas state must remain bound to DOM/source targets, not only fixed pixel positions; and
- a sandboxed MCP App cannot inspect a cross-origin application iframe without a separate capture bridge, browser extension, local proxy, or injected runtime.

tldraw's coordinate and overlay APIs help with the canvas half of these problems, but do not remove the browser security or provenance half.

A smaller, product-owned DOM overlay is likely the better core for in-place application review: it can render target outlines, pins, handles, ghost bounds, relationship guides, and a compact command surface while delegating geometry to DOM anchors. An infinite canvas is more natural when the canvas itself is the artifact or when the user wants a separate planning surface.

## Licensing and open-source strategy

The decisive constraint is licensing. The [tldraw license documentation](https://tldraw.dev/community/license) states that the SDK is source available, not open-source, and that its default terms permit development use only. Production deployment requires a trial, commercial, or discretionary hobby license and a license key. The documentation also says downstream users of an open-source product containing the SDK need their own production license.

That does not prevent a local development spike. It does mean a hard dependency would undermine a simple “clone it and use it in production” open-source promise and would introduce licensing friction for every downstream adopter.

The [Excalidraw repository](https://github.com/excalidraw/excalidraw) and embeddable React package are MIT-licensed. Excalidraw offers an open scene format, freehand drawing, common diagram shapes, arrows and bindings, text, pan/zoom, undo/redo, and image/SVG export. It is a better licensing fit for a default OSS drawing surface, although its editor extensibility and rich object-manipulation primitives should be prototyped rather than assumed to equal tldraw's.

## Recommended technical boundary

Define a canvas-independent interaction adapter behind the product's own model:

```text
Visible artifact
  -> target/provenance adapter
  -> interaction surface (DOM overlay | Excalidraw | optional tldraw)
  -> Visual Intent Envelope
  -> MCP delivery adapter
  -> agent source change
  -> revision resolver and verification
```

The envelope should contain intent primitives rather than tldraw or Excalidraw records. Canvas-specific records may be retained as evidence, but they should not be the portable contract.

Candidate V0 intent primitives:

- point to / comment on target;
- replace or revise visible text;
- move before/after/inside another target;
- align edges or centers;
- match width, height, spacing, style, or behavior;
- distribute a target set;
- resize toward a visual boundary;
- preserve or change a responsive relationship;
- draw a region, arrow, path, or rough replacement as supporting evidence; and
- approve, reject, or request another pass.

## Recommended experiment

Run one short interaction spike, not a platform build:

1. Use a representative local React application with a known source tree.
2. Implement the same three tasks in two prototypes:
   - a minimal DOM-native overlay; and
   - a tldraw-backed interaction surface.
3. Test three gestures: multi-target align, drag to reorder, and sketch/arrow plus text.
4. In both versions, emit the same draft Visual Intent Envelope.
5. Do not allow either prototype to edit source directly.
6. Measure implementation effort, interaction latency, pointer/focus conflicts, target stability after reflow, and how much canvas-specific data leaks into the envelope.

Use the result to choose the first UI engine. Do not let the engine choice determine the product schema.

## Decision recommendation

- **Yes:** use tldraw to learn quickly from a polished interaction system.
- **No:** do not make the tldraw SDK a mandatory production dependency for the OSS core.
- **Yes:** make visual manipulation a first-class input alongside selection and annotation.
- **No:** do not treat manipulation as direct mutation of the application source in V0.
- **Yes:** support browser-rendered surfaces through two explicit modes: saved/generated artifacts and framework-backed running applications.
- **Yes:** keep canvas implementations replaceable behind a product-owned interaction and envelope model.

## Open uncertainties

- Whether Excalidraw can provide the required polish without substantial custom editor work.
- Whether a custom DOM overlay plus a small drawing layer is simpler than embedding any full canvas engine.
- How accurately framework source locations can be recovered without requiring build-tool instrumentation.
- Which MCP hosts expose enough UI, steering, elicitation, and local-resource behavior for the complete experience.
- Whether users obtain enough extra value from freeform manipulation to justify it in V0, compared with excellent element/text/region selection plus relational commands.
