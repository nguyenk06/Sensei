const STORAGE_KEY = "sensei-living-overworld-layout-editor-v1";
const SCHEMA_VERSION = 1;
const $ = (id) => document.getElementById(id);

const [manifestResponse, layoutResponse] = await Promise.all([
  fetch("./asset-manifest.json"),
  fetch("./default-layout.json"),
]);
if (!manifestResponse.ok || !layoutResponse.ok) throw new Error("Unable to load editor data.");

const manifest = await manifestResponse.json();
const baseline = await layoutResponse.json();
const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
let state = structuredClone(baseline);
let selectedId = null;
let history = [];
let future = [];
let drag = null;
let autosaveTimer = null;
let pendingPlannerImport = null;

function clone(value) { return structuredClone(value); }
function selected() { return state.instances.find((item) => item.id === selectedId) || null; }
function assetFor(instance) { return assets.get(instance.assetId); }
function anchorPoint(asset, name) {
  return asset?.anchors?.[name] || asset?.anchors?.center || [asset.width / 2, asset.height / 2];
}
function fmt(value) { return Number(value.toFixed(2)); }
function message(text, kind = "info") {
  $("message").textContent = text;
  $("message").dataset.kind = kind;
}
function snapshot() { return JSON.stringify(state); }
function commit(mutator, text = "Layout updated") {
  history.push(snapshot());
  if (history.length > 100) history.shift();
  future = [];
  mutator();
  scheduleAutosave();
  render();
  message(text);
}
function undo() {
  if (!history.length) return;
  future.push(snapshot());
  state = JSON.parse(history.pop());
  if (selectedId && !selected()) selectedId = null;
  scheduleAutosave(); render(); message("Undid last change");
}
function redo() {
  if (!future.length) return;
  history.push(snapshot());
  state = JSON.parse(future.pop());
  if (selectedId && !selected()) selectedId = null;
  scheduleAutosave(); render(); message("Redid change");
}

function validateLayout(input) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== "object") return { errors: ["Layout must be a JSON object."], warnings };
  if (input.schemaVersion !== SCHEMA_VERSION) errors.push(`Unsupported schema version: ${input.schemaVersion}.`);
  if (!input.referenceCanvas || input.referenceCanvas.width !== 1920 || input.referenceCanvas.height !== 300) {
    errors.push("Reference canvas must be 1920 × 300.");
  }
  if (!Array.isArray(input.instances)) errors.push("Instances must be an array.");
  else {
    const ids = new Set();
    for (const instance of input.instances) {
      if (!instance.id || ids.has(instance.id)) errors.push(`Missing or duplicate instance ID: ${instance.id || "(blank)"}.`);
      ids.add(instance.id);
      if (!assets.has(instance.assetId)) errors.push(`Missing asset: ${instance.assetId} (${instance.id}).`);
      for (const key of ["x", "y", "scale", "rotation"]) {
        if (!Number.isFinite(Number(instance[key]))) errors.push(`${instance.id}.${key} must be numeric.`);
      }
      if (instance.scale <= 0) errors.push(`${instance.id}.scale must be greater than zero.`);
      if (!assetFor(instance)?.anchors?.[instance.anchor]) warnings.push(`${instance.id} uses unknown anchor ${instance.anchor}; center will be used.`);
    }
  }
  const known = new Set(["schemaVersion", "manifestVersion", "layoutName", "referenceCanvas", "nextInstanceNumber", "settings", "instances", "assets", "exportedAt", "plannerImport"]);
  const extra = Object.keys(input).filter((key) => !known.has(key));
  if (extra.length) warnings.push(`Preserved unknown top-level fields: ${extra.join(", ")}.`);
  return { errors, warnings };
}

function normalizeLayout(input) {
  const next = clone(input);
  next.layoutName ||= "Untitled Living Overworld layout";
  next.manifestVersion ||= manifest.schemaVersion;
  next.nextInstanceNumber ||= 1;
  next.settings = { showGrid: true, showAnchors: true, showMobileBoundary: true, zoom: 0.65, mobileWidth: 390, ...(next.settings || {}) };
  next.instances = next.instances.map((instance) => ({
    label: instance.id,
    anchor: "center",
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
    placeholder: false,
    notes: "",
    ...instance,
  }));
  return next;
}

function previewPlannerImport(input, strategy = "replace-editable") {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== "object") return { valid: false, errors: ["Import must be a JSON object."], warnings, added: 0, updated: 0 };
  if (input.format !== "sensei-living-overworld-planner-import") errors.push("format must be sensei-living-overworld-planner-import.");
  if (input.schemaVersion !== 1) errors.push(`Unsupported planner import schema: ${input.schemaVersion}.`);
  if (input.referenceCanvas?.width !== 1920 || input.referenceCanvas?.height !== 300) errors.push("referenceCanvas must be 1920 × 300.");
  if (!Array.isArray(input.instances)) errors.push("instances must be an array.");
  if (!["replace-editable", "merge"].includes(strategy)) errors.push(`Unsupported import strategy: ${strategy}.`);
  const ids = new Set();
  let added = 0;
  let updated = 0;
  for (const [index, item] of (Array.isArray(input.instances) ? input.instances : []).entries()) {
    const name = item.id || `item ${index + 1}`;
    if (!item.assetId || !assets.has(item.assetId)) errors.push(`${name}: unknown assetId ${item.assetId || "(missing)"}.`);
    if (item.x === undefined || item.y === undefined) errors.push(`${name}: x and y are required.`);
    if (item.id) {
      if (ids.has(item.id)) errors.push(`${item.id}: duplicate ID in import.`);
      ids.add(item.id);
      const existing = state.instances.find((instance) => instance.id === item.id);
      if (existing?.locked) errors.push(`${item.id}: cannot replace a locked baseline instance.`);
      if (existing) updated += 1; else added += 1;
    } else added += 1;
    for (const key of ["x", "y", "scale", "rotation"]) {
      if (item[key] !== undefined && !Number.isFinite(Number(item[key]))) errors.push(`${name}.${key} must be numeric.`);
    }
    if (item.scale !== undefined && Number(item.scale) <= 0) errors.push(`${name}.scale must be greater than zero.`);
    const asset = assets.get(item.assetId);
    const requestedAnchor = item.placementAnchor || item.anchor;
    if (asset && requestedAnchor && !asset.anchors?.[requestedAnchor]) errors.push(`${name}: asset ${item.assetId} has no anchor named ${requestedAnchor}.`);
    const supported = new Set(["id", "assetId", "displayLabel", "label", "x", "y", "placementAnchor", "anchor", "scale", "rotation", "flipX", "flipY", "visible", "locked", "placeholder", "notes"]);
    const extra = Object.keys(item).filter((key) => !supported.has(key));
    if (extra.length) warnings.push(`${name}: unsupported fields will be retained in plannerSource only: ${extra.join(", ")}.`);
  }
  if (strategy === "replace-editable") warnings.push(`${state.instances.filter((item) => !item.locked).length} current unlocked planning instance(s) will be replaced; locked baseline scenery remains.`);
  else warnings.push("Imported instances will be placed frontmost; matching unlocked IDs will be updated.");
  return { valid: errors.length === 0, errors, warnings, added, updated, total: input.instances?.length || 0, strategy };
}

function plannerInstance(item, resolvedId) {
  const asset = assets.get(item.assetId);
  const anchor = item.placementAnchor || item.anchor || (asset.anchors?.["bottom-center"] ? "bottom-center" : "center");
  return {
    id: resolvedId,
    assetId: item.assetId,
    label: item.displayLabel || item.label || asset.label,
    x: Number(item.x ?? 960), y: Number(item.y ?? 150), anchor,
    scale: Number(item.scale ?? Math.min(1, 220 / asset.width)), rotation: Number(item.rotation ?? 0),
    flipX: Boolean(item.flipX), flipY: Boolean(item.flipY), visible: item.visible !== false,
    locked: Boolean(item.locked), placeholder: Boolean(item.placeholder), notes: String(item.notes || ""),
    mobileRule: { type: "planning-fallback" }, plannerSource: clone(item),
  };
}

function applyPlannerImport(input, strategy = "replace-editable") {
  const report = previewPlannerImport(input, strategy);
  if (!report.valid) throw new Error(report.errors.join("\n"));
  commit(() => {
    const reservedIds = new Set(input.instances.flatMap((item) => item.id ? [item.id] : []));
    const imported = input.instances.map((item) => {
      let resolvedId = item.id;
      if (!resolvedId) {
        do { resolvedId = nextId(); } while (reservedIds.has(resolvedId));
        reservedIds.add(resolvedId);
      }
      return plannerInstance(item, resolvedId);
    });
    const importedIds = new Set(imported.map((item) => item.id));
    const preserved = strategy === "replace-editable"
      ? state.instances.filter((item) => item.locked)
      : state.instances.filter((item) => !importedIds.has(item.id));
    state.instances = [...imported, ...preserved];
    state.layoutName = input.layoutName || state.layoutName;
    state.plannerImport = { format: input.format, schemaVersion: input.schemaVersion, plannerNotes: input.plannerNotes || "", importedAt: new Date().toISOString(), strategy };
    selectedId = imported[0]?.id || null;
  }, `Planner import applied: ${report.added} added, ${report.updated} updated`);
  return report;
}

function loadLayout(input, source = "JSON") {
  const result = validateLayout(input);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  history.push(snapshot()); future = [];
  state = normalizeLayout(input);
  selectedId = null;
  scheduleAutosave(); render();
  message(`${source} loaded.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`, result.warnings.length ? "warning" : "info");
  return result;
}

function nextId() {
  let id;
  do { id = `inst-${String(state.nextInstanceNumber++).padStart(4, "0")}`; } while (state.instances.some((item) => item.id === id));
  return id;
}
function addAsset(assetId, options = {}) {
  const asset = assets.get(assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  const id = nextId();
  const count = state.instances.filter((item) => item.assetId === assetId).length + 1;
  const instance = {
    id, assetId, label: `${asset.label} ${count}`, x: 960, y: 150,
    anchor: asset.anchors?.["bottom-center"] ? "bottom-center" : "center",
    scale: Math.min(1, 220 / asset.width), rotation: 0, flipX: false, flipY: false,
    visible: true, locked: false, placeholder: false, notes: "",
    mobileRule: { type: "planning-fallback" }, ...options, id,
  };
  state.instances.unshift(instance); selectedId = id; return instance;
}

function transformPoint(instance, point) {
  const asset = assetFor(instance);
  const origin = anchorPoint(asset, instance.anchor);
  let dx = (point[0] - origin[0]) * instance.scale * (instance.flipX ? -1 : 1);
  let dy = (point[1] - origin[1]) * instance.scale * (instance.flipY ? -1 : 1);
  const radians = instance.rotation * Math.PI / 180;
  return [fmt(instance.x + dx * Math.cos(radians) - dy * Math.sin(radians)), fmt(instance.y + dx * Math.sin(radians) + dy * Math.cos(radians))];
}
function worldAnchor(instance, name) {
  const asset = assetFor(instance);
  if (!asset?.anchors?.[name]) return null;
  return transformPoint(instance, asset.anchors[name]);
}

function mobileTransform(instance, viewportWidth = state.settings.mobileWidth) {
  const rule = instance.mobileRule || { type: "planning-fallback" };
  if (rule.type === "hidden") return { hidden: true };
  const mobileHeight = 170;
  const worldLeft = -0.04 * viewportWidth;
  const worldWidth = 1.08 * viewportWidth;
  const asset = assetFor(instance);
  const ratioScale = mobileHeight / 300;
  let x = worldLeft + (instance.x / 1920) * worldWidth;
  let y = instance.y * ratioScale;
  let scale = instance.scale * ratioScale;
  if (rule.type === "surface") { x = viewportWidth / 2; y = mobileHeight / 2; scale = Math.max(viewportWidth / asset.width, mobileHeight / asset.height); }
  if (rule.type === "ground-band") { x = viewportWidth / 2; y = mobileHeight - 18; scale = viewportWidth / asset.width; }
  if (rule.type === "center-mountain") { x = 0.46 * viewportWidth; y = mobileHeight; scale = 420 / asset.width; }
  if (rule.type === "water-system") { x = -0.02 * viewportWidth + 190; y = mobileHeight - 4; scale = 380 / asset.width; }
  if (rule.type === "ground") { x = worldLeft + 215; y = mobileHeight + 5; scale = 430 / asset.width; }
  if (rule.type === "house") { x = viewportWidth + 8 - 180; y = mobileHeight + 2; scale = 360 / asset.width; }
  if (rule.type === "object") {
    x = rule.xRatio * viewportWidth;
    const height = rule.heightRatio * viewportWidth * 0.78;
    scale = height / asset.height;
    y = mobileHeight - rule.bottomRatio * mobileHeight;
  }
  return { hidden: false, x: fmt(x), y: fmt(y), scale: fmt(scale), rotation: instance.rotation, flipX: instance.flipX, flipY: instance.flipY };
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  $("autosave-status").textContent = "Saving…";
  autosaveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("autosave-status").textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }, 180);
}

function makeVisual(instance, mobile = false) {
  const asset = assetFor(instance);
  const transform = mobile ? mobileTransform(instance) : instance;
  if (!asset || !instance.visible || transform.hidden) return null;
  const node = document.createElement("div");
  node.className = `scene-instance${instance.id === selectedId ? " selected" : ""}${instance.locked ? " locked" : ""}${instance.placeholder ? " placeholder" : ""}`;
  node.dataset.instanceId = instance.id;
  node.style.left = `${transform.x}px`; node.style.top = `${transform.y}px`;
  const origin = anchorPoint(asset, instance.anchor);
  node.style.transform = `rotate(${transform.rotation ?? instance.rotation}deg) scale(${transform.scale},${transform.scale}) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`;
  const content = document.createElement(asset.kind === "image" ? "img" : "div");
  content.className = "asset-content";
  content.style.width = `${asset.width}px`; content.style.height = `${asset.height}px`;
  content.style.left = `${-origin[0]}px`; content.style.top = `${-origin[1]}px`;
  if (asset.kind === "image") { content.src = asset.src; content.alt = ""; content.draggable = false; }
  else content.style.background = asset.surface;
  node.append(content);
  if (!mobile) {
    const tag = document.createElement("span"); tag.className = "instance-tag"; tag.textContent = instance.label; node.append(tag);
    for (const [name, point] of Object.entries(asset.anchors || {})) {
      const marker = document.createElement("i"); marker.className = "anchor-marker"; marker.title = name;
      marker.style.left = `${point[0] - origin[0]}px`; marker.style.top = `${point[1] - origin[1]}px`; node.append(marker);
    }
  }
  return node;
}

function renderAssetOptions() {
  const library = $("asset-library");
  const replacement = $("instance-asset");
  if (!library.options.length) {
    for (const asset of manifest.assets) {
      for (const select of [library, replacement]) {
        const option = document.createElement("option"); option.value = asset.id; option.textContent = `${asset.label} · ${asset.width}×${asset.height}`; select.append(option);
      }
    }
  }
}

function renderLayers() {
  const list = $("layer-list"); list.replaceChildren();
  for (const instance of state.instances) {
    const row = document.createElement("div"); row.className = `layer-row${instance.id === selectedId ? " selected" : ""}`; row.dataset.instanceId = instance.id;
    const select = document.createElement("button"); select.className = "layer-select"; select.type = "button";
    select.innerHTML = `<strong>${escapeHtml(instance.label)}</strong><small>${escapeHtml(instance.id)} · ${escapeHtml(assetFor(instance)?.label || instance.assetId)}</small>`;
    select.addEventListener("click", () => { selectedId = instance.id; render(); });
    const visibility = document.createElement("button"); visibility.className = "layer-icon"; visibility.type = "button"; visibility.title = instance.visible ? "Hide" : "Show"; visibility.textContent = instance.visible ? "◉" : "○";
    visibility.addEventListener("click", () => commit(() => { instance.visible = !instance.visible; }, instance.visible ? "Instance hidden" : "Instance shown"));
    const lock = document.createElement("button"); lock.className = "layer-icon"; lock.type = "button"; lock.title = instance.locked ? "Unlock" : "Lock"; lock.textContent = instance.locked ? "🔒" : "🔓";
    lock.addEventListener("click", () => commit(() => { instance.locked = !instance.locked; }, instance.locked ? "Instance unlocked" : "Instance locked"));
    row.append(select, visibility, lock); list.append(row);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderCanvas() {
  const host = $("scene-assets"); host.replaceChildren();
  for (const instance of [...state.instances].reverse()) {
    const node = makeVisual(instance);
    if (!node) continue;
    node.addEventListener("pointerdown", (event) => beginDrag(event, instance));
    host.append(node);
  }
  $("grid-overlay").classList.toggle("hidden", !state.settings.showGrid);
  $("scene-canvas").classList.toggle("show-anchors", state.settings.showAnchors);
  $("mobile-boundary").classList.toggle("hidden", !state.settings.showMobileBoundary);
  applyZoom();
}

function renderMobile() {
  const viewportWidth = Number(state.settings.mobileWidth);
  const preview = $("mobile-preview"); preview.style.width = `${viewportWidth}px`;
  const host = $("mobile-assets"); host.replaceChildren();
  for (const instance of [...state.instances].reverse()) {
    const node = makeVisual(instance, true);
    if (node) host.append(node);
  }
  document.querySelectorAll("[data-mobile-width]").forEach((button) => button.classList.toggle("active", Number(button.dataset.mobileWidth) === viewportWidth));
}

function renderInspector() {
  const instance = selected();
  $("empty-inspector").hidden = Boolean(instance);
  $("instance-inspector").hidden = !instance;
  if (!instance) return;
  const asset = assetFor(instance);
  $("selected-title").textContent = instance.label; $("selected-id").textContent = instance.id;
  $("instance-label").value = instance.label; $("instance-asset").value = instance.assetId;
  const anchorSelect = $("instance-anchor"); anchorSelect.replaceChildren();
  for (const name of Object.keys(asset.anchors || {})) { const option = document.createElement("option"); option.value = name; option.textContent = name; anchorSelect.append(option); }
  anchorSelect.value = asset.anchors?.[instance.anchor] ? instance.anchor : Object.keys(asset.anchors || {})[0];
  $("instance-x").value = instance.x; $("instance-y").value = instance.y; $("instance-scale").value = instance.scale; $("instance-rotation").value = instance.rotation;
  $("instance-flip-x").checked = instance.flipX; $("instance-flip-y").checked = instance.flipY; $("instance-visible").checked = instance.visible; $("instance-locked").checked = instance.locked; $("instance-placeholder").checked = instance.placeholder; $("instance-notes").value = instance.notes;
  for (const id of ["instance-label", "instance-asset", "instance-anchor", "instance-x", "instance-y", "instance-scale", "instance-rotation", "instance-flip-x", "instance-flip-y", "reset-transform", "duplicate-instance", "delete-instance", "bring-forward", "send-backward", "bring-front", "send-back"]) $(id).disabled = instance.locked;
  const readout = $("anchor-readout");
  readout.innerHTML = `<table>${Object.keys(asset.anchors || {}).map((name) => { const point = worldAnchor(instance, name); return `<tr><td>${escapeHtml(name)}</td><td>X ${point[0]}</td><td>Y ${point[1]}</td></tr>`; }).join("")}</table>`;
}

function render() {
  renderAssetOptions(); renderLayers(); renderCanvas(); renderMobile(); renderInspector();
  $("layout-name").value = state.layoutName;
  $("show-grid").checked = state.settings.showGrid; $("show-anchors").checked = state.settings.showAnchors; $("show-mobile-boundary").checked = state.settings.showMobileBoundary;
  $("undo-button").disabled = !history.length; $("redo-button").disabled = !future.length;
}

function applyZoom() {
  const viewport = $("canvas-scroll");
  let zoom = state.settings.zoom;
  if (zoom === "fit") zoom = Math.min(1, Math.max(0.1, (viewport.clientWidth - 34) / 1920));
  zoom = Number(zoom);
  $("scene-canvas").style.transform = `scale(${zoom})`;
  $("canvas-scale-box").style.width = `${1920 * zoom}px`; $("canvas-scale-box").style.height = `${300 * zoom}px`;
  $("zoom-select").value = state.settings.zoom;
}

function canvasPoint(event) {
  const rect = $("scene-canvas").getBoundingClientRect();
  return { x: Math.max(0, Math.min(1920, (event.clientX - rect.left) * 1920 / rect.width)), y: Math.max(0, Math.min(300, (event.clientY - rect.top) * 300 / rect.height)) };
}
function beginDrag(event, instance) {
  event.preventDefault(); event.stopPropagation(); selectedId = instance.id; render();
  if (instance.locked) { message("Unlock this instance before moving it.", "warning"); return; }
  history.push(snapshot()); future = [];
  const point = canvasPoint(event); drag = { id: instance.id, dx: point.x - instance.x, dy: point.y - instance.y };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function continueDrag(event) {
  if (!drag) return;
  const instance = state.instances.find((item) => item.id === drag.id); if (!instance) return;
  const point = canvasPoint(event); instance.x = fmt(point.x - drag.dx); instance.y = fmt(point.y - drag.dy);
  renderCanvas(); renderMobile(); renderInspector();
}
function endDrag() { if (!drag) return; drag = null; scheduleAutosave(); message("Instance moved"); }

function updateSelected(patch, text = "Instance updated") {
  const instance = selected(); if (!instance || instance.locked) return false;
  commit(() => Object.assign(instance, patch), text); return true;
}
function reorderSelected(mode) {
  const instance = selected(); if (!instance || instance.locked) return false;
  const index = state.instances.indexOf(instance); let target = index;
  if (mode === "forward") target = Math.max(0, index - 1);
  if (mode === "backward") target = Math.min(state.instances.length - 1, index + 1);
  if (mode === "front") target = 0;
  if (mode === "back") target = state.instances.length - 1;
  if (target === index) return true;
  commit(() => { state.instances.splice(index, 1); state.instances.splice(target, 0, instance); }, "Layer order updated"); return true;
}

function downloadableLayout(exportMode = false) {
  const output = clone(state);
  if (exportMode) {
    output.exportedAt = new Date().toISOString();
    const used = new Set(output.instances.map((item) => item.assetId));
    output.assets = manifest.assets.filter((asset) => used.has(asset.id));
  }
  return output;
}
function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$("undo-button").addEventListener("click", undo);
$("redo-button").addEventListener("click", redo);
$("reset-layout").addEventListener("click", () => {
  history.push(snapshot()); future = []; state = clone(baseline); selectedId = null; scheduleAutosave(); render(); message("Repository baseline restored");
});
$("add-asset").addEventListener("click", () => commit(() => addAsset($("asset-library").value), "Asset instance added"));
$("save-draft").addEventListener("click", () => { downloadJson(`${safeName(state.layoutName)}-draft.json`, downloadableLayout(false)); message("Editable draft downloaded"); });
$("export-layout").addEventListener("click", () => { downloadJson(`${safeName(state.layoutName)}-layout-v1.json`, downloadableLayout(true)); message("Versioned layout exported"); });
$("load-draft").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try { loadLayout(JSON.parse(await file.text()), file.name); } catch (error) { message(`Import rejected: ${error.message}`, "error"); }
  event.target.value = "";
});
function showPlannerReport(report) {
  const lines = report.valid
    ? [`VALID PLANNER IMPORT`, `${report.total} placement(s): ${report.added} new, ${report.updated} matching unlocked ID(s).`, `Mode: ${report.strategy}.`]
    : ["IMPORT BLOCKED", ...report.errors];
  if (report.warnings?.length) lines.push("", "Warnings:", ...report.warnings.map((warning) => `- ${warning}`));
  $("planner-import-report").textContent = lines.join("\n");
  $("planner-import-report").dataset.kind = report.valid ? (report.warnings.length ? "warning" : "success") : "error";
  $("apply-planner-import").disabled = !report.valid;
}
$("open-planner-import").addEventListener("click", () => {
  pendingPlannerImport = null;
  $("planner-import-report").textContent = "Paste or choose a planner-first-pass JSON file, then validate it.";
  $("planner-import-report").dataset.kind = "";
  $("apply-planner-import").disabled = true;
  $("planner-import-dialog").showModal();
});
$("planner-import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  $("planner-import-json").value = await file.text();
  pendingPlannerImport = null; $("apply-planner-import").disabled = true;
  $("planner-import-report").textContent = `${file.name} loaded. Validate it before applying.`;
});
$("preview-planner-import").addEventListener("click", () => {
  try {
    const document = JSON.parse($("planner-import-json").value);
    const strategy = $("planner-import-strategy").value;
    const report = previewPlannerImport(document, strategy);
    pendingPlannerImport = report.valid ? { document, strategy } : null;
    showPlannerReport(report);
  } catch (error) {
    pendingPlannerImport = null; showPlannerReport({ valid: false, errors: [`Malformed JSON: ${error.message}`], warnings: [] });
  }
});
$("apply-planner-import").addEventListener("click", () => {
  if (!pendingPlannerImport) return;
  try {
    const report = applyPlannerImport(pendingPlannerImport.document, pendingPlannerImport.strategy);
    $("planner-import-dialog").close(); pendingPlannerImport = null;
    message(`Planner first pass imported after review: ${report.total} placement(s).`);
  } catch (error) { showPlannerReport({ valid: false, errors: [error.message], warnings: [] }); }
});
function safeName(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "living-overworld"; }

$("layout-name").addEventListener("change", (event) => commit(() => { state.layoutName = event.target.value.trim() || "Untitled Living Overworld layout"; }, "Layout renamed"));
$("zoom-select").addEventListener("change", (event) => { state.settings.zoom = event.target.value === "fit" ? "fit" : Number(event.target.value); scheduleAutosave(); applyZoom(); });
for (const [id, key] of [["show-grid", "showGrid"], ["show-anchors", "showAnchors"], ["show-mobile-boundary", "showMobileBoundary"]]) {
  $(id).addEventListener("change", (event) => { state.settings[key] = event.target.checked; scheduleAutosave(); renderCanvas(); });
}
document.querySelectorAll("[data-mobile-width]").forEach((button) => button.addEventListener("click", () => { state.settings.mobileWidth = Number(button.dataset.mobileWidth); scheduleAutosave(); renderMobile(); }));

for (const [id, key, parser] of [
  ["instance-label", "label", (value) => value.trim() || "Unnamed instance"],
  ["instance-x", "x", Number], ["instance-y", "y", Number],
  ["instance-scale", "scale", (value) => Math.max(0.001, Number(value))],
  ["instance-rotation", "rotation", Number], ["instance-notes", "notes", String],
]) {
  $(id).addEventListener("change", (event) => updateSelected({ [key]: parser(event.target.value) }));
}
for (const [id, key] of [["instance-flip-x", "flipX"], ["instance-flip-y", "flipY"], ["instance-visible", "visible"], ["instance-placeholder", "placeholder"]]) {
  $(id).addEventListener("change", (event) => updateSelected({ [key]: event.target.checked }));
}
$("instance-locked").addEventListener("change", (event) => {
  const instance = selected(); if (!instance) return;
  commit(() => { instance.locked = event.target.checked; }, event.target.checked ? "Instance locked" : "Instance unlocked");
});
$("instance-anchor").addEventListener("change", (event) => updateSelected({ anchor: event.target.value }, "Placement anchor changed"));
$("instance-asset").addEventListener("change", (event) => {
  const instance = selected(); if (!instance || instance.locked) return;
  const before = assetFor(instance); const after = assets.get(event.target.value); const oldAnchor = instance.anchor;
  commit(() => {
    instance.assetId = after.id;
    instance.anchor = after.anchors?.[oldAnchor] ? oldAnchor : (after.anchors?.["bottom-center"] ? "bottom-center" : Object.keys(after.anchors || {})[0]);
  }, "Referenced asset replaced; instance ID and placement point preserved");
  const ratio = Math.max(after.width / before.width, before.width / after.width, after.height / before.height, before.height / after.height);
  $("size-warning").hidden = ratio < 1.25;
  $("size-warning").textContent = ratio < 1.25 ? "" : `Replacement dimensions differ materially (${before.width}×${before.height} → ${after.width}×${after.height}). Review visual scale and anchor geometry.`;
});
$("reset-transform").addEventListener("click", () => updateSelected({ scale: 1, rotation: 0, flipX: false, flipY: false }, "Transform reset"));
$("duplicate-instance").addEventListener("click", () => {
  const source = selected(); if (!source || source.locked) return;
  commit(() => { const copy = addAsset(source.assetId, { ...clone(source), label: `${source.label} copy`, x: source.x + 20, y: source.y + 20, locked: false }); selectedId = copy.id; }, "Instance duplicated with a new stable ID");
});
$("delete-instance").addEventListener("click", () => {
  const instance = selected(); if (!instance || instance.locked) return;
  commit(() => { state.instances.splice(state.instances.indexOf(instance), 1); selectedId = null; }, "Instance deleted; other IDs unchanged");
});
for (const [id, mode] of [["bring-forward", "forward"], ["send-backward", "backward"], ["bring-front", "front"], ["send-back", "back"]]) $(id).addEventListener("click", () => reorderSelected(mode));

$("scene-canvas").addEventListener("pointermove", (event) => {
  const point = canvasPoint(event); $("cursor-readout").textContent = `X ${point.x.toFixed(1)} · Y ${point.y.toFixed(1)}`; continueDrag(event);
});
$("scene-canvas").addEventListener("pointerup", endDrag);
$("scene-canvas").addEventListener("pointercancel", endDrag);
$("scene-canvas").addEventListener("pointerleave", (event) => { if (!drag) $("cursor-readout").textContent = "X — · Y —"; else continueDrag(event); });
$("scene-canvas").addEventListener("pointerdown", (event) => { if (event.target === $("scene-canvas") || event.target === $("scene-assets")) { selectedId = null; render(); } });
window.addEventListener("resize", () => { if (state.settings.zoom === "fit") applyZoom(); });
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const instance = selected(); if (!instance || instance.locked || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault(); const distance = event.shiftKey ? 10 : 1;
  const patch = { x: instance.x, y: instance.y };
  if (event.key === "ArrowLeft") patch.x -= distance; if (event.key === "ArrowRight") patch.x += distance;
  if (event.key === "ArrowUp") patch.y -= distance; if (event.key === "ArrowDown") patch.y += distance;
  updateSelected(patch, "Instance nudged");
});

$("restore-autosave").addEventListener("click", () => {
  try { loadLayout(JSON.parse(localStorage.getItem(STORAGE_KEY)), "Autosaved draft"); $("restore-banner").hidden = true; } catch (error) { message(`Autosave could not be restored: ${error.message}`, "error"); }
});
$("dismiss-autosave").addEventListener("click", () => { $("restore-banner").hidden = true; localStorage.removeItem(STORAGE_KEY); message("Repository baseline retained"); });

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) $("restore-banner").hidden = false;
render();
document.documentElement.dataset.editorReady = "true";

window.editorApi = {
  getState: () => clone(state), getManifest: () => clone(manifest),
  reset: () => { state = clone(baseline); selectedId = null; history = []; future = []; render(); return clone(state); },
  addAsset: (assetId, options = {}) => { let result; commit(() => { result = addAsset(assetId, options); }, "Asset instance added"); return clone(result); },
  select: (id) => { selectedId = id; render(); return Boolean(selected()); },
  update: (id, patch) => { selectedId = id; return updateSelected(patch); },
  duplicate: (id) => { const source = state.instances.find((item) => item.id === id); if (!source || source.locked) return null; let copy; commit(() => { copy = addAsset(source.assetId, { ...clone(source), label: `${source.label} copy`, x: source.x + 20, y: source.y + 20, locked: false }); selectedId = copy.id; }); return clone(copy); },
  reorder: (id, mode) => { selectedId = id; return reorderSelected(mode); },
  setPlaceholder: (id, flag, notes = "") => { selectedId = id; return updateSelected({ placeholder: flag, notes }); },
  serialize: () => JSON.stringify(downloadableLayout(false), null, 2),
  exportLayout: () => clone(downloadableLayout(true)), load: (layout) => loadLayout(layout, "API layout"),
  previewPlannerImport: (document, strategy = "replace-editable") => previewPlannerImport(document, strategy),
  applyPlannerImport: (document, strategy = "replace-editable") => applyPlannerImport(document, strategy),
  mobileTransform: (id, width) => { const instance = state.instances.find((item) => item.id === id); return instance ? mobileTransform(instance, width) : null; },
  worldAnchor: (id, name) => { const instance = state.instances.find((item) => item.id === id); return instance ? worldAnchor(instance, name) : null; },
};
