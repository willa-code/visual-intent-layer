# Material and theme

The chrome and the work are visibly different substances: the rail is the warm `canvas` primitive, the stage behind the artifact is `surface.sunken`, and the artifact is served on its own white `surface`. The theme is the operator's — auto, light or dark — is remembered, and is never sampled or derived from the artifact. Dark mode is the same design in different values, and the armed mode tile is legible by glyph form and not by colour alone.

_Partly driven live: the rail/stage/artifact material, canvas versus surface, the filled and outlined tile forms, and the light/dark theme choice were confirmed in the Pass A Verification Run. The remaining recipes are mapped._

## Sub-features

- `material-rail-canvas` renders the rail on the warm `canvas` primitive, never `surface`.
- `material-stage-sunken` renders the stage behind the artifact on `surface.sunken`.
- `material-artifact-white` serves the artifact on its own `surface`, never a colour derived from chrome.
- `tile-glyph-forms` renders the filled form on the armed mode tile and the outlined form on the unarmed tile.
- `theme-choice` chooses auto, light or dark and remembers it across a surface reload.
- `theme-counterpart` holds the same hierarchy in the dark primitives, as a counterpart rather than a second design.
- `theme-not-from-artifact` never reads a chrome colour from the artifact under review.

## How to get to it (user POV)

- Look at the boundary between the rail and the artifact: two substances, not one plane seamed by a hairline.
- Arm a mode tile and watch the glyph gain its filled form.
- Open `More actions` and choose auto, light or dark; reload the surface and see the choice persist.

## Driving it with the Lever

Preconditions:

- A run is healthy on a saved-HTML Artifact.
- The mode island is visible so both tiles can be measured.

- **Read the material roles.** Run `… lever.mjs measure`. Exit `0`; the measurement records `material.railBackground`, `material.stageBackground`, `material.artifactBackground` and the resolved `canvas`, `surface` and `surface-sunken` tokens. It fails if the rail is not `canvas`, the stage is not `surface.sunken`, the artifact frame is not pure white, or `canvas` and `surface` resolve to the same colour.
- **See the two substances.** Run `… lever.mjs screenshot --name material`. The rail reads warm against the white artifact; the boundary is a substance change rather than a drawn seam.
- **Arm a tile and read the glyph form.** Run `… lever.mjs mode --to point` then `… lever.mjs measure`. The armed tile reports `filledGlyph: true`; the unarmed tile reports `false`.
- **Choose the light theme.** Run `… lever.mjs theme --to light` then `… lever.mjs measure`. Exit `0`; `material.theme` is `light` and the tokens are the light primitives.
- **Choose the dark theme.** Run `… lever.mjs theme --to dark` then `… lever.mjs measure` and `… lever.mjs screenshot --name material-dark`. Exit `0`; `material.theme` is `dark`, the tokens are the dark primitives, and the hierarchy survives.
- **Return to auto.** Run `… lever.mjs theme --to auto`. `material.theme` is `auto` and `material.prefersDark` names what the platform asked for.
- **Survive a surface reload.** Choose a theme, then run `… lever.mjs reload-surface` and `… lever.mjs measure`. The applied theme is unchanged.
- **Proof.** Run `… lever.mjs state` and keep the `measure-*.json` under `evidence/`. The measurement carries the resolved tokens and the computed background of each region, so the material claim is a read-back and not a pixel impression.

## Gotchas

- The theme control lives inside the overflow menu; `theme` opens it, chooses the radio and closes it. Choosing a theme does not change stored Annotation state.
- `auto` deletes the `data-theme` attribute and follows `prefers-color-scheme`; `measure` reports it as `auto` with `prefersDark` naming the platform preference.
- The gallery is the token baseline, not the product surface. A token change is proven by the gallery pass; that the product consumes the tokens is proven by `measure` on the live surface.
- A screenshot alone does not prove a material role; compare the computed background against the resolved token in `measure`.
- Never derive a chrome colour from the artifact. If a region's colour moves when the artifact changes, that is the failure this feature exists to catch.
