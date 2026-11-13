# Living Overworld Planner First-Pass Package

Your output is a placement proposal, not production code. Do not modify source artwork, runtime files, responsive rules, weather, creatures, chores, or allowance behavior.

## Objective

Arrange existing Living Overworld assets in the `1920 × 300` desktop reference coordinate system. Return one JSON document conforming to `planner-import-schema.json`.

Use:

- `baseline-layout.json` for current instance positions and front-to-back order.
- `asset-catalog.json` for stable asset IDs, image dimensions, repository paths, and named anchors.
- `planner-first-pass-template.json` as the output starting point.
- `COORDINATE_GUIDE.md` for transform and layering rules.

## Required planner behavior

1. Preserve locked baseline scenery unless the Product Owner explicitly asks for a replacement proposal.
2. Use existing asset IDs. Do not invent file paths or embed images.
3. Put proposed instances in frontmost-first order.
4. Give important placements readable labels. IDs may be omitted for new placements; the editor creates stable IDs during import.
5. Use one uniform scale and preserve aspect ratio.
6. Use `placementAnchor` when a named anchor matters.
7. Mark speculative future-art placements as placeholders and explain them in `notes`.
8. Keep desktop coordinates authoritative. The editor generates mobile previews from the runtime-derived rules or its documented planning fallback.

## Import review

The Product Owner opens **Planner import**, chooses or pastes your JSON, selects merge or replace-unlocked mode, and clicks **Validate and preview**. Invalid assets, duplicate IDs, malformed transforms, unsupported anchors, and attempts to replace locked instances are blocked before application.

Do not return prose in place of the JSON. Short design reasoning may be placed in the top-level `plannerNotes` field.
