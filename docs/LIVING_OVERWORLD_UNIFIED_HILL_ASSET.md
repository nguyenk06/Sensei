# Living Overworld — Final Unified Hill Asset

Status: Product Owner-approved geometry finalized as a permanent transparent asset. Runtime integration and waterfall alignment remain unauthorized.

## Asset

- Path: public/assets/living-overworld/autumn-structural/living-overworld-hill.png
- Dimensions: 3844 × 724 px
- Encoding: lossless PNG with alpha
- File size: 2,068,922 bytes
- SHA-256: 73AE44184AC5AF2A320A0EE5E22F509F12480F075E4026DEF39CFBC50797E572
- Metadata: public/assets/living-overworld/autumn-structural/living-overworld-hill.json

## Construction

The asset contains two unchanged 2172 × 724 instances of waterfall-outcrop.png:

| Instance | Pixel position | Orientation |
|---|---:|---|
| O1 | (0,0) | Horizontally mirrored |
| O2 | (1672,0) | Original |

The 3844px canvas is the exact union of those instances. No transparent border was added, and no visible terrain was cropped. O1 and O2 are combined with standard source-over alpha compositing at integer coordinates.

Original source SHA-256: A1AD26BF85C69DFA8D3EEAE10B7A31B14A9824B83BAD218C16BE7EC13A4C036F.

## Stable anchor

Coordinate origin is the final PNG's top-left. X increases rightward and Y downward.

| Anchor | Pixel | Normalized | Purpose |
|---|---:|---:|---|
| H-WATERFALL-SOURCE | (2142,116) | (0.5572320499, 0.1602209945) | Future upper-source alignment for water-connected.png |
| H-JOIN | (1922,150) | (0.5, 0.2071823204) | Construction traceability only |

For any rendered hill rectangle:

    waterfallX = renderedLeft + renderedWidth × 0.5572320499
    waterfallY = renderedTop + renderedHeight × 0.1602209945

No generalized anchor framework was introduced.

## Approved-proof transformation

The proof rendered each source at 650 × 216.67 CSS px, a source scale of 650 / 2172 = 0.2992633517.

The final integer source composition maps back to the 1920 × 300 approved scene as:

    sceneX = -33.4 + assetX × 0.2992633517
    sceneY = 85.3333 + assetY × 0.2992633517

Converting the proof's rounded 266.4px O1 translation to source pixels produces an ideal offset near 1672px. The permanent asset uses exactly 1672px, making H-JOIN exact in source pixels. This places O2 only 0.0304 CSS px left of the rounded proof bound, below a single rendered subpixel and visually equivalent.

## Verification evidence

- [Neutral preview](assets/screenshots/living-overworld-hill-final-neutral.png)
- [Annotated anchor preview](assets/screenshots/living-overworld-hill-final-annotated.png)
- [Approved proof comparison](assets/screenshots/living-overworld-hill-final-comparison.png)

Automated verification:

- Final decoded dimensions are 3844 × 724.
- Reconstructed expected composition versus decoded final PNG: 0 mismatched RGBA channels.
- Maximum channel delta: 0.
- Corner alpha: 0.
- H-WATERFALL-SOURCE annotation maps to the documented pixel coordinate.
- Both original source instances retain native resolution.
- Original waterfall-outcrop.png hash remains unchanged.

## Deferred

- Runtime scene integration.
- Waterfall alignment against H-WATERFALL-SOURCE.
- Trees, vegetation, and rock dressing intended to soften the accepted symmetry.
- Lake and shoreline work.

The finalized geometry is the approved baseline for those future tasks.
