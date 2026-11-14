# Living Overworld assets

Living Overworld now uses one cohesive landscape illustration per season. The retired modular terrain, object-placement metadata, and editor assets are preserved in Git history but are not part of the active asset tree.

## Active foundation

- `seasons/autumn/mobile.png` — 1774 × 887 accepted autumn mobile master.
- `seasons/autumn/desktop.png` — 2172 × 724 autumn desktop crop master.
- `seasons/winter/mobile.png` — 1774 × 887 accepted winter mobile master.
- `seasons/winter/desktop.png` — 2172 × 724 winter desktop crop master.
- `moon-detailed.png` — 768 × 768 transparent moon used by the existing eight-phase mask.

Spring and summer temporarily use the autumn pair as a visible fallback so the theme remains functional without creating unapproved additional scenes.

The browser keeps celestial, lighting, cloud, rain, snow, and fog layers independent of the landscape. This allows later atmospheric work without reconstructing the background illustration.

All four active seasonal images were created specifically for Sensei with the built-in image-generation tool. They contain no text, logos, sun, moon, active weather, or creatures. Mobile and desktop are selected responsively; the transparent sky permits independent celestial and atmosphere layers.
