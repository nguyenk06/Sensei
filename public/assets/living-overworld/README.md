# Living Overworld assets

Living Overworld now uses one cohesive landscape illustration per season. The retired modular terrain, object-placement metadata, and editor assets are preserved in Git history but are not part of the active asset tree.

## Active foundation

- `seasons/autumn/mobile.png` — 1774 × 887 accepted pushed-back autumn mobile master.
- `seasons/autumn/desktop.png` — 2172 × 724 accepted pushed-back autumn desktop master.
- `seasons/autumn/night-mobile.png` — 1774 × 887 matching authored autumn-night mobile master with transparent sky.
- `seasons/autumn/night-desktop.png` — 2172 × 724 matching authored autumn-night desktop master with transparent sky.
- `seasons/winter/mobile.png` — 1774 × 887 accepted winter mobile master.
- `seasons/winter/desktop.png` — 2172 × 724 winter desktop crop master.
- `seasons/winter/night-mobile.png` — 1774 × 887 authored blue winter-night mobile master with transparent sky.
- `seasons/winter/night-desktop.png` — 2172 × 724 authored blue winter-night desktop master with transparent sky.
- `seasons/spring/mobile.png` — 1774 × 887 mobile-first flowering-valley master.
- `seasons/spring/desktop.png` — 2172 × 724 laterally expanded spring desktop master.
- `seasons/spring/night-mobile.png` and `night-desktop.png` — matched luminous spring-night treatments.
- `seasons/summer/mobile.png` — 1774 × 887 mobile-first tropical karst master.
- `seasons/summer/desktop.png` — 2172 × 724 laterally expanded summer desktop master.
- `seasons/summer/night-mobile.png` and `night-desktop.png` — matched luminous tropical-night treatments.
- `moon-detailed.png` — 768 × 768 transparent moon used by the existing eight-phase mask.

All four seasons now have independent responsive day and night artwork. Each responsive pair preserves a transparent central sky corridor so the shared celestial and atmosphere layers remain independent.

The browser keeps celestial, lighting, cloud, rain, snow, and fog layers independent of the landscape. This allows later atmospheric work without reconstructing the background illustration.

All active seasonal images were created specifically for Sensei with the built-in image-generation tool. They contain no text, logos, sun, moon, active weather, or creatures. Mobile and desktop are selected responsively; the transparent sky permits independent celestial and atmosphere layers.
