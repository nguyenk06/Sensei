# Living Overworld autumn modular foundation

Checkpoint status: **A — geometry and extraction established**.

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

## Checkpoint A limitations

- No reusable autumn edge terrain exists yet.
- The current terrain edges contain unique trees and landforms and cannot be tiled.
- The existing lake remains central and does not need an extension.
- The current percentage-based creature placement has not been changed.
- No runtime code consumes this manifest yet.

## Next exact step

Create a summer-quality autumn extension proof consisting of:

1. A left terrain connector.
2. A right terrain connector.
3. Two alternating distant forest/mountain segments.
4. A small transparent autumn object atlas containing a tree, bush, grass cluster, flower cluster, and rock.

All terrain connectors must align to the corresponding seam and preserve the existing perspective, palette, baseline, and foreground depth. Validate the proof at 390, 1100, 1920, and 32:9 before integrating it into `LivingOverworldScene`.
