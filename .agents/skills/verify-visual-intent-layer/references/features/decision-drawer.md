# The decision drawer

When something needs a decision, the rail head shows an attention count and the drawer explains what would leave the machine, which items need a decision, and how the revision has moved. A remote-origin artifact is disclosed before it loads.

_Partly driven live: the leaving list including its Runtime State Evidence, the attention trigger, and the closed-rows toggle. The origin gate remains mapped, not yet driven._

## Sub-features

- `drawer-attention` shows the attention count when something needs a decision.
- `drawer-leaving` discloses what would leave this machine on send.
- `drawer-decisions` lists the items that need a decision and links to them.
- `drawer-origins` discloses the remote origins the Artifact will contact before it loads.
- `drawer-revision` explains whether the Artifact moved on since an Annotation was written.
- `drawer-close` closes the drawer without changing stored state.
- `drawer-closed-toggle` hides and reveals closed Annotations behind one control.

## How to get to it (user POV)

- Choose the `Needs you` attention trigger in the rail head.
- Choose `Open the disclosure` from the More actions menu.
- Open a remote-origin Artifact and read the policy gate before loading it.

## Driving it with the Lever

Preconditions:

- A run is healthy. The attention trigger appears only while something needs a decision: an Annotation is delivered and undecided, or a Target is unresolved. A merely queued Annotation does not create it; with only a queue, open the drawer from the More actions menu.
- For the origins recipe, an Artifact that declares a remote stylesheet, font or image.

- **Open the drawer.** Choose the attention trigger. Run `… lever.mjs attention`. Exit `0`, `… lever.mjs screenshot --name drawer`, and the snapshot naming `Needs you`, the leaving items, and the revision note.
- **Read what leaves.** Queue an Annotation first (`select`, `annotate`, `queue`). A queued Annotation is not a decision, so the attention trigger does not appear for it: reach the drawer through `overflow --item "Open the disclosure"`. `… lever.mjs snapshot --name drawer` names the queued Annotation and its evidence — label, role, name, selector, box, and the **address and scroll** Runtime State Evidence adds — plus the remote-origin contact line. A saved-HTML Artifact records no address for its own top document, so the address appears only when the Target was reached at a sub-path; a proxied application navigated to its own route is the fixture that shows it.
- **Follow a decision.** Activate an item from the drawer. The Annotation becomes active and its card opens. `state` is unchanged by opening the drawer.
- **Origins before load.** Launch an Artifact with a remote origin. `… lever.mjs screenshot --name policy-gate` shows the origins list and the `Load artifact and allow these origins` control; nothing has been loaded yet.
- **Close without change.** Close the drawer. Run `… lever.mjs attention` then `… lever.mjs press --key Escape`. The drawer closes and `state` is identical before and after.
- **Hide and reveal closed rows.** Run `… lever.mjs closed-rows`. Exit `0`; the visible `.annotation-row` count changes and the one toggle states how many are hidden. There is one control, not a filter affordance.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs snapshot --name drawer`. The state proves nothing changed; the snapshot shows the disclosure content.

## Gotchas

- The attention trigger exists only while something needs a decision: a delivered Annotation awaiting a verdict, or an unresolved Target. A non-empty queue alone does not create it, so with only a queue reach the drawer through `More actions` → `Open the disclosure`.
- Opening the drawer is read-only. Compare `state` before and after; it must be identical.
- The remote-origin gate appears before the Artifact loads. Once loaded, the disclosure no longer blocks.
- The drawer and the More actions menu are different surfaces; `attention` opens the drawer, `overflow` opens the menu.
- Escape closes the drawer first when both the drawer and menu are open.