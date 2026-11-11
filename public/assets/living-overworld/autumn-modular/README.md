# Living Overworld autumn modular foundation

Checkpoint status: **B — autumn terrain proof established**.

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

## Current limitations

- The authored core terrain still contains unique trees and landforms and cannot itself be tiled.
- The existing lake remains central and does not need an extension.
- The current percentage-based creature placement has not been changed.
- No runtime code consumes this manifest yet.
- Environmental object assets have not been created; Checkpoint C is next.

## Next exact step

Create a small transparent autumn object set containing a tree, bush, grass cluster, flower cluster, and rock. Add stable object IDs and interaction anchors to `world.json`, then demonstrate replacement and foreground/background placement in the isolated proof before integrating anything into `LivingOverworldScene`.
