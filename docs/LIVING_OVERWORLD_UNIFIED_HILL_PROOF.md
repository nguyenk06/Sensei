# Living Overworld — Unified Hill Outcrop Proof

Status: first-pass isolated assembly ready for Product Owner visual review. No waterfall was positioned and no runtime integration occurred.

## Result

The proof uses exactly two unchanged instances of waterfall-outcrop.png:

- O1 remains horizontally mirrored.
- O2 remains in its original orientation and position.
- O1 moves 266.4 CSS pixels left from the coordinate-map arrangement.
- Both instances retain their 650 × 216.67 CSS-pixel rendered dimensions, 0.299263 source scale, and Y=85.33 elevation.
- O1-I and O2-I coincide within 0.032px.

## Evidence

- [Transparent composite](assets/screenshots/living-overworld-unified-hill-transparent.png)
- [Annotated inspection](assets/screenshots/living-overworld-unified-hill-annotated.png)
- [Before and after](assets/screenshots/living-overworld-unified-hill-before-after.png)

## Coordinates and transforms

Reference scene: 1920 × 300 CSS px, origin at the scenic viewport top-left.

| Item | Value |
|---|---|
| Shared source | public/assets/living-overworld/autumn-structural/waterfall-outcrop.png |
| Source dimensions | 2172 × 724 |
| Rendered dimensions | 650 × 216.67 |
| Scale | 650 / 2172 = 0.299263 |
| O1 previous transform | translateX(-18%) scaleX(-1) |
| O1 proof transform | translateX(calc(-18% - 266.4px)) scaleX(-1) |
| O1 equivalent percentage | approximately translateX(-58.9846%) scaleX(-1) |
| O1 final bound | (-33.4, 85.33) to (616.6, 302.0) |
| O2 transform | translateX(18%) |
| O2 fixed bound | (467.0, 85.33) to (1117.0, 302.0) |
| H-JOIN | (541.8, 130.2) |
| Calculated O1-I | (541.784, 130.218) |
| Calculated O2-I | (541.816, 130.218) |
| Join tolerance | 0.032px |

The combined formation spans approximately X=-33.4 through X=1117.0. Relative to fixed O2, the formation extends 500.4px farther left than O2's bound and does not extend farther right.

## Proposed future waterfall anchor

H-WATERFALL-SOURCE is the previously estimated O2-S supporting-ledge point:

- Scene coordinate: (607.7, 120.0).
- Source-space estimate on O2: approximately (470, 116).
- Purpose: later alignment target for the existing waterfall's W1-A upper source.

This is a visual estimate, not authored asset metadata. No waterfall asset is present in this proof.

## Visual inspection

The exact anchor alignment makes the two instances read as one connected hill and eliminates the open central gap. It also creates two visible concerns:

1. The mirrored source shapes form an unusually symmetrical central crown.
2. The overlapping central terraces create a doubled vertical/ledge seam immediately below H-JOIN.

The base remains continuous and the assets share the same elevation. There are no disconnected terrain pieces, scaling differences, crop boundaries, or newly created artwork.

If the Product Owner considers the seam too artificial, the smallest next experiment would keep O2 fixed and move O1 a few pixels vertically or horizontally away from exact anchor coincidence. That adjustment is not included because this run authorized the exact first-pass join and prohibited independent redesign.

## Verification

- Exactly two outcrop instances appear in the annotated proof.
- O1 is mirrored and O2 is not.
- Join tolerance is below 0.1px.
- Both rendered assets remain 650 × 216.67 with matching elevation.
- Only the existing outcrop source is referenced.
- Source SHA-256 remains A1AD26BF85C69DFA8D3EEAE10B7A31B14A9824B83BAD218C16BE7EC13A4C036F.
- Transparent preview corner alpha is 0 (true PNG transparency).
- H-JOIN and H-WATERFALL-SOURCE are labeled.
- No waterfall, lake, background, house, vegetation, weather, creature, or runtime files changed.
- The original PNG remains untouched.

## Continuation point

Await Product Owner review of the joined hill geometry. Do not place the waterfall or generate a permanent combined asset until separately authorized.
