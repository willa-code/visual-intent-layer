# Research: open-source design/component sources for the Review Surface redesign

**Intended repository home:** `.scratch/surface-refinement/reviews/oss-design-sources.md`.
This file was written to the runtime-authoritative output path instead, because this run's output
path override forbids writing to other paths. Nothing has been written into the repo by this run.

**Scope discipline.** This covers the *open-source source layer* only. The icon-vs-label, toast,
coachmark, confidence-display and verdict-density questions are already answered in
`.scratch/surface-refinement/reviews/uiux-research.md` and `docs/background/mode-and-toolbar-research.md`
and are not revisited here. Evidence dates: all "last push" values are from the GitHub REST API read
on 2026-09-16.

**Ground truth read before searching:** `design.md` (§2 warm-neutral, one accent, no decoration;
§3 two-layer token architecture; §4 semantic roles and state vocabulary; §6 component inventory;
§7 keyboard; §8 WCAG 2.2 AA floor; §10 anti-patterns), `src/ui/icons.ts` (26 hand-built icons, one
`PATHS` map, `viewBox 0 0 24 24`, `fill=none`, `stroke=currentColor`, **`stroke-width 1.5`**,
`stroke-linecap/linejoin=round`, `aria-hidden`, `focusable=false`), `src/ui/components.ts`
(`modeIsland` with `aria-pressed`, `icon-only` tiles with `title` + `aria-label`;
`themeControl` as `role=radiogroup` of `role=radio` buttons; `candidateChooser` as a
`role=radiogroup` of native `<input type=radio>`; `overflowMenu` as `role=menu`/`menuitem`;
`toastElement` as `role=status aria-live=polite`; `drawer` as `role=dialog aria-modal=false`),
`.scratch/surface-refinement/issues/02-one-icon-set.md` (one module, one stroke weight, one viewbox,
one size scale, `currentColor`, no emoji, every icon-only control named) and
`src/ui/styles/tokens.css` (primitives + semantic pairs, dark counterpart, `--icon-size: 18px`,
`--island-tile: 36px`, radii 8/12/16/pill).

---

## 1. Verdict table

Verdicts: **adopt** = take material into the repo (source or schema); **imitate** = read the source
and rewrite in our own code, no dependency; **reject** = naming it as an influence would be a mistake.

| Source | What it is | Licence | Maintained (last push) | What we take | Conflicts with design.md | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| [ui.shadcn.com/docs](https://ui.shadcn.com/docs) | Code-distribution platform; "This is not a component library. It is how you build your component library." | MIT (`shadcn-ui/ui`) | 2026-09-16 (124k★) | The **rule-document shape** of `skills/shadcn/` (always-enforced rules, each linked to Incorrect/Correct pairs); component naming for Toast / Toggle Group / Radio Group / Dropdown Menu / Drawer | Its components import Base UI/Radix + Tailwind (runtime deps + build step); default look is consumer-grade radii, whitespace, elevation; icon rules push `data-icon` conventions we don't have | **imitate** (docs + skills only); reject as a dependency |
| [github.com/lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas) | **Not a token playground.** A "Sketch Material 3 Expressive screens in the browser… copy a prompt for your AI coding tool" editor (Next.js 16 / React 19, static export, localStorage). Verified from README + `package.json` | MIT (`LICENSE`, © 2026 lnkiai) | 2026-09-16 (7,078★, 732 forks, not archived) | `lib/color.ts` seed→scheme generator with **`Contrast = "standard" \| "medium" \| "high"`**; `lib/tokens.ts` interpolating metric scales (`onScale`, `buttonMetrics`, `chipMetrics`); `public/agent.md` as an agent-facing contract; `app/globals.css` `.msr[data-fill="1"]` = the M3 filled/outlined toggle | Its whole surface is M3 Expressive: shape-morphing loading indicator, spring motion, Roboto Flex type, 16dp rhythm, 412×892 consumer frame — §2 (tightened tool scale, 11px floor, one accent), §3 (radii 8/12/16), §10 (perpetual animation; decoration). Its "tokens" are geometry-first, not a primitive/semantic pair | **imitate** its contrast tiers + metric-scale maths; **reject** as a visual influence |
| [mui.com/material-ui](https://mui.com/material-ui/getting-started/) | Styled React component library implementing Material Design | MIT (`mui/material-ui`) | 2026-09-16 (99k★) | Nothing structural | Runtime dependency; Material elevation/ripple; consumer radii and whitespace; form-widget-first controls (§10); separate `@mui/icons-material` icons dep | **reject** |
| [uiverse.io](https://uiverse.io/) | Community gallery of ~7,411 UI elements, copy as HTML/CSS/Tailwind/React/Figma; categories include **glassmorphism, neumorphism, loading-UI** | Backing repo `uiverse-io/galaxy` is MIT; site itself returned HTTP 403 to this run | Repo active (11k★); site could not be fetched | Nothing | This is the §10 catalogue itself: decorative colour, gradients, glass blur, texture, perpetual animation, consumer radii | **reject** |
| [ionicframework.com/docs/components](https://ionicframework.com/docs/components) | Cross-platform UI toolkit, native-quality iOS/Android/PWA components | MIT (`ionic-team/ionic-framework`) | 2026-09-16 (52.6k★) | Conceptual only: `ion-segment` = exclusive two-state view switcher (our before/after control); `ion-toast` "appear over your app's content without interrupting user interaction" | Platform form widgets as primary controls (§10); runtime dep; platform-default visual language; iOS/Android look we must never inherit | **imitate** conceptually; reject as dep |
| [github.com/vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Agent skills collection (MIT); `web-design-guidelines`, `writing-guidelines`, `react-best-practices` (40+ rules, 8 categories, prioritised by impact), `composition-patterns` | MIT | 2026-09-16 (README "## License MIT") | The **rule-document format**: priority tiers, one rule per file, an explicit `## Anti-patterns (flag these)` section, and a terse `file:line` output contract | None — it is process, not visual language | **adopt** (format only) |
| [Base UI](https://github.com/mui/base-ui) | Unstyled accessible React primitives "from the creators of Radix, Floating UI, and Material UI" | MIT | 2026-09-16 (10.9k★) | `packages/react/src/{toast,toggle,toggle-group,radio,radio-group,tooltip,popover,menu,progress,scroll-area,preview-card}` — the best published **Toast** semantics (F6 jumps to the viewport landmark region; `title`/`description` are what screen readers announce); team includes Floating UI's author (`@atomiksdev`), i.e. collision/flip handling is first-party | React runtime dep; no visual layer to copy (by design) | **imitate** |
| [Radix Primitives](https://github.com/radix-ui/primitives) | Low-level accessible React primitives, "Maintained by @workos" | MIT | 2026-08-08 (19.3k★) | The **primitive taxonomy itself**: `packages/react/{popper,dismissable-layer,focus-scope,roving-focus,tooltip,popover,toast,dropdown-menu,radio-group,toggle-group}` — i.e. what our `AnchoredCard`, `OverflowMenu`, `CandidateChooser` and `BeforeAfterToggle` each secretly need | Runtime dep | **imitate** — the highest-value single read for §6/§7 |
| [Ark UI](https://github.com/chakra-ui/ark) | Headless components for React/Vue/Solid/Svelte, state-machine driven (Zag.js) | MIT | 2026-09-16 (5.4k★) | State-machine discipline: component state is one machine, not scattered booleans — the pattern our 10-state `AnnotationPill` wants | Runtime dep | **imitate** |
| [React Aria Components](https://github.com/adobe/react-spectrum) | Adobe's unstyled accessible component layer | **Apache-2.0** | 2026-09-16 (15.9k★) | `packages/react-aria-components/src/{Toast,Menu,Popover,Tooltip,RadioGroup,ToggleButton,ToggleButtonGroup}.tsx` — `Toast.tsx` (verified) composes a portal + region + focus/hover render props and exports `UNSTABLE_Toast`; the most explicit keyboard/focus documentation of the group | Apache-2.0 NOTICE retention applies if source is copied verbatim; runtime dep | **imitate** (read-only) |
| [Headless UI](https://github.com/tailwindlabs/headlessui) | Unstyled accessible components for React/Vue | MIT | 2026-04-13 (28.7k★) | `packages/@headlessui-react/src/components/{menu,menu-button,popover,radio-group,radio-group-option,switch,dialog,listbox,tab-group}` incl. `menu/menu-machine.ts` | **No Toast component** (verified: the repo's component tree has no `toast`) | **imitate** for OverflowMenu; reject for toasts |
| [Park UI](https://github.com/chakra-ui/park-ui) | "Beautifully designed components built with Ark UI and Panda CSS" | MIT | 2026-04-10 (2.4k★, now under `chakra-ui/`) | Nothing | A complete visual language + two dependencies; its aesthetic is not ours | **reject** |
| [Panda CSS](https://github.com/chakra-ui/panda) | "Universal, Type-Safe, CSS-in-JS Framework for Design Systems" | MIT | 2026-09-16 (6.2k★) | The **token schema**: `theme.tokens` → `theme.semanticTokens` where a semantic value is `{ value: '{colors.red}' }` and can be condition-mapped `{ value: { base: '{colors.red}', _dark: '{colors.darkred}' } }` | It is a build step/compiler (design.md §3 allows a token layer, not a CSS-in-JS runtime); it also ships `gradients` token type, which we would never populate | **imitate** the schema, **reject** the dependency |
| [Open Props](https://open-props.style/) | "CSS variables… Expertly crafted web design tokens", v1.7.23 | MIT | 2026-08-11 (5.5k★) | The light/dark alias shape (`--text-1: var(--gray-9)` under `@media (--OSdark)`) | Ships **30 gradients**, `--noise-*`/`--noise-filter-*` grain texture, `--radius-drawn-*` hand-drawn borders, `--radius-blob-*`, `--shadow-{1-6}` + text-shadows + tinted-shadow playground — §10 decorative colour, gradients, texture, and a 6-step consumer radii scale | **reject** as a token source (it is the clearest counter-example to take our own §2 seriously) |
| [Radix Colors](https://www.radix-ui.com/colors) | "A gorgeous, accessible color system", 12-step scales + transparent variants | MIT | 2025-12-17 (1.7k★) | The **step vocabulary** (1 app bg → 12 high-contrast text) and the aliasing strategy: semantic aliases, use-case aliases, and **"Mutable aliases"** for light/dark mappings, with the explicit warning "Avoid using specific variable names like 'CardBg', or 'Tooltip', because you will likely need to use each variable for multiple use cases." | 12 steps per hue is a superset of our one accent; a colour ramp invites uses our §4 does not define | **adopt** the vocabulary + alias rules; **reject** the palettes |
| [Radix Themes](https://github.com/radix-ui/themes) | Styled component library on top of Primitives | MIT | 2026-04-11 (8.7k★) | Nothing | Runtime dep; a second visual language layered on ours | **reject** |
| [Untitled UI — React](https://github.com/untitleduico/react) | "world's largest collection of open-source React components built with Tailwind CSS and React Aria" | MIT | 2026-09-02 (1.9k★) | Nothing (its React Aria choice corroborates React Aria as the primitive of record) | Marketing-grade visual language; Tailwind + React Aria deps; PRO tier is paid | **reject** |
| [Untitled UI — Icons](https://github.com/untitleduico/icons) | 1,100+ free SVG icons; PRO adds 4,600+ across 4 styles | **Not open source.** `LICENSE`: "You are not allowed to: Sell, sublicense, or distribute the icons (in original or modified form) • **Create derivative icon libraries based on the icons** • Use the icons in any form of UI kit, library, or template intended for resale" | Active | Nothing | The licence forbids exactly what vendoring an icon set into this repo would be; also line/solid duality is a PRO feature | **reject** (licence) |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | MIT SVG icon set, "by the makers of Tailwind CSS" | MIT | 2026-05-12 (23.8k★) | A **complete matched pair**: `optimized/24/outline` = 324 files and `optimized/24/solid` = 324 files (counted from the contents API); root attrs `fill="none" stroke="currentColor" stroke-width="2"` | 2px stroke vs our 1.5; 20px and 16px exist **solid-only**, so a "matching set" is only true at 24; chunky Tailwind-grade shapes; 324 is far more than our 26 | **adopt narrowly** (two mode-tile filled twins only, or redraw) |
| [Lucide](https://github.com/lucide-icons/lucide) | "Beautiful & consistent icon toolkit made by the community… fork of Feather Icons", 1600+ SVGs | **ISC** (`LICENSE`; GitHub reports `NOASSERTION` because the file is bespoke-worded, README says "licensed under the ISC License") | 2026-09-16 (24.5k★) | The **rule grammar of a hand-drawn set**: "Use a 24 × 24-pixel canvas", "Keep a 1-pixel safe zone", "**Use 2-pixel strokes** — Don't use thicker or thinner strokes, or mix stroke widths", "Use round line joins", and the SVG contract "Do not use transforms, filters, fills, or explicit stroke colors" | **Outline-only, no filled variant** (Lucide Discussion #458 is a community request for one); 2px stroke contradicts our 1.5; their own rules forbid `fill` | **reject as the icon set**, **adopt as the drawn-set rulebook** |
| [Phosphor](https://github.com/phosphor-icons/core) | Icon family shipping the same names in six weights | MIT | 2026-01-06 (core 380★; `phosphor-icons/web` 529★) | `assets/{thin,light,regular,bold,fill,duotone}` — verified directories, and `assets/regular/acorn.svg` ↔ `assets/fill/acorn-fill.svg` name alignment; ≥1000 entries in each of regular and fill (listing capped at 1000). README: "exposes all icons as SVG assets, grouped by weight… These files can be used as needed for custom implementations" | Six weights is a system choice design.md §6/§2 does not want (one set, one weight); 8 months since last push | **adopt narrowly** if a complete filled/outline pair is needed |
| [Tabler Icons](https://github.com/tabler/tabler-icons) | "6,184 free, MIT-licensed, high-quality SVG icons… Each icon is designed on a 24x24 grid with a 2px stroke" | MIT | 2026-09-11 (21.7k★) | README: "All outline icons are designed with a 2px stroke, but every path is drawn so that it also renders well at other stroke widths" — a **re-weightable** outline set | Filled coverage is 1,054 of 6,184 (~17%): not a matched pair; 2px default | **reject as the set** |
| [Material Symbols](https://github.com/google/material-design-icons) | Google's Material Symbols / Material Icons | **Apache-2.0** | 2026-09-11 (54k★) | The truest filled/outlined duality: one glyph name plus a `FILL` axis — evidenced in this repo's named source by `app/globals.css` `.msr[data-fill="1"] { font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24; }` | Apache-2.0 NOTICE/attribution duties; delivered as a **webfont** (runtime + network dependency) or 3,800×N per-style SVGs; a whole design language and animated symbols arrive with it | **reject** as delivery; **adopt** only the filled/unfilled *encoding idea* |
| [Remix Icon](https://github.com/Remix-Design/RemixIcon) | "Open source neutral style icon system", 2,800+ icons, line + fill | **Bespoke "Remix Icon License v1.0" (2026-01)** — no longer Apache-2.0. GitHub reports `NOASSERTION`. Issue [#1069 "License Change Notice"](https://github.com/Remix-Design/RemixIcon/issues/1069): "Previously, we used the Apache-2.0 license and included some additional supplementary terms… Additional terms: Remix Icon may not be sold as standalone icon products… **Creating competing icon libraries based on Remix Icon is not allowed**" | 2026-04-28 (8.4k★) | Nothing | Not an OSI-approved licence; the CNCF could not approve it and Backstage froze at `4.8.0` (same issue, comment 2026-05-20: "The new license is incompatible with the CNCF's pre-approved licenses and policy") | **reject** (licence risk) |
| [Iconoir](https://github.com/iconoir-icons/iconoir) | "1600+ unique SVG icons, designed on a 24x24 pixels grid" | MIT | 2026-08-12 (4.6k★) | **The weight and attribute match to our own set.** `icons/regular/activity.svg`: `<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none">` + `stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"` — same garden as `src/ui/icons.ts` | `icons/solid` contains **288 files** against 1600+ regular (counted) ≈18% coverage, so the solid twin exists for a minority only; also brand/product logos (Adobe XD etc.) we must never use | **adopt** as the geometry/weight reference set; **reject** as a source of filled pairs |
| [Eva Icons](https://github.com/akveo/eva-icons) | "A pack of more than 480 beautifully crafted Open Source icons. SVG, Sketch, Web Font and Animations support" | MIT | **2023-03-04 — stale ≈3.5 years** (8.8k★) | Nothing | Unmaintained; outline+filled is a nice shape but the repo is a 2018-era artefact; SVG + webfont + animations packaging | **reject** (staleness) |
| [anthropics/skills](https://github.com/anthropics/skills) | Anthropic's public Agent Skills repo (176k★) incl. `skills/brand-guidelines/SKILL.md` and `skills/canvas-design/SKILL.md` | "Many skills in this repo are open source (Apache 2.0)" + per-skill `LICENSE.txt` + `THIRD_PARTY_NOTICES.md`; repo itself has no declared `spdx_id` | 2026-09-10 | `brand-guidelines/SKILL.md` as the **minimal agent-readable design contract**: literal hexes ("Dark: `#141413`", "Accent Orange: `#d97757`"), type pairings, and the keywords an agent matches on | `canvas-design` is poster art: "a VISUAL PHILOSOPHY", "90% visual design, 10% essential text", "Name the movement… 'Brutalist Joy'", "Emphasize craftsmanship REPEATEDLY" — the exact opposite of §2 | **adopt** `brand-guidelines` as a format; **reject** `canvas-design` as an influence |
| [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) / [awesome-design-skills](https://github.com/bergside/awesome-design-skills) | Curated lists; `awesome-design-skills` is "A curated registry of 67 design system skill files… Each skill now ships as a folder with: `SKILL.md` for AI-agent instructions (tokens, component rules, accessibility constraints, **quality gates**) [and] `DESIGN.md` for human-readable design intent, rationale, and implementation notes" | MIT (list repos) | active | The **two-file split** (human intent vs agent constraints + quality gates) and the "pull one skill in with a command" distribution shape | The 67 styles include `glassmorphism`, `gradient`, `claymorphism`, `cosmic`, `dithered`, `doodle`, `fantasy`, `artistic` — a menu of §10 violations | **adopt** the file convention; **reject** the style catalogue |

---

## 2. Source-by-source detail

### 2.1 shadcn/ui — `https://ui.shadcn.com/docs`
**What it is.** Documentation + registry for a *code distribution* model. Fetched page:
"shadcn/ui is a set of beautifully-designed, accessible components and a code distribution platform…
**This is not a component library. It is how you build your component library.**" Principles listed:
"Open Code", "Composition", "Distribution", "Beautiful Defaults", **"AI-Ready"**.
**Why it matters here.** Two things, neither of them visual.
1. It ships its own agent skill. `shadcn-ui/ui` → `skills/shadcn/SKILL.md` (19.1 KB) + `rules/`,
   `cli.md`, `customization.md`, `registry.md`, `mcp.md`. SKILL.md contains a section titled
   "**Critical Rules** — These rules are **always enforced**. Each links to a file with
   Incorrect/Correct code pairs." Those rules include an **Icons** group ("Icons in `Button` use
   `data-icon`", "No sizing classes on icons inside components") and a rule that is directly
   relevant to our §6 inventory: "**Option sets (2–7 choices) use `ToggleGroup`.** Don't loop
   `Button` with manual active state." Our `themeControl` and `BeforeAfterToggle` are exactly
   "2–7 exclusive choices" and are currently hand-rolled.
2. It has already converged on the primitive layer we should imitate: its topic list includes
   `base-ui`, `radix-ui`, `react-aria-components`; and its own `rules/base-vs-radix.md` documents
   `asChild` (Radix) vs `render` (Base UI) and "ToggleGroup" composition differences.
**Licence/maintenance.** MIT; repo pushed 2026-09-16, 123,958★, 1,839 open issues.
**Icon set.** None of its own (defaults to Lucide — see Q-A).
**Risk.** Copying an actual shadcn component drags in Base UI or Radix **plus** Tailwind utility
classes **plus** a `cn()` helper — a runtime dependency and a styling philosophy. Under
`design.md` §3 that is a different token layer, not ours.
**Conflicts with design.md.** Its own defaults are a consumer visual language (its docs demo radii,
shadows, spacing); its `--radix-*`-style semantic tokens are a *third* architecture beside ours;
"Beautiful Defaults" is the opposite of §2's "ornament carries nothing".

### 2.2 m3e-canvas — `https://github.com/lnkiai/m3e-canvas` (verified, not assumed)
**What it actually is.** Not a design-token playground. README: "**Sketch Material 3 Expressive
screens in the browser, link them, tap through them, and copy a prompt for your AI coding tool.**"
A drag-and-drop M3 screen sketcher that emits a natural-language prompt for Claude Code / Codex /
Gemini CLI / Cursor. `package.json`: `next 16.3.4`, `react 19.2.8`, `motion ^13`, `tailwindcss ^4`,
`vitest`, `"license": "MIT"`, backend none (localStorage). GitHub: MIT, 2026-09-16, 7,078★, 732
forks, `"archived":false`, topics `["design-tool","material-3-expressive","material-design",…]`.
It is Trendshift "#1 repository of the day".
**What it concretely offers this product.**
- `lib/color.ts` — a seed→scheme generator: "one seed color becomes a light color scheme by placing
  each role at a fixed tone (CIE L*)… It follows the shape of Material's HCT tonal palettes", with
  `export type Contrast = "standard" | "medium" | "high";` and "tone (CIE L*) of every role, light
  and dark, at each contrast level." **This is a working model for the scripted contrast check
  `design.md` §3 promises.**
- `lib/tokens.ts` — geometry scales with interpolation: `BUTTON_SIZES` (xs…xl: h 32/40/56/96/136,
  padX, gap, icon, font) and `onScale()`/`buttonMetrics()` so "a height between two steps takes
  values between theirs". A disciplined way to express §3's `control height 32, small 28, large 36`
  without a pile of one-off numbers.
- `public/agent.md` — a contract written *for an agent*: what to deliver, the document schema,
  a field table, and a "**Checklist before you reply**". Relevant to Q-D.
- `public/material-symbols.json` + `components/IconPicker.tsx` — a validated Material Symbols name
  list with a ligature-width probe (`FONT = '24px "Material Symbols Rounded"'`; "A real Material
  Symbols glyph is exactly 1em wide; a name with no glyph falls back to text and measures wider").
- `app/globals.css` — `.msr[data-fill="1"] { font-variation-settings: "FILL" 1, … }`: the M3
  filled/outlined toggle, implemented via the variable font.
**Icon set.** None authored. It consumes Google's **Material Symbols Rounded webfont at runtime**
(ligature names), which is a network/font dependency and the opposite of our zero-dependency inline
`PATHS` map.
**Risk.** MIT, so quoting/adapting with attribution is fine. Adopting its token/colour code would
imply copying `lib/color.ts` + `lib/i18n.ts` wiring; the colour maths is ~200 lines and is easier to
re-derive than to import.
**Conflicts with design.md.** Every visual thing: M3 Expressive shape morphing, spring motion,
Roboto Flex, 16dp margins, 412×892 phone frame, and a decorative-by-design part palette — §2
("ornament carries nothing"), §3 (motion `fast/base/deliberate`, "no perpetual animation except the
agent-activity indicator"), §10 (perpetual animation; decorative colour), §6 (our control heights).
**Inference (not published guidance):** the useful reading is *engineering*, not design — its
contrast tiers, its interpolated metric scales, and its agent-facing checklist.

### 2.3 MUI — `https://mui.com/material-ui/getting-started/`
MIT (`mui/material-ui`, 2026-09-16, 99,048★). A styled Material Design implementation. Fetched
page returned only a 2.2 KB stub (JS-rendered), so no quotes are available from it.
**What it offers:** Popper/Tooltip/Snackbar/Menu/RadioGroup/ToggleButtonGroup implementations and a
`createTheme` token system — all of which we can read elsewhere without inheriting Material's
elevation, ripple and density. **Icon set:** ships Material Icons via a separate
`@mui/icons-material` package (another dependency, Apache-2.0 artwork).
**Risk.** Runtime dependency; a full visual language; theming hooks that would become a second
source of truth beside `tokens.css`. **Conflict:** §10 platform/consumer defaults, Material elevation
and motion, generous whitespace and consumer radii, and a form-widget-first interaction model.
**Reject.**

### 2.4 Uiverse — `https://uiverse.io/`
A community gallery: "Community-built library of UI elements. Copy as HTML/CSS, Tailwind, React and
Figma", organised into "categories such as loading UI, button effects, card components, forms and
inputs, and modern styles like **glassmorphism, neumorphism**, and dark mode"; the backing repo
`uiverse-io/galaxy` is MIT ("The largest Open-Source UI Library! Community-made and free to use",
11k★) and contains ~3,500 self-contained HTML snippets with self-contained CSS animations.
**Could not verify directly:** `uiverse.io` returned **HTTP 403** to this run; the characterisation
above is from the site's own description as indexed by search plus the MIT backing repo.
**What it offers this product: nothing.** Its value proposition is ornamental CSS recipes.
**Conflicts with design.md:** it *is* §10 — decorative colour, gradients, glass blur, texture,
perpetual loader animation, and consumer radii, with no token layer and no accessibility record.
**Reject, and reject loudly.**

### 2.5 Ionic — `https://ionicframework.com/docs/components`
MIT (`ionic-team/ionic-framework`, 2026-09-16, 52,665★). Fetched component index confirms
`ion-popover` ("present information or options without changing contexts"), `ion-radio` ("present a
set of exclusive options"), `ion-segment` ("a set of exclusive buttons that can be used as a filter
or view switcher"), `ion-toast` ("subtle notifications that appear over your app's content without
interrupting user interaction").
**What it offers:** the naming and *semantics* of exactly three of our open components — a
two-state exclusive switcher (before/after), an exclusive option set (candidate chooser), and a
non-blocking notification (toast). **Risk:** Stencil-based custom elements = a runtime dependency
and a platform-look theming system (iOS/Material mode detection). **Conflict:** §10 "a platform
form widget as a primary surface control" and the whole native-platform aesthetic.
**Imitate the semantics, reject the framework.**

### 2.6 vercel-labs/agent-skills — `https://github.com/vercel-labs/agent-skills`
MIT ("## License — MIT" at the end of the README). Skills: `web-design-guidelines`,
`writing-guidelines`, `react-best-practices` ("40+ rules across 8 categories, **prioritized by
impact**", e.g. "Eliminating waterfalls (Critical)", "Bundle size optimization (Critical)"),
`composition-patterns`, `react-native-guidelines`, `react-view-transitions`, `vercel-optimize`,
`vercel-deploy-claimable`. Each skill is `SKILL.md` + `rules/` with `_sections.md`, `_template.md`
and one file per rule.
The review skill's own instructions (fetched): "1. Fetch the latest guidelines from the source URL
below… 4. Output findings in the terse `file:line` format", with the canonical rule document at
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
**This is process quality, not visual language: adopt it.** See Q-D.

### 2.7 Base UI — `https://base-ui.com` / `github.com/mui/base-ui`
"Unstyled UI components for building accessible web apps and design systems. From the creators of
Radix, Floating UI, and Material UI." MIT, 2026-09-16, 10,915★, 439 open issues, topics include
`wai-aria`. Component directories verified at `packages/react/src/`: `accordion`, `alert-dialog`,
`autocomplete`, …, `popover`, `preview-card`, `progress`, `radio`, `radio-group`, `scroll-area`,
…, `tabs`, `toast`, `toggle`, `toggle-group`, `toolbar`, `tooltip`. README team list includes
**"James Nelson [@atomiksdev]"** — the Floating UI author — which is why its positioning/flip
handling is the closest published analogue to design.md §7's "Anchored card is clamped to the
viewport and flips side rather than overlapping its target".
Fetched Base UI Toast docs:
- "`<Toast.Provider>` can be wrapped around your entire app, ensuring all toasts are rendered in the
  same viewport."
- "**F6 lets users jump into the toast viewport landmark region** to navigate toasts with keyboard
  focus."
- "For high priority toasts, the `title` and `description` strings are what are used to announce the
  toast to screen readers. **Screen readers do not announce any extra content rendered inside
  `<Toast.Root>`** … unless they intentionally navigate to the toast viewport."
- Stacking is expressed as CSS variables (`--toast-offset-y`, `--toast-frontmost-height`) plus
  `data-expanded` / `data-behind` attributes rather than JS measurement.
**Take:** the a11y contract for toasts (announce exactly the title/description; a keyboard-reachable
viewport region) and the `radio-group` / `toggle-group` / `tooltip` file set as the shape of what we
must reimplement. **Risk:** React runtime dep. **Conflicts:** none visual (it is unstyled).

### 2.8 Radix Primitives — `https://github.com/radix-ui/primitives`
MIT, 2026-08-08, 19,274★, 352 open issues, "Maintained by @workos". Directory listing of
`packages/react/` verified: `tooltip`, `popover`, `popper`, `toast`, `dropdown-menu`, `radio-group`,
`toggle-group`, `toggle`, `toolbar`, `roving-focus`, `dismissable-layer`, `focus-scope`,
`use-callback-ref`, … The site describes the library as "With submenus, checkable items, collision
handling, arrow key navigation, and typeahead support" (Dropdown Menu) and "With fine-grained focus
control, collision handling, origin-aware and collision-aware animations" (Popover).
**This file list is the most valuable single artefact in this research**, because it names the
primitives our §6 components silently need:
`AnchoredCard` needs `popper` + `dismissable-layer`; `OverflowMenu` needs `dropdown-menu` +
`roving-focus`; `Drawer` needs `focus-scope` + `dismissable-layer`; `CandidateChooser` needs
`radio-group`; `BeforeAfterToggle` needs `toggle-group`; `Tooltip`/coachmarks need `tooltip`.
**Risk:** runtime dep. **Conflicts:** none visual.

### 2.9 Ark UI — `https://github.com/chakra-ui/ark`
"Unstyled, accessible UI components for your design System. Works in React, Vue, Solid, and
Svelte." MIT, 2026-09-16, 5,393★, only 12 open issues. Dependencies pull Zag.js state machines
(`ark` 2022-10-26; tiny open-issue count suggests a well-closed project).
**Take:** the idea that a component's states are one machine rather than N booleans (also visible in
Headless UI's `menu-machine.ts`). Our `AnnotationPill` has ten states and §4 says every state must
carry "text plus at least one non-colour cue" — a machine with a declared transition table is how
that stops being a `switch` in six places. **Conflicts:** none visual.

### 2.10 React Aria Components — `https://github.com/adobe/react-spectrum`
**Apache-2.0** (not MIT — matters for Q4 of the per-source questions). 2026-09-16, 15,869★.
Verified files under `packages/react-aria-components/src/`: `Toast.tsx` (9,251 B), `Menu.tsx`
(22,664 B), `Popover.tsx` (13,787 B), `Tooltip.tsx` (8,211 B), `RadioGroup.tsx` (14,756 B),
`ToggleButton.tsx` (4,985 B), `ToggleButtonGroup.tsx` (3,646 B), plus `OverlayArrow.tsx`,
`PreviewTrigger.tsx`, `Toolbar.tsx`.
`Toast.tsx` fetched verbatim and is the most complete toast implementation read in this research: it
composes `useToastRegion` + `createPortal(region, portalContainer)`, tracks `isHovered`/`isFocused`/
`isFocusVisible` render props, renders `state.visibleToasts` into an `<ol>` (`ToastList`), and its
default class names are `react-aria-ToastRegion` / `react-aria-Toast`. It is exported as
`UNSTABLE_Toast` / `UNSTABLE_ToastRegion` — i.e. Adobe itself flags this as not-yet-frozen, which is
the honest reason to imitate rather than adopt.
**Risk:** Apache-2.0 §4 requires retaining copyright/attribution notices for redistributed source
and including NOTICE content if a NOTICE file ships. Since we would rewrite rather than copy, the
practical obligation is attribution in a NOTICE/credits file if any code is transcribed.
**Conflicts:** none visual.

### 2.11 Headless UI — `https://github.com/tailwindlabs/headlessui`
MIT, 2026-04-13, 28,741★, 111 open issues. "Completely unstyled, fully accessible UI components,
designed to integrate beautifully with Tailwind CSS." Component directories verified under
`packages/@headlessui-react/src/components/`: `menu/` (incl. `menu-machine.ts`,
`menu-machine-glue.tsx`, `menu-button/`, `menu-item/`, `menu-heading/`, `menu-separator/`),
`popover/` (also machine-based: `popover-machine.ts`, `popover-button/`, `popover-backdrop/`,
`popover-group/`), `radio-group/` + `radio/` + `radio-group-label/` + `radio-group-option/`,
`switch/` + `switch-group/` + `switch-label/`, `dialog/` + `dialog-panel/` + `dialog-title/`,
`listbox/`, `tab-group/`.
**Notably: there is no toast component** — a repo-wide search for "toast" in the component tree
returns nothing. That is a real finding for Q-B: if our toast design leans on Headless UI, there is
nothing to lean on.
**Take:** `menu-machine.ts` as the model for `OverflowMenu` (keyboard, typeahead, focus return).

### 2.12 Park UI — `https://github.com/chakra-ui/park-ui`
"Beautifully designed components built with Ark UI and Panda CSS that work with a variety of JS
frameworks." MIT, 2026-04-10, 2,367★. Redirects from `cschroeter/park-ui` to `chakra-ui/park-ui`.
It is a *complete* visual language on top of two dependencies. **Reject** — nothing here that
Ark UI + Panda don't already give us, and it would import an aesthetic we did not choose.

### 2.13 Panda CSS — `https://panda-css.com/docs/theming/tokens`
MIT, 2026-09-16, 6,191★, 7 open issues, topics include `design-tokens`, `styled-system`, `theming`.
Fetched docs give the schema, which is unusually close to our §3:
```ts
theme: {
  tokens: { colors: { red: { value: '#EE0F0F' }, green: { value: '#0FEE0F' } } },
  semanticTokens: { colors: {
    danger:  { value: '{colors.red}' },
    success: { value: '{colors.green}' }
  } }
}
```
plus a light/dark condition mapping:
```ts
danger: { value: { base: '{colors.red}', _dark: '{colors.darkred}' } }
```
and "Token Nesting" with a `DEFAULT` key for hierarchy. It also defines a `gradients` token type
(which we would simply never populate).
**Take:** the *shape* — raw tokens and semantic tokens as two declared layers, semantic values
expressed as references to raw tokens, and dark mode as a second value on the same semantic name
rather than a second table. **Reject:** the compiler/build step and any CSS-in-JS runtime; our layer
is plain CSS custom properties and should stay that way.

### 2.14 Open Props — `https://open-props.style/`
"CSS custom properties to help accelerate adaptive and consistent design", v1.7.23, MIT, 2026-08-11,
5,517★. Fetched page confirms: `--radius-{1-6}`, `--radius-round`, **`--radius-drawn-{1-6}`**
("radii that produce a hand-drawn border"), **`--radius-blob-{1-5}`**, `--shadow-{1-6}`,
`--text-shadow-{1-6}`, `--inner-shadow-{0-4}`, a tintable shadow playground, `--noise-{1-5}` /
`--noise-filter-{1-5}` ("grainy-gradients"), and "**Open Props includes 30 handcrafted gradients**"
with a gradient-text recipe (`-webkit-background-clip: text`).
It does have a thin alias layer — `html { --text-1: var(--gray-9); @media (--OSdark) { --text-1:
var(--gray-1) } }` — and it is genuinely non-prescriptive, which is its best quality.
**Take:** nothing structural. It is the clearest single illustration of why `design.md` §2's
"three changes make it a tool" (radii 8/12/16, drop decorative accents, 11px floor) is the right
call: an off-the-shelf token set will hand you gradients, grain, blobs and a 6-step consumer radius
scale by default. **Reject.**

### 2.15 Radix Colors — `https://www.radix-ui.com/colors`
MIT, 2025-12-17, 1,670★, "A gorgeous, accessible color system."
Fetched "Understanding the scale": "There are 12 steps in each scale. Each step was designed for at
least one specific use case", with the table 1 app background / 2 subtle background / 3 UI element
background / 4 hovered UI element background / 5 active-selected / 6 subtle borders and separators /
**7 UI element border and focus rings** / 8 hovered UI element border / 9 solid backgrounds / 10
hovered solid backgrounds / 11 low-contrast text / 12 high-contrast text.
Fetched "Aliasing" is the directly useful part: **Semantic aliases** ("creating semantic aliases
like `accent`, `primary`, `neutral`, or `brand` can be helpful, especially when it comes to
theming"), **Use case aliases** (name a step by its designed use), and **Mutable aliases** — "When
designing for both light and dark modes, you sometimes need to map a variable to one color in light
mode, and another color in dark mode", with the warning "**Avoid using specific variable names like
'CardBg', or 'Tooltip', because you will likely need to use each variable for multiple use cases.**"
**Take:** the step vocabulary and the three alias classes. **Reject:** the palettes and the 12-step
ramp, which invite uses our §4 role table does not define.
**Could not verify:** `radix-ui.com/colors` itself returned only an 860-char stub (JS-rendered);
the often-repeated "text colors are guaranteed to pass target contrast ratios… based on the modern
APCA contrast algorithm" claim appears in search-engine snippets of that page but was **not**
confirmed from fetched text. Treat the contrast-guarantee framing as unverified.

### 2.16 Radix Themes — `https://github.com/radix-ui/themes`
MIT, 2026-04-11, 8,698★, "an open-source component library optimized for fast development, easy
maintenance, and accessibility. Maintained by @workos." A styled library layered on the primitives.
The getting-started page returned only 870 chars (JS-rendered), so nothing is quoted from it.
**Reject** as a dependency and as a visual influence: it would impose a second design language and a
runtime dependency on a surface whose §2 is "one accent, no decoration".

### 2.17 Untitled UI — `https://github.com/untitleduico/react` and `/icons`
**React**: MIT, 2026-09-02, 1,921★, "the world's largest collection of open-source React components
built with Tailwind CSS and React Aria", topics `react-aria`, `react-aria-components`, `tailwindcss`.
Nothing to take (their React Aria choice is corroboration, not content).
**Icons** (separate repo, separate terms): README claims "1,100+ free SVG icons for your next React
project"; fetched `LICENSE` says:
> "You are allowed to: • Use the icons in personal and commercial projects.
> You are not allowed to: • Sell, sublicense, or distribute the icons (in original or modified form)
> • **Create derivative icon libraries based on the icons** • Use the icons in any form of UI kit,
> library, or template intended for resale"

and the README points at "the PRO version… 4,600+ icons across 4 styles… minimal line, modern
duocolor or duotone, or solid icon styles" behind a paid tier. Vendoring this set into a repo would
be distribution of the icons and, worse, would touch the "derivative icon libraries" clause.
**Reject on licence grounds.** (Flag: the two Untitled UI repos carry different terms — do not read
the React repo's MIT as covering the icons.)

### 2.18 Heroicons — `https://github.com/tailwindlabs/heroicons`
MIT, 2026-05-12, 23,804★, only 4 open issues. Fetched README: "Beautiful hand-crafted SVG icons, by
the makers of Tailwind CSS"; the inline example uses `fill="none" viewBox="0 0 24 24"
stroke="currentColor" stroke-width="2"` with round caps/joins; "The 24x24 outline icons can be
imported from `@heroicons/react/24/outline`, the 24x24 solid icons from `@heroicons/react/24/solid`,
the 20x20 solid from `@heroicons/react/20/solid`, and the 16x16 solid from `@heroicons/react/16/solid`."
Counted from the contents API: **`optimized/24/outline` = 324 files, `optimized/24/solid` = 324
files.** That equal count is the strongest "matched pair at one coherent weight" evidence found in
this research. Contributing note: "We're **not accepting contributions for new icons**" — a set
that is frozen by policy, which matters if we wanted a shape it lacks.
**Take:** the *pair* (if we want an off-the-shelf filled twin) and the `currentColor` + `fill=none`
+ 24 grid attribute contract. **Conflict:** 2px stroke vs our 1.5 (`src/ui/icons.ts`), and the
consumer/Tailwind shape language; also at 20px and 16px there is no outline twin at all.

### 2.19 Lucide — `https://github.com/lucide-icons/lucide`
ISC (`LICENSE`; README: "this software is licensed under the [ISC License]"; GitHub's API reports
`NOASSERTION` because the file is bespoke-worded — a distinction worth knowing when a licence
scanner runs). 2026-09-16, 24,549★, 469 open issues, "Beautiful & consistent icon toolkit made by the
community. Open-source project and a fork of Feather Icons", "provides 1600+ vector (svg) files".
Fetched `https://lucide.dev/contribute/icons/design-principles`:
- "Icons **must** be designed on a 24 × 24-pixel canvas."
- "Icons **must** have at least 1 pixel of padding between their strokes and the edge of the canvas."
- "**Strokes must be 2 pixels wide.** Do Use a 2-pixel stroke width. Don't Don't use thicker or
  thinner strokes, or mix stroke widths."
- "Strokes **must** use round line joins."
Fetched `https://lucide.dev/contribute/icons/code-conventions`:
- root attributes `<svg … viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">`
- "SVG files may only contain simple path and shape elements."
- "**Do not use transforms, filters, fills, or explicit stroke colors.**"
- "Never use `<use>`."
**No filled variant.** Because Lucide's own rules forbid `fill`, the set is outline-only by
construction; the community request "Fill icons · Discussion #458" ("My only problem with using
lucide-icons at the moment is the lack of filled icons") confirms the gap exists and is not being
filled; an independent comparison states it flatly: "It has no filled variants."
**Take:** Lucide is the best *published rulebook* for a hand-drawn set — which is exactly the
artefact `design.md` §6 and issue `02-one-icon-set.md` currently lack (they say "one stroke weight,
one viewbox, one size scale" but do not state the weight, the grid rule, the safe zone, or the
circumstance/radius rules). Copy the *rules*, not the icons.
**Conflicts:** §2/§8 icon weight (2px vs 1.5), and — decisively for the mode island — outline-only,
which cannot encode "filled = armed, outlined = unarmed".

### 2.20 Phosphor — `https://github.com/phosphor-icons/core`
MIT, 2026-01-06 (≈8 months stale at 2026-09-16), core 380★; the web package
`phosphor-icons/phosphor-icons` redirects to `phosphor-icons/web` (MIT, 2026-01-06, 529★).
Fetched README: "This package exposes all icons as SVG assets, **grouped by weight**, under the
`/assets` directory (i.e. `/assets/<weight>/<kebab-name>-<weight>.svg`)… These files can be used as
needed for custom implementations or ports." Contents API confirms weight directories
`assets/{thin,light,regular,bold,fill,duotone}`; `assets/regular/acorn.svg` ↔
`assets/fill/acorn-fill.svg` name alignment holds; the `fill` and `regular` listings each return
≥1,000 entries (the contents API caps at 1,000, so the true counts are higher).
**Take:** the only vendorable, permissively-licensed **complete fill/regular pair** found.
**Risk:** MIT + a copyright notice is all it needs; vendored raw SVG has no runtime dependency.
**Conflicts:** six weights is a "system of weights" where `design.md` wants one; Phosphor's shapes are
rounder/consumer-friendlier than our current drawn set; and I could **not** verify whether
`assets/regular/*` is stroke- or fill-based artwork, so the claim "same weight" is unproven.

### 2.21 Tabler Icons — `https://github.com/tabler/tabler-icons`
MIT, 2026-09-11, 21,695★. Fetched README (raw): "A set of 6184 free, MIT-licensed, high-quality SVG
icons… Each icon is designed on a 24x24 grid with a 2px stroke"; "### Outline version (5130 icons)";
"### Filled version (1054 icons)"; "All outline icons are designed with a 2px stroke, but **every
path is drawn so that it also renders well at other stroke widths.** Change the `stroke-width` value
to get lighter or bolder variants."
**Take:** the re-weightability claim is attractive (it means a Tabler path is not ruined at 1.5).
**Conflicts:** filled coverage is 1,054/6,184 ≈ 17%, so "the filled twin" frequently does not exist;
2px default; the sheer size of the set is an invitation to icon sprawl; and `@tabler/icons` is a
1.1 GB repo (installation/allotment cost).

### 2.22 Material Symbols — `https://github.com/google/material-design-icons`
Apache-2.0 (`LICENSE`), 2026-09-11, 53,960★, 9,743 forks. Google Fonts: "Material Symbols are
available under the Apache License Version 2.0… available from the Material Symbols Library in SVG or
PNG formats." Attribute evidence for the filled/outlined duality is inside this repo's named source
`m3e-canvas`: `app/globals.css` defines `.msr` with
`font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;` and
`.msr[data-fill="1"] { font-variation-settings: "FILL" 1, … }`, and `components/IconPicker.tsx`
renders glyphs via ligature names (`FONT = '24px "Material Symbols Rounded"'`).
So: one icon name, one axis, two appearances — the cleanest filled/outlined duality of any source
here.
**Risk / why it still loses.** Apache-2.0 §4(c)/(d) require retaining notices and reproducing any
NOTICE file; and the practical delivery is either (a) a **webfont loaded at runtime** (network
dependency, text-ligature fallbacks, the exact opposite of our `PATHS` map), or (b) vendoring
thousands of per-style SVGs. Per `02-one-icon-set.md` ("one module exports every chrome icon"), this
replaces our whole icon architecture with a Google dependency.
**Conflicts:** §2/§10 (a whole Material design language arrives with it), §3 (icon scale is a font
metric, not our `--icon-size: 18px`/`--island-tile: 36px`).

### 2.23 Remix Icon — `https://github.com/Remix-Design/RemixIcon`
2,800+ line+fill icons, historically Apache-2.0. **This changed in January 2026.**
Fetched `License` (v1.0, January 2026, © 2017–2026 Remix Design): "**Attribution (Optional)**
Attribution to Remix Icon is appreciated but not required"; "**3.2 Prohibited: Competing Icon
Libraries** You may NOT use the Icons to create, distribute, or sell a competing icon library or
icon set"; "4. Brand Icons and Trademarks"; "When distributing the complete Icon library or
substantial portions thereof: You must retain existing copyright notices in source files"; §9
"License Compatibility… The restrictions in Section 3 continue to apply."
Fetched issue [`#1069 License Change Notice`](https://github.com/Remix-Design/RemixIcon/issues/1069)
(OPEN, 2026-01-25, author `xiaochunjimmy`): "Remix Icon has updated its license to Remix Icon
License v1.0… **Previously, we used the Apache-2.0 license and included some additional
supplementary terms on top of it.** However, these additions created conflicts with the original
Apache-2.0 license itself"; "Creating competing icon libraries based on Remix Icon is not allowed."
Independent third-party consequence, same issue, comment 2026-05-20 (Backstage maintainer): "the new
license is incompatible with the CNCF's pre-approved licenses and policy and we are not able to get
an exception… We are currently staying on the `4.8.0` version of the library, but we don't consider
this viable long-term. The main option for us at this point is to move to a different library."
GitHub API: `spdx_id: NOASSERTION`, 2026-04-28, 8,371★, 603 open issues.
**Reject.** A bespoke, non-OSI licence with a competing-library clause is a liability for a repo that
might later be published, forked or audited — and there are MIT alternatives with the same shape.
**Verification note:** a `source_check` call on this claim returned status "unclear (confidence
0.30)"; the conclusion above rests on the fetched `License` text and issue #1069, both of which are
primary and unambiguous, not on that verdict.

### 2.24 Iconoir — `https://github.com/iconoir-icons/iconoir`
MIT, 2026-08-12, 4,553★, "an open-source library with 1600+ unique SVG icons, designed on a 24x24
pixels grid."
Fetched `icons/regular/activity.svg` verbatim:
```svg
<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3 12H6L9 3L15 21L18 12H21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```
Compare `src/ui/icons.ts`: `viewBox 0 0 24 24`, `fill none`, `stroke currentColor`,
**`stroke-width 1.5`**, `round` caps and joins. **This is the same garden.** If we ever do want to
take shapes from an external set, Iconoir's geometry will not read as foreign at 1.5px; no other set
researched here can say that.
The catch: the repo has `icons/regular` and `icons/solid`, but the contents API shows
**`icons/solid` = 288 files** against 1600+ regular (≈18%), so the solid twin exists for a minority
only. It also carries third-party product marks (Adobe XD, Illustrator, Photoshop…) we must never
render in chrome.
**Take:** the reference set for weight, grid, cap/join and attribute grammar; possibly individual
1.5px outline shapes for new chrome icons.
**Reject:** as a source of filled pairs for the mode island.

### 2.25 Eva Icons — `https://github.com/akveo/eva-icons`
MIT, 8,815★, "A pack of more than 480 beautifully crafted Open Source icons. SVG, Sketch, Web Font
and Animations support" — but **last push 2023-03-04**, i.e. ≈3.5 years stale at the time of this
research. It ships outline and filled variants plus a webfont and animations.
**Reject on staleness.** An unmaintained icon repo is a repo that will never absorb a fix, and its
"animations" packaging is §10 perpetual-motion bait.

### 2.26 anthropics/skills — `https://github.com/anthropics/skills`
176,659★, pushed 2026-09-10, topics `["agent-skills"]`, no `license` field on the repo itself.
README: "This repository contains skills that demonstrate what's possible with Claude's skills
system… **Many skills in this repo are open source (Apache 2.0).** We've also included the document
creation & editing skills…" and per-skill `LICENSE.txt` files (`skills/<name>/LICENSE.txt`) plus
`THIRD_PARTY_NOTICES.md`.
Relevant skills: `skills/brand-guidelines/` (SKILL.md fetched) and `skills/canvas-design/`
(SKILL.md fetched). The brand skill is the **minimal viable design contract for an agent**: literal
values and nothing else —
> "**Main Colors:** Dark: `#141413` — Primary text and dark backgrounds; Light: `#faf9f5` …
> **Accent Colors:** Orange: `#d97757` — Primary accent; Blue: `#6a9bcc` — Secondary accent…"
> "**Typography** Headings: Poppins… Body Text: Lora…"
> `description: Applies Anthropic's official brand colors and typography to any sort of artifact…`

The canvas skill is the opposite: "These are instructions for creating design philosophies —
aesthetic movements…", "create a VISUAL PHILOSOPHY (not layouts or templates)", "**Name the
movement** (1-2 words): 'Brutalist Joy' / 'Chromatic Silence'", "**Emphasize craftsmanship
REPEATEDLY**", "artifacts that are 90% visual design, 10% essential text."
**Take:** brand-guidelines as the shape of a palette/type contract an agent will actually obey;
`canvas-design` as a cautionary example of a design instruction set that would actively fight
`design.md` §2.
**Risk:** Apache-2.0 on the skills; nothing here requires a dependency.

### 2.27 Agent-skill design-contract registries
- [`bergside/awesome-design-skills`](https://github.com/bergside/awesome-design-skills) —
  "A curated registry of **67 design system skill files** for AI-powered agentic tools like Claude
  Code, Cursor, Codex, and others. Pull any skill into your project with a single command. Each skill
  now ships as a folder with: **`SKILL.md` for AI-agent instructions (tokens, component rules,
  accessibility constraints, quality gates)** [and] **`DESIGN.md` for human-readable design intent,
  rationale, and implementation notes**." The 67 include `glassmorphism`, `gradient`,
  `claymorphism`, `cosmic`, `dithered`, `doodle`, `neopop`, `fantasy` — a menu of our anti-patterns.
- [`travisvn/awesome-claude-skills`](https://github.com/travisvn/awesome-claude-skills) and its
  several forks (`frostant`, `jexp`, ComposioHQ) — curated lists of Claude skills; useful only as an
  index. There is no canonical, single "awesome-claude-skills".
- `ui-shadcn`'s own [Skills docs](https://ui.shadcn.com/docs/skills) make the point that a design
  system can ship its rules *as* a skill.
**Take:** the **two-file split** — a normative, machine-checkable `SKILL.md` (tokens, component
rules, accessibility constraints, quality gates) beside a human `DESIGN.md` (intent and rationale).
`design.md` is already the *second* file and is doing part of the first file's job; the split is the
missing piece. **Reject** the style catalogue.

---

## 3. Q-A. Which icon set ships a matched filled + outlined pair at a single coherent stroke weight?

**Claim:** Only two of the researched sets ship a *complete* matched pair — **Heroicons** (324/24
outline + 324/24 solid, 2px) and **Phosphor** (fill + regular for the whole family, six weights).
No set ships a matched pair **at 1.5px**, which is the weight our 26 hand-built icons use.
**Sources:** Heroicons counts from `api.github.com/repos/tailwindlabs/heroicons/contents/optimized/24/{outline,solid}`
(324 and 324 — [repo](https://github.com/tailwindlabs/heroicons)); Phosphor
`assets/{thin,light,regular,bold,fill,duotone}` and name alignment `acorn.svg` ↔ `acorn-fill.svg`
([repo](https://github.com/phosphor-icons/core)); our weight from `src/ui/icons.ts`
(`svg.setAttribute('stroke-width','1.5')`).
**Support:** direct evidence for the counts and weights; **researcher inference** for "therefore".
**Confidence:** high on counts/weights; medium on Phosphor's regular-weight artwork being
stroke-compatible (not inspected).

Per set:

| Set | Filled/outlined pair? | Coverage of the pair | Weight | Verdict for our two-tile mode island |
| --- | --- | --- | --- | --- |
| Heroicons | **Yes** — 24/outline + 24/solid, same names | **324/324 — complete at 24px** | 2px | Best off-the-shelf pair, wrong weight |
| Phosphor | **Yes** — regular + fill (+ 4 more) | complete family | weight-family, not a stroke width | Best if we accept Phosphor geometry |
| Iconoir | Yes, but partial — `icons/solid` = 288 vs `icons/regular` = 1600+ | **≈18%** | **1.5px — ours** | Right weight, cannot supply the pair |
| Tabler | Yes, but partial — 1054 filled vs 5130 outline | ≈17% | 2px | Cannot supply the pair; paths are re-weightable |
| Material Symbols | **Yes, and the truest kind** — one name + `FILL` axis | 100% | font metric | Best *encoding*, worst *delivery* (font runtime, Apache-2.0 NOTICE) |
| Lucide | **No** — outline only, `fill` forbidden by its own rules | 0% | 2px | Cannot encode armed/unarmed at all |
| Eva | Yes (outline + filled) | full-ish | — | Unmaintained since 2023-03-04 |
| Remix Icon | Yes (line + fill) | full-ish | — | Bespoke licence; competing-library clause |
| Untitled UI Icons | Solid styles are a **paid PRO** tier; free set is line-only | — | — | Licence forbids derivative icon libraries |

**Recommendation (inference, labelled as such):** keep the hand-built module and **draw the two
filled twins** (`point-armed`, `box-armed`) in the existing 1.5/24 grammar. The mode island needs
exactly two tiles whose filled state means *armed* and outlined state means *unarmed*; adding a
1,000-icon dependency to obtain two filled glyphs would break `02-one-icon-set.md`'s "one module",
`design.md` §3's icon metric, and the "no runtime dependency" posture in one move. In order of
preference if the maintainer wants to source shapes rather than draw them:
**(1) Phosphor `fill`** (MIT, complete pair, vendorable raw SVG, needs a redraw to 1.5px);
**(2) Heroicons `24/solid` + `24/outline`** (MIT, exactly matched coverage, needs a redraw from 2px);
**(3) Material Symbols' `FILL`-axis idea without the font** — vendor *nothing*, but adopt the rule
"a mode tile is the same glyph, filled when armed and outlined when unarmed", which is what
`design.md` §4 already implies ("The lit tile… Never colour alone").
**Also adopt Lucide's and Iconoir's rule text into `02-one-icon-set.md`**: 24×24 canvas, ≥1px safe
zone, one stroke width with no mixing, round joins/caps, consistent corner radii, ≥2px spacing
between elements, `fill="none" stroke="currentColor"`, and "do not use transforms or explicit
stroke colours".

---

## 4. Q-B. Which source has the best-published, most accessible primitive implementations to imitate?

All five patterns exist in all five libraries; the differences are in what is *published* versus
what is *implemented*. Answer per pattern, with the exact file or docs page:

| Pattern | Best to imitate | Exact file / page | Why |
| --- | --- | --- | --- |
| **Tooltip / popover anchored to a target** (coachmarks + `AnchoredCard`) | **Radix Primitives**, with Base UI for the collision model | `radix-ui/primitives` → `packages/react/{tooltip,popover,popper,dismissable-layer}`; Base UI → `packages/react/src/{tooltip,popover,preview-card}`; Base UI team includes Floating UI's author `@atomiksdev` | §7 requires "clamped to the viewport and flips side rather than overlapping its target"; `popper` + `dismissable-layer` are the two named primitives that make that a contract instead of a bug |
| **Toast / snackbar** | **React Aria Components** for the implementation, **Base UI** for the announced-text contract | `adobe/react-spectrum` → `packages/react-aria-components/src/Toast.tsx` (fetched: portal + `useToastRegion` + `ToastList` `<ol>` + hover/focus render props); Base UI docs `https://base-ui.com/react/components/toast` ("F6 lets users jump into the toast viewport landmark region"; "the `title` and `description` strings are what are used to announce the toast to screen readers. Screen readers do not announce any extra content rendered inside `<Toast.Root>`") | Our `toastElement()` is `role=status aria-live=polite` with a single text slot; the two rules above are what stop a toast that *looks* announced from being silent |
| **Menu button / overflow menu** (`OverflowMenu`) | **Headless UI** (machine) + **Radix `dropdown-menu`** (feature list) | `tailwindlabs/headlessui` → `packages/@headlessui-react/src/components/{menu/menu-machine.ts,menu/menu.tsx,menu-button/,menu-item/}`; Radix `packages/react/dropdown-menu` + `packages/react/roving-focus` | `design.md` §5 puts theme/reload/copy/disclosure in the overflow and says it "never holds a frequent action" — i.e. it must be fully keyboard-drivable and focus-returning. A machine (`menu-machine.ts`) is the readable way to guarantee that |
| **Radio group** (`CandidateChooser`) | **Base UI** / **Headless UI** | Base UI `packages/react/src/{radio,radio-group}`; Headless UI `components/{radio-group,radio,radio-group-label,radio-group-option}`; React Aria `src/RadioGroup.tsx` | Our `candidateChooser()` already uses a `role=radiogroup` of native radios — the right semantics. What is missing is roving focus and a labelled group; `radio-group-label`/`radio-group-option` is the piece we have no equivalent of |
| **Segmented / two-state toggle** (`BeforeAfterToggle`) | **Radix `toggle-group`** | `radix-ui/primitives` → `packages/react/{toggle,toggle-group}` | A single-select toggle group *is* before/after. Worth pairing with shadcn's rule: "**Option sets (2–7 choices) use `ToggleGroup`. Don't loop `Button` with manual active state.**" Our `themeControl` (3 exclusive choices, hand-rolled buttons with `role=radio`) violates that rule today |

**One-line answer:** imitate **Radix Primitives** as the taxonomy (popper, dismissable-layer,
focus-scope, roving-focus, toggle-group, radio-group, dropdown-menu), **React Aria** for the toast
implementation, and **Base UI** for toast announcing semantics and the F6 viewport region. Depend on
none of them.

---

## 5. Q-C. Which source ships a design-token schema worth copying?

**Claim:** three sources each contribute a different piece, and none of them alone is better than
our §3 — but together they close three gaps in it.
**Support:** direct evidence (all fetched).

1. **Panda CSS** contributes the *literal architecture* our §3 describes, as a config:
   `theme.tokens` (raw) → `theme.semanticTokens` whose values are references
   (`danger: { value: '{colors.red}' }`) and can be condition-mapped
   (`danger: { value: { base: '{colors.red}', _dark: '{colors.darkred}' } }`), plus `DEFAULT` keys
   for nesting. That is exactly "components consume semantic roles, never raw values" and "a theme
   may adjust a primitive for contrast without changing a semantic role", expressed in a form a
   linter can check. Page: <https://panda-css.com/docs/theming/tokens>.
2. **Radix Colors** contributes the *naming vocabulary and the aliasing rules*: a 12-step scale with
   one published use case per step (… "7 UI element border and focus rings", "11 Low-contrast text",
   "12 High-contrast text"), and three alias classes — semantic (`accent`, `primary`), use-case, and
   **mutable** for light/dark mappings, with the explicit instruction "**Avoid using specific
   variable names like 'CardBg', or 'Tooltip', because you will likely need to use each variable for
   multiple use cases**" and "you can choose to define multiple semantic aliases which map to the
   same scale" (Pages:
   <https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale>,
   <https://www.radix-ui.com/colors/docs/overview/aliasing>).
   That last sentence is the direct answer to a problem our §4 has: `attention` is used for *both*
   "target being drawn" and "agent awaiting you" and "ambiguous resolution" and "attention badge".
   Radix's guidance says: name both semantics and point them at one primitive, rather than
   overloading one name.
3. **m3e-canvas `lib/color.ts`** contributes *contrast as an explicit tier*, which is the one thing
   neither Panda nor Radix Colors ships as a schema: `export type Contrast = "standard" | "medium" |
   "high"` with "tone (CIE L*) of every role, light and dark, at each contrast level… medium and high
   push the accents and outlines further from their backgrounds the way Material Theme Builder does."
   `design.md` §3 already requires a "scripted contrast check [that] holds every semantic
   surface/ink pair at the documented floor"; this is a neighbouring implementation of the same idea.
   Repo: <https://github.com/lnkiai/m3e-canvas/blob/main/lib/color.ts>.
4. **Open Props** is the counter-example: a genuinely well-executed single-layer token set
   (`--gray-1..12`, `--radius-1..6`, `--shadow-1..6`) with only a thin alias veneer and **no semantic
   role layer and no contrast checking at all** — plus 30 gradients, grain noise, drawn borders and
   blobs. <https://open-props.style/>.

**How this compares to design.md §3.** Our two-layer architecture is already the right shape and is
*stricter* than every source above: we have one accent rather than twelve steps, five checked
semantic pairs rather than a spectrum, a designed dark counterpart, and an explicit "shadow is never
the only boundary". The gaps worth copying are:
- **per-step use-case names** for the grey/accent ramps we do use (Radix's vocabulary), so
  "which grey is this" stops being taste;
- **mutable aliases** so the light/dark counterpart is one named mapping instead of two duplicated
  tables in `tokens.css` (which is how the dark `--closed-*` and `--progress-*` values already
  drifted from the `design.md` §3 table — `#3A2E15` vs `#3A2F14`, `#1E2A44` vs `#232449`);
- **a stated contrast target per semantic pair** and an explicit contrast tier, so the scripted check
  in §3 has something to assert against (m3e-canvas's `Contrast` type is the model).

---

## 6. Q-D. Do agent-skill repos contain guidance on writing design/UI contracts that agents can follow?

**Yes — four distinct, quotable mechanisms. All are directly adoptable for how `design.md` is
written and enforced.**

1. **`vercel-labs/agent-skills` → `skills/web-design-guidelines/SKILL.md`** does not contain the
   rules; it contains the *procedure* for applying them: "1. Fetch the latest guidelines from the
   source URL below / 2. Read the specified files (or prompt user for files/pattern) / 3. Check
   against all rules in the fetched guidelines / 4. Output findings in the terse `file:line` format".
   The canonical rules live in one file
   (`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`),
   fetched fresh before each review — which is exactly the "single normative source of truth,
   re-read every time" property `design.md` §1 claims for itself. That rule document is organised as
   headers per concern, one line per rule, imperative and checkable ("Icon-only buttons need
   `aria-label`"; "Never `outline-none` / `outline: none` without focus replacement"; "Sticky
   headers/footers/overlays must not cover the focused element"), and it **ends with an explicit
   `## Anti-patterns (flag these)` list** followed by an output contract: "Group by file. Use
   `file:line` format (VS Code clickable). Terse findings… State issue + location. Skip explanation
   unless fix non-obvious. No preamble."
   **What to adopt:** `design.md` §10 is already an anti-pattern list — give every entry a
   *checkable* phrasing and a location-based output format so a review produces
   `src/ui/components.ts:214 - mode tile has no filled twin; armed state is colour-only` instead of
   an essay.
2. **`shadcn-ui/ui` → `skills/shadcn/SKILL.md`** adds the piece `design.md` most lacks: "**Critical
   Rules** — These rules are **always enforced**. **Each links to a file with Incorrect/Correct code
   pairs.**" Its rules are single sentences with a pointer (`rules/styling.md`, `rules/forms.md`,
   `rules/icons.md`, …), and they include a direct instruction for the exact pattern our
   `themeControl` hand-rolls: "**Option sets (2–7 choices) use `ToggleGroup`.** Don't loop `Button`
   with manual active state."
   **What to adopt:** for every §10 anti-pattern, add an `Incorrect`/`Correct` pair. `design.md`
   currently states prohibitions ("A solid boundary for a target the Builder-Reviewer drew") without
   showing the two lines of code that differ. The Incorrect/Correct pair is what makes the rule
   unambiguous to an agent and to a test.
3. **`bergside/awesome-design-skills`** documents the two-file convention: "Each skill now ships as a
   folder with: `SKILL.md` for AI-agent instructions (**tokens, component rules, accessibility
   constraints, quality gates**) [and] `DESIGN.md` for **human-readable design intent, rationale, and
   implementation notes**." (67 skills, one folder each.)
   **What to adopt:** `design.md` is doing both jobs. Split it — keep `design.md` as the human
   rationale + amendment record (which is what its §11 already is), and add a generated or
   hand-maintained `AGENTS.md`-style **checklist with quality gates** derived from §3/§4/§6/§8/§10
   that an agent can execute mechanically. The repo's own `AGENTS.md` is the natural home, and
   `docs/agents/domain.md` already establishes that pattern for issues.
4. **`anthropics/skills` → `skills/brand-guidelines/SKILL.md`** proves the minimal form works: literal
   hexes and font names, plus a `description:` line that tells the agent *when* to load the skill
   ("Applies Anthropic's official brand colors and typography to any sort of artifact that may
   benefit from having Anthropic's look-and-feel"). And **`m3e-canvas/public/agent.md`** shows the
   complementary shape for a *schema* contract: what to deliver, the field table, "Keep it simple"
   rules, and a "**Checklist before you reply**".
   **What to adopt:** a `when to load this` description line and a closing checklist, so the
   contract is loadable by an agent rather than only readable by a human.

**Adoption summary for `design.md`:** keep it normative; add (a) a priority/severity per rule,
(b) one Incorrect/Correct pair per §10 entry, (c) an explicit quality gate per §8 accessibility rule,
(d) a terse checkable output format for the §9 gallery pass, and (e) a companion checklist file that
an agent loads. Record the change as a §11 amendment, since §1 requires amending this document
before the visual or interaction language changes.

---

## 7. Q-E. Which sources are actively HARMFUL — naming them as an influence would be a mistake?

Direct answer, with the §10 clause each one pulls toward:

1. **Uiverse** — the worst offender and it is not close. Its categories *are* `design.md` §10:
   glassmorphism, neumorphism, "button effects", loading UI, gradients, decorative colour, perpetual
   animation. Naming it as an influence would invite exactly the surface §2 says the tool is not.
2. **MUI** — pulls toward a platform form widget as a primary control (§10), Material elevation and
   ripple motion (§10 perpetual/animation), a consumer radii and whitespace scale (§2's "deliberate
   tightening"), and a runtime dependency with its own theming authority beside `tokens.css`.
3. **Ionic** — pulls toward "a platform form widget as a primary surface control" (§10) and toward
   inheriting iOS/Android platform look, which is a *second design* in the sense §2 forbids for dark
   mode. `ion-segment`/`ion-toggle` are the tempting parts and they are the parts that would make the
   rail read as a web form.
4. **Open Props** — pulls toward decorative colour, gradients, **texture** (`--noise-*`, grainy
   gradients), hand-drawn borders and blobs (§10), and a 6-step consumer radius scale plus tinted
   shadows (§2 "shadows are warm neutral; a shadow tinted toward a colour is decoration").
5. **`anthropics/skills` → `canvas-design`** — pulls toward decoration as the point: "artifacts that
   are 90% visual design, 10% essential text", an aesthetic "movement" per artefact. For a work tool
   whose §2 says "ornament carries nothing", this is the anti-contract. (Its sibling
   `brand-guidelines` is fine and useful.)
6. **`bergside/awesome-design-skills` as a style source** — a 67-entry catalogue in which the styles
   are `glassmorphism`, `gradient`, `claymorphism`, `cosmic`, `dithered`, `doodle`, `neopixel`,
   `fantasy`. Useful as a *file-format* precedent; fatal as a menu.
7. **Radix Themes and Park UI** — not harmful in themselves, but adopting either means a second
   visual language and a runtime dependency on a surface that is supposed to have one accent and a
   380px rail. Same verdict for **shadcn's default look** (imitate its `skills/` discipline, not its
   `Beautiful Defaults`).
8. **m3e-canvas as a design influence** — its M3 Expressive motion (shape-morphing loading, springs),
   its Roboto Flex typography and its 16dp/412×892 consumer frame are all §2/§3/§10 conflicts. Its
   *engineering* artefacts (contrast tiers, metric interpolation, `agent.md`) are the reason to read
   it, and they should never be described as a visual influence in `design.md`.
9. **Three icon sets, specifically:** **Lucide** (outline-only and 2px — it cannot express armed vs
   unarmed at all, so naming it would invite a mode island that encodes state with colour alone,
   §10), **Untitled UI Icons** (its licence forbids derivative icon libraries), and **Remix Icon**
   (bespoke non-OSI licence with a competing-library clause). **Eva Icons** is not harmful, merely
   dead.
10. **Material Symbols as a delivery mechanism** — a runtime webfont in a tool that currently renders
   26 inline paths is a §1-adjacent architectural regression, and Apache-2.0 NOTICE duties arrive
    with it. The *encoding idea* (same glyph, filled vs outlined) is good and should be credited as
    an idea, not adopted as a dependency.

---

## 8. What we should VENDOR and what we should merely IMITATE

**Vendor (source enters the repo; no runtime dependency, no build step, no copyleft):**

| Item | Source | Licence | Why vendoring is safe |
| --- | --- | --- | --- |
| **Nothing, wholesale.** | — | — | Every candidate set here is either 2px (Heroicons, Lucide, Tabler), partial-pair (Iconoir 288/1600+, Tabler 1054/6184), webfont-delivered (Material Symbols), stale (Eva, 2023), or restrictively licensed (Remix Icon, Untitled UI Icons). |
| *Optional, if the maintainer insists on sourced shapes:* the two **filled twins** for `point` and `box`, redrawn to 1.5px | **Phosphor `fill`** (MIT) or **Heroicons `24/solid`** (MIT) | MIT | Raw `<path>` data, `currentColor`, no runtime dep; a `THIRD_PARTY_NOTICES` line discharges the MIT notice. Heroicons gives exactly matched 324/324 coverage; Phosphor gives a complete family. |
| *Optional:* individual **outline shapes** to extend the 26-icon set | **Iconoir** (MIT) | MIT | Its files are already `24×24 / 1.5 / fill=none / currentColor / round` — identical to `src/ui/icons.ts`, so a vendored path needs no redraw and cannot read as foreign. |
| **The rule text**, not the icons, into `.scratch/surface-refinement/issues/02-one-icon-set.md` and `design.md` §6 | **Lucide design principles + SVG conventions**; **Iconoir NAMING_CONVENTION.md** | ISC / MIT (rules are short factual constraints; restate in our own words) | Gives the icon-set ticket the missing specification: 24×24 canvas, ≥1px safe zone, one stroke width (no mixing), round joins/caps, consistent corner radii, ≥2px element spacing, `fill="none" stroke="currentColor"`, no transforms/filters/explicit stroke colours. |

**Imitate (read the source, write our own code; no dependency):**

| Our component / decision | Imitate | Exact artefact to read |
| --- | --- | --- |
| `ModeIsland` / `ModeTile` armed vs unarmed | Material Symbols' `FILL`-axis *idea*; M3 icon-button toggle rule already cited in `uiux-research.md` §1.5 | m3e-canvas `app/globals.css` `.msr[data-fill="1"]`; `design.md` §4/§6 |
| `AnchoredCard`, coachmarks, tooltips | **Radix Primitives** | `packages/react/{popper,dismissable-layer,tooltip,popover}`; Base UI `packages/react/src/{tooltip,popover,preview-card}` |
| `OverflowMenu` | **Headless UI** (machine) + Radix `dropdown-menu` + `roving-focus` | `packages/@headlessui-react/src/components/menu/{menu-machine.ts,menu.tsx}` |
| `CandidateChooser` | **Base UI** / **Headless UI** radio-group pair | `packages/react/src/{radio,radio-group}`; `components/{radio-group,radio-group-label,radio-group-option}` |
| `BeforeAfterToggle` | **Radix `toggle-group`** | `packages/react/{toggle,toggle-group}`; shadcn rule "Option sets (2–7 choices) use `ToggleGroup`" |
| `Toast` | **React Aria** implementation + **Base UI** announcing contract | `packages/react-aria-components/src/Toast.tsx`; <https://base-ui.com/react/components/toast> |
| `Drawer` + focus containment | Radix `focus-scope` + `dismissable-layer` | `packages/react/{focus-scope,dismissable-layer}` |
| `AnnotationPill` / state vocabulary (§4) | **Ark UI** state-machine discipline | `chakra-ui/ark` (Zag.js machines) |
| `tokens.css` architecture (§3) | **Panda CSS** `semanticTokens` schema + **Radix Colors** alias classes + **m3e-canvas** contrast tiers | <https://panda-css.com/docs/theming/tokens>; <https://www.radix-ui.com/colors/docs/overview/aliasing>; `lnkiai/m3e-canvas/lib/color.ts` |
| `design.md` enforcement (§10) and the §9 gallery pass | **vercel-labs/agent-skills** `web-design-guidelines` + `react-best-practices`; **shadcn** `skills/shadcn/SKILL.md`; **awesome-design-skills** two-file split; **anthropics** `brand-guidelines` | as quoted in §6 (Q-D) above |

**Reject:** Uiverse, MUI, Ionic (as a framework), Radix Themes, Park UI, Open Props, Untitled UI
(both repos), Eva Icons, Remix Icon, Material Symbols as a delivery mechanism, Lucide as the icon
set, and `canvas-design` / the 67-style catalogue as design influences.

**Net effect on `design.md`:** nothing in this research changes §2, §3, §4, §5, §7 or §8. The two
things it *adds* are (a) a specification for the icon set (weight, grid, safe zone, radii, spacing —
so `02-one-icon-set.md` stops being under-specified) and (b) an enforcement shape for §10
(priority + Incorrect/Correct + a terse checkable output). Both are amendments to record under §11.

---

## 9. Disclosure: what could not be verified

1. **`uiverse.io` returned HTTP 403** to this run. Everything said about it comes from its own
   indexed description plus the MIT backing repo `uiverse-io/galaxy`; I did not read a single
   component from the site.
2. **JS-rendered pages that yielded only stubs:** `mui.com/material-ui/getting-started/` (2.2 KB),
   `www.radix-ui.com/colors` (860 chars), `www.radix-ui.com/themes/docs/overview/getting-started`
   (870 chars). **No quotes in this brief come from those three pages.** In particular, the widely
   repeated claim that Radix Colors text steps "are guaranteed to pass target contrast ratios" using
   "the modern APCA contrast algorithm" appears only in a search-engine snippet of
   `radix-ui.com/colors` and is **unverified**; do not cite it as fact in `design.md`.
3. **Lucide documentation moves under us:** `lucide.dev/guide/design/icon-design-guide` and
   `.../icon-design-guide.mdx` both 404. The Lucide rules quoted here come from
   `lucide.dev/contribute/icons/design-principles` and `/code-conventions` (both fetched), and
   "Lucide has no filled variants" rests on (a) those rules forbidding `fill`, (b) GitHub Discussion
   #458 requesting one, and (c) an independent comparison — **not** on an explicit statement by
   Lucide that no filled variant exists.
4. **Phosphor:** I verified that `assets/regular/` and `assets/fill/` both exist with ≥1,000 icons and
   matching names, but I did **not** inspect whether the regular-weight artwork is stroke-based or
   fill-based. Do not assume a Phosphor regular icon can be restyled by changing `stroke-width`.
5. **Licence-scanner trap:** `lucide-icons/lucide` reports `spdx_id: NOASSERTION` on GitHub although
   its README and LICENSE say ISC; `Remix-Design/RemixIcon` also reports `NOASSERTION` and now uses a
   bespoke licence. Any automated licence check will be wrong about both.
6. **Untitled UI has two repos with two different terms.** `untitleduico/react` reports MIT;
   `untitleduico/icons` ships a custom licence prohibiting derivative icon libraries. Only the icons
   `LICENSE` was fetched; the React repo's terms were read from the GitHub API metadata alone.
7. `anthropics/skills` has no `license` field on the repository (GitHub API returns none); the
   Apache-2.0 statement comes from its README plus per-skill `LICENSE.txt` files, which I did not
   read individually.
8. **Not inspected:** any component library's actual source internals (I read file paths, READMEs,
   docs pages and one file — React Aria's `Toast.tsx` — in full). Claims about "how accessible" a
   library is are therefore about *what it documents and names*, not about its implementation
   quality.
9. **Not verified:** MUI X commercial licensing tiers (not needed for the verdict, since MUI is
   rejected on other grounds); Headless UI's or Ark UI's latest release versions (only repository push
   dates); whether Heroicons' 324/324 equality holds icon-for-icon (equality of counts is strong but
   not proof of name-for-name pairing).
10. **`source_check` limitation.** One `source_check` call was made, on the Remix Icon licence claim,
    and it returned **status "unclear (confidence 0.30)"** while surfacing the corroborating issue
    #1069. The conclusion in this brief rests on directly fetched primary text (the repository
    `License` file and issue #1069), not on that verdict. No other claim was machine-validated; every
    quotation in this brief comes from a fetched page or a read file, and every count comes from the
    GitHub contents API.
11. **Person attribution:** Base UI's team list includes Floating UI's author; I read the name from
    the repository README. The inference that this is *why* its positioning is trustworthy is mine,
    not a documented claim.

---

## 10. Ranked summary (source value to this product)

*This mirrors the ≤400-word response summary.*

**Top tier — read these.** (1) **Radix Primitives** — the primitive taxonomy our §6 components
secretly need (`popper`, `dismissable-layer`, `focus-scope`, `roving-focus`, `toggle-group`,
`radio-group`, `dropdown-menu`); MIT, no visual opinion. (2) **Iconoir** — the only set whose SVG
grammar is byte-identical to ours (24/1.5/currentColor/round), so it can extend our icons without a
redraw; but only 288 of 1600+ have a solid twin. (3) **Lucide's contribute rules** — the missing
specification for a hand-drawn set (24 canvas, 1px safe zone, 2px rule, round joins, no fills); ISC.
(4) **Base UI** — the best-published toast a11y contract and the `toggle-group`/`radio-group`
implementation shape.

**Second tier — format, not visuals.** **vercel-labs/agent-skills** (rules with priority tiers + an
explicit anti-pattern list + a terse `file:line` output contract), **shadcn `skills/shadcn`**
("These rules are always enforced… Each links to a file with Incorrect/Correct code pairs"),
**awesome-design-skills** (`DESIGN.md` intent + `SKILL.md` constraints/quality gates), **anthropics
`brand-guidelines`** (the minimal agent-readable palette). **Panda CSS** + **Radix Colors** +
**m3e-canvas/lib/color.ts** for the token schema, alias classes and contrast tiers. **React Aria**
and **Headless UI** for toast/menu implementations (note: Headless UI has **no** toast).

**Single best icon set:** *none is adoptable.* **Iconoir** is the best *weight-and-grammar* match
and is not a source of filled pairs; **Heroicons** is the best *matched pair* (324 outline / 324
solid at 24px, MIT) but at 2px, not our 1.5. Conclusion: draw the two filled twins ourselves and take
Iconoir/Lucide's rules; if shapes must be sourced, **Phosphor `fill`** (MIT, complete family) or
Heroicons `24/solid`, redrawn to 1.5px.

**Single best component source:** **Radix Primitives**, with **React Aria** for the toast and
**Base UI** for the announcing contract.

**Maintainer-named sources NOT worth using, and why:** **uiverse.io** (its categories *are* our §10
anti-patterns), **MUI** (Material look, consumer scale, runtime dep, form-widget-first), **Ionic**
(platform form widgets as primary controls; runtime dep), **m3e-canvas as a visual influence** (M3
Expressive motion, shape morphing, Roboto Flex, 16dp consumer frame — its `lib/color.ts`,
`lib/tokens.ts` and `public/agent.md` are worth reading as engineering), and **shadcn/MUI as
dependencies** — shadcn's *docs and skills* are high value, its components are not. Two additional
rejections the maintainer did not name but should know about: **Remix Icon** (bespoke licence since
January 2026; the CNCF refused it and Backstage froze at 4.8.0) and **Untitled UI Icons** (licence
forbids derivative icon libraries).
