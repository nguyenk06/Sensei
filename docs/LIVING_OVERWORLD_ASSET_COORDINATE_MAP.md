# Living Overworld — Asset Coordinate and Anchor Map

Status: diagnostic reference only. No composition or runtime placement was changed.

## Primary evidence

[Annotated coordinate sheet](assets/screenshots/living-overworld-asset-coordinate-anchor-map.png)

The sheet uses a 1920 × 300 CSS-pixel reference scene with (0,0) at the scenic viewport's top-left. X increases rightward and Y increases downward. Grid spacing is 100px horizontally and 50px vertically.

## Important current-state distinction

The current autumn composition proof contains exactly two outcrop instances and one complete water-connected.png instance. It has no independent lake layer.

L1 therefore shows the existing base Sensei lake asset, public/assets/living-overworld/water.png, using the base runtime layer's desktop rendering rules. It is reference-only: the autumn renderer suppresses the ordinary seasonal water layer while the modular autumn structure is active. Adding L1 to the proof would create the extra water plane that the Product Owner explicitly prohibited.

## Coordinate implementation

Reference scene:

- Scene: 1920 × 300 CSS px.
- Shared waterfall parent: top-left (350, 85.33), size 650 × 216.67.
- Source assets: 2172 × 724 px.
- Shared source-to-CSS scale: 650 / 2172 = 0.299263.
- Parent placement: left: calc(50% - 610px); bottom: -2px.
- Image transform origin: 50% 50%.
- O1: translateX(-18%) scaleX(-1), internal z-index 1.
- O2: translateX(18%), internal z-index 1.
- W1: translate(42%, 5%), internal z-index 2.
- Parent stacking: waterfall-system z-index 6.
- Foreground ground: z-index 7, naturally concealing water below or behind the shoreline.

For a source anchor (sx, sy):

    scale = 650 / 2172

    O1.x = 233 + (2172 - sx) × scale
    O1.y = 85.333 + sy × scale

    O2.x = 467 + sx × scale
    O2.y = 85.333 + sy × scale

    W1.x = 623 + sx × scale
    W1.y = 96.167 + sy × scale

The mirrored O1 formula reverses source X before scaling. A requested scene-space move such as “move O1 left 40” changes its translate offset from -18% to approximately -24.154%, because 40 / 650 × 100 = 6.154.

## Bounds and placement

| ID | Asset | Top-left | Size | Scale | Mirrored | Depth | Current placement anchor |
|---|---|---:|---:|---:|---|---:|---|
| O1 | waterfall-outcrop.png | (233.0, 85.3) | 650 × 216.7 | 0.299263 | Yes | z1 inside z6 | Shared frame plus -18% X |
| O2 | waterfall-outcrop.png | (467.0, 85.3) | 650 × 216.7 | 0.299263 | No | z1 inside z6 | Shared frame plus +18% X |
| W1 | water-connected.png | (623.0, 96.2) | 650 × 216.7 | 0.299263 | No | z2 inside z6 | Shared frame plus +42% X, +5% Y |
| L1 | water.png | (0.0, 0.0) element | 1920 × 300 element | 0.883978 content | No | base z6 | Full-scene object-fit: cover, center 58% |

For L1, the 2172 × 724 source is proportionally scaled to 1920 × 640 and vertically cropped inside its 1920 × 300 element. Its content offset is approximately (0, -197.2).

## Anchor table

Solid-circle anchors in the sheet are measured CSS geometry. Diamond anchors prefixed ~ are visually estimated points on the artwork, transformed into exact scene coordinates. The images contain no authored anchor metadata, so those landmark selections must not be treated as implementation facts.

| ID | Asset | Anchor | X | Y | Basis |
|---|---|---|---:|---:|---|
| O1-B0 | O1 | Top-left bound | 233.0 | 85.3 | Measured |
| O1-B1 | O1 | Bottom-right bound | 883.0 | 302.0 | Measured |
| O1-T | O1 | Transformed center/origin | 558.0 | 193.7 | Measured |
| ~O1-A | O1 | Uppermost plateau | 756.1 | 111.7 | Visual estimate |
| ~O1-S | O1 | Waterfall-supporting ledge | 742.3 | 120.0 | Visual estimate |
| ~O1-I | O1 | Inner joining edge | 808.2 | 130.2 | Visual estimate |
| ~O1-G | O1 | Ground/base contact | 703.4 | 276.9 | Visual estimate |
| ~O1-L | O1 | Lake-facing rock boundary | 835.1 | 241.0 | Visual estimate |
| O2-B0 | O2 | Top-left bound | 467.0 | 85.3 | Measured |
| O2-B1 | O2 | Bottom-right bound | 1117.0 | 302.0 | Measured |
| O2-T | O2 | Transformed center/origin | 792.0 | 193.7 | Measured |
| ~O2-A | O2 | Uppermost plateau | 593.9 | 111.7 | Visual estimate |
| ~O2-S | O2 | Waterfall-supporting ledge | 607.7 | 120.0 | Visual estimate |
| ~O2-I | O2 | Inner joining edge | 541.8 | 130.2 | Visual estimate |
| ~O2-G | O2 | Ground/base contact | 646.6 | 276.9 | Visual estimate |
| ~O2-L | O2 | Lake-facing rock boundary | 960.8 | 255.9 | Visual estimate |
| W1-B0 | W1 | Top-left bound | 623.0 | 96.2 | Measured |
| W1-B1 | W1 | Bottom-right bound | 1273.0 | 312.8 | Measured |
| W1-T | W1 | Transformed center/origin | 948.0 | 204.5 | Measured |
| ~W1-A | W1 | Upper stream/source | 672.4 | 135.7 | Visual estimate |
| ~W1-B | W1 | First drop | 703.8 | 151.5 | Visual estimate |
| ~W1-C | W1 | First receiving terrace | 724.7 | 171.6 | Visual estimate |
| ~W1-D | W1 | Second drop | 745.7 | 191.9 | Visual estimate |
| ~W1-E | W1 | Second receiving terrace | 772.6 | 211.4 | Visual estimate |
| ~W1-F | W1 | Final drop | 790.6 | 236.8 | Visual estimate |
| ~W1-G | W1 | Final splash/landing | 817.5 | 265.3 | Visual estimate |
| ~W1-H | W1 | Water tail toward lake | 1146.7 | 272.7 | Visual estimate |
| L1-B0 | L1 | Element top-left bound | 0.0 | 0.0 | Measured |
| L1-B1 | L1 | Element bottom-right bound | 1920.0 | 300.0 | Measured |
| L1-T | L1 | Element transform origin | 960.0 | 150.0 | Measured |
| ~L1-A | L1 | Existing lake left shoreline | 212.2 | 244.8 | Visual estimate |
| ~L1-B | L1 | Water surface elevation | 795.6 | 244.8 | Visual estimate |
| ~L1-C | L1 | Intended waterfall entry | 459.7 | 293.4 | Visual estimate |
| ~L1-D | L1 | Protected open-water region | 990.1 | 284.6 | Visual estimate |
| ~L1-E | L1 | Foreground shoreline overlap | 1281.8 | 306.7 | Visual estimate |

## Responsive transformations

The proof uses three placement regimes:

| Viewport | Scene | Shared frame | Parent top-left | Scale |
|---|---:|---:|---:|---:|
| ≤700px | 390 × 175 reference | 330 × 110 | (0, 63) | 0.151934 |
| 701–1300px | width × 300 | 650 × 216.7 | (0, 85.3) | 0.299263 |
| >1300px | width × 300 | 650 × 216.7 | (50%-610, 85.3) | 0.299263 |

The same -18%, +18%, +42%, and +5% child transforms apply in all regimes. At the 390px reference width, their resulting bounds are approximately:

- O1: (-59.4, 63.0) to (270.6, 173.0).
- O2: (59.4, 63.0) to (389.4, 173.0).
- W1: (138.6, 68.5) to (468.6, 178.5).

The scene clips pixels outside its viewport; the underlying assets are not cropped or edited.

## Relevant files

- Prototype placement: docs/prototypes/living-overworld-autumn-rich.html
- Diagnostic sheet source: docs/prototypes/living-overworld-asset-coordinate-map.html
- Diagnostic capture/validation: docs/prototypes/capture-asset-coordinate-map.mjs
- Annotated PNG: docs/assets/screenshots/living-overworld-asset-coordinate-anchor-map.png
- Runtime autumn structure: src/client/LivingOverworldScene.tsx
- Runtime layer and responsive rules: src/client/styles.css
- Structural metadata: public/assets/living-overworld/autumn-modular/world.json

## Validation

- Four instances are represented: O1, O2, W1, and reference-only L1.
- All four source images load at 2172 × 724.
- O1 mirroring and all three current prototype transforms are reproduced without repositioning.
- Measured bounds match the current 1920px prototype.
- The grid, table, and marker calculations share one coordinate convention.
- Runtime facts and visually estimated artwork anchors are explicitly distinguished.
- No production source, artwork, composition, or runtime behavior was changed.
