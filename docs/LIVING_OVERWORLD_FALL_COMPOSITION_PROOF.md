# Living Overworld Fall Composition Proof

Status: **Product Owner accepted and integrated into Living Overworld.**

This package is an isolated composition proof. It does not change the Sensei runtime, theme selector, scene renderer, weather, celestial behavior, chores, allowance features, or production deployment.

## Approved brief represented by this proof

- Fall only, with a neutral daytime presentation.
- Mobile-first composition for portrait phones.
- A separate but cohesive desktop expansion of the same world.
- Softer illustrative voxel/pixel-art treatment with clear Minecraft inspiration.
- Wooded valley as the primary landmark and a small retreat house as a secondary landmark.
- Complete house, foreground, distant depth, and useful sky visible on mobile.
- Transparent header intended to overlay the upper sky.
- A centered open-sky corridor reserved for an independent sun or moon layer.
- Scenery may naturally occlude the celestial body because the celestial layer sits behind the seasonal illustration.
- Creatures, foreground effects, weather, and time-of-day variants remain deferred.

## Review images

- [Complete review sheet](assets/living-overworld-fall-proof/fall-composition-review-sheet.png)
- [Mobile clean preview](assets/living-overworld-fall-proof/fall-mobile-clean.png)
- [Mobile annotated preview](assets/living-overworld-fall-proof/fall-mobile-annotated.png)
- [Desktop clean preview](assets/living-overworld-fall-proof/fall-desktop-clean.png)
- [Desktop annotated preview](assets/living-overworld-fall-proof/fall-desktop-annotated.png)
- [Mobile transparency inspection](assets/living-overworld-fall-proof/fall-mobile-transparency.png)
- [Desktop transparency inspection](assets/living-overworld-fall-proof/fall-desktop-transparency.png)

## Transparent scene artwork

| Asset | Dimensions | Purpose | SHA-256 |
| --- | ---: | --- | --- |
| `fall-mobile-scene.png` | 1774 x 887 | Mobile design master; approximately 2:1 | `B453880EADC4B52671A6E2ED9D4946C2B981EFD180415545F35AA301F90538CE` |
| `fall-desktop-scene.png` | 2172 x 724 | Desktop expansion; approximately 3:1 | `3F62A615F762764AD219BD34CE522B6EFCD7EE4C36F3BE2C486341CA32CB980F` |

Both PNGs retain transparent sky. Sampled upper-sky pixels in the left, center, and celestial-corridor areas have alpha `0`.

## Composition relationship

The mobile artwork is the design master. The desktop artwork expands the same world laterally: framing trees move outward, the wooded valley opens, and more surrounding terrain becomes visible. Landmark order, house side, terrain language, autumn palette, and central valley direction remain consistent. The desktop version is not mirrored and does not substitute unrelated geography.

The previews use a temporary blue sky only to demonstrate the transparent seasonal layer. The blue sky is not part of either scene PNG and is not proposed as final sky artwork.

## Deferred work

No further production should proceed until the composition is accepted. After acceptance, the next bounded milestone should establish independent sky and celestial layers, then demonstrate morning, day, evening, and night treatments for this same approved fall arrangement. Weather proofs should follow, beginning with one or two representative states before expanding to the full set.

Creature and foreground layers remain deferred.

## Atmosphere extension

The accepted composition now has an isolated atmosphere proof covering four lighting periods, independent celestial artwork, six weather examples, and moving clouds. This remains a visual prototype and is not connected to the Sensei runtime.

### Review evidence

- [Complete atmosphere review sheet](assets/living-overworld-fall-proof/fall-atmosphere-review-sheet-sun-adjusted.png)
- [Four lighting treatments](assets/living-overworld-fall-proof/fall-lighting-treatments-sun-adjusted.png)
- [Six weather examples](assets/living-overworld-fall-proof/fall-weather-examples-sun-adjusted.png)
- [Dynamic cloud reference](assets/living-overworld-fall-proof/fall-dynamic-cloud-reference-sun-adjusted.png)

### Lighting approach

Day uses the accepted neutral artwork. Morning, evening, and night are separately authored relighting passes of the same mobile scene arrangement rather than uniform CSS tints. The transparent sky remains independent in every pass.

| Scene layer | Dimensions | SHA-256 |
| --- | ---: | --- |
| `fall-mobile-morning-scene.png` | 1774 x 887 | `0DF5D9A2A487125479FEA9487B4246E08BFE5510A619AD4608EC50E0595E0F31` |
| `fall-mobile-evening-scene.png` | 1774 x 887 | `C75DBF23BF4DA6C71E2B2597B8037E1384970D049660435A0F74E7BF6CA8F265` |
| `fall-mobile-night-scene.png` | 1774 x 887 | `6DF997903826F3BB5A808424CF55F499187756326B6D8B888F1A0BF0D4E30ED6` |

### Celestial and cloud layers

- `celestial-sun.png`: round, softly pixel-textured sun, 1536 x 1024.
- `celestial-moon.png`: detailed round full moon, 1536 x 1024.
- `cloud-bank.png`: transparent reusable cloud bank, 2172 x 724.

The proof order is sky, stars, celestial body, clouds, seasonal illustration, then precipitation or fog. This lets mountains, trees, and the house naturally pass in front of the sun, moon, and clouds. The cloud example uses two instances of the same artwork with different scale, opacity, direction, and duration. `prefers-reduced-motion` stops the movement while preserving a static cloud composition.

### Weather examples

The review sheet demonstrates clear, partly cloudy, cloudy, rain, light first snow, and fog. Weather remains independent of the fall artwork: snow does not imply winter terrain, and fall does not automatically imply falling leaves or precipitation.

Weather styling is deferred and is not approved production direction. In particular, the rain scale, density, and depth treatment require another pass, while the fog needs more natural terrain-aware depth and less uniform foreground coverage. These examples establish only the intended layer boundaries.

The sun was reduced after review so it remains a supporting atmospheric element: approximately 13% of scene width in morning, 17% in daytime, and 15% in evening. The detailed moon remains unchanged. Particle density, cloud speed, fog depth, and mobile performance require later tuning.

## Known limitations

- This is generated proof artwork, not a final optimized production export.
- Fine foliage and transparency edges should receive an asset-cleanup pass before runtime use.
- Actual transparent-header typography and controls are represented only by guides; no application header was changed.
- The proof establishes composition and layer compatibility, not final banner sizing or responsive CSS.

## Reproduction

Open `docs/prototypes/living-overworld-fall-composition-proof.html` for the composition proof and `docs/prototypes/living-overworld-fall-atmosphere-proof.html` for the animated atmosphere proof. Run their corresponding `capture-*.mjs` scripts from the repository root to regenerate static review evidence.
