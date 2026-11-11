# Living Overworld autumn modular foundation

Checkpoint status: **D — autumn modular runtime integration established on the feature branch**.

This directory records the canonical geometry for the autumn modular-world proof. It does not replace the current runtime scene yet.

## Preserved authored core

The current 2172 × 724 layers remain the visual reference and coordinate source:

- Mountains, water, and retreat are already clean transparent structural layers.
- The autumn terrain layer is intentionally retained as one authored core because its cliffs, rooted trees, shoreline, path, rocks, and ground overlap. Separating those pixels would require substantial reconstruction and would risk visible degradation.
- Autumn foreground vegetation remains a core occlusion layer until independently generated objects are accepted.

The modular proof will extend this core rather than repeat, stretch, or redraw its major landmarks.

## Geometry

`world.json` defines:

- The source-pixel and normalized coordinate systems.
- Desktop, mobile, and 32:9 evaluation frames.
- Landmark and alpha bounds.
- Left and right extension seams.
- Initial habitat baselines and lake bounds.
- The intended layer order.

The numbers are proof coordinates. They must be verified against the first rendered autumn composition before runtime integration.

## Checkpoint B proof assets

- `terrain-left.png`: meadow extension rising into the authored left cliff seam.
- `terrain-right.png`: right terrace transition descending into open meadow.
- `distant-a.png` and `distant-b.png`: alternating low-contrast mountain and forest extensions.
- `docs/prototypes/living-overworld-autumn-modular.html`: isolated responsive composition proof.

All four proof assets are 2172 × 724 transparent PNGs. Their combined encoded size is 2.61 MB and their raw decoded estimate is approximately 24 MB. Runtime format optimization remains deferred because no existing WebP encoder is installed and this milestone does not authorize a new dependency.

Evidence is captured at 390, 1100, 1920, and 2560 × 720 (32:9) under `docs/assets/screenshots/`.

## Checkpoint C environmental objects

The proof now includes independently replaceable transparent objects:

- Amber and red tree variants.
- Bush.
- Grass cluster.
- Flower cluster.
- Rock.

Clean browser assets live in `objects/`; their unmodified generated masters remain in `source-masters/`. A deterministic alpha cleanup removed only pixels below alpha 32 and cropped transparent margins without repainting the assets.

`world.json` gives every object a stable ID, normalized position, scale, layer, and interaction anchor. The isolated proof's **Swap tree** control changes only the tree asset source, demonstrating replacement without changing terrain. The replacement state is recorded in `docs/assets/screenshots/living-overworld-autumn-modular-object-swap.png`.

## Checkpoint D runtime integration

The existing `LivingOverworldScene` now uses the accepted autumn extension and object inventory only while autumn is visible. Desktop renders feathered left/right terrain and distant scenery around the unchanged authored core. Mobile deliberately omits the peripheral extensions and retains the compact accepted core crop. Objects share stable IDs and normalized positions from this manifest.

Missing decorative extension or object images hide independently; the preserved authored core remains usable. The same seasonal-transition opacity is applied to the modular layer, while spring, summer, and winter retain their existing assets and behavior.

Runtime evidence:

- `docs/assets/screenshots/living-overworld-autumn-modular-runtime-desktop.png`
- `docs/assets/screenshots/living-overworld-autumn-modular-runtime-mobile.png`

## Current limitations

- The authored core terrain still contains unique trees and landforms and cannot itself be tiled.
- The existing lake remains central and does not need an extension.
- The current percentage-based creature placement has not been changed.
- No runtime code consumes this manifest yet.
- The object set is intentionally small and autumn-only.
- The runtime keeps a small typed autumn asset inventory aligned with this manifest; it does not introduce a generalized scene-manifest engine.
- Desktop seam feathering intentionally softens the outer edges of the authored core because the generated extensions use a slightly different material palette.

## Next exact step

Request Product Owner visual review of the runtime desktop and mobile evidence. If accepted, the next bounded action is a release review—not additional scene expansion. Push, merge, deployment, and production restart remain unauthorized.
