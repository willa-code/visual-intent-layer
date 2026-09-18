# 02: Prefactor: the layer belongs to one document

**What to build:** A proxied application whose document embeds a same-origin frame
renders with exactly one artifact layer — the shell's. The frame document no longer
grows its own overlay, hover, hotkeys, candidate marks or relation ghost whose messages
reach nothing. This is the prefactor that makes crossing a frame boundary tractable: a
second overlay under a dead message path is a defect, not a boundary.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A proxied artifact embedding a same-origin frame shows exactly one selection overlay, in the artifact's own document
- [ ] Pointing, hovering and keyboard acts over the frame's region produce no second, in-frame overlay and no selection that goes nowhere
- [x] The shell still receives every layer message it receives today, and the artifact still reports its own revision
- [x] A saved-HTML artifact, which cannot nest a frame at all, is unaffected
- [ ] Covered by the browser loop against a fixture with a same-origin frame

## Comments

2026-09-18. Filed from `.scratch/reach-within-the-class/spec.md` **Findings from the
decision pass**. The finding is that the layer is injected into every proxied `text/html`
response, and the nested instance posts to its own parent while the shell accepts a layer
message only from the artifact frame's own window — so the frame grows a phantom overlay.
Chosen over relaying nested messages, which would need its own design; ticket 06 is where
a frame becomes addressable on purpose.

2026-09-18 — guard landed; two of five boxes ticked, status left `ready-for-agent`. The
layer now starts only in the document the shell framed as the artifact: it checks
`window.frameElement` against the shell's own iframe class, and the class has one
definition shared by the shell and the layer. A nested frame's document therefore registers
no listeners and creates no overlay, so it cannot grow the phantom second layer the spec
found. The whole browser loop still passes, which is what proves the shell still receives
every layer message and that saved HTML is unaffected.

The three unticked boxes all need the same thing, which is not built: a proxied application
whose document embeds a same-origin frame, driven in the browser. That fixture belongs to
ticket 06, so the guard's behaviour inside a real frame is asserted by its unit predicate
today and will be driven end to end there.
