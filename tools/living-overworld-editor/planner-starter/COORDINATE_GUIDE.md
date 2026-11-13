# Coordinate Guide

- Reference canvas: `1920 × 300` CSS pixels.
- Origin: top-left. X increases rightward; Y increases downward.
- Instance X/Y: the world position of `placementAnchor`.
- Scale: uniform multiplier; values must be greater than zero.
- Rotation: clockwise degrees around the placement anchor.
- `flipX` and `flipY`: mirror around the placement anchor.
- Instance list order: frontmost first.
- New instances normally remain unlocked.

## Important named anchors

- Unified hill: `H-WATERFALL-SOURCE` = `[2142, 116]` in its native `3844 × 724` image.
- Unified hill default placement anchor: `bottom-center` = `[1922, 724]`.
- Connected water: `W-UPPER-SOURCE` and `W-FINAL-SPLASH` are listed in `asset-catalog.json`.

Named anchor coordinates are transformed by scale, rotation, and flips. Do not pre-transform native anchor coordinates in planner JSON; choose the anchor name and provide its desired world X/Y position.

## Mobile preview boundary

Current runtime autumn rendering uses a 170px scenic height on narrow screens, a world width of 108%, and a left offset of -4%. Existing runtime instances retain their exact layer-specific mobile overrides. New planner instances use the editor's proportional planning fallback until runtime integration is separately authorized.
