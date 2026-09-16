# Interaction modes and toolbar placement for a pointing surface

_Research date: 16 September 2026. Sources are official documentation and
first-party repositories. Confidence is stated per finding: no third-party
product was driven by hand for this note, so the claims below are what those
products' own docs and PRs say, not what was measured._

## The question

The Review Surface currently offers five equal tool buttons — Pointer, Element,
Text, Region, Arrange — in a top bar. This note answers three questions:

1. Is a separate mode needed for drawing a box, or can one pointing tool produce
   element, text and area targets?
2. How do comparable products display the mode they are in?
3. Where does the mode control belong, if a top bar is not earning its place?

## 1. A mode is only needed where our gesture conflicts with the page's own

The artifact is a live page. Both it and our layer want the same pointer events.
That conflict is the *only* reason a mode exists.

| Gesture | Conflicts with the page? | Mode needed? |
| --- | --- | --- |
| Click a thing to target it | Yes — a click on "Place order" would otherwise submit the form | Yes, one interception mode |
| Drag across words to target a phrase | No, if we let native text selection run | No |
| Drag a box to target an area | Yes — a drag otherwise selects text, scrolls or drags content | Shares the same interception mode |

Click-versus-drag does not need a mode. The two are distinguishable by how far
the pointer moved between press and release, and every mature selection library
does exactly that: a movement threshold decides `singleClick` versus `drag`.
Viselect, Selecto and DragSelect all document this state transition explicitly,
and all three also document the same caveat — a marquee overlay blocks native
text selection unless it is managed deliberately.

So the three target kinds are one tool with one threshold, not three modes. The
mode count is **two**, and the second one exists for the opposite reason:

- **Use the page** — no interception. Links, inputs, sliders, drag-and-drop,
  native text selection and scrolling all behave normally.
- **Point at things** — interception on. Click targets a thing, dragging across
  words targets those words, dragging anywhere else draws a box.

This matches the recommendation already recorded in
[tldraw-fit-research.md](./tldraw-fit-research.md): "These should be modes in one
coherent interaction model, not five independent tools."

## 2. How comparable products display mode

| Product | Modes it exposes | How mode is displayed | Where the control sits |
| --- | --- | --- | --- |
| Excalidraw | Selection, lasso, rectangle, diamond, ellipse, arrow, line, draw, text, image, eraser | Icon tiles in a floating island; the active tile is filled | Top-centre floating island on desktop, bottom on mobile |
| tldraw | Select, draw, text, arrow, frame, hand and custom tools | Icon tiles in a floating toolbar; active tool is highlighted | Bottom-centre on desktop, in an eight-region layout grid that can be overridden |
| Figma | Design, Prototype, Comment, Dev Mode | Small segmented control at the top; entering Comment mode swaps the sidebar to comments and changes the cursor to a speech bubble | Top bar, adjacent to the canvas |
| Chrome DevTools | Inspect on/off | A toggle icon that turns blue when armed; hovering the page outlines what a click would pick | Top-left of the DevTools panel |
| Marker.io, BugHerd, Markup (website feedback) | Point-and-click pin placement; freeform capture/draw kept separate | Elements highlight on hover; clicking locks the target and records its selector | Injected floating widget or browser-extension toolbar |

Four things hold across all of them:

1. **The mode control is adjacent to the thing you are pointing at**, not at the
   far edge of the window.
2. **The active mode is stated twice**: once in the control, and once in the
   artifact itself through a cursor change or a hover outline. A control-only
   signal is the thing that makes users feel lost.
3. **Words are rare.** These toolbars are icons with accessible names and
   tooltips, because a toolbar that is always on screen cannot afford five words.
4. **Freeform drawing is a separate mode from point-and-click targeting** in the
   website-feedback tools. That is the conflict in §1, expressed as product
   structure rather than as taste.

## 3. Where the mode control belongs

Two observations about our own surface, from the Verification Run on
`.visual-intent-verify/runs/2026-09-16_11-53-16-mode-research`:

- The top bar carries identity, revision, two surface states, five tools, the
  full agent sentence, a selection count, an attention badge and an overflow
  menu. With the agent sentence present it wraps to two or three lines and the
  bar grows past its declared 48px.
- With a card open, focus is in its textarea, so the single-key tool shortcuts
  are correctly ignored and tool switching silently stops working until the user
  clicks elsewhere. The shortcuts and the buttons therefore disagree about when
  they are available.

The candidate placements, with their cost:

| Option | Shape | Cost |
| --- | --- | --- |
| Slim top bar | Keep the bar for identity and agent state; the mode control is a two-item segmented control beside it | The control stays far from the artifact, and the bar cannot shrink much further |
| Panel-only | Delete the top bar; identity, mode and agent state all live in the right panel | The artifact gains full height, but the mode control is as far from the pointer as it can get |
| Floating island over the stage | A small island pinned to the stage, collapsed to one pill when idle and expanding to the mode control when armed | Nearest to the pointer and familiar from every drawing tool; it sits over artifact content unless deliberately placed and hidden while a card is open |

## Open uncertainties

- Whether a drag threshold that also reads native text selection stays
  predictable on artifacts with their own drag interactions.
- Whether an island over the stage obscures enough artifact content to be worse
  than a bar at the top.
- Whether the agent sentence can be shortened in the bar without becoming the
  "status dot" that design.md §10 forbids.

## Outcome

Adopted in the surface-refinement iteration: one full-height rail, and a floating
island at the stage's lower edge holding two icon-only tiles — point and box —
with operating the artifact as the unarmed state rather than a third tile. The
top bar is gone; identity, revision, agent position and the attention trigger
moved into the rail head.

The island is **never hidden**, including while an anchored card is open; the
card is positioned so the two cannot overlap. Pointing is one mode with two
outcomes decided by a movement threshold: a click targets a thing the artifact
owns, and a drag across words takes the artifact's own selection. A drawn Area
is dashed and static, and reports the elements it encloses so it stays
resolvable after a reflow. The two open uncertainties above — the drag threshold
on artifacts with their own drag interactions, and whether an island obscures
too much — remain unmeasured and are deferred in the spec.
