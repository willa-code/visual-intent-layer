# The decision drawer

When something needs a decision, the rail head shows an attention count and the drawer explains what would leave the machine, which items need a decision, and how the revision has moved. A remote-origin artifact is disclosed before it loads.

_Partly driven live: the closed-rows toggle was confirmed in the surface-refinement Verification Run. The attention drawer and origin gate remain mapped, not yet driven._

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

- A run is healthy with at least one Annotation queued or one unresolved target, so the attention trigger appears.
- For the origins recipe, an Artifact that declares a remote stylesheet, font or image.

- **Open the drawer.** Choose the attention trigger. Run `… lever.mjs attention`. Exit `0`, `… lever.mjs screenshot --name drawer`, and the snapshot naming `Needs you`, the leaving items, and the revision note.
- **Read what leaves.** Queue an Annotation first (`select`, `annotate`, `queue`), then open the drawer. `… lever.mjs snapshot --name drawer` names the queued Annotation and the remote-origin contact line.
- **Follow a decision.** Activate an item from the drawer. The Annotation becomes active and its card opens. `state` is unchanged by opening the drawer.
- **Origins before load.** Launch an Artifact with a remote origin. `… lever.mjs screenshot --name policy-gate` shows the origins list and the `Load artifact and allow these origins` control; nothing has been loaded yet.
- **Close without change.** Close the drawer. Run `… lever.mjs attention` then `… lever.mjs press --key Escape`. The drawer closes and `state` is identical before and after.
- **Hide and reveal closed rows.** Run `… lever.mjs closed-rows`. Exit `0`; the visible `.annotation-row` count changes and the one toggle states how many are hidden. There is one control, not a filter affordance.
- **Proof.** Run `… lever.mjs state` and `… lever.mjs snapshot --name drawer`. The state proves nothing changed; the snapshot shows the disclosure content.

## Gotchas

- The attention trigger only exists while something needs a decision: an unresolved target, an advanced revision, or a non-empty queue.
- Opening the drawer is read-only. Compare `state` before and after; it must be identical.
- The remote-origin gate appears before the Artifact loads. Once loaded, the disclosure no longer blocks.
- The drawer and the More actions menu are different surfaces; `attention` opens the drawer, `overflow` opens the menu.
- Escape closes the drawer first when both the drawer and menu are open.