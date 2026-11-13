# Living Overworld Layout Editor V1

This is an isolated, local-only planning utility. It is not linked from Sensei and is not included in production navigation.

## Launch

On Windows, double-click `start-living-overworld-editor.bat` in the repository root. Keep its terminal window open while using the editor; press `Ctrl+C` there when finished.

Alternatively, run from the repository root:

```powershell
pnpm editor
```

Open `http://127.0.0.1:4174/tools/living-overworld-editor/`. The command binds Vite to loopback only.

## Coordinate and layer model

- The desktop workspace is `1920 × 300` reference pixels.
- Instance `x` and `y` identify the selected placement anchor in that coordinate system.
- Scale is uniform. Rotation is clockwise in degrees around the placement anchor. Flips also occur around it.
- The layer list is frontmost-first and is the single source of stacking order.
- Existing scene instances begin locked. Unlock one explicitly before editing it.
- `living-overworld-hill.png` exposes `H-WATERFALL-SOURCE` at native pixel `[2142, 116]`.

The baseline reproduces the current autumn runtime composition rather than integrating the finalized hill. The current runtime source combines the lake and waterfall in `water-connected.png`, and the path is embedded in `ground.png`; the editor represents those source boundaries honestly.

## Responsive preview

Imported runtime instances carry the current renderer's layer-specific mobile rules: the 170px scene height, 108% world width at `-4%`, central mountain, water-system, ground, house, environmental-object, and hidden-peripheral overrides. The yellow desktop overlay shows the mobile-visible world range.

New planning instances do not yet have runtime CSS overrides. They use a documented proportional desktop-to-mobile fallback so one desktop placement immediately appears in all three previews. KEYSTONE should assign a final runtime rule during a later authorized integration pass.

## Save and export

- Autosave stores the editable draft in this browser's local storage. A saved draft is offered for restoration rather than silently replacing the repository baseline.
- **Save draft** downloads the complete editable state.
- **Load draft** validates schema version, instance IDs, assets, and transforms before loading.
- **Export layout** downloads the versioned state plus the definitions of referenced assets.
- Images remain external repository paths and are never embedded in JSON.

The JSON contract is documented in `layout-schema.json`; `default-layout.json` is a complete example.

## Planner starter package and import mode

Click **Starter package** to download `planner-starter/living-overworld-planner-starter-v1.zip`. It contains:

- A planner-specific brief and coordinate guide.
- The current locked baseline layout.
- The complete stable asset catalog and named anchors.
- A first-pass template and import schema.

The planner returns a `sensei-living-overworld-planner-import` JSON file. Open **Planner import**, choose or paste that file, then select one of two bounded behaviors:

- **Replace unlocked planning instances** keeps all locked baseline scenery and replaces only previous planning additions.
- **Merge into current draft** updates matching unlocked IDs and places new planner objects frontmost.

Validation happens before mutation. Malformed JSON, unsupported schema versions, missing assets, duplicate IDs, bad transforms, invalid anchors, and attempts to overwrite locked baseline elements are blocked. A summary and warnings must be reviewed before **Apply reviewed import** is enabled. The applied import retains the planner's original per-instance data for traceability and remains undoable.

## Known V1 boundaries

- No snapping, multi-selection, animation, weather editing, or seasonal variant management.
- Undo/redo covers editor mutations in the current tab; local storage supplies cross-session recovery.
- Rotation and flip rendering are exact in the editor. Runtime integration remains a separate Product Owner gate.
- Asset replacement preserves the instance ID and placement point, and warns when source dimensions differ materially; visual review is still required.
