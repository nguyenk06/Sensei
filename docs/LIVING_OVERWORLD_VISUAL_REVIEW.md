# Living Overworld visual review

Review target: `feature/living-overworld-seasons`  
Review status: **Pending Product Owner visual acceptance**  
Evidence source: isolated browser QA with synthetic household data; no production database was accessed.

This page presents the current Living Overworld development branch for visual review. It is not evidence of a merge, household deployment, or production acceptance.

## Seasonal and responsive composition

### Summer · Day

| Desktop · 1100 px viewport | Mobile · 390 px viewport |
| --- | --- |
| ![Living Overworld summer day at desktop width](assets/screenshots/living-overworld-seasons-summer-day.png) | ![Living Overworld summer day at 390 pixel mobile width](assets/screenshots/living-overworld-review-summer-day-mobile.png) |

The approved summer terrain remains the composition anchor: waterfall and mountains on the left, connected lake through the center, and the retreat in the right third. Mobile crops the shared 3:1 scene rather than distorting it. The square sun is intentionally retained; celestial redesign in this branch applies only to the moon.

### Spring · Day

| Desktop · 1100 px viewport | Mobile · 390 px viewport |
| --- | --- |
| ![Living Overworld spring day at desktop width](assets/screenshots/living-overworld-review-spring-day-desktop.png) | ![Living Overworld spring day at 390 pixel mobile width](assets/screenshots/living-overworld-review-spring-day-mobile.png) |

Spring changes the terrain and foreground vegetation while keeping the mountain, water, retreat, camera, and landmark coordinates stable. Flower density is deliberately strongest near the foreground and right-side flowering tree.

### Autumn · Evening

| Desktop · 1100 px viewport | Mobile · 390 px viewport |
| --- | --- |
| ![Living Overworld autumn evening at desktop width](assets/screenshots/living-overworld-seasons-autumn-evening.png) | ![Living Overworld autumn evening at 390 pixel mobile width](assets/screenshots/living-overworld-review-autumn-evening-mobile.png) |

Autumn introduces warm foliage and ground materials. Evening is a discrete lighting period with a warm sky, lower sun, darker terrain treatment, early window glow, and chimney smoke—not a continuously animated solar traversal.

### Winter · Night

| Desktop · 1100 px viewport | Mobile · 390 px viewport |
| --- | --- |
| ![Living Overworld winter night at desktop width](assets/screenshots/living-overworld-seasons-winter-night.png) | ![Living Overworld winter night at 390 pixel mobile width](assets/screenshots/living-overworld-seasons-winter-night-mobile.png) |

Winter has coordinated snow-aware mountain, terrain, water, retreat, and vegetation layers. The screenshots show the detailed circular moon under automatic and first-quarter phase treatments; the application calculates eight deterministic phases.

## Environmental proofs

### Detailed moon · Full phase

![Living Overworld full detailed round moon at desktop width](assets/screenshots/living-overworld-review-full-moon-desktop.png)

The moon is a transparent 768 × 768 raster asset rendered at 104–148 CSS pixels on desktop and 84 pixels on mobile. CSS supplies its glow and phase shadow. This capture forces the full phase only for review; automatic mode uses the calculated phase.

### Controlled rain · Summer day

![Living Overworld controlled rain proof at desktop width](assets/screenshots/living-overworld-review-rain-desktop.png)

Rain currently proves that weather can render above independent scenery layers and stop with reduced motion. It is a controlled scene state, not a completed Living Overworld weather product.

## Implemented on this branch

- A separate device-local `Living Overworld` theme; NovaPay, Classic, and the existing Overworld theme remain intact.
- One fixed-camera, layered geography with independently composited mountain, terrain, water, retreat, vegetation, celestial, lighting, cloud, rain, glow, and smoke elements.
- Runtime spring, summer, autumn, and winter scenery in shared 2172 × 724 coordinates.
- Meteorological season selection in `America/Los_Angeles`.
- Morning, day, evening, and night periods using the existing Seattle-area sunrise/sunset response, with deterministic Pacific-time fallbacks.
- A detailed round moon with eight deterministic phases.
- Manual season, light, weather, and moon selectors for visual review.
- Motion preference, `prefers-reduced-motion`, hidden-page suspension, responsive desktop/mobile composition, and no horizontal overflow.

## Incomplete or intentionally bounded

- Living Overworld weather is limited to clear and rain proof states. Snowfall, fog, wind response, wet surfaces, accumulation, and weather-driven environmental behavior are not implemented.
- Seasons switch discretely; crossfades and adjacent-season preloading are not implemented.
- Lighting uses four periods rather than a continuously moving sun or moon.
- The new theme has no creatures or creature movement zones.
- Runtime seasonal PNGs total roughly 8 MB. WebP/AVIF evaluation and alpha-edge cleanup remain future optimization work.
- The review controls are development-facing and remain visible in these captures.
- The screenshots use synthetic chores and allowance values and do not represent household records.

## Review decision requested

Please evaluate:

1. Whether the shared composition, landmark placement, and crop work across desktop and mobile.
2. Whether each season is visually distinct while remaining recognizably the same place.
3. Whether morning/day/evening/night lighting and the new round moon fit the intended atmosphere.
4. Whether the theme is ready for a separately authorized weather-polish milestone.

No acceptance, merge, release, or deployment is implied by this page.
