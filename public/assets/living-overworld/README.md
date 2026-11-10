# Living Overworld 1A assets

Original summer/day artwork created for Sensei's fixed-camera Living Overworld proof.

All raster assets use the same 2172 × 724 scene coordinates:

- `summer-master.png`: composition and visual-quality reference; not loaded by the application.
- `distant-mountains-v2.png`: transparent distant mountain layer, refined to remove foreground tree silhouettes.
- `terrain.png`: transparent shoreline, cliff, path, trees, and terrain layer.
- `water.png`: transparent connected waterfall and lake layer.
- `retreat.png`: transparent East Asian retreat and foundation layer.
- `foreground-vegetation.png`: transparent reeds, flowers, and grass tufts.

The browser supplies the sky, square sun, clouds, daylight, rain, and restrained motion with theme-scoped CSS. The original scene and every extracted layer were generated with the built-in OpenAI image-generation tool from one approved composition master. No third-party game artwork is included.

The transparent extractions intentionally preserve one coordinate system so future seasonal variants can retain the same geography. They remain production candidates: compression and small edge cleanup should be considered before a broader seasonal release.
