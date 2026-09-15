# Review Surface design contract

Status: normative implementation source of truth for the Review Surface. A change
to the Review Surface's visual or interaction language is a change to this
document first.

## 1. Scope and precedence

This document governs the Review Surface: the product-owned chrome, its two
states, its components, and the interaction layer it draws inside an artifact.
It governs no artifact's own appearance.

Precedence, strongest first:

1. A platform or browser accessibility requirement.
2. A privacy, consent, or security rule — including the artifact fidelity and
   remote-origin rules in ADR-0015 and the disclosure requirements behind them.
3. A domain rule from `CONTEXT.md`. The surface must not imply a state the domain
   does not have, and must not present two different claims with one word.
4. This document.
5. Local taste.

Where this document conflicts with 1–3, the conflict is resolved by an
amendment recorded here rather than by an implementation decision.

## 2. Visual direction

**Warm-neutral luminous base, one accent, no decoration.**

The surface is a work tool, so legibility and hierarchy carry the personality
and ornament carries nothing. A warm near-white canvas, white or subtly tinted
content surfaces, dark confident type, and a single saturated accent reserved
for two jobs: marking the thing the Builder-Reviewer is acting on, and marking
the one primary action available.

Soft semantic surfaces exist to carry state. They are never used decoratively,
never used as the sole signal, and never invented for a new component without a
role defined in §4.

Dark mode is a designed counterpart, not an inversion and not the browser's
default canvas. The hierarchy survives; the values are chosen for the dark
ground and contrast-checked against it.

**Deliberate tightening relative to the reference palette.** The warm palette
this direction is drawn from was authored for a spacious consumer application.
Three changes make it a tool:

- Radii tighten from a 12/18/28 consumer scale to a 8/12/16 scale, so density
  reads as intentional rather than undersized.
- The vivid decorative accents (lime, apricot) are dropped from chrome
  entirely. Coral survives only as destructive confirmation.
- Type drops to a tool scale with an 11px floor, because a review surface shows
  metadata, identity strings and evidence alongside content.

## 3. Token architecture

Two layers, always. Components consume semantic roles from §4, never raw values
from this section. A theme may adjust a primitive for contrast without changing
a semantic role.

### Colour primitives — light

| Token | Value |
| --- | --- |
| `canvas` | `#FBFAF8` |
| `surface` | `#FFFFFF` |
| `surface.raised` | `#FFFFFF` |
| `surface.sunken` | `#F4F1EE` |
| `ink.primary` | `#20202A` |
| `ink.secondary` | `#676674` |
| `ink.muted` | `#76727C` |
| `line.default` | `#E9E5E5` |
| `line.strong` | `#D4CED1` |
| `accent` | `#2B5FD7` |
| `accent.ink` | `#FFFFFF` |

### Colour primitives — dark

| Token | Value |
| --- | --- |
| `canvas` | `#14131A` |
| `surface` | `#1D1B24` |
| `surface.raised` | `#26232E` |
| `surface.sunken` | `#100F16` |
| `ink.primary` | `#F2F0F4` |
| `ink.secondary` | `#ACA7B6` |
| `ink.muted` | `#8B8794` |
| `line.default` | `#302D38` |
| `line.strong` | `#45414F` |
| `accent` | `#6D9BF5` |
| `accent.ink` | `#10131F` |

### Semantic surface pairs

Each pair is `surface` plus its paired `ink`. Every pairing must be verified on
its own; a token pair is not licensed for a use it was not checked against.

| Role surface | Light surface / ink | Dark surface / ink |
| --- | --- | --- |
| `attention` | `#FFF2CC` / `#6B4A00` | `#3A2F14` / `#F0D089` |
| `progress` | `#E9EAFE` / `#37358F` | `#232449` / `#B9BCF5` |
| `success` | `#E6EFE2` / `#2E4A28` | `#1F2E1D` / `#A9C9A0` |
| `closed` | `#F0EEEC` / `#57535E` | `#252329` / `#A9A5B4` |
| `destructive` | `#FFEDE6` / `#7E3A28` | `#3A231C` / `#F0B49F` |

### Type

| Token | Family | Size / leading | Use |
| --- | --- | --- | --- |
| `type.meta` | sans | 11 / 16 | Counts, timestamps, badges |
| `type.label` | sans | 12 / 16 | Control labels, chips, tool names |
| `type.body` | sans | 13 / 18 | Notes, evidence, list content |
| `type.body.strong` | sans | 13 / 18, 600 | Selected rows, active tool |
| `type.panel.title` | sans | 15 / 22, 600 | Panel and card headings |
| `type.stage.title` | sans | 18 / 26, 600 | Empty and terminal states only |
| `type.identity` | mono | 12 / 18 | Revision ids, selectors, spans, paths |

Sans is the platform system UI font. Mono is the platform monospace. Identity
strings are never set in the sans font, because a mistyped revision hash must
look like a hash.

### Spacing, metrics, radius, elevation, motion

| Group | Values |
| --- | --- |
| Spacing | `4, 8, 12, 16, 20, 24, 32, 40, 48`. Chrome uses 4–16; panel rhythm is 8/12/16; section separation is 24/32. |
| Metrics | Top bar height `48`; panel width `380`; drawer width `380`; anchored card max width `340`; control height `32`, small `28`, large `36`; icon button `28×28`. |
| Radius | `8` inputs and buttons; `12` cards and panel sections; `16` anchored card, drawer, dialog; `pill` chips and tags; `full` icon buttons. |
| Elevation | `card`: `0 1px 2px rgba(20,18,28,.06), 0 8px 24px rgba(73,56,128,.08)`; `overlay`: `0 4px 12px rgba(20,18,28,.10), 0 16px 40px rgba(73,56,128,.14)`; `sheet`: `-8px 0 32px rgba(20,18,28,.12)`. Every elevated surface also carries a `line.default` border: a shadow is never the only boundary. |
| Motion | `fast` 120ms, `base` 200ms, `deliberate` 320ms, easing `cubic-bezier(.2,.8,.2,1)`. Spatial movement stays under 12px. No perpetual animation except the agent-activity indicator, which must be pausable. Reduced motion removes all transitions and all scale or lift. |

## 4. Semantic roles and the state vocabulary

Roles name meaning. The surface has exactly these state families, and every
state must be expressed as **text plus at least one non-colour cue** — an icon,
a shape, a border, or a position.

| Family | States | Role | Required cue beyond colour |
| --- | --- | --- | --- |
| Target | hovered, selected, focused | `accent` | Mark with a distinct border weight; focus uses a ring separate from selection |
| Annotation | draft, queued, delivered, acknowledged, resolved, verified, rejected, superseded, obsolete | `progress` while in flight, `success` verified, `closed` rejected/superseded/obsolete | Label text per state; delivery and implementation are never shown as one state |
| Resolution | matched, recovered, ambiguous, deleted | `success`, `progress`, `attention`, `closed` | Glyph plus label. Ambiguous shows its candidates and never resolves itself; deleted states that approval is blocked |
| Revision | current, advanced | `closed`, `attention` | Annotation-level, never a target label. Phrased as "written before this revision", not as an error |
| Provenance | source span, inferred, unavailable | `progress`, `closed`, `attention` | Always labelled. Never uses the word "exact", which belongs to resolution alone |
| Agent position | awaiting you, working, acknowledged, stepped away | `progress`, `success`, `closed` | A sentence, not a dot. "Stepped away" must never read as "working" |
| Attention | one or more items needing a decision | `attention` | Count badge on the drawer trigger, hidden at zero |

## 5. Surface composition

```
┌─ top bar (48) ─────────────────────────────────────────────────────────────┐
│ artifact identity · revision │ Review │ Verify │  tool row  │ agent · ▣ · ⋯ │
├──────────────────────────────────────────────┬─────────────────────────────┤
│                                              │  panel (380)                │
│  stage: artifact frame                       │                             │
│  + artifact-document overlay                 │  Review: queue + composer   │
│    (hover, target marks, focus ring,         │          + send controls    │
│     marquee, relation guides and handles,    │                             │
│     before/after toggle)                     │  Verify: annotation list    │
│                                              │          + verdicts         │
│                                              │          + candidates       │
└──────────────────────────────────────────────┴─────────────────────────────┘
        anchored annotation card sits over the stage, near its target
        drawer (380) slides over the panel when the attention badge is used
```

**Review state:** artifact is exercised normally; the tool row is present; the
panel is a queue with a composer and send controls; anchored annotation cards
open on selection; the drawer is available.

**Verify state:** tool row is absent; the panel is a list of annotations with
per-annotation verdict controls and a candidate chooser where a resolution is
ambiguous; the stage carries a before/after revision toggle; the drawer is
available.

Anything that is not one of the two states' core jobs lives in the overflow
menu or the drawer. The overflow menu holds end session, reload artifact, copy
artifact path, copy evidence, and open the disclosure. It never holds a
frequent action.

## 6. Component inventory

Every component is delivered in every state it can actually reach, and the
gallery in §9 renders them.

| Component | Variants and states |
| --- | --- |
| `TopBar` | default; revision chip `current` / `advanced` |
| `StateSwitch` | Review active / Verify active; Verify disabled while nothing is deliverable |
| `ToolRow` | per tool: default, hover, active, focus, disabled; roving tabindex |
| `RevisionChip` | current, advanced; mono identity |
| `AgentPosition` | awaiting, working, acknowledged, stepped away; each with its sentence |
| `AttentionTrigger` | hidden at zero, badge with count |
| `OverflowMenu` | closed, open, item focus |
| `ArtifactFrame` | loading, ready, unreachable, policy-blocked |
| `OverlayMark` | hover, selected, focused, ambiguous-candidate highlight, relation member |
| `Marquee` | drawing; below the minimum-size threshold it produces nothing |
| `RelationGuide` / `RelationHandle` | available, dragging, snapped, invalid |
| `RelationSentence` | readable sentence of the current relation set |
| `BeforeAfterToggle` | before, after, off |
| `AnchoredCard` | positioned left/right/flipped, clamped to viewport, dismissed |
| `AnnotationCard` | drafting; with attachment; with relation; actions: queue, delete |
| `AttachmentChip` | uploading, ready, failed, removed |
| `QueueList` | empty, populated, reordering |
| `AnnotationPill` | draft, queued, delivered, acknowledged, resolved, verified, rejected, superseded, obsolete |
| `Composer` | empty, typing, over threshold, disabled |
| `SendControls` | send queue; send-and-hold; disabled with the reason stated |
| `AnnotationRow` | matched, recovered, ambiguous, deleted, advanced |
| `CandidateChooser` | none, several, one chosen |
| `VerdictControls` | enabled, blocked with reason, recorded |
| `Drawer` | open, closed, scrollable body |
| `DisclosureList` | populated, empty |
| `Button` | primary, secondary, ghost, destructive; hover, active, focus, disabled, busy |
| `IconButton` | hover, active, focus, disabled; requires a text alternative |
| `ToggleGroup`, `Pill`, `Badge`, `StatusDot`, `Tooltip`, `Toast`, `Textarea`, `Listbox`, `ScrollArea`, `Dialog` | default plus the states they can reach |

Consequential actions use visible text. An icon-only control is permitted only
where its meaning is unambiguous and it carries an accessible name.

## 7. Interaction and keyboard

- `Cmd/Ctrl+I` toggles Review. Leaving Review never discards anything.
- In Review: `V` Pointer, `E` Element, `T` Text, `G` Region, `A` Arrange. Single
  keys are ignored while focus is in a text field or a contenteditable region.
- `Enter` in an anchored annotation card queues the annotation. `Cmd/Ctrl+Enter`
  queues and sends the whole queue.
- `Escape` unwinds exactly one level and no more: close the anchored card, then
  clear the selection, then leave Review, then return focus to the state switch.
  `Escape` never discards unsent text.
- Native application controls stay operable in Review without a state change.
  Custom non-native controls opt out of targeting explicitly.
- The artifact document never traps focus. Chrome layers do.
- Selected targets carry their own visible focus indicator, distinct from the
  selection mark, so keyboard and pointer targeting visibly agree.
- An anchored card is clamped to the viewport and flips side rather than
  overlapping its target.

## 8. Accessibility floor

WCAG 2.2 AA is the floor, not an aspiration.

- Body and control text meets 4.5:1. Large text and non-text UI including focus
  indicators, borders and glyphs meet 3:1. Every semantic pair is verified on
  its own surface.
- Pointer targets meet the 24×24 minimum.
- Focus is always visible and is never removed without replacement.
- The tool row, target marks, resolution labels and verdict controls have
  programmatic names that state position and meaning, for example
  "Target 2 of 3, Place order button, button".
- Reduced motion removes transitions, scale and lift.
- State changes that a sighted user sees as motion are announced where they
  change the meaning of the surface, in particular revision advance and
  resolution.
- The surface never makes the artifact harder to operate than opening it
  directly would.

## 9. The design gallery

A dev-only route serves every token in §3 and every component and state in §6,
rendered side by side in light and dark. It is not part of the product's
navigation and is never served to a normal session.

A scripted screenshot pass captures the gallery and fails on difference. Token
or state drift therefore fails loudly instead of being discovered months later
in a screenshot thread. The gallery is also the surface the primary browser
seam asserts against when it needs a component in isolation.

## 10. Anti-patterns

Recorded because each one has a plausible-sounding reason to exist:

- A style-value editor of any kind: typography, colour, spacing values, borders,
  shadows or content. This product expresses relationships and leaves the
  implementation to the agent.
- A freehand pen, highlighter, arrow or shape palette.
- Decorative colour, gradients, glass blur or texture in chrome.
- Colour as the only state signal.
- A shadow as the only boundary between surfaces.
- A modal that obscures the artifact, or any dialog that steals the artifact's
  own interaction without an explicit close.
- Icon-only controls for consequential actions.
- A status dot standing in for a sentence about the agent.
- One control that carries two claims, in particular the word "exact" meaning
  both that the target matched and that the source span is known.
- Perpetual animation.
- Approximating a missing target rather than showing it as missing.
- Shrinking the chrome below the 11px floor to fit more controls.

## 11. Amendment process

An amendment is a change to this document, made before the implementation
changes, recorded at the foot of this file with its date, its reason, and what
it replaces. An amendment that trades a §1 precedence rule for a visual
preference is not available; the conflict goes up the precedence list instead.

### Amendments

_None yet._