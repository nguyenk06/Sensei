# Asset-generation record

Mode: built-in OpenAI image-generation tool.

## Summer master prompt

> Create an original, polished Minecraft-inspired block-world summer landscape for the Sensei Living Overworld theme. Use a fixed-camera 2D side view and an ultra-wide approximately 3:1 composition. Reserve the upper 42 percent as clear blue sky. Place layered mountains primarily on the left and left-center, with a stepped waterfall visibly feeding a central lake. Position a small fantasy East Asian retreat in the right third, using dark timber, pale plaster, curved tiled roofs, a stone foundation, warm windows, and an integrated stone path. Include blocky shoreline, trees, rocks, reeds, grasses, restrained summer flowers, and an open foreground baseline. Render it as a high-quality dimensional voxel/pixel-art hybrid with crisp edges, coherent summer daylight, and no people, animals, sun, moon, weather, text, logos, watermark, floating terrain, or disconnected water.

## Layer extraction prompt set

Each extraction used `summer-master.png` as its only source image, requested a genuinely transparent background, preserved the exact 2172 × 724 canvas and original coordinates, and prohibited redrawing, relocation, restyling, enlargement, invented objects, text, watermark, borders, and alpha halos.

- `distant-mountains-v2.png`: refined extraction of the distant mountain range without duplicated pine silhouettes, preserving distant rock, snow, atmospheric foothill texture, transparency, and scene coordinates.
- `terrain.png`: retain solid near terrain, shoreline, waterfall cliff, path, rocks, rooted trees, and terrain-attached vegetation; exclude water, distant mountains, retreat, and loose foreground plants.
- `water.png`: retain only the connected waterfall streams, foam, central lake, and existing reflected highlights.
- `retreat.png`: retain only the complete retreat, its timber structure, walls, roofs, windows, lanterns, stone foundation, porch, and front steps.
- `foreground-vegetation.png`: retain only loose foreground grass, reeds, flowers, and low plant clusters.

The extracted layers were visually checked in the browser at desktop and Android viewport sizes after compositing over a CSS sky.

## Winter/night direction proof

`docs/assets/screenshots/living-overworld-1b-winter-night-proof.png` was produced with the built-in OpenAI image-generation tool by editing `summer-master.png`. The prompt preserved the exact geography, camera, landmarks, waterfall, lake, retreat, and path while changing only the season, foliage state, settled snow, night lighting, warm windows, and chimney smoke. It explicitly excluded a painted moon, active snowfall, animals, text, and new landmarks so future celestial and weather layers remain independent.
