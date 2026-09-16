# Accessibility and keyboard

The surface is operable by keyboard: `P` and `B` arm the two mode tiles, `V` returns to operating the artifact, Escape unwinds the card, the selection and the mode in order, focus is visibly distinct from selection, and reduced motion is honoured.

_Partly driven live: rail legibility, island pointer events, the mode-tile minimum size and `V` were confirmed in the surface-refinement Verification Run. The remaining key recipes are mapped, not yet driven._

## Sub-features

- `keys-tiles` arms the two mode tiles with `P` and `B`, and returns to operating with `V`.
- `keys-escape-order` unwinds the card, then the selection, then the view.
- `keys-send` queues with Enter and sends with Cmd/Ctrl+Enter from the card.
- `focus-visible` keeps visible focus distinct from a selected target.
- `motion-reduced` honours a reduced-motion preference.

## How to get to it (user POV)

- Press `P`, `B` or `V` while focus is outside an editable field.
- Press Escape repeatedly and watch what unwinds.
- Tab through the surface and watch the focus ring.
- Set the operating system or browser to reduced motion.

## Driving it with the Lever

Preconditions:

- A run is healthy and the Artifact is on screen with focus outside a text field.
- For reduced motion, the browser is launched with a reduced-motion preference.

- **Tile keys.** Press `P` to arm pointing, then `B` to arm boxing, then `V` to return to operating. Run `… lever.mjs press --key p`, `… lever.mjs press --key b`, `… lever.mjs press --key v`. Exit `0`; `… lever.mjs snapshot --name mode-keys` shows exactly one tile armed at a time, then none.
- **Escape unwinding.** With a card open and a target selected, press Escape. Run `… lever.mjs press --key Escape` then `… lever.mjs screenshot --name escape-card`. The card closes first, then the selection clears on a second Escape, then the mode returns to operating on a third. `state` is unchanged throughout.
- **Enter queues.** With the card focused, press Enter. Run `… lever.mjs press --key Enter --target ".anchored-card textarea"`. The Annotation moves from draft to queued in `state`.
- **Send shortcut.** Focus the card and press Cmd/Ctrl+Enter. Run `… lever.mjs press --key Control+Enter --target ".anchored-card textarea"`. The queue is delivered.
- **Visible focus.** Tab through the rail head and the mode island. Run `… lever.mjs press --key Tab` then `… lever.mjs screenshot --name focus`. The focused control shows a focus ring; the selected target keeps its selection outline, and the two are distinguishable.
- **Reduced motion.** Relaunch with a reduced-motion preference and repeat a tool change. Run `… lever.mjs screenshot --name reduced-motion`. Motion is suppressed and the state change still lands.
- **Proof.** Run `… lever.mjs snapshot --name accessibility` and `… lever.mjs state`. The snapshot names roles and labels; the state proves the keyboard acts landed.

## Gotchas

- A mode key typed while a text field has focus inserts the character instead of arming a tile. Ensure focus is outside the field first.
- The mode tiles are never removed from the surface, so focus in a text field never strands the operator in a mode; the tile stays pointer-reachable.
- Escape unwinds one layer at a time; assert the order rather than assuming a single press clears everything.
- Enter queues; Cmd/Ctrl+Enter queues and sends. Do not use Enter expecting a send.
- Focus and selection are different states and must be asserted separately.
- Reduced motion changes presentation only; the stored state is the proof that the act landed.