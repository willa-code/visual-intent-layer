# UI/UX Research: Review Surface refinement

Scope: reduction of copy density in tool UIs, progressive disclosure / first-run guidance, toast placement, before/after comparison toggles, ambiguity-resolution and confidence display, and dense action rows.

Every claim below cites a source URL. Direct quotes are from the fetched page. Where a statement is my own design inference rather than published guidance, it is prefixed **Inference (not published guidance)**.

## Executive summary

The published evidence supports most of the maintainer's instincts, contradicts two of them, and is silent on one.

**Ranked top 5 changes by expected gain in perceived simplicity**

1. **Collapse the 4-verdict row to 1 primary + 1 secondary + an overflow menu.** Carbon's explicit rule is that a button group is for **two or three** actions and that more than three must be grouped into a menu button; Apple caps prominent buttons at one or two per view. Visible: `Approve` (primary) and `Request another pass` (secondary). In overflow: `Reject` (labeled, never icon-only) and `Mark obsolete`. This removes the densest cluster of words-plus-buttons in the product. (Carbon, Apple HIG)
2. **Delete the "55% evidence" badges and the explanatory paragraph.** Google's PAIR Guidebook tells teams to consider *not* showing confidence at all when it isn't actionable, warns that granular numbers ("85.8% vs 87%") confuse, and warns that a misleadingly high number causes blind acceptance. A controlled study found **miscalibrated** confidence yielded minimal accuracy gains while **increasing** automation bias. Replace 5 flat-scored candidates with a ranked "n-best" list, the distinguishing evidence per candidate, and a "none of these" escape. (PAIR; AAAI 2025)
3. **One line of copy per annotation; everything else behind the anchor card.** Primer caps teaching-bubble text at ~160 characters; Atlassian caps spotlight messages at two lines at minimum supported size. Copy that isn't read is pure visual noise. (Primer, Atlassian)
4. **Stop toasts covering the mode island.** Material says plainly: "Avoid placing a snackbar in front of frequently used touch targets or navigation," and permits diagonal offsets. Cap to one toast at a time (Primer: no more than 2 alerts at once). Note: "top" is a desktop *convention*, not a Material or HIG rule — the defensible published requirement is non-occlusion, not the top edge. (M3 snackbar, Primer)
5. **Icon-only mode island with real state encoding.** M3's toggle icon button uses *filled* for selected and *outlined* for unselected, and requires a hover tooltip on web. Clean win for two mode tiles. Do **not** extend icon-only treatment to annotation state/target summaries — see contradiction #1. (M3)

**Where published guidance contradicts the maintainer**

- **(b) Icon-only everywhere, including state/target summaries — contradicted.** Carbon: icon-only buttons "should be used sparingly," a tooltip is required on every one, and destructive actions must never be icon-only. It cites Wiedenbeck (1999): *"For most situations, users learn correct interpretations better with text alone than with icons alone."* The icon-only treatment is unsafe for anything with novel, unlearned meaning (state names, "single element vs large area").
- **(d) Toasts should move to top — only half-contradicted.** Material places snackbars at the bottom and its stated remedy for overlap is to nudge them clear, not to relocate them.
- **(g) Before/after toggle in the right rail — not supported.** GitHub's precedent is a diff-mode toggle in the compared view's own header/top-right, and toggles are supposed to sit near what they affect. Placing a content-comparison mode switch in a metadata rail separates control from content. (GitHub; NN/g)

**Validation limitation:** `source_check` returned a false negative on the PAIR confidence claim (status "contradicted" citing a passage that in fact restates the same warning, "showing numeric model confidence might confuse users for outputs they consider to be a sure thing"). The claim is asserted here from the directly fetched page text, not from the automated verdict.

---

## 1. Reducing copy density: icon + label rules, when icons alone work

**1.1 Carbon's icon-only test is the most explicit published decision rule found.**
Carbon states icon-only buttons "should be used sparingly" and recommends them only when one of two conditions holds: (a) "The icon must be standardized and recognizable without label or must represent an action with a strong visual attribute, such as a pin icon for a pinning action," or (b) "There is insufficient space and multiple actions, therefore a toolbar using icon buttons is required."
Sources: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/).
**Support:** direct evidence. **Confidence:** high.

**1.2 Carbon publishes the underlying research finding against icon-only.**
Quoted verbatim on the Carbon button page: *"For most situations, users learn correct interpretations better with text alone than with icons alone." — Wiedenbeck, S (1999).* The primary study (n=novices, learning + delayed retention) found "performance was best on the label-only and icon-label interfaces" — i.e. icon-only underperformed labels.
Sources: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/); [Wiedenbeck, *The use of icons and labels in an end user application program* (Behaviour & Information Technology 18(2))](https://www.tandfonline.com/doi/abs/10.1080/014492999119129).
**Support:** direct evidence (quote is Carbon's; study abstract corroborates). **Confidence:** high.

**1.3 Tooltips are mandatory and are the accessible name, not decoration.**
Carbon: "Regardless of how recognizable an icon may or may not be… a tooltip is always required with text explaining what the icon button would do if clicked." Nuance published on the accessibility tab: "Every icon-only button needs a tooltip, except for icons with clearly established names or functions (such as Bold and Italics)." Tooltips show on **hover and focus**, dismiss on Esc, and the trigger uses `aria-labelledby` to announce the tooltip text.
Sources: [Button usage](https://carbondesignsystem.com/components/button/usage/); [Tooltip — Carbon accessibility](https://carbondesignsystem.com/components/tooltip/accessibility/).
**Support:** direct evidence. **Confidence:** high.

**1.4 Destructive actions must not be icon-only.**
Carbon: "Danger can be a critical action and should be applied to a button that holds higher emphasis along with a visual label… Danger buttons cannot be used in an icon only form." For lower-emphasis destruction: "use a ghost danger button."
Source: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/).
**Support:** direct evidence. **Confidence:** high. *(Directly relevant to Reject / Mark obsolete.)*

**1.5 Material 3: icon buttons need a system-recognized meaning, a tooltip on web, and filled/outlined state.**
M3 icon-button overview: "Icon buttons must use a system icon with a clear meaning"; "On web, display a tooltip describing the action while hovering"; "In toggle buttons, use the outlined style of an icon for the unselected state, and the filled style for the selected state." Accessibility tab: users must "Understand meaning of the icon"; "When applicable, a tooltip should be available to help describe the icon button's purpose"; "The accessibility label for icon buttons describes the action the button is executing."
Sources: [Icon buttons — M3 overview](https://m3.material.io/components/icon-buttons/overview); [Icon buttons — M3 accessibility](https://m3.material.io/components/icon-buttons/accessibility).
**Support:** direct evidence (page text is JS-rendered; quotes captured from indexed page content, so treat as high-but-not-verified-verbatim). **Confidence:** medium-high.

**1.6 Primer: the tooltip *is* the label; make content persistent instead when you can.**
"Reserve Tooltips to visually surface the label for IconButtons." "Keep the Tooltip text minimal." "Never include Tooltips on non-interactive components." IconButtons "have a visually hidden label utilizing `aria-label`" and the Tooltip `label` option "serves as the accessible name for the control utilizing `aria-labelledby`." Primer also pushes back on using tooltips as content storage: "Is this information essential and necessary? Can the UI be made clearer? Can the information be shown on the page by default?"; "If possible, persist the content so it's always available rather than using a Tooltip, which hides content by default." Alternatives offered: modal, summary disclosure.
Source: [Tooltip guidelines — Primer](https://primer.style/product/components/tooltip/guidelines/).
**Support:** direct evidence. **Confidence:** high.

**1.7 Apple HIG: a button always carries a label or a symbol; icons should map to familiar actions.**
"Ensure that each button clearly communicates its purpose. A button always includes a text label or a symbol (or interface icon) — and sometimes a combination of both." "Try to associate familiar actions with familiar icons. For example, people can predict that a button containing the `square.and.arrow.up` symbol will help them perform share-related activities." (HIG page is JS-rendered; text captured via indexed content.)
Source: [Buttons — Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/buttons).
**Support:** direct evidence. **Confidence:** medium-high.

**1.8 Icons in labeled buttons are a cost, not a freebie.**
Carbon: "Icons can be placed next to labels to clarify an action… However, icons should be used sparingly, as overuse can create visual noise and make an experience less usable. If you use a button with an icon in one part of your UI it does not mean that you need to add icons to all other buttons." Within a button group: "We recommend showing an icon for each button in a button group or showing no icons for consistency… using too many buttons with icons in a group can create unwanted noise in the UI."
Source: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/).
**Support:** direct evidence. **Confidence:** high.

**1.9 On "one word vs icon" decision rules.**
The only *published, operationalized* rule I found for choosing between a word and an icon is Carbon's two-condition test (1.1). NN/g supplies a complementary rule for help copy rather than controls: "Skip the obvious stuff… you probably don't need to give users lots of detail on what the gear icon means (it usually means Settings)."
Source: [Onboarding Tutorials vs. Contextual Help — NN/g](https://www.nngroup.com/articles/onboarding-tutorials/).
**Inference (not published guidance):** for the Review Surface this yields a concrete triage — icons may replace words only where the action is universal and visually stereotyped (approve/check, reject/x, diff/compare). State names (`draft/queued/delivered/verified`), target-scope summaries, and destructive verdicts carry no universal glyph and should keep words.

---

## 2. Progressive disclosure and first-run guidance

**2.1 NN/g: the push/pull distinction is the central finding.**
"Intrusive tutorials and lists of changes that are shown when an app is launched or at random points during the user's session are a type of **push revelation**." They "interrupt users who are attempting to do something else at that moment, they don't tend to be memorable, and they also don't result in better task performance. So, in essence, they slow users down, get in the way, and don't achieve their very reason for being." The alternative is the **pull revelation**: "help content triggered by some signal that the user would benefit from that information at that moment," delivered as "hover tooltips or coach marks… or step-by-step task-flow wizards."
Source: [Onboarding Tutorials vs. Contextual Help — NN/g](https://www.nngroup.com/articles/onboarding-tutorials/).
**Support:** direct evidence. **Confidence:** high.

**2.2 NN/g experimental comparison: tours did not improve task success.**
"We observed comparable task success rates for the two conditions. Task success across the four apps tested was 91%…" — i.e. the tutorial condition produced no meaningful performance benefit.
Source: [Mobile Tutorials: Wasted Effort or Efficiency Boost? — NN/g](https://www.nngroup.com/articles/mobile-tutorials/).
**Support:** direct evidence. **Confidence:** high.

**2.3 NN/g coach-mark rules, and the reason chains of tips hurt.**
"Focus on a **single interaction** rather than attempting to explain every possible area of the user interface." "Bombarding users with frequent hint screens causes them to **dismiss hints more quickly**, regardless of how helpful each may be." "Showing multiple coach marks or tips in a row… can also make your app **appear overly complicated and daunting** to new users." "Including visuals alongside written instructions allow users to get the basic idea of what to do **without reading very much**." And a distinctive warning: "People must immediately be able to distinguish between hint screens and actual elements of the interface" — users tried to interact with the Wimbledon app's overly polished annotation overlay. Recommendation: use a different font/handwritten feel so hints read as annotations, and "Keep Tips Scannable and Sparse."
Source: [Instructional Overlays and Coach Marks for Mobile Apps — NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/).
**Support:** direct evidence. **Confidence:** high.

**2.4 NN/g: dismissal must be paired with recall, and help content itself should use progressive disclosure.**
Guideline 1: "Make it easy to dismiss (and recall) the help content." Illustrated by Evernote's *What's New* list which "at the bottom left remains in place in case the user wishes to access it again." Guideline 2: "Use progressive disclosure in the help content. Make the existence of the contextual help visible, but do not overwhelm the user with detail until they ask for it" — illustrated by Photoshop's tooltip with a "Learn how" link. Supporting note on why tutorials fail: the information is shown *out of context* and would have to be memorized; "our memory is quite limited."
Source: [Onboarding Tutorials vs. Contextual Help — NN/g](https://www.nngroup.com/articles/onboarding-tutorials/); [Instructional Overlays and Coach Marks — NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/).
**Support:** direct evidence. **Confidence:** high.

**2.5 Primer's feature-onboarding rules (the strongest published "campaign contract").**
- Proximity: "Onboarding elements should be close to where the feature will live in perpetuity." "Consider the primary task on a page before disrupting the user with a feature callout."
- Non-trap: "Make it clear to the user how they may dismiss the message and return to their original task quickly."
- **Persistence semantics:** "System triggers, e.g. a new feature released, **a user should not need to dismiss the same announcement each time they visit a different repository**"; "Timebox to a maximum number of days"; "Specify a maximum number of impressions a user should see an in-product message. **Respect when a user dismisses a message.**"
- Collision control: "Avoid showing too many alerts at once. **There should be no more than 2 alerts at a time.**"
- Teaching bubble: "Show one teaching bubble at a time"; "Include a headline that states the purpose"; "Keep messages short and concise, **around 160 characters**"; "Generally, use a descriptive dismiss button over a close icon. **'OK, got it' is the default dismissal button copy.**"; "Don't point to hidden elements"; "Don't use a teaching bubble if the user cannot immediately interact or benefit from the highlighted feature."
- Lifecycle: "Do not leave feature announcement campaigns running forever."
Source: [Feature onboarding — Primer](https://primer.style/product/ui-patterns/feature-onboarding/).
**Support:** direct evidence. **Confidence:** high.

**2.6 Atlassian's spotlight: the published max length is small.**
- "Only show one spotlight at a time."
- "Offer a dismiss option at every step. Don't force people to participate."
- "Ideally, spotlights should only have a single step… **Aim for 3-4 steps maximum.** People only need enough information to get them started."
- Message anatomy: "Try to restrict messages to **two lines** in length. Showcase a single change and how it benefits the person reading your message. Try to avoid just naming the function."
- "Keep the text length to two lines at the app's minimum supported size."
- Motion hazard: "The pulse animation can be very disruptive for some users… limit the pulse animation to one spotlight at a time and limit the number of pulses." "If the spotlight opens upon page entry, avoid a pulse animation as the attention is already on the spotlight."
- Spatial honesty: "If you talk about an element or a location within the body of the spotlight message, that element should be visible on the screen at the same time. Don't talk about things that the viewer can't see."
- First-impression principles: patterns "should be dismissible, so we get out of people's way"; for a small change use "New or updated feature"; **"Don't use these patterns for new users signing up for an app"**; new-feature announcement entry points "should be passive and temporary (they shouldn't live forever)"; "Allow power users to uncover advanced features progressively rather than announcing changes they may not be interested in."
Source: [Onboarding (spotlight) — Usage — Atlassian Design](https://atlassian.design/components/onboarding/usage).
**Support:** direct evidence. **Confidence:** high.

**2.7 "Don't show again" persistence: what is specified vs. what is implementation lore.**
- **Specified (published):** the *behavioral contract* — respect dismissal, cap impressions, timebox the campaign, persist across scopes ("should not need to dismiss the same announcement each time they visit a different repository"), and keep a route to recall the content later (NN/g's Evernote example). Sources: [Primer feature onboarding](https://primer.style/product/ui-patterns/feature-onboarding/); [NN/g onboarding](https://www.nngroup.com/articles/onboarding-tutorials/).
- **Not specified by any design system I found:** a canonical storage key scheme. The pattern that appears in practice is a namespaced, versioned `localStorage` key holding a dismissed-set keyed by feature/announcement id, e.g. `exxat-ds:`-namespaced keys "so every DS-owned key is greppable in DevTools" ([persisted-state pattern doc, exxatdesignux](https://cdn.jsdelivr.net/npm/@exxatdesignux/ui@1.6.0/consumer-extras/patterns/persisted-state-pattern.md)) and `featuredrop`'s `isNew(feature) = !dismissed AND !expired AND afterWatermark` with dismissals in `localStorage` ([featuredrop ARCHITECTURE.md](https://github.com/glincker/featuredrop/blob/6556a8ff409677ad83247df0f79409d16e02b79f/docs/ARCHITECTURE.md)). These are third-party implementation sources, **not** design-system guidance — treat as engineering pattern, not authority.
- **Per-user vs per-device:** `localStorage` is inherently per-device/per-browser. For non-critical UI hints this is accepted practice; the consent domain shows why bailing out to `sessionStorage` is wrong for dismissals — it "reappears on every new browser session" ([AuditBuffet pattern catalog](https://auditbuffet.com/patterns/ab-000800)). For a local single-user browser app, `localStorage` is the proportionate choice.
- **Reset affordance:** I found **no** authoritative published spec for a "reset onboarding" control. NN/g's "easy to dismiss **and recall**" implies one is required; that mapping is my inference.
**Support:** interpretation for the design-system part; direct evidence for the quotes. **Confidence:** medium.

**2.8 What this means for (c), summarized as published constraints.**
Anchored, dismissible, persisted spotlights are sanctioned — but the guidance constrains them hard: one at a time, no more than 2 alerts on a page, ≤3–4 steps total (prefer 1), two lines / ~160 characters, a factual dismiss button rather than a bare ×, no pulse on page entry, prefer pull triggers over auto-launch, and don't point at hidden elements.
**Inference (not published guidance):** for three new features, ship three independent single-step spotlights triggered on first relevant interaction (not one 3-step tour), each with its own dismissal key.

---

## 3. Toast / notification placement

**3.1 Material places snackbars at the bottom, and prescribes *offsetting* rather than relocation when they collide.**
"Snackbars should be placed at the bottom of a UI, in front of the main content. **In some cases, snackbars can be nudged upwards to avoid overlapping with other UI elements near the bottom**, such as FABs or docked toolbars." And the non-occlusion rule directly relevant to the mode island: "**Avoid placing a snackbar in front of frequently used touch targets or navigation.**"
Source: [Snackbar — Material Design 3 guidelines](https://m3.material.io/components/snackbar/guidelines).
**Support:** direct evidence (JS-rendered page; quotes captured from indexed page content). **Confidence:** medium-high.

**3.2 Material 2 makes the collision remedy explicit for a bottom-anchored control.**
For a bottom app bar: "To avoid obstruction, **snackbars and toasts should animate in place vertically above a bottom app bar**." Also: "Spatial positioning significantly impacts…" — the underlying rule is obstruction avoidance, and a bottom app bar is treated as a surface that temporary messages must not cover.
Source: [App bars: bottom — Material Design](https://m2.material.io/components/app-bars-bottom).
**Support:** direct evidence. **Confidence:** high.

**3.3 Duration and auto-dismiss (accessibility-critical).**
- "Common acceptable durations are **4–10 seconds**."
- "Snackbars with actions **shouldn't auto-dismiss**. This way, users can read and interact with it at their own pace."
- "On web, **auto-dismissing snackbars are inaccessible** for people with low vision or who require additional time to perceive information. This can be solved in 2 ways: Information in auto-dismissing snackbars must also be communicated using another accessible method inline or near the action that triggered the snackbar. Alternatively, add actions to the snackbar so it doesn't dismiss until acted on."
Sources: [Snackbar — M3 accessibility](https://m3.material.io/components/snackbar/accessibility); [Snackbar — M3 guidelines](https://m3.material.io/components/snackbar/guidelines).
**Support:** direct evidence. **Confidence:** high.

**3.4 Stacking.**
Material's older component doc: "Snackbars appear above all other elements on screen and **only one can be displayed at a time**." Primer's newer, page-level rule: "no more than 2 alerts at a time."
Sources: [Snackbars & toasts — Material Design](https://m1.material.io/components/snackbars-toasts.html); [Feature onboarding — Primer](https://primer.style/product/ui-patterns/feature-onboarding/).
**Support:** direct evidence. **Confidence:** high.

**3.5 Desktop notification *noticeability* is a function of where the user's attention already is.**
CHI 2022, Mueller et al., *Designing for Noticeability: Understanding the Impact of Visual Importance on Desktop Notifications*, introduces a "noticeability map" that "encode[s] the likelihood of a notification to be detected while considering both bottom up (visual importance) and top down (the users' current focus of attention)… as well as the appearance and design of a notification." The paper's contribution is that the visual importance of the background at the notification location significantly affects detection.
Source: [Mueller et al., CHI 2022 (PDF)](https://www.perceptualui.org/publications/mueller22_chi.pdf).
**Support:** direct evidence. **Confidence:** high for the existence/claim of the paper; medium for the specific wording (extracted from PDF text).

**3.6 Top vs bottom as a *convention* rather than a rule.**
Adobe Spectrum documents a Toast component ([Spectrum Toast](https://spectrum.adobe.com/page/toast/)) but its page content could not be extracted to quote a placement rule. Multiple secondary/practitioner sources describe desktop toasts defaulting to top-right or bottom-right corners; one such source argues the four positions have different ergonomics and that "users learn to ignore the top-right corner" ([How to Build a Toast Notification System That Does Not Block the User](https://dev.to/137foundry/how-to-build-a-toast-notification-system-that-does-not-block-the-user-27l4)). **These are practitioner sources, not authoritative design systems — weighted low.**
**Missing evidence:** I could not retrieve and verify Apple HIG's notification/banner placement page (JS-rendered; fetch failed) and therefore **cannot cite HIG for a top-placement rule**. Do not treat "Apple says toasts go top" as verified.
**Confidence:** low for any top-vs-bottom rule; high that no primary source requires "top."

**3.7 Answer to (d).**
The maintainer's complaint is grounded: M3's own text forbids placing a snackbar "in front of frequently used touch targets or navigation," which is exactly what a bottom-centre toast over the mode island does. However, **Material's documented remedy is to nudge the snackbar upward / keep it out of the collision zone, not to move it to the top.** Both satisfy the published rule.
**Inference (not published guidance):** the lowest-risk fix for a two-pane desktop app is a bottom-corner lane that never overlaps the island (e.g. offset above it or aligned to the stage's far edge), one toast at a time, no auto-dismiss when the toast carries an action. "Top" is a legitimate convention but is not *required* by any primary source I could verify, and top-placement risks colliding with artifact identity / rail header instead.

---

## 4. Binary / 2-option comparison toggles (before/after, A/B, diff)

**4.1 Published precedent: the mode toggle lives in the chrome of the compared view.**
GitHub's split-diff introduction: "Diffs now come in two flavors, unified and split. **Switch between them on pull request, commit, and compare pages using the toggle in the top right of the page.** The mode you last used will become your preferred default." Current GitHub docs describe a "Diff view options" control in the diff/file region ([GitHub docs: about comparing branches](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-comparing-branches-in-pull-requests)). GitHub Desktop stores the diff display mode behind "the gear icon in the **diff header**" and persists it ([desktop/desktop#22112](https://github.com/desktop/desktop/issues/22112)).
Sources: [Introducing split diffs — GitHub blog](https://github.blog/news-insights/product-news/introducing-split-diffs/).
**Support:** direct evidence. **Confidence:** high.

**4.2 NN/g's toggle rules constrain how a before/after control may behave.**
"Toggle switches should take **immediate** effect and should not require the user to click Save or Submit to apply the new state." "Toggles may replace two radio buttons or a single checkbox to allow users to choose between **two opposing states**." Labels: "Keep labels for toggle switches short and direct… frontload your labels with keywords"; "The toggle labels should describe what the control will do when the switch is on; they should not be neutral or ambiguous"; "When in doubt, say the label aloud and append 'on/off' to the end." Consistency: "Separate controls that produce instant results from those that require clicking a command button."
Source: [Toggle-Switch Guidelines — NN/g](https://www.nngroup.com/articles/toggle-switch-guidelines/).
**Support:** direct evidence. **Confidence:** high.

**4.3 Before/after slider conventions.**
The dominant published pattern for comparing two *layers of the same artifact* is a **draggable divider over the content** (clip-path reveal, handle centred on a divider, often starting at 50%), not a chrome toggle — see the widely reused `image-compare` web component ([Image Compare Web Component](https://image-compare-component.netlify.app/), [Cloud Four: building an accessible image comparison web component](https://cloudfour.com/thinks/building-an-accessible-image-comparison-web-component/)). Accessibility requirements for such a slider: it must be keyboard operable (typically a native `range` input), and the handle/divider are non-text UI that must meet WCAG 1.4.11 non-text contrast of at least 3:1 against adjacent colours ([Image comparison sliders and visual accessibility — UX StackExchange](https://ux.stackexchange.com/questions/137121/image-comparison-sliders-and-visual-accessibility) — practitioner discussion, weighted medium).
**Support:** direct evidence for existence of the pattern; interpretation for "dominant." **Confidence:** medium.

**4.4 Proximity.**
I found **no** authoritative design-system rule stating "a control must sit next to what it affects." The closest primary-adjacent material is a UX StackExchange discussion where the accepted reasoning is that a toggle far from its object makes the causal relationship unclear ([Does the toggle button need to be near the item that it affects?](https://ux.stackexchange.com/questions/145677/does-the-toggle-button-need-to-be-near-the-item-that-it-affects)). Meanwhile Carbon's published grouping rule is about grouping actions that apply to *the same data*: "Do use menu buttons to group meaningful actions being applied to the same data" ([Button — Carbon](https://carbondesignsystem.com/components/button/usage/)).
**Support:** weak/practitioner. **Confidence:** low.

**4.5 Answer to (g), labelled as inference.**
**Inference (not published guidance):** the before/after revision toggle controls the *artifact*, so it belongs with the artifact's own view chrome (its header/toolbar), not with the rail that holds artifact identity, agent status, and annotation verdicts. Published precedent (4.1) puts diff-mode switches in the compared view's header/top-right, and the rail is a different semantic domain (annotations and status), so moving it there separates the control from what it affects. A defensible compromise that keeps the maintainer's intent: move it from the artifact's *content footprint* into the stage's own top-edge chrome — out of the way, still attached to the content. Also apply 4.2: it must take immediate effect, be labelled non-neutrally ("Before / After" is acceptable as two opposing named states), and persist the last mode (GitHub precedent).
**Confidence:** low-to-medium (reasoned from precedent, not a published rule).

---

## 5. Ambiguity resolution: how confidence should and should not be displayed

**5.1 Google PAIR explicitly tells teams to consider *not* showing confidence.**
"You might choose **not** to indicate model confidence if:
- **The confidence level isn't impactful.** If it doesn't make an impact on user decision making, consider not showing it. Counterintuitively, **showing more granular confidence can be confusing if the impact isn't clear — what should I do when the system is 85.8% certain vs. 87% certain?**
- **Showing confidence could create mistrust.** If the confidence level could be misleading for less-savvy users, reconsider how it's displayed, or whether to display it at all. **A misleadingly high confidence, for example, may cause users to blindly accept a result.**"
Also: "Because most AI models will never make a prediction with 100% confidence, showing numeric model confidence might confuse users for outputs they consider to be a sure thing." And: "There's still active research around the best ways to display confidence… There's always a risk that confidence displays will be distracting, or worse, misinterpreted."
Source: [Explainability + Trust — People + AI Guidebook (Google PAIR)](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/).
**Support:** direct evidence (fetched page text). **Confidence:** high.
*(Note: an automated `source_check` run mis-scored this claim as "contradicted" using a passage that actually restates it. See the validation limitation in the executive summary.)*

**5.2 PAIR publishes the candidate-list ("n-best") pattern as a first-class alternative to a number.**
Under "Model confidence displays," PAIR's examples are, side by side:

> **N-best most-likely classifications** — Most likely plant: *Poison oak / Maple leaf / Blackberry leaf*
> **Numeric confidence level** — Prediction: Poison oak (80%)

And on presentation: "Optimize for understanding, not completeness" with the example explanation "This is most likely a sword plant, because of its dark green color and pointy shape."
Sources: [Explainability + Trust — PAIR](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/); [Building Trusted AI Products with the PAIR Guidebook — Google Codelabs](https://codelabs.developers.google.com/codelabs/pair-guidebook).
**Support:** direct evidence. **Confidence:** high.

**5.3 Controlled evidence that miscalibrated numeric confidence harms decisions.**
*Too Sure for Our Own Good: A User Study on AI Confidence and Human Reliance* (AAAI 2025): calibrated scores improved decision accuracy (+20%), "whereas **miscalibrated scores yielded minimal accuracy gains (+2%) and increased vulnerability to automation bias and conservatism bias**. Participants were more likely to accept AI recommendations when high confidence was expressed, **even when those recommendations were incorrect**, resulting in errors."
Source: [Too Sure for Our Own Good (AAAI 2025), DOI 10.1609/aaai.v40i21.38798](https://doi.org/10.1609/aaai.v40i21.38798).
**Support:** direct evidence. **Confidence:** high for the reported result; medium for exact numeric wording (abstract extraction).

**5.4 Anchoring: exposed numeric anchors bias estimates *and* inflate confidence.**
*Confidently Biased: Comparisons with Anchors Bias Estimates and Increase Confidence* (Journal of Behavioral Decision Making): "people who made estimates after making comparisons with externally provided anchors tended to be more c[onfident]…" — i.e. a number presented in the UI raises the reviewer's own confidence, not just their estimate.
Source: [Confidently Biased, DOI 10.1002/bdm.1996](https://doi.org/10.1002/bdm.1996).
**Support:** direct evidence. **Confidence:** medium-high.

**5.5 Uncertainty presentation changes reliance behaviour (additional supporting research).**
*Designing for Appropriate Reliance: The Roles of AI Uncertainty Presentation, Initial User Decision, and User Demographics in AI-Assisted Decision-Making* (ACM, DOI 10.1145/3637318) and *How Stated Accuracy of an AI System and Analogies to Explain Accuracy Affect Human Reliance* (DOI 10.1145/3610067) both treat confidence/accuracy presentation as a lever on reliance. Also relevant: language models are documented as reluctant to express uncertainty, producing confident-sounding answers even when wrong (*Relying on the Unreliable*, ACL 2024, [PDF](https://aclanthology.org/2024.acl-long.198.pdf)).
**Support:** direct evidence (existence and topic); **Confidence:** high for relevance, medium for any specific behavioural magnitude.

**5.6 Candidate-list disambiguation patterns in the wild.**
- **Search / spell correction:** the published government standard for spelling suggestions requires the literal string "Did you mean:", the corrected term, and retention of the original query; query-correction guidance emphasizes exposing a reversible correction state and preserving the submitted query ([Queensland GUX Standard, Checkpoint 24](https://www.forgov.qld.gov.au/communication-and-publishing/website-standards-guidelines-and-templates/consistent-user-experience-standard/module-5-search-results-presentation/module-5-checkpoint-24-spelling-suggestions-display); [Query correction UX pattern — UX Patterns Guide](https://uxpatternsguide.com/patterns/query-correction/) — secondary).
- **Entity disambiguation:** the research pattern is a *clarification question over a small candidate set* rather than raw scores — *Did you mean A or B? Supporting Clarification Dialog for Entity Disambiguation* ([CEUR-WS Vol-1556 paper 5](https://ceur-ws.org/Vol-1556/paper5.pdf)). Recent work (AmbigChat, UIST 2025) generates hierarchical clarification widgets for ambiguous queries ([PDF](https://majiaju.io/assets/utils/ambigchat_UIST2025.pdf)).
- **Photo taggers:** Google Photos exposes merge/label confirmation flows from face-group suggestions ([Google Photos help](https://support.google.com/photos/answer/6128838?hl=en)); third-party galleries implement an explicit accept/reject/compare triad on a suggestion panel ([Face Suggestions — Gallery docs](https://docs.opennoodle.de/features/face-suggestions) — secondary source). Note the "cautious threshold" principle stated there: the system deliberately leaves low-confidence faces *unassigned* and asks rather than asserting.
**Support:** direct evidence for existence of the patterns; the accept/reject/compare triad is from a secondary implementation. **Confidence:** medium.

**5.7 Answer to (f), labelled.**
**Supported by direct evidence:** a raw numeric badge is not a neutral presentation choice. PAIR explicitly lists "the confidence level isn't impactful" as a reason *not* to show confidence, and uses a nearly identical granularity example (85.8% vs 87%) to the maintainer's complaint. The AAAI study shows uncalibrated numbers raise automation bias.
**Inference (not published guidance):** when five candidates all carry the identical "55% evidence" badge, the number carries literally zero discriminating information — the ranking order is the only signal. And because the number is (per the maintainer's own doubt) uncalibrated, it can only produce the two documented harms: false authority and anchoring. Recommended replacement, drawing on PAIR's patterns: rank the candidates, state the *evidence* that distinguishes each ("matched by heading text", "matched by surrounding section"), front-load the most likely, and add an explicit "none of these" escape. If any scalar must remain, express it as an ordinal/categorical label rather than a percentage.
**Confidence:** high for "remove the badge," medium for the specific replacement.

---

## 6. Dense action rows and collapsing a 4-way verdict

**6.1 Apple HIG: one or two prominent buttons per view.**
"**Keep the number of prominent buttons to one or two per view. Presenting too many prominent buttons increases cognitive load because people must spend time comparing multiple likely options before making a choice.**" Also: "In general, use a button that has a prominent visual style for the most likely action in a view." And on spacing: "Make controls easier to use by providing enough space around them and grouping them in logical sections."
Source: [Buttons — Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/buttons).
**Support:** direct evidence. **Confidence:** medium-high (JS-rendered page; captured via indexed content).

**6.2 Carbon publishes the numeric threshold for a button group, and the overflow remedy.**
- "**Button groups should be used when there are either two or three actions that a user needs to consider. Any more than three actions should be grouped meaningfully using menu buttons, to reduce the amount of space these actions take up on a page.**"
- "Too many calls to action will overwhelm and confuse users so they should be avoided."
- "Each page should have only one primary button. Any remaining calls to action should be represented as lower emphasis buttons."
- "Group the buttons logically into sets based on usage and importance."
- "Do not use two high-emphasis buttons in a button group."
- "due to the visual weight of the secondary button, it's recommended to use **tertiary or ghost buttons in layouts with more than three calls to action**."
- Published *recommended combinations* table: for **2** buttons — "Primary and secondary / Primary and tertiary / Primary and ghost / Primary and danger tertiary / Danger primary and secondary / Danger primary and ghost"; for **3** — "Primary, secondary, and tertiary / Primary, secondary, and ghost / Primary and 2 secondary / Primary and 2 tertiary / Primary, tertiary, and danger tertiary".
- For grouping same-data actions: "Do use menu buttons to group meaningful actions being applied to the same data. / Do not use many individual buttons applying to the same data."
Source: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/).
**Support:** direct evidence. **Confidence:** high.

**6.3 Material's segmented control is deprecated and is *not* a verdict control.**
"Segmented buttons are no longer recommended in the Material 3 expressive update. For those who have updated, use the connected button group instead" ([Segmented button — M3 specs](https://m3.material.io/components/segmented-buttons/specs)). What the replacement is *for*: "Connected button groups help people select options, switch views, or sort elements in a page" ([Button groups — M3 guidelines](https://m3.material.io/components/button-groups/guidelines)). Note also that M3's connected group is specified for selection/view-switching semantics with a persistent *selected* state ([ButtonGroup.md — material-components-android](https://github.com/material-components/material-components-android/blob/master/docs/components/ButtonGroup.md)).
**Support:** direct evidence. **Confidence:** medium-high.
**Inference (not published guidance):** `Approve / Reject / Request another pass / Mark obsolete` are four distinct **commands**, not one mutually-exclusive view setting, and two of them are irreversible commitments. A segmented control would wrongly imply "pick one view mode" and would show a persistent selected state that doesn't match a verdict lifecycle. Verdicts are a command group, not a segmented control.

**6.4 Choice overload is documented.**
NN/g: "As the number of choices increases, so does the effort required to collect information and make good decisions… An excess of choices can lead to fatigue and can make people feel dissatisfied with the experience, or even worse, abandon the process altogether." And on the remedy: "Split buttons reduce visual complexity by grouping similar commands together — much like how navigation menus chunk together related options."
Sources: [Simplicity Wins over Abundance of Choice — NN/g](https://www.nngroup.com/articles/simplicity-vs-choice/); [Split Buttons: Definition — NN/g](https://www.nngroup.com/articles/split-buttons/).
**Support:** direct evidence. **Confidence:** high.

**6.5 Destructive/low-frequency actions should be visually demoted.**
Carbon's danger guidance: "For actions that could have destructive effects on the user's data (for example, delete or remove). Danger button has three styles: primary, tertiary, and ghost"; and "use a ghost danger button for lower emphasis destructive actions." Combined with 1.4 (never icon-only) this yields: `Reject` and `Mark obsolete` should not be peers of `Approve` and must carry labels.
Source: [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/).
**Support:** direct evidence. **Confidence:** high.

**6.6 Answer to (e), labelled.**
**Supported by direct evidence:** four peer buttons in a row exceeds both published thresholds (Carbon: >3 must become a menu; Apple: ≤2 prominent). The clustering complaint is therefore well-founded, and Carbon's own remedy — a menu button grouping actions applied to the same data — fits an annotation's verdict set exactly.
**Inference (not published guidance):** recommended hierarchy for one annotation:
- Visible: **Approve** (single primary) and **Request another pass** (secondary/tertiary).
- Overflow menu ("More actions"): **Reject** and **Mark obsolete** — both with text labels, Reject styled danger (ghost danger for lower emphasis).
This satisfies Carbon's 2–3 visible-actions rule and its published combination table (`Primary, secondary, and tertiary` / `Primary, tertiary, and danger tertiary`), Apple's one-or-two-prominent rule, and keeps the destructive verdict labelled and demoted.
**Confidence:** high for the diagnosis, medium-high for the specific arrangement.

---

## 7. Contradictions, missing evidence, and how the maintainer's instincts map

### 7.1 Contradictions with the maintainer's instincts

| Instinct | Verdict from published guidance |
|---|---|
| (a) Too many words everywhere | **Supported.** NN/g: users don't read; hints get dismissed. Carbon: "Too many calls to action will overwhelm and confuse users." Primer caps teaching text at ~160 chars; Atlassian at two lines. |
| (b) Icon-only mode island **and** icon-only annotation state/target summaries | **Split.** Mode island: safe (M3 toggle icon button with filled/outlined state + tooltip; Carbon permits icon-only where a stereotyped glyph exists). State/target summaries: **contradicted** — Carbon says icon-only "should be used sparingly," requires a tooltip on every one, forbids icon-only for destructive actions, and cites Wiedenbeck (1999) that "users learn correct interpretations better with text alone than with icons alone." Novel, unlearned concepts (draft/queued/delivered/verified; single element vs large area) have no standardized glyph. |
| (c) First-run anchored tooltips, dismissible, persistent "don't show again" | **Supported with hard constraints.** Primer (one bubble at a time, ≤2 alerts/page, ~160 chars, "OK, got it" default dismiss, respect dismissal, max impressions, timebox) and Atlassian (one spotlight at a time, dismiss every step, ≤3–4 steps, two-line messages, no pulse on entry, passive + temporary). Dominant caveat: NN/g prefers *pull* revelations over auto-launched tours, and tours measurably did not improve task success. |
| (d) Toasts should move to the top | **Half-contradicted.** The complaint is valid — M3: "Avoid placing a snackbar in front of frequently used touch targets or navigation." But M3 keeps snackbars at the bottom and prescribes nudging them clear of the collision zone. No primary source I could verify mandates top placement. Moving to top is permissible convention, not a documented rule. |
| (e) Deciding/approving row feels clustered | **Supported.** Carbon: >3 actions → menu button; Apple: ≤2 prominent buttons; NN/g: choice overload. |
| (f) "55% evidence" badge is probably meaningless | **Supported.** PAIR: consider *not* showing confidence when it isn't impactful; "what should I do when the system is 85.8% certain vs. 87% certain?"; misleadingly high confidence causes blind acceptance. AAAI 2025: miscalibrated confidence yields +2% accuracy but increases automation bias. |
| (g) Before/after toggle belongs in the right rail | **Not contradicted, but not supported either.** GitHub puts diff-mode toggles in the compared view's header/top-right and persists the choice. No published rule supports moving a content-comparison switch into a metadata rail; the weak practitioner consensus is proximity to what the control affects. |

### 7.2 Contradictions between sources

- **Toast placement.** Material (bottom, offset when colliding) vs. desktop practitioner convention (top-right / corner). These are not strictly contradictory — Material's rule is about obstruction, and a non-obstructing corner satisfies both — but the *position* recommendation genuinely diverges. Sources: [M3 snackbar guidelines](https://m3.material.io/components/snackbar/guidelines); [DEV.to toast placement](https://dev.to/137foundry/how-to-build-a-toast-notification-system-that-does-not-block-the-user-27l4) (practitioner).
- **Tooltips: label-of-record vs. content cupboard.** Carbon requires a tooltip on every icon-only button; Primer says tooltips should carry only the label and that content should be persisted on the page instead. Both agree the tooltip is the accessible name; they diverge on whether tooltips may hold explanatory content. Sources: [Carbon Button](https://carbondesignsystem.com/components/button/usage/); [Primer Tooltip](https://primer.style/product/components/tooltip/guidelines/).
- **Onboarding tour length.** Atlassian allows up to 3–4 spotlight steps; NN/g's evidence says tutorials don't improve performance and users skip them. Atlassian's own framing ("Ideally, spotlights should only have a single step") softens the conflict but doesn't remove it.

### 7.3 Missing evidence / unverified

- **Apple HIG notification and banner placement.** Page is JS-rendered and could not be fetched. **No HIG citation is offered for toast/notification screen position.** The claim "Apple says notifications/banners go at the top" is **unverified here**.
- **Material Design 3 pages are JS-rendered.** Icon-button, button-group, segmented-button, and snackbar quotes were captured from indexed page content and search-provided page text rather than a verbatim rendered fetch. Treat verbatim wording as medium-high confidence. The M3 snackbar quotes (bottom placement, 4–10 s, no auto-dismiss with actions) appeared consistently across multiple M3 pages and a Google-hosted Android doc, which raises confidence.
- **Adobe Spectrum Toast page** could not be content-extracted; no placement rule quoted.
- **No primary design-system source specifies a `localStorage` key scheme or a "reset onboarding" affordance.** The persistence *behaviour* is specified (respect dismissal, cap impressions, persist across scopes); the *storage mechanism* is implementation practice only.
- **No primary source found on "maximum peer buttons in a row" beyond Carbon's 2–3 rule and Apple's 1–2 prominent rule.** Material does not publish a numeric cap I could verify.
- **Source-check limitation (must disclose):** `source_check` returned "unclear (0.30)" for the Carbon icon-only claim and a **false negative "contradicted" (0.60)** for the PAIR confidence claim — the passage it cited as contradicting was `"* Because most AI models will never make a prediction with 100% confidence, showing numeric model confidence might confuse users for outputs they consider to be a sure thing."`, which restates the same advice. Both claims are therefore asserted from directly fetched page text, and the automated verdicts were discarded as unreliable for these two items.

### 7.4 Ranked recommendations (expected impact on perceived simplicity)

1. **Collapse the verdict row** to `Approve` + `Request another pass` visible, with `Reject` (labelled danger/ghost) and `Mark obsolete` in a menu button. Removes the single densest button+prose cluster. *Evidence:* Carbon ≤3 rule and menu-button remedy; Apple ≤2 prominent; NN/g choice overload.
2. **Remove the "55% evidence" badge;** convert the chooser to a ranked candidate list with per-candidate distinguishing evidence and a "none of these" option. *Evidence:* PAIR (n-best pattern; don't show unimpactful confidence), AAAI 2025 (automation bias), anchoring research.
3. **Cut per-annotation copy to one line** with everything else behind the anchor card; apply the same to the deciding phase. *Evidence:* Primer ~160 chars; Atlassian two lines; NN/g "users don't read."
4. **Guarantee toasts never cover the mode island**, one at a time, no auto-dismiss when the toast carries an action; prefer a corner/offset lane over a bottom-centre overlay. *Evidence:* M3 "avoid placing a snackbar in front of frequently used touch targets or navigation," 4–10 s durations, no auto-dismiss for actionable snackbars; Primer ≤2 alerts.
5. **Make the mode island icon-only with real state encoding** (M3 filled=selected / outlined=unselected) + hover tooltip + `aria-label`; keep labels for annotation states and target scope; let the highlight itself, not a badge string, communicate what is targeted. *Evidence:* M3 icon buttons; Carbon tooltip-always + "use sparingly" + never icon-only destructive; Wiedenbeck 1999.

Secondary: consolidate first-run guidance into ≤3 single-step, dismissed-and-remembered spotlights on a namespaced `localStorage` key (Primer campaign limits; Atlassian single-step preference), and move the before/after toggle into the stage's own header chrome rather than the rail (GitHub precedent).

---

## Sources

**Kept**
- [Button — Carbon Design System](https://carbondesignsystem.com/components/button/usage/) — icon-only sparingly rule, mandatory tooltips, Wiedenbeck citation, danger/icon-only prohibition, ≤3-actions button-group rule, recommended combination tables, one primary button per page.
- [Tooltip — Carbon Design System (accessibility)](https://carbondesignsystem.com/components/tooltip/accessibility/) — tooltips on hover **and** focus, Esc dismissal, `aria-labelledby`, "every icon-only button needs a tooltip."
- [Buttons — Apple Developer Documentation (HIG)](https://developer.apple.com/design/human-interface-guidelines/buttons) — "Keep the number of prominent buttons to one or two per view"; buttons always carry label or symbol.
- [Icon buttons — Material Design 3 (overview / accessibility)](https://m3.material.io/components/icon-buttons/overview) — system-icon requirement, web tooltip requirement, filled/outlined toggle states, accessible-name is the action.
- [Snackbar — Material Design 3 (guidelines / accessibility)](https://m3.material.io/components/snackbar/guidelines) — bottom placement, nudging to avoid overlap, "avoid placing a snackbar in front of frequently used touch targets or navigation," 4–10 s, no auto-dismiss for actionable snackbars, web accessibility caveat.
- [App bars: bottom — Material Design](https://m2.material.io/components/app-bars-bottom) — explicit instruction to animate snackbars above a bottom-anchored control.
- [Onboarding Tutorials vs. Contextual Help — NN/g](https://www.nngroup.com/articles/onboarding-tutorials/) — push vs pull revelations; dismiss-and-recall; progressive disclosure in help.
- [Instructional Overlays and Coach Marks for Mobile Apps — NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/) — single interaction per hint, avoid chains, don't mimic real UI.
- [Mobile Tutorials: Wasted Effort or Efficiency Boost? — NN/g](https://www.nngroup.com/articles/mobile-tutorials/) — comparable task success with and without tutorials.
- [Toggle-Switch Guidelines — NN/g](https://www.nngroup.com/articles/toggle-switch-guidelines/) — two-opposing-states, immediate effect, non-neutral keyword-first labels, separate instant controls from submit controls.
- [Simplicity Wins over Abundance of Choice — NN/g](https://www.nngroup.com/articles/simplicity-vs-choice/) and [Split Buttons — NN/g](https://www.nngroup.com/articles/split-buttons/) — choice overload; grouping as the remedy.
- [Feature onboarding — Primer](https://primer.style/product/ui-patterns/feature-onboarding/) — proximity, campaign limits, respect dismissal, ≤2 alerts, one bubble at a time, ~160 chars, "OK, got it" dismissal, no pointing at hidden elements.
- [Tooltip guidelines — Primer](https://primer.style/product/components/tooltip/guidelines/) — tooltip is the label, minimal text, persist content instead, `aria-labelledby`/`aria-describedby` semantics.
- [Onboarding (spotlight) — Usage — Atlassian Design](https://atlassian.design/components/onboarding/usage) — one at a time, dismiss every step, 3–4 steps max, two-line messages, pulse hazards, "don't use these patterns for new users signing up."
- [Explainability + Trust — Google PAIR](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/) — when **not** to show confidence, granularity example, misleading-high-confidence warning, n-best candidate display.
- [Too Sure for Our Own Good (AAAI 2025)](https://doi.org/10.1609/aaai.v40i21.38798) — miscalibrated confidence increases automation and conservatism bias.
- [Confidently Biased (JBDM)](https://doi.org/10.1002/bdm.1996) — anchors bias estimates and raise confidence.
- [Introducing split diffs — GitHub blog](https://github.blog/news-insights/product-news/introducing-split-diffs/) and [about comparing branches — GitHub docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-comparing-branches-in-pull-requests) — diff-mode toggle lives in the compared view's header/top-right and the last mode becomes the default.
- [Did you mean A or B? Clarification Dialog for Entity Disambiguation (CEUR)](https://ceur-ws.org/Vol-1556/paper5.pdf) — clarification over a small candidate set rather than raw scores.
- [Queensland GUX Standard, Checkpoint 24](https://www.forgov.qld.gov.au/communication-and-publishing/website-standards-guidelines-and-templates/consistent-user-experience-standard/module-5-search-results-presentation/module-5-checkpoint-24-spelling-suggestions-display) — published "Did you mean:" presentation requirements for candidate suggestions.
- [Wiedenbeck (1999), Behaviour & Information Technology 18(2)](https://www.tandfonline.com/doi/abs/10.1080/014492999119129) — the primary empirical support Carbon quotes against icon-only.
- [Mueller et al., CHI 2022, Designing for Noticeability](https://www.perceptualui.org/publications/mueller22_chi.pdf) — detection of desktop notifications depends on placement relative to attention and background importance.
- [Building an accessible image comparison web component — Cloud Four](https://cloudfour.com/thinks/building-an-accessible-image-comparison-web-component/) — before/after slider accessibility requirements (keyboard, contrast).

**Rejected / deprioritized**
- `uxpatternsguide.com` pattern and comparison pages — repeatedly surfaced "two to four actions" and similar summaries without a verifiable primary anchor; appears aggregator-generated. All equivalent claims in this brief are sourced to Carbon/Apple/M3 directly instead.
- `briantree.se`, `dev.to`, `studyaround.blog`, `thehangline.com`, `tianpan.co`, `reloadux.com`, `uxuiprinciples.com`, `neonapps.co` — practitioner/AI-summarized content. Used only as weak signal for crowd practice (toast positions, confidence badges), never as authority.
- `uxstackexchange.com` — used only where labelled; community consensus, not published guidance.
- `m1.material.io` snackbars page — kept only for the "only one at a time" legacy rule; M3 supersedes it elsewhere.
- Deprecated Atlassian onboarding package pages and `atlaskit.atlassian.com` mirrors — superseded by `atlassian.design`.

---

## Next steps

1. **Verify Apple HIG notification/banner placement** via a rendered fetch of `developer.apple.com/design/human-interface-guidelines/notifications` — the only remaining gap that could change recommendation #4.
2. **Fetch the rendered M3 button-groups and icon-buttons pages verbatim** to upgrade the medium-high confidence quotes to verified-verbatim (requires a Firecrawl/TinyFish key or a rendered-fetch fallback).
3. **Local usability check, not a literature question:** test whether an icon-only target-scope indicator ("single element" vs "large area") is understood without a label. The literature predicts it will not be (Carbon/Wiedenbeck); a 5-participant first-click test on the two highlights would settle it cheaply.
