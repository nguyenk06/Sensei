# Living Overworld assets

Original summer/day artwork created for Sensei's fixed-camera Living Overworld proof.

All raster assets use the same 2172 × 724 scene coordinates:

- `summer-master.png`: composition and visual-quality reference; not loaded by the application.
- `distant-mountains-v2.png`: transparent distant mountain layer, refined to remove foreground tree silhouettes.
- `terrain.png`: transparent shoreline, cliff, path, trees, and terrain layer.
- `water.png`: transparent connected waterfall and lake layer.
- `retreat.png`: transparent East Asian retreat and foundation layer.
- `foreground-vegetation.png`: transparent reeds, flowers, and grass tufts.
- `moon-detailed.png`: transparent 768 × 768 detailed round full-moon source used beneath the deterministic phase shadow.

The browser supplies the sky, square sun, clouds, daylight, rain, and restrained motion with theme-scoped CSS. The original scene and every extracted layer were generated with the built-in OpenAI image-generation tool from one approved composition master. No third-party game artwork is included.

Milestone 1B adds deterministic lunar phases, night lighting, aligned warm-window glow, and restrained chimney smoke. The original CSS square moon was subsequently replaced by a larger detailed circular moon asset while retaining the same eight calculated phases. The isolated winter/night direction proof is stored at `docs/assets/screenshots/living-overworld-1b-winter-night-proof.png` and remains a reference rather than a runtime asset.

The seasons milestone adds coordinate-matched runtime variants beneath `seasons/`:

- Spring reuses the mountain, water, and retreat while replacing terrain and foreground vegetation with fresh foliage and flowers.
- Summer remains the approved original five-layer composition.
- Autumn reuses the mountain, water, and retreat while replacing terrain and foreground vegetation with gold, orange, and red materials.
- Winter replaces all five layers with coordinated snow, frost, cold water, and a snow-covered retreat.

All seasonal PNGs are 2172 × 724, 32-bit RGBA, and share the original coordinates. The browser selects meteorological seasons in `America/Los_Angeles`. Morning, day, evening, and night are CSS lighting states selected from the existing Seattle-area sunrise/sunset response, with deterministic Pacific-time fallbacks when that response is unavailable. Manual selectors remain available as a visual-review tool.

These remain production candidates: lossless PNG delivery favors fidelity over transfer size, so WebP/AVIF evaluation and small alpha-edge cleanup are sensible future optimization work.
