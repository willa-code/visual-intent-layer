# Accessibility and keyboard

The surface is operable by keyboard: tool keys select tools, Escape unwinds the card, the selection and the view in order, focus is visibly distinct from selection, and reduced motion is honoured.

_Not yet driven. Recipes are mapped; no live drive has confirmed them._

## Sub-features

- `keys-tools` selects a tool with its key (V, E, T, G, A).
- `keys-escape-order` unwinds the card, then the selection, then the view.
- `keys-send` queues with Enter and sends with Cmd/Ctrl+Enter from the card.
- `focus-visible` keeps visible focus distinct from a selected target.
- `motion-reduced` honours a reduced-motion preference.

## How to get to it (user POV)

- Press a tool key while focus is outside an editable field.
- Press Escape repeatedly and watch what unwinds.
- Tab through the surface and watch the focus ring.
- Set the operating system or browser to reduced motion.

## Driving it with the Lever

Preconditions:

- A run is healthy and the Artifact is on screen in Review with focus outside a text field.
- For reduced motion, the browser is launched with a reduced-motion preference.

- **Tool key.** Press the Element key. Run `… lever.mjs press --key e`. Exit `0`; `… lever.mjs snapshot --name tool-key` shows the Element tool pressed.
- **Escape unwinding.** With a card open and a target selected, press Escape. Run `… lever.mjs press --key Escape` then `… lever.mjs screenshot --name escape-card`. The card closes first, then the selection clears on a second Escape, then the view returns on a third. `state` is unchanged throughout.
- **Enter queues.** With the card focused, press Enter. Run `… lever.mjs press --key Enter --target ".anchored-card textarea"`. The Annotation moves from draft to queued in `state`.
- **Send shortcut.** Focus the card and press Cmd/Ctrl+Enter. Run `… lever.mjs press --key Control+Enter --target ".anchored-card textarea"`. The queue is delivered.
- **Visible focus.** Tab through the topbar. Run `… lever.mjs press --key Tab` then `… lever.mjs screenshot --name focus`. The focused control shows a focus ring; the selected target keeps its selection outline, and the two are distinguishable.
- **Reduced motion.** Relaunch with a reduced-motion preference and repeat a tool change. Run `… lever.mjs screenshot --name reduced-motion`. Motion is suppressed and the state change still lands.
- **Proof.** Run `… lever.mjs snapshot --name accessibility` and `… lever.mjs state`. The snapshot names roles and labels; the state proves the keyboard acts landed.

## Gotchas

- A tool key typed while a text field has focus inserts the character instead of selecting a tool. Ensure focus is outside the field first.
- Escape unwinds one layer at a time; assert the order rather than assuming a single press clears everything.
- Enter queues; Cmd/Ctrl+Enter queues and sends. Do not use Enter expecting a send.
- Focus and selection are different states and must be asserted separately.
- Reduced motion changes presentation only; the stored state is the proof that the act landed.