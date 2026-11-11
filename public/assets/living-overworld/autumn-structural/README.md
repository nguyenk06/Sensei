# Living Overworld autumn structural recomposition

Status: **Autumn Scene Dressing Checkpoint D verified; Product Owner visual acceptance pending**.

These 2172 × 724 transparent PNG assets replace the combined autumn panorama with independently composed structural elements:

- `mountains.png` — complete central mountain group.
- `waterfall-outcrop.png` — complete tree-free stepped cliff.
- `water-connected.png` — three-tier waterfall and connected lake.
- `ground.png` — central structural shoreline and right-side house foundation.
- `meadow-extension.png` — low-detail outer terrain without baked landmarks.

The existing independent `retreat.png` remains the house asset. Existing autumn modular trees, plants, flowers, and rocks remain separate environmental objects.

## Generation methodology

The built-in image generation tool created each raster independently using the current Sensei autumn terrain, water, mountain, house, or newly generated structural asset as a style and alignment reference. Prompts required a fixed side view, dimensional voxel/pixel-hybrid materials, complete silhouettes, transparent backgrounds, and no text or watermarks.

The outcrop prompt explicitly excluded water and recognizable vegetation. The water prompt used the new outcrop as its alignment reference and required one connected waterfall/lake system. The structural ground and meadow prompts excluded replaceable environmental objects.

## Responsive proof

The isolated proof is `docs/prototypes/living-overworld-autumn-structural.html`. It uses one coordinate relationship with bounded size changes:

- Mobile: 170px scene, 420px composition width.
- Desktop: 300px scene, central landmarks capped near 1100px.
- Ultrawide: 300px scene, complete outer meadow and distinct distant groups extend the world without stretching the central landmarks.

No blur, edge mask, or clipped panorama conceals structural joins.

## Runtime integration

Autumn now renders these independent structural objects instead of the old combined autumn terrain. Seasonal crossfades omit the baked autumn layers and fade this structural scene as one bounded composition. Spring, summer, and winter keep their existing assets.

Existing weather, celestial, creature, environmental-object, reduced-motion, and page-visibility behavior remains outside and above the structural layer. Decorative asset failures remain isolated, while the rest of the scene and application continue rendering.

The current dressing pass shifts the central mountain group left, uses distinct outer mountain variants, creates a natural centered celestial saddle, and connects the waterfall's sharp left edge with one scaled structural outcrop tile. Nine stable environmental-object placements add restrained terrain detail while preserving creature corridors and landmark visibility.

