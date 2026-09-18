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
ground and contrast-checked against it. It is drawn from the same warm family
as the light primitives and holds the same luminance steps between surface,
raised and sunken. A cool or purple cast is not a counterpart; it is a second
design.

**The theme is the operator's, never the artifact's.** The surface follows the
platform preference until the operator chooses otherwise, and that choice is
remembered. It never samples the artifact, derives a colour from it, or inverts
it. The artifact is what is being judged; letting it theme the surface that
judges it makes review non-reproducible, invites contrast failures we do not
control, and destroys the boundary between the tool and the work.

**The rail is warm; the artifact is white.** The chrome's material is the warm
`canvas` primitive, and the raised surfaces inside it are `surface`. The artifact
is served on the artifact's own white. A white rail against a white artifact is
one plane, and a surface that is one plane with the work has to be explained
rather than seen; the product's own warm identity then survives only in the dark
theme, which is where nobody checks.

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
| `canvas` | `#191614` |
| `surface` | `#211D1A` |
| `surface.raised` | `#2A2521` |
| `surface.sunken` | `#12100E` |
| `ink.primary` | `#F4F1ED` |
| `ink.secondary` | `#B3ACA4` |
| `ink.muted` | `#8D867E` |
| `line.default` | `#332F2B` |
| `line.strong` | `#474139` |
| `accent` | `#7AA2F0` |
| `accent.ink` | `#14110E` |

Final values, replacing a cool/purple set that contradicted the warm base. The
§9 gallery pass renders them in both themes, the token and screenshot baselines
are regenerated from that pass, and a scripted contrast check holds every
semantic surface/ink pair at the documented floor — so these are settled, not
proposed.

### Semantic surface pairs

Each pair is `surface` plus its paired `ink`. Every pairing must be verified on
its own; a token pair is not licensed for a use it was not checked against.

| Role surface | Light surface / ink | Dark surface / ink |
| --- | --- | --- |
| `attention` | `#FFF2CC` / `#6B4A00` | `#3A2E15` / `#F0D089` |
| `private` | `#EEEAFD` / `#4D3D97` | `#2B2545` / `#CFCBF5` |
| `progress` | `#E9EAFE` / `#37358F` | `#232449` / `#B9BCF5` |
| `success` | `#E6EFE2` / `#2E4A28` | `#212E1D` / `#A9C9A0` |
| `closed` | `#F0EEEC` / `#57535E` | `#262220` / `#B3ACA4` |
| `destructive` | `#FFEDE6` / `#7E3A28` | `#3A241B` / `#F0B49F` |

`canvas` and `surface` are roles as well as primitives, and no component may
leave one of them without a consumer. The rail's material is `canvas`; a raised
content surface inside the rail is `surface`; the stage behind the artifact is
`surface.sunken`. The rail is never `surface`.

### Type

| Token | Family | Size / leading | Use |
| --- | --- | --- | --- |
| `type.meta` | sans | 11 / 16 | Counts, timestamps, badges |
| `type.label` | sans | 12 / 16 | Control labels, chips, tool names |
| `type.body` | sans | 13 / 18 | Notes, evidence, list content |
| `type.body.strong` | sans | 13 / 18, 600 | Selected rows, active tool |
| `type.panel.title` | sans | 15 / 22, 600 | Rail and card headings |
| `type.stage.title` | sans | 18 / 26, 600 | Empty and terminal states only |
| `type.identity` | mono | 12 / 18 | Revision ids, selectors, spans, paths |

Sans is the platform system UI font. Mono is the platform monospace. Identity
strings are never set in the sans font, because a mistyped revision hash must
look like a hash.

### Spacing, metrics, radius, elevation, motion

| Group | Values |
| --- | --- |
| Spacing | `4, 8, 12, 16, 20, 24, 32, 40, 48`. Chrome uses 4–16; rail rhythm is 8/12/16; section separation is 24/32. |
| Metrics | Rail width `380`; drawer width `380`; anchored card max width `340`; control height `32`, small `28`, large `36`; icon button `28×28`. |
| Radius | `8` inputs and buttons; `12` cards and rail sections; `16` anchored card, drawer, dialog; `pill` chips and tags; `full` icon buttons. |
| Elevation | `card`: `0 1px 2px rgba(43,32,20,.06), 0 8px 24px rgba(43,32,20,.08)`; `overlay`: `0 4px 12px rgba(43,32,20,.10), 0 16px 40px rgba(43,32,20,.14)`; `sheet`: `-8px 0 32px rgba(43,32,20,.12)`. Every elevated surface also carries a `line.default` border: a shadow is never the only boundary. Shadows are warm neutral; a shadow tinted toward a colour is decoration. |
| Motion | `fast` 120ms, `base` 200ms, `deliberate` 320ms, easing `cubic-bezier(.2,.8,.2,1)`. Spatial movement stays under 12px. No perpetual animation except the agent-activity indicator, which must be pausable. Reduced motion removes all transitions and all scale or lift. |

## 4. Semantic roles and the state vocabulary

Roles name meaning. The surface has exactly these state families, and every
state must be expressed as **text plus at least one non-colour cue** — an icon,
a shape, a border, or a position.

| Family | States | Role | Required cue beyond colour |
| --- | --- | --- | --- |
| Target the artifact owns | hovered, selected, focused | `accent` | Mark with a distinct border weight; focus uses a ring separate from selection |
| Target the Builder-Reviewer drew | drawing, drawn, focused | `attention` while drawing, `accent` once drawn | A dashed, static boundary. A drawn target is never marked with the solid outline that means the artifact owns it |
| Mode | operating (unarmed), point, box | `accent` on the armed tile, and no accent while operating | The lit tile, the cursor over the artifact, and the pre-commit hover outline. Operating is the unarmed state and is never a tile. Never colour alone |
| Pass | open, in flight, ready, closed | `progress` open and in flight, `attention` ready, `closed` closed | One status line naming whose turn it is. A new revision moves a Pass to ready and never closes it; only the Builder-Reviewer closes a Pass |
| Pass outcome | answered, untouched, gone | `success`, `attention`, `closed` | Anchor-level only. Never states that an agent fixed anything, because nothing reports it |
| Annotation | draft, queued, delivered, acknowledged, resolved, verified, rejected, not-fixed, replaced, obsolete | `private` for unsent draft and queued, `progress` while in flight, `success` verified, `closed` rejected/not-fixed/replaced/obsolete | Label text per state; delivery and implementation are never shown as one state |
| Resolution | matched, recovered, ambiguous, deleted | `success`, `progress`, `attention`, `closed` | Glyph plus label. Ambiguous marks its candidates on the artifact and never resolves itself; deleted states that approval is blocked |
| Revision | current, advanced | `closed`, `attention` | Annotation-level, never a target label. Phrased as "written before this revision", not as an error |
| Provenance | source span, inferred, unavailable | `progress`, `closed`, `attention` | Always labelled. Never uses the word "exact", which belongs to resolution alone |
| Agent position | awaiting you, working, acknowledged, stepped away | `progress`, `success`, `closed` | A sentence, not a dot, together with when the agent last checked. "Stepped away" must never read as "working"; a convention the agent is not honouring must be visible rather than assumed |
| Attention | one or more Annotations needing a decision | `attention` | Count badge on the drawer trigger, hidden at zero. Never summed with Annotations written before the current revision, and never summed with a non-empty queue: one badge, one claim |

## 5. Surface composition

One rail, and one island over the artifact. No chrome spans the window.

```
┌──────────────────────────────────────────────┬────────────────────────────┐
│ ┌──────────────────────────┐                 │  rail (380, full height)   │
│ │ before/after (top edge)  │                 │                            │
│ └──────────────────────────┘                 │  subject, whose turn it is │
│  stage: artifact frame                       │                            │
│  + artifact-document overlay                 │  one ledger of Passes      │
│    (hover, target marks, focus ring,         │                            │
│     drawn-target boundary, relation ghost,   │  verdicts on each row      │
│     candidate marks)                          │                            │
│                                              │                            │
│         ┌─────────────────┐                  │                            │
│         │  mode island    │                  │                            │
│         └─────────────────┘                  │                            │
└──────────────────────────────────────────────┴────────────────────────────┘
        anchored annotation card sits over the stage, near its target
        notice lane at the rail's top edge, never over the stage or island
        drawer (380) slides over the rail when the attention badge is used
```

**The rail is the only chrome region, and it answers one question.** Its head
carries the artifact's identity, then one status line of at most eight words
saying whose turn it is — `Your turn · 3 notes to send`, `Agent's turn · Pass 2
in flight`, `Your turn · Pass 2 ready` — then the attention trigger and the
overflow. Identity is there because the rail's own content is qualified by it:
an Annotation marked "written before this revision" is only meaningful beside
the revision on screen. The Stop action sits beside the status line, because it
acts on the agent rather than on an Annotation. When the agent last checked is
one disclosure away, never a second paragraph.

**The mode island is the only chrome over the artifact.** It holds two tiles —
point and box — and sits at the stage's lower edge, nearest the pointer it
governs. Operating the artifact is the unarmed state rather than a tile: neither
tile lit is the resting state, and arming an armed tile again returns to it. The
island is never hidden and never covers the target of the current selection; the
anchored card is positioned so the two cannot overlap.

**A relation is a gesture, not a third tile.** `Shift` extends the selection
into a set of up to eight targets, and dragging a target already in that set
moves a ghost and infers one relation, shown as one sentence in the anchored card
before release. The artifact-document overlay draws the ghost; the card draws the
sentence. A drag that begins anywhere else behaves as the artifact does, so text
selection is unaffected. Nothing about the relation is a displacement: it records
the desired relationship and leaves the implementation to the agent.

**One ledger, grouped by Pass.** The rail holds every Annotation — unsent and
sent — in the order the Builder-Reviewer set, grouped by the Pass it belongs to.
The state pill carries the difference, so nothing leaves the ledger when it is
sent and nothing has to be found again in a second state. Verdict controls
appear on an Annotation's own row once it has been delivered.

**Uncertainty is marked on the artifact, never listed.** Where Target Resolution
cannot match a target, its candidates are marked on the artifact itself and the
row says so. The Builder-Reviewer points at the right target to re-point the
Annotation, or declares it missing. The surface never presents a ranked list of
candidates with a figure beside each: labels drawn from the same evidence that
failed to discriminate cannot be read, and a number that cannot be checked is
asserted rather than shown.

**A notice never covers a tool.** A notice appears at the rail's top edge, one at
a time, and never over the stage, the mode island or an open card. It carries
only what a row cannot already show; a notice that repeats a row's own state
does not exist.

**Reloading asks, and a new revision makes a Pass ready.** When the artifact's
bytes change under review the surface offers one action, and it never swaps the
artifact out from under an open card or an open draft, because which revision an
Annotation was written against is part of what the Annotation means. A new
revision moves the open Pass to ready; it never closes one, and it never claims
that anything was addressed. The control that switches the artifact between two
revisions sits in the stage's own top-edge chrome, and the row states which
revision its result came from, because that fact belongs to the row and the
control belongs to the artifact.

Anything that is not one of these core jobs lives in the overflow menu or the
drawer. The overflow menu holds end session, reload artifact, copy artifact
path, copy evidence, open the disclosure, and choose the theme. It never holds
a frequent action.

## 6. Component inventory

Every component is delivered in every state it can actually reach, and the
gallery in §9 renders them.

| Component | Variants and states |
| --- | --- |
| `RailHead` | pinned; artifact name and kind; revision chip `current` / `advanced`; status line with the `StopAction` beside it; attention trigger; overflow trigger |
| `StatusLine` | awaiting you, working, acknowledged, stepped away; each also states whether a Pass is open, in flight or ready, and the one count that needs a decision; at most eight words. When the agent last checked is one disclosure away, never a second sentence |
| `ModeIsland` | resting, with neither tile armed; point armed; box armed; per tile below |
| `ModeTile` | default, hover, armed, focus, disabled; icon only, with an accessible name and a tooltip sentence |
| `RevisionChip` | current, advanced; mono identity |
| `AttentionTrigger` | hidden at zero, badge with count |
| `OverflowMenu` | closed, open, item focus |
| `ArtifactFrame` | loading, ready, unreachable, policy-blocked, changed |
| `OverlayMark` | hover, selected, focused, drawn-target boundary, relation ghost, candidate mark |
| `RelationSentence` | preview before release; recorded on the Annotation in the card and the rail row, from one formatter; names the targets and the desired relationship, never a pixel value |
| `DrawnTargetBoundary` | drawing; drawn; below the minimum-size threshold it produces nothing |
| `BeforeAfterToggle` | before, after, off; at the stage's top edge, never over the stage's content footprint; present only while the selected row has a result from a different revision to compare; the selected row states which revision it compares |
| `AnchoredCard` | positioned left/right/flipped, clamped to viewport, dismissed |
| `AnnotationCard` | drafting; with attachment; with relation, showing the `RelationSentence`. Its target line is a kind icon plus what was pointed at, never the bare kind word, and an Area carries the drawn-boundary glyph. `Queue` is the only worded action, with attach and delete as icons. No instruction copy anywhere in the card: the placeholder carries the question and the attach control explains itself through its accessible name |
| `AttachmentChip` | uploading, ready, failed, removed |
| `PassLedger` | empty; one Pass open; several Passes. Rows grouped by Pass, where the state pill carries the difference so sending never moves an Annotation out of view; actionable Annotations first, and closed ones behind one toggle rather than deleted; a Pass header states its state and its outcome counts |
| `AnnotationPill` | draft, queued, delivered, acknowledged, resolved, verified, rejected, not-fixed, replaced, obsolete |
| `Composer` | empty, typing, over threshold, disabled |
| `SendAction` | one verb, with no intent selector to choose from; disabled with the reason stated; the agent's position and whether it is holding the call are stated beside it |
| `ReplaceAction` | offered on a delivered Annotation that is not yet verified: Replaces it, links the Replacement, and delivers it with the steering intent |
| `StopAction` | offered while the agent is working or has acknowledged an Annotation, and absent otherwise; states which delivery channel applies and when the agent last checked |
| `ThemeControl` | auto, light, dark; the choice is remembered |
| `AnnotationRow` | matched, recovered, ambiguous, deleted, advanced; states which revision its result came from |
| `CandidateMark` | none, several, one chosen; drawn on the artifact, never presented as a ranked list; carries no evidence figure |
| `RepointAction` | offered on an Annotation whose target could not be matched: the next selection re-points that Annotation rather than composing a new one |
| `VerdictControls` | enabled, blocked with reason, recorded; `Approve` and `Reject` are visible, and `Not Fixed` and obsolete sit behind one overflow on that row |
| `Drawer` | open, closed, scrollable body |
| `DisclosureList` | populated, empty |
| `Button` | primary, secondary, ghost, destructive; hover, active, focus, disabled, busy |
| `IconButton` | hover, active, focus, disabled; requires a text alternative |
| `Coachmark` | one at a time, two lines at most, anchored to the control it explains; triggered by the first real use of that control and never at launch; dismissed by one worded dismissal; remembered per device rather than per artifact; clearable from the overflow menu |
| `Notice` | one at a time; at the rail's top edge; never over the stage, the mode island or an open card; no auto-dismiss while it carries an action |
| `ToggleGroup`, `Pill`, `Badge`, `StatusDot`, `Tooltip`, `Textarea`, `Listbox`, `ScrollArea`, `Dialog` | default plus the states they can reach |

Consequential actions use visible text. An icon-only control is permitted only
where its meaning is unambiguous and it carries an accessible name. Selecting a
mode is such a control: it is reversible and has no side effect, so it is
icon-only, states itself through the lit tile, the cursor over the artifact and
the pre-commit hover outline, and explains itself in a tooltip rather than in
permanent copy. Because an armed tile must be distinguishable from an unarmed
one by more than colour, the icon set ships a filled and an outlined variant of
every tile glyph. Deleting an unsent Annotation is also icon-only: nothing has
left the machine, nothing in the artifact changed, and the Annotation can be
composed again, so it is not consequential in the sense this section means.

## 7. Interaction and keyboard

- In Review there are two tiles and three keys: `P` points at things, `B` boxes
  an area, and `V` returns to operating the artifact, which is the unarmed
  state. Single keys are ignored while focus is in a text field or a
  contenteditable region. The island stays visible and pointer-reachable at all
  times, so focus in a field never strands the operator in a mode.
- Pointing is one state with two outcomes the gesture already distinguishes:
  clicking targets a thing the artifact owns, and dragging across words targets
exactly those words.
- A modifier extends the selection into one set. `Shift` adds a target the
  artifact owns, a text range or a drawn Area, and removes a member already in
the set; a plain click or box replaces the set, and the existing `Escape` level
clears it. A set holds at most eight targets, and a ninth is refused in words
rather than truncated.
- A drag that begins on a target already in the set is a relation drag: it moves
a ghost, infers one relation, and shows one sentence before release. Geometry
infers containment (the dragged target lands inside another), ordering (it is
dragged past another along the dominant axis) and alignment (an edge or centre
line comes into line with another). The three the geometry cannot discriminate
are declared with a key held through the drag: `Alt` for equal spacing, which
needs three or more targets, `Ctrl`/`Cmd` for a shared visible property, and
`Shift` for comparative size, whose dominant axis chooses width or height.
Releasing records it; `Escape` or a release outside records nothing. A drag that
begins anywhere else behaves as the artifact does, so text selection is
unaffected. The stored relation names a desired relationship and carries no
pixel value.
- Relational Intent has no keyboard route, and the surface states it: no target
of any kind is reachable by keyboard today, so a relation-only route would be the
product's only keyboard targeting and would misstate the surface. The route is
reopened when keyboard targeting exists.
- `Enter` in an anchored annotation card queues the annotation. In a replacement
  editor `Enter` delivers the Replacement. `Cmd/Ctrl+Enter` queues and sends the
  whole queue, and is never a shortcut inside a replacement editor. Keys are
  scoped to the editor that holds focus rather than matched against any field.
- `Escape` unwinds exactly one level and no more, in this order: dismiss a
  coachmark, close the overflow menu, close the drawer, close the replacement
  editor, leave the re-point state, close the anchored card, then clear the
  selection, then return to operating the artifact, then move focus to the mode
  island. `Escape` never discards unsent text.
- Guidance is never the only route to a capability. A dismissed or never-seen
  coachmark removes nothing, and the overflow menu can clear all guidance.
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
- The mode island, target marks, resolution labels and verdict controls have
  programmatic names that state position and meaning, for example
  "Target 2 of 3, Place order button, button". Each mode tile is at least 24×24,
  including while the island is at rest.
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
  shadows or content. This product expresses what should change and leaves the
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
  both that the target matched and that the source span is known. The stored
  vocabulary obeys this too: provenance never uses a word that resolution owns.
- Perpetual animation.
- Approximating a missing target rather than showing it as missing.
- Shrinking the chrome below the 11px floor to fit more controls.
- A theme sampled or derived from the artifact under review. The artifact is
  judged, not consulted.
- A permanent sentence explaining a control that teaches itself through its
  icon, its armed state and the cursor. A coachmark is not that: it is anchored
  to the control, triggered by first use, two lines at most, and dismissed once.
- A solid boundary for a target the Builder-Reviewer drew. A drawn target is
  dashed and static; motion is reserved for agent activity.
- A mode control at the far edge of the window. The control that governs the
  pointer belongs beside the pointer.
- A platform form widget as a primary surface control. A native select, a
  full-width system button or a default checkbox in the rail is how a work tool
  comes to read as a web form, which is what the surface is not.
- Presenting the resting state as a peer of the modes. Operating the artifact is
  where the operator already is; it is the unarmed state, not a third tile to
  pick.
- A delivery intent the Builder-Reviewer has to choose. The intent follows from
  which Annotation they acted on: sending a queue, amending something already
  sent, and asking an agent to stop are three different acts, not three options
  in one list.
- A capability flag gating behaviour that does not exist. A host is never asked
  to declare something the product cannot honour.
- Editing a delivered Annotation in place. What the agent was told is a record;
  a Replacement closes it and states what replaced it.
- A numeric confidence, percentage or score anywhere in chrome. Evidence about a
  target is categorical: source span, inferred or unavailable.
- A ranked list of resolution candidates. Uncertainty is marked on the artifact;
  the Builder-Reviewer points at the right target or declares it missing.
- A notice that covers the stage, the mode island or an open card, or more than
  one notice at a time.
- A count that sums unrelated claims. One badge, one claim.
- A state chip present on every row that says the same thing on every row.
- A first-run paragraph of instruction. Guidance is anchored, one feature at a
  time, and triggered by first use.
- A control whose meaning belongs to one row, positioned away from that row.
- A notice that restates what a row already says.
- Reloading the artifact without being asked.

## 11. Amendment process

An amendment is a change to this document, made before the implementation
changes, recorded at the foot of this file with its date, its reason, and what
it replaces. An amendment that trades a §1 precedence rule for a visual
preference is not available; the conflict goes up the precedence list instead.

### Amendments

### 2026-09-16 — Direction after dogfooding 0.3.0-next.1

Reason: the dogfood surfaced a vocabulary and composition problem rather than a
styling problem. Five word-labelled tools presented two different questions —
"what am I pointing at?" and "what am I doing?" — as equals; two of them could
only produce silence in the case a newcomer would try first (`Arrange` clicked
before anything was selected, `Text` used outside a text drag), and `Pointer`
presented the absence of a mode as a peer of three real ones. The window-level
bar held identity, surface state, tools, agent position, a selection count and
an attention trigger at once, and the agent sentence overflowed its fixed height
whenever it was present.

Replaces:

- §2's account of dark mode, with an operator-chosen theme that is never derived
  from the artifact and a dark counterpart drawn from the same warm family as the
  light primitives.
- §3's dark primitive table, proposed pending the §9 gallery pass.
- §4's state families: adds Mode, and separates a target the artifact owns from
  a target the operator drew.
- §5's composition: one full-height rail and a mode island over the stage,
  replacing the top bar plus panel.
- §6's `TopBar`, `ToolRow`, `Marquee` and `OverlayMark` entries.
- §7's Review keys: `V` / `E` / `B` replace `V` / `E` / `T` / `G` / `A`.
- §10's anti-pattern list.

Unchanged by this amendment, and carrying open questions from the same dogfood:
the two surface states of §5, the anchored card and its copy, the send controls
and their delivery intents, and the verify block.

### 2026-09-16 — Delivery stops pretending, and Verify stops being a place

Reason: the same dogfood showed the delivery vocabulary was three options with
two behaviours and one false claim. `Draft` created a batch and moved
Annotations to `delivered` while telling the Builder-Reviewer that nothing was
sent. `Steering` was offered although no host ever declares the capability, and
`deliveryPlan`'s output is never branched on anywhere — the strategy is computed,
returned and ignored, so "deliver now" and "queue locally" are one code path
with different prose. The surface also emptied its queue on send, leaving the
Builder-Reviewer with no record of what they had asked for.

Replaces:

- §3's metrics, elevation tints and the rail's title token use.
- §4's Agent-position cue: adds when the agent last checked.
- §5's two surface states, with one list and a conditional before/after toggle;
  adds the reload rule.
- §6's `StateSwitch`, `QueueList` and `SendControls` entries.
- §7's `Cmd/Ctrl+I` binding, which toggled a state that no longer exists.
- §10's anti-pattern list.

The delivery intents remain in the envelope. They stop being a question the
Builder-Reviewer answers: sending a queue is `next-pass`, amending something
already sent is `steering`, and asking an agent to stop is `review-interruption`.
Steering is treated as a published convention — the agent checks for new
direction between its own steps — rather than a host capability to detect, and
the surface states when the agent last checked so a convention that is not being
honoured is visible.

Still open from the same dogfood, and amended separately: the anchored card and
its copy, and the Stop action and its host contract.

### 2026-09-16 — The card, the Stop action, the theme control, and two tiles

Reason: independent review of this iteration found that tickets covering the
anchored card, the Stop action and the theme control rested on contract text that
did not exist, because amendment 2 deferred all three to a later amendment and
none was recorded; resolving them by implementation decision is what §1 forbids.
The same review found the contract contradicting itself in two places. §10 forbade
presenting the absence of a mode as a peer of the modes while §5 and §6 described
an island whose first tile was exactly that. And §5 said the island hides while an
anchored card is open while §7 said it stays pointer-reachable, which cannot both
hold when every text field lives in the card.

Replaces:

- §4's Mode row: operating is the unarmed state, not a tile.
- §5's mode island paragraph; the Stop action's place in the rail; and the
  overflow menu's contents.
- §6's `ModeIsland`, `AnnotationCard` and `AnnotationList` entries, the
  delete-is-consequential judgement, and the new `StopAction` and `ThemeControl`.
- §7's mode keys, and the relational gesture that amendment 2 left undefined when
  it removed the `Arrange` tool.
- §8's accessibility line, which still named a tool row that no longer exists.
- §10's resting-state anti-pattern, restated so it cannot be read as licensing an
  operate tile.
- Corrects amendment 1's account of the window-level bar: its height was fixed
  and the agent sentence overflowed it rather than growing it.

The Stop action's host contract, recorded here because tickets depend on it: an
MCP server cannot put anything into an agent's running turn, so delivery has
exactly two forms — returning a held tool call early, which is guaranteed and
already implemented, and an agent-initiated Check-In, which is a convention this
product publishes. Steering and interruption are the second form. The surface
states which form applies and when the agent last checked. ADR-0018 records the
decision, the rejected alternatives, and the retirement of ADR-0008's active-turn
steering clause.

### 2026-09-16 — Relational Intent is deferred, and the rail is not a form

Reason: two findings, one from the independent review and one from the
maintainer's judgement about scope. Expressing a relationship by dragging a
selected target was the last thing the mode change left undefined, and the
`Arrange` tool that carried it was undiscoverable — it did nothing until two
targets were already selected, and a newcomer clicking it first saw silence.
Relational Intent is the product's stated differentiator, but nothing in the
dogfood asked for it and this iteration's purpose is a focused surface. It is
deferred rather than dropped: the envelope keeps its support for relationships,
`CONTEXT.md` keeps the term, and the capability returns in a later iteration with
a gesture that is designed rather than inherited. Separately, the loudest signal
that the surface read as a web form was a native select and a full-width primary
button in the panel; deleting the feature that used the select removed one
instance and left the rule unstated.

Replaces:

- §5's composition diagram: the overlay no longer draws relation guides or handles.
- §6's `RelationGuide`, `RelationHandle` and `RelationSentence` entries, and the
  `AnnotationCard`'s relation variant.
- §7's relational-drag binding, which was the one design call this iteration
  carried that the maintainer had not reviewed.
- §10's anti-pattern list.

Consequence worth stating plainly: this iteration does not demonstrate Relational
Intent, which the previous spec named as the product's non-parity differentiator.
No relation will be built, and the contract no longer promises one.

### 2026-09-16 — The surface stops explaining a lifecycle it does not have

Reason: a second dogfood, an independent open-source design review, and a
code-level lifecycle trace found that the surface's wordiness is not a
vocabulary problem but a missing-object problem. **There is no Pass.**
`DeliveryBatch` carries an identity, an idempotency key, a host, a delivery
intent, a member list and a timestamp and no state at all, while the browser
client's snapshot type declares a `status` the server has never sent. With no
Pass the surface cannot say whose turn it is, so it restates the delivery
convention in four places on one screen, prints a default state as news on every
row, and sums three unrelated claims into one count. Four further defects were
confirmed as contract violations rather than taste: the annotation card still
carries an instruction sentence §6 had already removed; a notice is positioned
directly over the mode island, which §5 forbids; the resolution chooser prints a
numeric confidence the domain does not have, uncalibrated and identical on every
candidate in the observed case; and the `Attention` count conflates unresolved
targets, Annotations written before the current revision, and a non-empty queue.
Two revision-accounting defects share the same root: an Annotation created after
a reload is stamped with the pre-reload revision while being labelled "written
against this revision", and only one artifact snapshot is ever stored, so the
comparison control can only ever show the revision the session was opened at.

Replaces:

- §2's account of surface material, which named no material for the rail.
- §3's token roles, which left `canvas` with no consumer while the rail took
  `surface` and became indistinguishable from the artifact.
- §4's Annotation vocabulary (`another-pass` is Not Fixed, `superseded` is
  Replaced), its Resolution cue, its Attention count, and the new Pass and
  Pass-outcome families.
- §5's rail head, its one-list rule, its resolution rule, the comparison
  control's place, and the new notice and coaching regions.
- §6's `RailHead`, `AgentPosition`, `AnnotationList`, `AnnotationPill`,
  `AmendAction`, `CandidateChooser`, `VerdictControls`, `BeforeAfterToggle`,
  `AnnotationCard`, `OverlayMark` and `RelationGuide` entries; the `Toast`
  renamed to `Notice`; and the new `StatusLine`, `PassLedger`, `CandidateMark`,
  `RepointAction` and `Coachmark` components.
- §7's card keys and `Escape`'s order, which the code had been unwinding in an
  order the contract never listed.
- §10's anti-pattern list.

Unchanged: the two tiles and the mode keys, the one-ledger principle, the
reloading rule, the theme's ownership, the accessibility floor, the 11px type
floor, and every precedence rule in §1. ADR-0019 records the Pass decision.
`CONTEXT.md` gains Pass, Replacement, Not Fixed and Another Pass, and retires
Supersession. The Relational Integrity of §11's previous amendment stands: no
relation is built and none is promised, and the code stops drawing the relation
sentence that no surface path can create.

Consequence worth stating plainly: this iteration does not build revision
comparison, per-item accept and reopen, or the Declared Missing act. An
Annotation whose target cannot be matched is repaired by `RepointAction` alone,
which leaves no blocker behind and needs no new term. It removes what the
contract already forbids, gives the surface the Pass object it needs to stop
explaining itself, and makes a new revision arrive as a fact rather than a
paragraph. What a new revision *answered* remains anchor-level and is settled
separately. `design.md` deliberately lists no component this iteration does not
build: the previous iteration's `RelationGuide` entry was a contract promising
something no surface path could reach, and removing it was part of the
correction.
### 2026-09-16 — The dark semantic pairs are corrected to the shipped warm values

Reason: a palette audit against the selected reference, **Luminous Native** from
the Shared Intent UI/UX contract (`canvas.warmWhite #FBFAF8`, `surface.default
#FFFFFF`, `ink.primary #20202A`, `ink.secondary #676674`, `ink.muted #76727C`,
`line.default #E9E5E5`, `line.strong #D4CED1`, cobalt `#2B5FD7`), found the light
primitives and light semantic pairs accurate to the letter, but the dark semantic
table stale. The previous iteration deliberately warmed the dark counterpart in
code (`14a73a1`, "Operator-chosen theme with a warm dark counterpart") and the
table was not re-cut, so all five dark rows disagreed with the shipped
`tokens.css`; `closed` still carried a cool lavender-grey that contradicted this
document's own warm-family rule. One dark row has also been brought back to the
light counterpart's hue: `progress` is the counterpart of the light blue-violet
`#E9EAFE` / `#37358F`, so its dark tint is blue-violet `#232449` rather than the
navy it had drifted to.

Replaces:

- §3's dark half of the semantic surface-pair table, with the values the code
  already ships and the §9 gallery pins: `attention #3A2E15 / #F0D089`,
  `progress #232449 / #B9BCF5`, `success #212E1D / #A9C9A0`,
  `closed #262220 / #B3ACA4`, `destructive #3A241B / #F0B49F`.

Unchanged: every light primitive and semantic value, every dark primitive, the
`canvas`/`surface`/`surface.sunken` role assignment, and the rule that the
artifact is served on its own white and never samples chrome. The dark base
remains the warm near-black canvas, elevated charcoal surfaces and light ink the
reference asks for; each dark semantic pair clears 4.5:1.

### 2026-09-16 — The unsent Annotation takes the reference's private tone

Reason: the palette audit above adopted none of the reference's remaining
semantic roles. Two were candidates. `state.private` (lavender) has an honest
consumer here: an unsent Annotation is personal and has not left the machine,
yet the surface toned draft and queued with `progress`, whose own cue is "while
in flight". That contradicted §4's rule that delivery and implementation are
never shown as one state, and it is exactly what the reference means by
"personal possibility/editing, not secrecy theatre". `state.commitment` (warm
celebration) has no consumer: the Review Surface has no mutual-confirmation
moment, an individual verdict is not a shared Commitment, and a semantic
surface added for a state the product does not have is the speculative token the
contract forbids.

Replaces:

- §3's semantic surface-pair table, adding `private`: `#EEEAFD` / `#4D3D97`
  light, `#2B2545` / `#CFCBF5` dark, both clearing 4.5:1.
- §4's Annotation role: `private` for unsent draft and queued, `progress` while
  in flight, `success` verified, `closed` rejected/not-fixed/replaced/obsolete.

Not adopted: the reference's celebration surface. Recorded here so the omission
is a decision rather than an oversight. The reference's lavender, amber, blue
and coral roles are all present; its celebration role waits for a state that
deserves it.

### 2026-09-17 — Relational Intent returns as a gesture over a set

Reason: amendment 4 deferred Relational Intent because the gesture was undefined
and the `Arrange` tool that carried it did nothing until two targets were already
selected. That deferral was always conditional — the capability returns with a
gesture that is designed rather than inherited — and the gesture is now designed
and accepted. The maintainer chose the drag this ticket recorded: a modifier
extends a set of targets into one Annotation, and a drag beginning on a target
already in that set expresses one relation. The alternative the review named,
explicit handles on a multi-selection, was considered and refused because it
costs a new selection-bounds component for a capability the two-tile island can
already carry. ADR-0023 records the decision and the alternatives it traded
against.

Replaces:

- §5's composition diagram, which omitted the relation ghost from the
  artifact-document overlay, and the state §5 was left in when amendment 4
  removed relation guides and handles.
- §6's `OverlayMark` entry, which no longer draws a relation ghost, the
  `AnnotationCard` variant that showed no relation, and the `RelationSentence`
  entry that amendment 4 deleted.
- §7's interaction rules, which named no set modifier, no relation drag and no
  keyboard route for Relational Intent.

Consequence worth stating plainly: the capability amendment 4 deferred now
ships, so the deferral is superseded rather than standing. The envelope's
`relationship` definition is unchanged, because it was never the part that was
missing. The Intent Preview the product promised is the ghost plus the sentence,
not a separate capability: a reversible visual proposal shown before the
relation is recorded, which never mutates authoritative source. The keyboard
route is stated as absent, because no target of any kind is reachable by
keyboard today and a relation-only route would misrepresent the surface.

### 2026-09-18 — A Pass reports evidence, not accomplishment

Reason: ADR-0019 fixed the Pass outcome as *answered*, *untouched* and *gone*,
and this document promised the same three as marks on the artifact. Three
independent reviews found both claims overstate what the product knows.
"Answered" reads as "the agent did what I asked", while the product can only
observe that the evidence at an anchor changed; "gone" collapses an ambiguous
target, a deleted one and the Builder-Reviewer's own declaration into one word.
The artifact marks also restated a row, and an anchor that could not be found has
nowhere on the artifact to carry one.

Replaces:

- §5's composition diagram, which listed pass-outcome marks in the
  artifact-document overlay.
- §6's `OverlayMark` entry, which listed a pass-outcome variant.

The outcome words become **changed**, **same** and **not found**, derived from the
same comparison that decides the counts. No substitute mark takes their place:
every mark on the artifact is something the Builder-Reviewer can act on — a
target, a candidate or a relation ghost — and nothing derived is drawn there.
ADR-0024 records the decision.
